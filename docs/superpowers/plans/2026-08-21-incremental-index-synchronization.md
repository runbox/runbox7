# Incremental Index Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first useful local message list appear after a durable 100-message recent-index
batch, then extend it with older server partitions without backend changes.

**Architecture:** `SearchService` coordinates one operation and publishes typed state. A testable
worker-side runner fetches 1,000-message pages, sorts each page by descending ID, and commits
100-message batches. `AppComponent` renders state and switches data sources once; it no longer
coordinates nested index phases.

**Tech Stack:** Angular 16, TypeScript, RxJS, Jasmine/Karma with FirefoxHeadless, Web Workers,
Emscripten IDBFS, Xapian.

**Spec:** [Approved incremental index synchronization design][design]

[design]: ../specs/2026-08-21-incremental-index-synchronization-design.md

## Global Constraints

- Work only on issue #1158. Do not include the unrelated chunk-size or verification-logging commits.
- Preserve the server API and the server indexer's partition sizes.
- Keep the first test-only commit for every behavior separate from its implementation commit.
- Verify every test fails for the intended reason before implementing the corresponding behavior.
- Do not enable the local list before a durable recent-batch acknowledgement or an empty catch-up.
- Treat partition-map and message-fetch failures as failures, never as empty successful results.
- Never log message subjects, addresses, bodies, or other message data.
- Leave the user's unrelated untracked files untouched.
- Use mandatory commit format, an imperative subject, a mandatory scope, and lines of at most 100
  characters.

---

### Task 1: Define and validate the synchronization contracts

**Files:**

- Create: `src/app/xapian/index-sync.types.ts`
- Create: `src/app/xapian/index-sync-manifest.ts`
- Test: `src/app/xapian/index-sync-manifest.spec.ts`

- [ ] **Step 1: Write failing manifest-normalization tests**

Cover all of these cases in `index-sync-manifest.spec.ts`:

```ts
describe('normalizeIndexManifest', () => {
  it('keeps the main partition first and sorts historical partitions numerically', () => {
    const manifest = manifestWithFolders([
      'downloadable', 'xapianglass_10', 'xapianglass_2', 'xapianglass_1'
    ]);

    expect(normalizeIndexManifest(manifest).partitions.map(partition => partition.number))
      .toEqual([0, 1, 2, 10]);
  });

  it('totals compressed bytes, uncompressed bytes, and messages', () => {
    const result = normalizeIndexManifest(manifestWithKnownTotals());

    expect(result.totalCompressedBytes).toBe(60);
    expect(result.totalUncompressedBytes).toBe(600);
    expect(result.totalMessages).toBe(6);
  });

  it('rejects a missing main partition', () => {
    expect(() => normalizeIndexManifest(manifestWithFolders(['xapianglass_1'])))
      .toThrowError(IndexManifestError, /partition 0/i);
  });

  it('rejects duplicate partition numbers', () => {
    expect(() => normalizeIndexManifest(manifestWithFolders([
      'downloadable', 'xapianglass_1', 'xapianglass_01'
    ]))).toThrowError(IndexManifestError, /duplicate/i);
  });

  it('rejects unknown folder names and incomplete file metadata', () => {
    expect(() => normalizeIndexManifest(manifestWithFolders(['downloadable', 'archive'])))
      .toThrowError(IndexManifestError, /archive/);
    expect(() => normalizeIndexManifest(manifestWithMissingFileSize()))
      .toThrowError(IndexManifestError, /metadata/i);
  });
});
```

The fixture must reflect the current endpoint contract: the first manifest entry names the main
download as `downloadable`; historical entries are `xapianglass_<number>`. Confirm those names from
a captured development response before finalizing the fixture. If the response differs, encode the
observed names and update the approved design document in a separate documentation commit first.

- [ ] **Step 2: Run the focused spec and prove red**

Run:

```bash
npm test -- --watch=false --browsers=FirefoxHeadless \
  --include=src/app/xapian/index-sync-manifest.spec.ts
```

Expected: compilation fails because `index-sync-manifest` and its exported symbols do not exist.

- [ ] **Step 3: Commit the failing specification by itself**

```bash
git add src/app/xapian/index-sync-manifest.spec.ts
git commit -m "test(index): specify server index manifest ordering"
```

- [ ] **Step 4: Implement shared types and manifest normalization**

Add these public contracts to `index-sync.types.ts`:

