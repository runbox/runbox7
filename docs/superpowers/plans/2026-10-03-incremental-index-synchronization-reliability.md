# Incremental Index Synchronization Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make initial local-index synchronization settle every operation reliably, preserve the
last usable index on failure, and report cancellation, retry, and progress truthfully.

**Architecture:** Add one operation-scoped cancellation and failure contract shared by the
coordinator, main thread, and worker. Put destructive partition replacement and publication behind
transactional helpers, and put worker mutations and persistence behind one serialized queue.

**Tech Stack:** Angular 16, TypeScript, RxJS, Jasmine/Karma with FirefoxHeadless, Web Workers,
Emscripten IDBFS, Xapian.

**Spec:** [Approved incremental index synchronization design][design]

[design]: ../specs/2026-08-21-incremental-index-synchronization-design.md

## Global Constraints

- Work only on issue #1158 and the confirmed findings I1-I9, S1-S2, plus the incorrect retry test.
- Preserve existing backend APIs, Xapian document semantics, page size 1,000, and batch size 100.
- Put each task's failing tests in a cherry-pickable commit before its implementation commit.
- Run each new test before implementation and verify that it fails for the intended missing behavior.
- Never log subjects, addresses, message bodies, or other message content.
- Match the existing ESLint style: single quotes, semicolons, no shadowing, and `_` for unused vars.
- Leave `.codex`, `e2e/cypress/integration/signup.deployed.ts`, `out-tsc`, and `paad` untouched.
- Use a mandatory commit scope, imperative subject, no trailing dot, and lines of at most 100
  characters.
- Do not open a PR; present the complete diff and obtain explicit human approval first.

## Review Focus

- Cancellation after a dependency resolves but before the next phase must prevent that phase.
- Failure while restoring a historical backup must retain both the original failure and rollback
  failure category without claiming success.
- Multiple worker-open errors for one command must produce exactly one terminal event.
- A persistence failure with both active and queued mutation callers must reject all callers and
  leave the next independent batch runnable.
- Legacy publication arriving during an acknowledged publication must be serialized and coalesced,
  not dropped or run concurrently.

---

### Task 0: Cross-boundary regression contract

**Files:**

- Create: `src/app/xapian/index-sync-orchestration.spec.ts`

**Interfaces:**

- Consumes: the existing `SearchService`, `IndexWorkerClient`, coordinator dependency, and fake
  worker seams.
- Produces: one standing acceptance spec used by Tasks 1-7.

- [ ] **Step 1: Write the failing orchestration test**

Exercise manifest, main download, worker ready, first 100 committed, cutover, remaining recent
batches, transactional history, final reconciliation, and completion. Add failure cases for worker
open, persistence, cancellation during delay, and historical restore. Assert terminal state, visible
data source, periodic-sync start, and absence of unsettled promises.

- [ ] **Step 2: Run the orchestration spec and prove red**

Run: `npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/index-sync-orchestration.spec.ts`

Expected: FAIL on the current branch because worker-open errors can remain pending, cancellation can
start later work, and historical replacement cannot restore the prior partition.

- [ ] **Step 3: Commit the failing orchestration test**

```bash
git add src/app/xapian/index-sync-orchestration.spec.ts
git commit -m "test(index): cover synchronization orchestration"
```

Do not weaken assertions while implementing Tasks 1-7. Run this spec alongside each task's focused
specs once that task owns enough behavior for its corresponding assertions to pass.

---

### Task 1: Typed failures and transport-only retry

**Files:**

- Modify: `src/app/xapian/index-sync.types.ts`
- Modify: `src/app/xapian/index-sync-coordinator.ts`
- Test: `src/app/xapian/index-sync-coordinator.spec.ts`

**Interfaces:**

- Produces: `IndexSyncFailureCategory`, `IndexSyncFailureDetails`, and `IndexSyncError`.
- Produces: `IndexSyncState.error: IndexSyncFailureDetails | null`.

- [ ] **Step 1: Write failing coordinator tests**

Add tests proving that three retry delays produce four total attempts, only
`category: 'transport'` with `recoverable: true` retries, state preserves phase/attempt/category,
and persistence, validation, corruption, publication, and rollback errors run once. Assert progress
does not regress when a retry restarts attempt-local counters.

- [ ] **Step 2: Run the focused spec and prove red**

Run: `npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/index-sync-coordinator.spec.ts`

