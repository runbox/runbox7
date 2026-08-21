# Incremental Index Synchronization Design

**Date:** 2026-08-21
**Issue:** [#1158 — Populate message list index incrementally](https://github.com/runbox/runbox7/issues/1158)
**Scope:** Runbox 7 frontend initial local-index synchronization
**Status:** Approved design

## Problem

When a user enables or refreshes the local index after receiving many messages, Runbox 7 can switch
from the database-backed message list to a local Xapian list before the latest database changes have
finished synchronizing. The recent messages users expect at the top of the list can therefore appear
late or discontinuously.

The current flow also starts worker synchronization without waiting for completion, discovers
historical partitions afterward, relies on implicit partition ordering, and lacks active unit tests
for the transition. These risks are documented in
`paad/architecture-reviews/2026-08-18-runbox7-architecture-report.md`.

## Goals

- Keep the database-backed list visible until a useful local-index list is ready.
- Download the newest server index partition before synchronizing database changes.
- Synchronize recent database messages from newest to oldest.
- Fetch 1,000 messages per HTTP request and publish visible progress in 100-message batches.
- Make progressively older server partitions available in reverse chronological order.
- Represent phase completion explicitly across the main thread and worker.
- Preserve a usable partial index when optional history is declined or a later phase fails.
- Make failures, cancellation, and progress observable and testable.
- Implement the improvement without changing backend APIs.

## Non-Goals

- Changing the server index generator or its partition size.
- Adding snapshot tokens, cursor pagination, or new backend endpoints.
- Refactoring all responsibilities out of `SearchService`.
- Removing the existing `SearchService` and `MessageListService` dependency cycle.
- Changing search semantics, message sort preferences, or Xapian document structure.
- Guaranteeing transactional snapshot consistency that the current backend contract cannot provide.
- Including backend verification-stat logging in the #1158 contribution.

## Existing Partition Semantics

Partition `0` is the newest server-generated partition and is the writable main Xapian database.
When it fills, the server indexer renumbers prior partitions upward, moves the previous main
partition to partition `1`, and creates a new partition `0` for recent messages. Partition numbers
therefore increase toward older history:

```text
0  newest server-indexed messages
1  next newest
2  older
N  oldest
```

The frontend currently downloads partition `0` through the main-index endpoint, excludes it from
the additional partition list, and downloads the remaining array sequentially. The new flow makes
this ordering explicit by parsing, validating, and sorting partition numbers.

## Chosen Architecture

`SearchService` owns one explicit initial-synchronization operation. `AppComponent` starts or
cancels the operation and renders its state, but does not coordinate nested phases or directly
mutate synchronization flags.

### SearchService

- Create a unique operation ID.
- Fetch, validate, normalize, and total the partition manifest.
- Download partition `0` through the existing main-index endpoint.
- Open the writable main index in the worker.
- Request recent-message catch-up and wait for worker acknowledgements.
- Publish the local-list cutover only after a durable worker acknowledgement.
- Download historical partitions `1` through `N` in numerical order.
- Request final reconciliation and wait for completion.
- Publish a single synchronization-state stream to the UI.

### Index Worker

- Open partition `0` and acknowledge readiness after IDBFS and Xapian initialization.
- Fetch recent database messages in 1,000-message pages.
- Normalize each page to descending message ID.
- Divide each page into ordered 100-message publication batches.
- Mutate, commit, and persist each batch before acknowledging it.
- Keep the initial catch-up watermark provisional until final reconciliation succeeds.
- Emit typed success, failure, cancellation, and progress events.
- Resume normal periodic synchronization only after initial synchronization completes.

### AppComponent

- Continue displaying the database-backed message list until cutover.
- Switch once after the first committed recent batch, or after an empty catch-up completes.
- Redraw after later batches without resetting scroll position.
- Render phase, progress, retry, and cancellation state.
- Avoid direct worker messaging for initial synchronization.

## Synchronization State

The public operation has these phases:

```text
discovering
downloading-main
opening-worker
catching-up-recent
local-index-ready
downloading-history
final-reconciliation
complete
failed
cancelled
```

Its state contains:

```text
operationId
phase
fetchedMessages
committedMessages
currentPage
currentPartition
totalPartitions
downloadedBytes
totalBytes
error
```

State describes user-relevant progress and does not expose raw Worker, IDBFS, or Xapian objects.

## Worker Protocol

Commands and events are typed discriminated unions. Every initial-synchronization message carries
the operation ID.

Minimum commands:

```text
openIndex
catchUpRecent
cancelInitialSync
startPeriodicSync
```

Minimum events:

```text
workerIndexReady
recentChunkCommitted
recentCatchUpComplete
recentCatchUpFailed
initialSyncCancelled
```

A delayed event whose operation ID does not match the active operation is ignored.

`recentChunkCommitted` contains page number, batch number, committed batch size, and cumulative
committed count. It is emitted only after the Xapian commit and IDBFS persistence succeed.

## Data Flow

### 1. Discover and normalize the manifest

Fetch `/rest/v1/searchindex/partitions` before downloading index files. Reject missing partition
`0`, duplicate partition numbers, unrecognized partition names, or missing file metadata. Do not
convert transport or validation failures into an empty manifest.

Sort partitions numerically and calculate total compressed bytes, uncompressed bytes, and message
count. The manifest supplies progress totals, not a transactional database boundary.

### 2. Download partition 0

Download the four existing main-index files in their required order. Keep the database-backed list
visible. Partial main-index files are not treated as a usable index.

### 3. Open the worker

Persist the downloaded main index, request worker initialization, and wait for
`workerIndexReady`. Worker readiness means IDBFS synchronization and writable Xapian initialization
have completed successfully.

### 4. Capture the catch-up baseline

Capture one `indexLastUpdateTime` from partition `0` using the existing conservative date-overlap
behavior. Keep this baseline fixed for the first pass and final reconciliation. Do not persist a
new watermark after an individual page or publication batch.

### 5. Fetch and publish recent messages

Request pages from `/mail/download_xapian_index?listallmessages=1` with:

```text
page size: 1,000
changed-date boundary: fixed catch-up baseline
content: skipped
page order: 0, 1, 2, ...
```

Normalize each response to descending message ID. Process all 100-message batches from page `N`
before requesting page `N+1`. A full page produces ten publications; a 250-message page produces
publications of 100, 100, and 50. A response shorter than 1,000 ends the pass.

### 6. Cut over the visible list

Keep the database-backed list visible until either:

- The first `recentChunkCommitted` event arrives; or
- `recentCatchUpComplete` reports that there were no recent messages.

Synchronize and reload the main-thread read-only Xapian view before cutover. Switch once. Later
batch acknowledgements reload and redraw without scrolling to the top.

The visible list uses the existing global Xapian sort. With Date descending, messages appear in
their correct visible chronological positions even when header date and message ID differ.

### 7. Download historical partitions

After recent catch-up, download partitions `1` through `N` in ascending partition number. Each
partition becomes visible only after its complete file set has arrived and the partition opens
successfully. Reload after each completed partition so progressively older history becomes
available.

Preserve the current user choice about downloading optional historical data. Declining additional
history retains partition `0` and recent database synchronization; it does not cancel local index
use.

### 8. Reconcile and finalize

Repeat catch-up from the original baseline after historical downloads finish or are declined.
Stable Xapian message-ID terms make overlapping results idempotent. This second pass reduces drift
from offset pagination while messages arrive or are deleted during the first pass.

After reconciliation succeeds, persist the greatest validated changed-date watermark and start the
normal periodic update loop.

## Consistency Model

The backend exposes offset pages rather than a snapshot token or stable cursor. A frontend-only
implementation therefore cannot promise a transactional snapshot across index generation,
database catch-up, and historical downloads.

The design provides:

- A fixed baseline across both catch-up passes.
- Ordered sequential page processing.
- Idempotent message updates keyed by stable message ID terms.
- A complete final reconciliation pass.
- Existing ongoing verification and periodic synchronization.

This provides eventual convergence without claiming a stronger guarantee than the existing API can
support.

## Error Handling

Every failure records:

```text
operationId
phase
page or partition when applicable
attempt
error category
recoverable
```

Logs and state must not contain subjects, addresses, message bodies, or other message content.

### Before cutover

Manifest, main download, worker opening, or first catch-up failure leaves the database-backed list
visible. Discard partial files and offer retry or cancellation.

### Recent catch-up after cutover

Keep the last successfully committed local index visible. Retry from the fixed baseline. Do not
advance the watermark or report completion.

### Historical partition failure

Keep partition `0`, recent messages, and previously completed historical partitions available.
Retry the failed partition rather than restarting the operation.

Download files into an operation-specific temporary directory. Promote the directory to its final
partition name only after every file arrives and the partition opens successfully.

### Final reconciliation failure

Keep the usable partial index, mark synchronization incomplete, and retry reconciliation. Do not
finalize the watermark.

### Query failure

Do not silently swallow a local-index query exception. Publish the failure and return the UI to the
database-backed message list. Index recovery or deletion follows the synchronization error policy.

Interactive retries are bounded. The existing periodic ten-second retry applies only after initial
synchronization completes.

## Cancellation

- Overall initial-sync cancellation preserves existing behavior: complete or roll back the current
  atomic operation, delete the newly created local index, and keep the database-backed list.
- Declining optional historical download retains the usable recent local index.
- The worker checks cancellation between 100-message batches.
- The current batch finishes and persists before `initialSyncCancelled` is emitted.
- Cancellation invalidates the operation ID so delayed events cannot advance state.
- In-flight partition requests are unsubscribed or aborted.
- Operation-specific temporary files are removed.

## Testing Strategy

Tests must run without a real browser Worker, Xapian WASM, or IndexedDB. Provide a fake worker
transport to `SearchService` and isolate worker page/batch orchestration behind replaceable fetch,
commit, persist, and event functions.

### Manifest tests

- Fetch the manifest before main-index files.
- Require partition `0`.
- Normalize shuffled entries to `0, 1, 2, ... N`.
- Reject missing, duplicate, or malformed partition numbers.
- Calculate message and byte totals.

### Pagination and publication tests

- Split 1,000 messages into ten 100-message commits.
- Split 250 messages into 100, 100, and 50.
- Finish on an empty or short page.
- Do not request the next page before all current-page batches commit.
- Normalize each page to descending message ID.

### Cutover tests

- Keep database results active before the first acknowledgement.
- Cut over exactly once after the first committed batch.
- Redraw later batches without scrolling.
- Cut over after an empty catch-up completes.

### Watermark and reconciliation tests

- Do not advance the persisted watermark during the first pass.
- Reconcile from the original baseline.
- Reprocess overlapping messages without duplicates.
- Advance the watermark only after successful reconciliation.

### Failure and cancellation tests

- Do not convert HTTP failure into an empty successful page.
- Ignore events from stale operation IDs.
- Cancel between 100-message batches.
- Never promote a partial historical partition.
- Retain recent synchronization when optional history is declined.
- Return to the database list after a local-index query failure.

### Integration test

Using HTTP mocks and the fake worker, verify:

```text
manifest
→ main download
→ worker ready
→ first 100 committed
→ UI cutover
→ remaining recent batches
→ historical partitions
→ final reconciliation
→ complete
```

Run the full required suite with `npm run ci-tests` before proposing a PR.

## Anticipated Files

- `src/app/xapian/searchservice.ts` — operation orchestration and public state.
- `src/app/xapian/index.worker.ts` — page and publication processing.
- `src/app/xapian/messageactions.ts` or a focused protocol module — typed commands and events.
- `src/app/app.component.ts` — start/cancel actions and one-time cutover rendering.
- `src/app/app.component.html` — phase-aware progress if existing bindings are insufficient.
- Unit specs for the manifest, worker batching, state transitions, and UI integration.

The implementation plan may introduce a small worker-safe orchestration module when needed for
deterministic unit tests. It must not introduce another Angular coordinator service.

## Contribution and Branch Requirements

Commits `6ae86dd4` and `2b8b2809` must not appear in the final #1158 contribution. They are outside
the approved narrow frontend design, and their commit headers also fail the current no-trailing-dot
rule. A later implementation plan must obtain explicit human approval to rebuild the feature branch
from current `master` or rewrite it to drop those commits. Adding revert commits would leave the
out-of-scope, nonconforming commits in PR history and is therefore not the intended final history.

Do not include verification-stat logging in the #1158 contribution. Do not rewrite or rebase branch
history without explicit human approval at that stage.

Tests must be in their own cherry-pickable commit before implementation commits and must fail on the
corresponding pre-implementation checkout. Commit headers require a scope, imperative present-tense
subject, no trailing period, and lines no longer than 100 characters.

Before any PR is opened:

- Search open and closed PRs for duplicate work again.
- Run `npm run ci-tests`.
- Present the complete diff to the human partner for explicit approval.
- Include the required AI-use disclosure in the PR description.
- Let the human partner open the PR.

## Acceptance Criteria

- Partition discovery occurs before index-file downloads.
- Partition `0` downloads before recent database catch-up.
- The database-backed list remains visible until a durable recent batch or empty completion.
- HTTP pages contain at most 1,000 messages.
- Visible publications contain at most 100 messages.
- Pages and partitions are processed from newest to oldest.
- The UI redraws after each durable publication without changing scroll position.
- The watermark advances only after final reconciliation.
- Optional-history decline retains a usable recent local index.
- Failures and cancellation cannot be mistaken for successful completion.
- Stale worker events cannot advance a newer operation.
- All new behavior has active red/green unit coverage.
- The full project test suite passes before PR review.