```ts
export const INITIAL_SYNC_PAGE_SIZE = 1000;
export const VISIBLE_INDEX_BATCH_SIZE = 100;

export type IndexSyncPhase =
  | 'discovering'
  | 'downloading-main'
  | 'opening-worker'
  | 'catching-up-recent'
  | 'local-index-ready'
  | 'downloading-history'
  | 'final-reconciliation'
  | 'complete'
  | 'failed'
  | 'cancelled';

export interface IndexSyncState {
  operationId: string;
  phase: IndexSyncPhase;
  fetchedMessages: number;
  committedMessages: number;
  currentPage: number;
  currentPartition: number;
  totalPartitions: number;
  downloadedBytes: number;
  totalBytes: number;
  error: string | null;
}

export interface NormalizedIndexPartition {
  number: number;
  folder: string;
  numberOfMessages: number;
  files: ReadonlyArray<{
    filename: string;
    compressedsize: number;
    uncompressedsize: number;
  }>;
}

export interface NormalizedIndexManifest {
  partitions: ReadonlyArray<NormalizedIndexPartition>;
  totalCompressedBytes: number;
  totalUncompressedBytes: number;
  totalMessages: number;
}
```

Also define discriminated worker command/event unions here. Every initial-sync member carries
`operationId`; include `openIndex`, `catchUpRecent`, `cancelInitialSync`, `startPeriodicSync`,
`workerIndexReady`, `recentChunkCommitted`, `recentCatchUpComplete`, `recentCatchUpFailed`, and
`initialSyncCancelled`. The committed event carries page, batch, batch size, and cumulative count.

Implement `normalizeIndexManifest()` as a pure function. Require one main entry, derive historical
numbers from the anchored expression `/^xapianglass_(\d+)$/`, and reject duplicate numeric values.
Require finite non-negative sizes and message counts, return new objects, and sort numerically. Do
not mutate the HTTP response.

- [ ] **Step 5: Run the focused spec and prove green**

Run the command from Step 2.

Expected: all `index-sync-manifest` specs pass.

- [ ] **Step 6: Commit the implementation separately**

```bash
git add src/app/xapian/index-sync.types.ts src/app/xapian/index-sync-manifest.ts
git commit -m "feat(index): normalize server index manifests"
```

---

### Task 2: Fetch recent messages in ordered, durable publication batches

**Files:**

- Create: `src/app/xapian/recent-index-sync.ts`
- Test: `src/app/xapian/recent-index-sync.spec.ts`

- [ ] **Step 1: Write failing tests for page and batch semantics**

Define a worker-safe dependency interface in the spec and test without Worker, Xapian, or IDBFS:

```ts
const run = (pages: MessageInfo[][]) => runRecentIndexSync({
  operationId: 'sync-1',
  baseline: 1234,
  pageSize: 1000,
  publishSize: 100,
  fetchPage: async page => pages[page],
  commitBatch: async messages => committed.push(messages.map(message => message.id)),
  isCancelled: () => cancelled,
  onBatchCommitted: event => events.push(event),
});
```

Cover:

- A 250-message page is sorted descending and committed as 100, 100, and 50.
- Page 1 is not fetched until all batches from page 0 are committed.
- A full 1,000-message page fetches the next page; a short page ends the pass.
- The same fixed baseline and page size are passed to every request.
- Cancellation is observed between 100-message batches and emits no later commit.
- A rejected fetch rejects the pass and is not converted to an empty result.
- An empty first page completes with `committedMessages === 0`.

- [ ] **Step 2: Run the focused spec and prove red**

```bash
npm test -- --watch=false --browsers=FirefoxHeadless \
  --include=src/app/xapian/recent-index-sync.spec.ts
```

Expected: compilation fails because `runRecentIndexSync` does not exist.

- [ ] **Step 3: Commit the failing specification**

```bash
git add src/app/xapian/recent-index-sync.spec.ts
git commit -m "test(index): specify ordered recent message batches"
```

- [ ] **Step 4: Implement the worker-safe runner**

Use this shape in `recent-index-sync.ts`:

```ts
export interface RecentIndexSyncDependencies {
  operationId: string;
  baseline: number;
  pageSize: number;
  publishSize: number;
  fetchPage: (page: number, baseline: number, pageSize: number) => Promise<MessageInfo[]>;
  commitBatch: (
    messages: MessageInfo[], context: { page: number; batch: number }
  ) => Promise<void>;
  isCancelled: () => boolean;
  onBatchCommitted: (event: RecentChunkCommittedEvent) => void;
}
```