Expected: FAIL because failures are untyped, structural errors retry, and the existing assertion
expects five attempts instead of four.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/app/xapian/index-sync-coordinator.spec.ts
git commit -m "test(index): specify synchronization failure policy"
```

- [ ] **Step 4: Implement the typed failure policy**

Define categories `transport`, `initialization`, `persistence`, `validation`, `publication`,
`corruption`, `rollback`, and `cancellation-cleanup`. Define `IndexSyncError` with readonly
`details: IndexSyncFailureDetails` and `cause: unknown`. Change `withBoundedRetry()` to retry only
recoverable transport errors and record the one-based attempt. Preserve the maximum published byte
and message counters when later attempts report lower values.

- [ ] **Step 5: Run the focused spec and prove green**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/app/xapian/index-sync.types.ts src/app/xapian/index-sync-coordinator.ts
git commit -m "fix(index): classify synchronization failures"
```

---

### Task 2: Durable operation cancellation

**Files:**

- Create: `src/app/xapian/index-sync-operation.ts`
- Create: `src/app/xapian/index-sync-operation.spec.ts`
- Modify: `src/app/xapian/index-sync-coordinator.ts`
- Modify: `src/app/xapian/searchservice.ts`
- Modify: `src/app/rmmapi/restapi_standalone.ts`
- Test: `src/app/xapian/index-sync-coordinator.spec.ts`
- Test: `src/app/rmmapi/restapi_standalone.spec.ts`

**Interfaces:**

- Produces: `IndexSyncOperation.cancel(): void`, `.cancelled: boolean`, `.signal: AbortSignal`,
  `.cancelled$: Observable<void>`, `.throwIfCancelled(): void`, and
  `.wait(delayMilliseconds: number): Promise<void>`.
- Consumes: typed cancellation-cleanup failure from Task 1.

- [ ] **Step 1: Write failing cancellation tests**

Cover cancellation before subscription, during retry delay, while the history dialog is open,
after a dependency resolves, and during `listAllMessages()`. Assert the dialog closes, fetch sees an
aborted signal, no later dependency starts, and cleanup rejection ends in `failed` with category
`cancellation-cleanup` rather than `cancelled`.

- [ ] **Step 2: Run the focused specs and prove red**

Run: `npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/index-sync-operation.spec.ts --include=src/app/xapian/index-sync-coordinator.spec.ts --include=src/app/rmmapi/restapi_standalone.spec.ts`

Expected: FAIL because cancellation is a one-shot subject, delay is not interruptible, and worker
fetch has no abort signal.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/app/xapian/index-sync-operation.spec.ts \
  src/app/xapian/index-sync-coordinator.spec.ts src/app/rmmapi/restapi_standalone.spec.ts
git commit -m "test(index): specify durable synchronization cancellation"
```

- [ ] **Step 4: Implement the operation controller**

Use one `IndexSyncOperation` per `startInitialIndexSynchronization()`. Pass its signal to an optional
final `signal?: AbortSignal` parameter on `listAllMessages()`, use its observable for Angular HTTP
unsubscription and dialog closure, and replace raw `setTimeout` backoff with `.wait()`. Check
`.throwIfCancelled()` immediately before and after every coordinator dependency. Publish
`cancelled` only after cleanup resolves.

- [ ] **Step 5: Run the focused specs and prove green**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/app/xapian/index-sync-operation.ts src/app/xapian/index-sync-coordinator.ts \
  src/app/xapian/searchservice.ts src/app/rmmapi/restapi_standalone.ts
git commit -m "fix(index): make synchronization cancellation durable"
```

---

### Task 3: Fresh initialization and worker-open settlement

**Files:**

- Modify: `src/app/xapian/initial-index-open.ts`
- Modify: `src/app/xapian/index.worker.ts`
- Modify: `src/app/xapian/index-worker-client.ts`
- Modify: `src/app/xapian/searchservice.ts`
- Test: `src/app/xapian/initial-index-open.spec.ts`
- Test: `src/app/xapian/index-worker-client.spec.ts`
- Test: `src/app/xapian/searchservice.spec.ts`

**Interfaces:**

- Produces: a fresh `Promise<void>` readiness contract for each first initialization.
- Produces: exactly one `workerIndexReady` or typed opening failure for every `openIndex` command.
- Consumes: `IndexSyncError` from Task 1.

- [ ] **Step 1: Write failing initialization tests**

Prove a no-index discovery result cannot satisfy fresh filesystem readiness. Cover outer IndexedDB
open failure, inner `FILE_DATA.get()` failure, IDBFS failure, missing index, corrupt Xapian open, and
successful open. Assert each worker command emits one terminal event and every
`openInitialWorkerIndex()` promise settles.

- [ ] **Step 2: Run the focused specs and prove red**

Run: `npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/initial-index-open.spec.ts --include=src/app/xapian/index-worker-client.spec.ts --include=src/app/xapian/searchservice.spec.ts`