Copy each response before sorting it with `(left, right) => right.id - left.id`. Await every
`commitBatch` before emitting its event or requesting more data. Check cancellation before each
batch and before the next page. Return fetched and committed totals plus the highest conservative
watermark candidate, but do not persist it here.

- [ ] **Step 5: Run the focused spec and prove green**

Run the command from Step 2.

Expected: all recent-index-sync specs pass.

- [ ] **Step 6: Commit the implementation separately**

```bash
git add src/app/xapian/recent-index-sync.ts
git commit -m "feat(index): process recent messages in visible batches"
```

---

### Task 3: Add an acknowledged, injectable worker protocol

**Files:**

- Create: `src/app/xapian/index-worker.factory.ts`
- Modify: `src/app/xapian/messageactions.ts`
- Modify: `src/app/xapian/index.worker.ts`
- Modify: `src/app/xapian/searchservice.ts`
- Modify: `src/app/rmmapi/restapi_standalone.ts`
- Create: `src/app/rmmapi/restapi_standalone.spec.ts`
- Test: `src/app/xapian/searchservice.spec.ts`

- [ ] **Step 1: Replace the skipped lifecycle test with failing fake-worker tests**

Create a `FakeIndexWorker` that records `postMessage` calls and exposes `emit(event)` and
`emitError(error)`. Inject it through a factory token. Change the two relevant `xit` blocks to `it`
only after removing their real Worker/WASM dependency.

Test that:

- `openIndex` is followed by an awaited matching `workerIndexReady`.
- `catchUpRecent` carries operation ID, fixed baseline, page size 1,000, and publication size 100.
- The first matching `recentChunkCommitted` reloads the read-only Xapian view before publishing
  `local-index-ready`.
- A zero-message `recentCatchUpComplete` also publishes `local-index-ready`.
- Later chunk events redraw without another data-source cutover.
- Events for an old operation ID are ignored.
- `recentCatchUpFailed` produces a failed state and retains the database-backed list.

In `restapi_standalone.spec.ts`, stub `fetch` with a non-OK response and assert that
`listAllMessages()` rejects. This distinguishes “empty page” from “request failed”. Restore
the global fetch function in `afterEach`.

Use `fakeAsync()` and `flushMicrotasks()` or async Jasmine expectations; do not use timing sleeps.

- [ ] **Step 2: Run the SearchService spec and prove red**

```bash
npm test -- --watch=false --browsers=FirefoxHeadless \
  --include=src/app/xapian/searchservice.spec.ts \
  --include=src/app/rmmapi/restapi_standalone.spec.ts
```

Expected: the fake worker cannot be injected, typed events are not handled, and message-fetch
transport errors resolve as empty arrays.

- [ ] **Step 3: Commit the failing worker-boundary tests**

```bash
git add src/app/xapian/searchservice.spec.ts src/app/rmmapi/restapi_standalone.spec.ts
git commit -m "test(index): specify acknowledged worker synchronization"
```

- [ ] **Step 4: Introduce the injectable worker and typed event routing**

In `index-worker.factory.ts`, provide an injection token whose browser factory creates the current
module worker:

```ts
export type IndexWorkerFactory = () => Worker;

export const INDEX_WORKER_FACTORY = new InjectionToken<IndexWorkerFactory>(
  'INDEX_WORKER_FACTORY',
  {
    providedIn: 'root',
    factory: () => () => new Worker(new URL('./index.worker', import.meta.url), { type: 'module' })
  }
);
```

Inject the factory into `SearchService` and replace direct construction. Keep legacy actions in
`PostMessageAction`; put only the new initial-sync protocol in the discriminated unions from Task 1.
Create one event router that first checks whether an event is an initial-sync event, then rejects a
non-matching operation ID, and finally advances the coordinator.

- [ ] **Step 5: Connect the worker to the batch runner**

In `index.worker.ts`:

- Pause the existing 10-second poll while an initial operation is active.
- Acknowledge `openIndex` only after both IDBFS loading and writable Xapian initialization succeed.
- Implement `catchUpRecent` with `runRecentIndexSync()`.
- Fetch with `listAllMessages(page, 0, baseline, pageSize, true)`.
- Remove the terminal catch in `listAllMessages()` that logs and returns `[]`; let transport and
  parsing failures reject so the worker can retry or fail the phase.
- Fetch deletions using the same fixed baseline. Apply them idempotently in the first durable batch,
  or in a deletion-only durable commit before reporting an otherwise empty catch-up complete.
- Refactor the existing document-diff creation into a method reused by periodic and initial sync.
- Commit each 100-message update set with the existing serialized queue.
- Make `persistIndex()` reject when `FS.syncfs` supplies an error.
- Emit `recentChunkCommitted` only after commit and successful persistence.
- Keep the candidate watermark provisional; accept a `finalizeWatermark` flag only on the final
  pass.
- Emit typed failure/cancellation events with a safe phase/code/message, not message data.
- Start periodic sync only on `startPeriodicSync`.

Remove the worker-local 10,000 constant from the initial path. Do not alter the default in
`restapi_standalone.ts`; issue #1158 passes 1,000 explicitly.

- [ ] **Step 6: Run focused worker-boundary and batching specs**

```bash
npm test -- --watch=false --browsers=FirefoxHeadless \
  --include=src/app/xapian/searchservice.spec.ts \
  --include=src/app/xapian/recent-index-sync.spec.ts \
  --include=src/app/rmmapi/restapi_standalone.spec.ts
```

Expected: all included specs pass and neither spec constructs a real Worker or loads WASM.

- [ ] **Step 7: Commit the implementation separately**

```bash
git add src/app/xapian/index-worker.factory.ts \
  src/app/xapian/messageactions.ts \
  src/app/xapian/index.worker.ts \
  src/app/xapian/searchservice.ts \
  src/app/rmmapi/restapi_standalone.ts
git commit -m "feat(index): acknowledge durable recent synchronization"
```

---

### Task 4: Coordinate manifest, main, recent, history, and reconciliation phases

**Files:**

- Modify: `src/app/xapian/searchservice.ts`
- Test: `src/app/xapian/searchservice.spec.ts`

- [ ] **Step 1: Write failing coordinator tests**

Use `HttpClientTestingModule`, `HttpTestingController`, fake FS/Xapian collaborators, and the fake
worker. Assert this exact observable sequence:

```text
discovering
downloading-main
opening-worker
catching-up-recent
local-index-ready
downloading-history
final-reconciliation
complete
```

Also prove:

- `/rest/v1/searchindex/partitions` is requested before any index file.
- The main four files finish before `openIndex` is sent.
- Historical folders are requested in numeric order `1, 2, 10`, not response order.
- Each complete historical partition is opened and published before the next begins.
- The final catch-up uses the original baseline, then starts periodic sync.
- Manifest HTTP/validation errors become `failed`, not an empty successful map.
- A historical failure retains the already-usable local index and exposes retry state.
- Cancelling before cutover deletes the incomplete new index and remains database-backed.
- Declining optional history retains the usable local index and proceeds to reconciliation.
- Cancelling or failing an old operation cannot alter the active operation.

- [ ] **Step 2: Run the coordinator spec and prove red**

```bash
npm test -- --watch=false --browsers=FirefoxHeadless \
  --include=src/app/xapian/searchservice.spec.ts
```

Expected: the existing nested download methods do not meet the phase/order assertions.

- [ ] **Step 3: Commit the failing coordinator tests**

```bash
git add src/app/xapian/searchservice.spec.ts
git commit -m "test(index): specify initial synchronization phases"
```

- [ ] **Step 4: Implement one SearchService-owned operation**

Expose a read-only stream and two commands:

```ts
private readonly initialSyncStateSubject = new BehaviorSubject<IndexSyncState | null>(null);
public readonly initialSyncState = this.initialSyncStateSubject.asObservable();

public startInitialIndexSynchronization(): Observable<IndexSyncState>;
public cancelInitialIndexSynchronization(): void;
```

Use one internal `runInitialIndexSynchronization(operationId)` method. It must:

1. Fetch and normalize the manifest without `catchError(() => of(emptyMap))`.
2. Download all four main files and persist them before asking the worker to open.
3. Await worker readiness, then capture the main partition's conservative baseline once.
4. Run and await recent catch-up with that fixed baseline.
5. Publish local readiness after reloading the read-only main-thread database.
6. Download historical partitions from the already-normalized manifest; do not refetch it.
7. Run final reconciliation with the original baseline and finalize its watermark.
8. Start the periodic poll and publish `complete`.

Replace public mutable download flags as orchestration inputs with state derived from this
operation.
Compatibility getters are acceptable while the template migration is in progress, but callers must
not assign to them.

- [ ] **Step 5: Make historical partition publication atomic**

Download each partition into an operation-specific temporary folder such as
`<partition>.sync-<operationId>`. Only after every file succeeds, rename/promote the folder, open
it with `addFolderXapianIndex`, sync/reload the read-only view, and publish progress. On error or
cancel, delete only that operation's temporary folder. Do not delete already-promoted history.