Expected: FAIL because fresh initialization replays `false`, the inner request lacks `onerror`, and
some Xapian-open exceptions only update the legacy subject.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/app/xapian/initial-index-open.spec.ts src/app/xapian/index-worker-client.spec.ts \
  src/app/xapian/searchservice.spec.ts
git commit -m "test(index): specify index initialization settlement"
```

- [ ] **Step 4: Implement explicit readiness and terminal worker events**

Separate stored-index discovery from initialization readiness in `SearchService`. Make worker
opening await IndexedDB lookup, IDBFS population, main Xapian open, strict partition open, and
baseline load before emitting readiness. Route every error through a once-only terminal-event
function and remove legacy `initSubject` as an initial-operation error channel.

- [ ] **Step 5: Run the focused specs and prove green**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/app/xapian/initial-index-open.ts src/app/xapian/index.worker.ts \
  src/app/xapian/index-worker-client.ts src/app/xapian/searchservice.ts
git commit -m "fix(index): settle index initialization requests"
```

---

### Task 4: Transactional historical replacement

**Files:**

- Modify: `src/app/xapian/historical-partition-promotion.ts`
- Modify: `src/app/xapian/searchservice.ts`
- Test: `src/app/xapian/historical-partition-promotion.spec.ts`

**Interfaces:**

- Produces: `promoteHistoricalPartition()` dependencies `backupExisting`, `promote`, `persist`,
  `reopenWorker`, `openMainView`, `removeBackup`, and `restoreBackup`.
- Consumes: typed rollback failure from Task 1.

- [ ] **Step 1: Write failing promotion tests**

Test success ordering and failure at promote persistence, worker open, and main-view open. Assert an
existing partition is renamed to backup, retained until both views open, restored and persisted on
failure, and rollback failure is reported distinctly. Also test the no-existing-partition path.

- [ ] **Step 2: Run the focused spec and prove red**

Run: `npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/historical-partition-promotion.spec.ts`

Expected: FAIL because the current helper deletes the existing partition before promotion and has
no restore path.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/app/xapian/historical-partition-promotion.spec.ts
git commit -m "test(index): specify historical partition rollback"
```

- [ ] **Step 4: Implement backup, commit, and restore**

Use operation-specific `.backup-<operationId>` paths. Persist after backing up, after promotion, and
after either backup deletion or restoration. Do not remove the backup until both worker and main
views open. Preserve the original error as the cause when restoration itself fails.

- [ ] **Step 5: Run the focused spec and prove green**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/app/xapian/historical-partition-promotion.ts src/app/xapian/searchservice.ts
git commit -m "fix(index): restore failed historical replacements"
```

---

### Task 5: Failure-safe worker mutation queue

**Files:**

- Create: `src/app/xapian/index-mutation-queue.ts`
- Create: `src/app/xapian/index-mutation-queue.spec.ts`
- Modify: `src/app/xapian/index.worker.ts`

**Interfaces:**

- Produces: `IndexMutationQueue.enqueue(mutations, publishLegacy): Promise<void>` and
  `.whenIdle(): Promise<void>`.
- Constructor consumes async `commit`, `persist`, and `publishLegacy` functions.

- [ ] **Step 1: Write failing queue tests**

Test FIFO mutation ordering, waiting for active persistence, rejection of active and queued callers
when persistence fails, complete state reset after rejection, and successful processing of a later
independent batch. Assert a legacy publication occurs only for batches requesting it.

- [ ] **Step 2: Run the focused spec and prove red**

Run: `npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/index-mutation-queue.spec.ts`

Expected: compilation fails because `IndexMutationQueue` does not exist.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/app/xapian/index-mutation-queue.spec.ts
git commit -m "test(index): specify failure-safe mutation queuing"
```

- [ ] **Step 4: Implement and integrate the queue**

Move mutation sequencing, commit, and persistence ownership out of
`postMessagesToXapianWorker()`. Use one promise chain whose rejection handler rejects pending
callers, clears batch state, and restores an idle chain before accepting later work. Make
`prepareIndexReplacement()` await `.whenIdle()`.

- [ ] **Step 5: Run the focused and worker specs**

Run the command from Step 2, then run:
`npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/initial-index-worker-sync.spec.ts --include=src/app/xapian/index-batch-completion.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/app/xapian/index-mutation-queue.ts src/app/xapian/index.worker.ts
git commit -m "fix(index): recover the worker mutation queue"
```

---

### Task 6: Strict serialized publication

**Files:**

- Create: `src/app/xapian/index-publication-queue.ts`
- Create: `src/app/xapian/index-publication-queue.spec.ts`
- Modify: `src/app/xapian/published-index-view.ts`
- Modify: `src/app/xapian/searchservice.ts`
- Test: `src/app/xapian/published-index-view.spec.ts`
- Test: `src/app/xapian/searchservice.spec.ts`

**Interfaces:**

- Produces: `IndexPublicationQueue.publish(request: 'acknowledged' | 'legacy'): Promise<void>`.
- Constructor consumes one strict `rehydrate(): Promise<void>` operation.

- [ ] **Step 1: Write failing publication tests**

Assert a historical-open error triggers fallback and rejects acknowledged publication. Start an
acknowledged publication, inject multiple legacy events before it resolves, and prove there is no
concurrent close/populate/open and only one coalesced follow-up publication. Prove queue recovery
after rejection.

- [ ] **Step 2: Run the focused specs and prove red**

Run: `npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/index-publication-queue.spec.ts --include=src/app/xapian/published-index-view.spec.ts --include=src/app/xapian/searchservice.spec.ts`

Expected: FAIL because `openStoredPartitions()` swallows errors and legacy publication bypasses
acknowledged publication.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/app/xapian/index-publication-queue.spec.ts \
  src/app/xapian/published-index-view.spec.ts src/app/xapian/searchservice.spec.ts
git commit -m "test(index): specify serialized index publication"
```