Keep file and partition concurrency at one. Track bytes from HTTP progress events in
`IndexSyncState` instead of mutating file metadata in the manifest.

- [ ] **Step 6: Implement phase-aware retry and cancellation**

Retry transient recent-sync transport failures a bounded three times with delays of 1, 2, and 4
seconds. Do not retry manifest validation failures. Allow historical retry from the failed
partition.
Check cancellation between 100-message batches and files. Overall cancellation before cutover calls
the existing local-index deletion path; declining the optional history dialog is not overall
cancellation.

- [ ] **Step 7: Run the focused coordinator tests and lint touched files**

```bash
npm test -- --watch=false --browsers=FirefoxHeadless \
  --include=src/app/xapian/searchservice.spec.ts
npx eslint src/app/xapian/index-sync.types.ts \
  src/app/xapian/index-sync-manifest.ts \
  src/app/xapian/recent-index-sync.ts \
  src/app/xapian/index-worker.factory.ts \
  src/app/xapian/index.worker.ts \
  src/app/xapian/searchservice.ts \
  src/app/xapian/*.spec.ts
```

Expected: tests pass and ESLint exits zero.

- [ ] **Step 8: Commit the implementation separately**

```bash
git add src/app/xapian/searchservice.ts
git commit -m "feat(index): coordinate incremental initial synchronization"
```

---

### Task 5: Switch and redraw the message list without visible jumps

**Files:**

- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Create: `src/app/app.component.spec.ts`

- [ ] **Step 1: Write failing component behavior tests**

Instantiate the component with focused test doubles or configure the smallest practical TestBed.
Do not load the real worker. Prove:

- `downloadIndexFromServer()` invokes only `startInitialIndexSynchronization()`.
- `cancelOrRefuseLocalIndex()` invokes `cancelInitialIndexSynchronization()` during an operation.
- The database-backed display remains active through `catching-up-recent`.
- The first `local-index-ready` state calls `afterUpdateIndex()` exactly once.
- Subsequent committed batches call `updateSearch(true, true)` and never `scrollTop()`.
- `failed` before cutover retains the database display and shows a retryable error.
- `failed` during history retains the local display.
- The template shows phase text and a determinate progress bar when totals are known.

- [ ] **Step 2: Run the component spec and prove red**

```bash
npm test -- --watch=false --browsers=FirefoxHeadless \
  --include=src/app/app.component.spec.ts
```

Expected: the component still coordinates nested subscriptions and has no state-stream renderer.

- [ ] **Step 3: Commit the failing UI tests**

```bash
git add src/app/app.component.spec.ts
git commit -m "test(index): specify seamless local list cutover"
```

- [ ] **Step 4: Replace nested UI orchestration**

Subscribe once to `searchService.initialSyncState` using the component's existing teardown pattern.
Track the active operation ID and a per-operation `hasCutOverToLocalIndex` boolean. On
`local-index-ready`, call `afterUpdateIndex()` once. On later batch/history publication, call
`updateSearch(true, true)`. Do not post directly to the worker or assign SearchService lifecycle
flags for the initial operation.

Keep optional-history confirmation in the UI, but report the choice back through a SearchService
method so the service remains the phase coordinator.

- [ ] **Step 5: Render phase-aware progress**

Replace the two download-only bars with state-derived presentation:

```html
<mat-progress-bar
  *ngIf="indexSyncState && isIndexSyncBusy(indexSyncState)"
  [mode]="indexSyncState.totalBytes > 0 ? 'determinate' : 'indeterminate'"
  [value]="indexSyncProgress(indexSyncState)">
</mat-progress-bar>
<span *ngIf="indexSyncState" class="index-sync-status" aria-live="polite">
  {{ indexSyncStatusText(indexSyncState) }}
</span>
```

Use translation-ready, non-PII text such as “Preparing recent messages”, “Adding older
messages”, and “Finishing synchronization”. Announce changes politely; do not announce every
message.

- [ ] **Step 6: Report local-query failures**

Replace the empty `catch (e) { }` in `updateSearch()` with a safe error report and a stable
fallback.
Keep the current displayed rows when a later local redraw fails. If the first cutover query fails,
return to the database-backed display and surface a retry action.

- [ ] **Step 7: Run component and SearchService specs**

```bash
npm test -- --watch=false --browsers=FirefoxHeadless \
  --include=src/app/app.component.spec.ts \
  --include=src/app/xapian/searchservice.spec.ts
```