- [ ] **Step 4: Implement strict publication**

Add a strict flag to `openStoredPartitions()` and use it for acknowledged publication. Route both
`indexUpdatedSubject` and initial chunk publication through one `IndexPublicationQueue`; coalesce
legacy requests while work is active and propagate acknowledged failures to the coordinator.

- [ ] **Step 5: Run the focused specs and prove green**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/app/xapian/index-publication-queue.ts src/app/xapian/published-index-view.ts \
  src/app/xapian/searchservice.ts
git commit -m "fix(index): serialize local index publication"
```

---

### Task 7: Consistent monotonic progress

**Files:**

- Modify: `src/app/xapian/searchservice.ts`
- Modify: `src/app/xapian/index-sync-coordinator.ts`
- Test: `src/app/xapian/searchservice.spec.ts`
- Test: `src/app/xapian/index-sync-coordinator.spec.ts`

**Interfaces:**

- Consumes: `NormalizedIndexManifest.totalUncompressedBytes` and typed retry attempts from Task 1.
- Produces: monotonic decoded-byte and message progress in `IndexSyncState`.

- [ ] **Step 1: Write failing progress tests**

Use different compressed and uncompressed sizes and assert `totalBytes` uses uncompressed bytes.
Fail a download after reporting progress, retry from zero, and assert published bytes and message
counters never decrease and end at the decoded body total.

- [ ] **Step 2: Run the focused specs and prove red**

Run: `npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/index-sync-coordinator.spec.ts --include=src/app/xapian/searchservice.spec.ts`

Expected: FAIL because the total uses compressed bytes and retries overwrite higher counters.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/app/xapian/index-sync-coordinator.spec.ts src/app/xapian/searchservice.spec.ts
git commit -m "test(index): specify monotonic synchronization progress"
```

- [ ] **Step 4: Implement one byte domain and high-water progress**

Set `totalBytes` from `totalUncompressedBytes`. Track committed offsets separately from
attempt-local HTTP progress, publish `Math.max(previous, offset + loaded)`, and restore only local
attempt bookkeeping after failure.

- [ ] **Step 5: Run the focused specs and prove green**

Run the command from Step 2. Expected: PASS.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/app/xapian/searchservice.ts src/app/xapian/index-sync-coordinator.ts
git commit -m "fix(index): keep synchronization progress monotonic"
```

---

### Task 8: Full verification and handoff

**Files:**

- Verify only: files changed by Tasks 0-7

**Interfaces:**

- Consumes: all contracts from Tasks 1-7.
- Verifies: the browser-independent orchestration contract from Task 0 and all focused contracts
  from Tasks 1-7.

- [ ] **Step 1: Run the orchestration spec**

Run: `npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/index-sync-orchestration.spec.ts`

Expected: PASS. If it fails, return to the owning task and begin a new red/green cycle with a focused
test before changing production code.

- [ ] **Step 2: Run focused Xapian tests**

Run: `npm test -- --watch=false --browsers=FirefoxHeadless --include=src/app/xapian/*.spec.ts`

Expected: PASS with no assertion failures.

- [ ] **Step 3: Run the mandatory full suite**

Run: `npm run ci-tests`

Expected: lint, policy, unit, e2e, and build all pass. If Firefox again fails only to capture or
disconnects without an assertion result, report it as an unresolved verification failure rather
than claiming success.

- [ ] **Step 4: Review branch history and complete diff**

Run `git log --oneline master..HEAD`, `git diff --check master...HEAD`, and
`git diff --stat master...HEAD`. Confirm every test commit precedes its implementation commit and
present the complete diff to the human partner. Do not open a PR.