Expected: all included specs pass; assertions confirm one cutover and scroll-preserving redraws.

- [ ] **Step 8: Commit the implementation separately**

```bash
git add src/app/app.component.ts src/app/app.component.html
git commit -m "feat(index): populate the local message list incrementally"
```

---

### Task 6: Prove reconciliation, regression safety, and contribution readiness

**Files:**

- Modify: `src/app/xapian/searchservice.spec.ts`
- Modify: `src/app/xapian/recent-index-sync.spec.ts`
- Modify: `src/app/app.component.spec.ts`
- Modify if required by findings: scoped implementation files from Tasks 1–5

- [ ] **Step 1: Add failing end-to-end orchestration regression cases**

Using only fake HTTP, worker, FS, and Xapian collaborators, add cases that simulate:

- A message arriving between the first pass and historical download is captured by reconciliation.
- An overlapping message in both passes produces one Xapian document by stable `Q<id>` term.
- A 2,050-message response sequence publishes 21 ordered batches and never fetches concurrently.
- Cancellation after batch 2 acknowledges exactly 200 committed messages and ignores a late event.
- Persistence failure prevents `recentChunkCommitted` and prevents cutover.
- Periodic sync starts only after reconciliation completes.

- [ ] **Step 2: Run the three focused specs and prove the new cases red where behavior is missing**

```bash
npm test -- --watch=false --browsers=FirefoxHeadless \
  --include=src/app/xapian/recent-index-sync.spec.ts \
  --include=src/app/xapian/searchservice.spec.ts \
  --include=src/app/app.component.spec.ts
```

Expected: any still-unimplemented boundary fails with an assertion identifying that boundary.

- [ ] **Step 3: Commit the final failing regression tests**

```bash
git add src/app/xapian/recent-index-sync.spec.ts \
  src/app/xapian/searchservice.spec.ts \
  src/app/app.component.spec.ts
git commit -m "test(index): cover incremental synchronization recovery"
```

- [ ] **Step 4: Make only the minimal implementation corrections required by the tests**

Do not broaden the refactor. Preserve stable unique-term idempotency, fixed baseline semantics,
bounded retries, stale-operation filtering, and the database fallback.

- [ ] **Step 5: Run focused verification, then the mandatory full suite**

```bash
npm test -- --watch=false --browsers=FirefoxHeadless \
  --include=src/app/xapian/index-sync-manifest.spec.ts \
  --include=src/app/xapian/recent-index-sync.spec.ts \
  --include=src/app/xapian/searchservice.spec.ts \
  --include=src/app/app.component.spec.ts
npm run ci-tests
```

Expected: every focused spec and the complete lint, policy, unit, e2e, and build pipeline passes.
If infrastructure prevents a full-suite stage, record the exact command and complete output; do not
claim readiness.

- [ ] **Step 6: Commit any final implementation corrections separately**

Skip this commit if Step 4 changed nothing. Otherwise:

```bash
git add src/app/xapian src/app/app.component.ts src/app/app.component.html
git commit -m "fix(index): complete incremental synchronization recovery"
```

- [ ] **Step 7: Review scope, history, and the complete diff**

```bash
git status --short
git log --oneline master..HEAD
git diff --check master...HEAD
git diff --stat master...HEAD
git diff master...HEAD
```

Confirm:

- Only issue #1158 files are present.
- Tests and implementations remain in separate commits.
- No placeholder, `TODO`, skipped spec, or accidental 10,000 initial-sync page remains:

```bash
rg -n "TODO|FIXME|xit\(|xdescribe\(|10000" \
  src/app/xapian/index-sync* \
  src/app/xapian/recent-index-sync* \
  src/app/xapian/searchservice.spec.ts \
  src/app/app.component.spec.ts
```

- The design's constants, protocol names, state fields, and phase names match implementation types.
- No message content or personal data is present in new logging.
- The old out-of-scope commits are not ancestors of this branch.

- [ ] **Step 8: Check for duplicate pull requests before proposing a new one**

```bash
gh pr list --repo runbox/runbox7 --state all --search "1158 in:title,body"
```

Expected: no existing pull request already implements the approved #1158 design. If a duplicate
exists, stop and show it to the human partner.

- [ ] **Step 9: Request human approval of the complete diff**

Present the entire diff, test evidence, known no-snapshot limitation, and an AI disclosure draft.
Do not open a pull request. The human partner reviews and decides whether to open it.
