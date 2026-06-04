# Architecture Report — runbox7

**Date:** 2026-06-03
**Commit:** 1b33a6448eb3d12328b3dcdcd9e3cdf13022dc00
**Languages:** TypeScript / Angular 16 (RxJS, Dexie/IndexedDB, web workers, Angular Material)
**Key directories:** `src/app/rmmapi/`, `src/app/rmm/`, `src/app/common/`, `src/app/xapian/`, `src/app/canvastable/`, feature areas (`calendar-app/`, `contacts-app/`, `compose/`, `mailviewer/`, `account-app/`, `account-security/`, `domainregister/`, `dkim/`, `start/`)
**Scope:** Full repository (`runbox7` application project; the `rmm6` library shares `src/`). Frontend only — the Perl/MySQL backend lives in another repo and was treated as an external boundary.

## Repo Overview

Runbox 7 is the browser single-page webmail client for Runbox. It is an Angular 16 workspace (~244 non-spec TS files under `src/app`, ~35 spec files) built on NgModules (not standalone components), RxJS, Dexie for IndexedDB persistence, a Xapian-based local search index running in web workers, and a custom canvas-rendered message table.

All backend access is funnelled through two coexisting facades: `RunboxWebmailAPI` (`rmmapi/rbwebmail.ts`, a ~999-line injectable hitting `/rest/...`) and `RMM` (`rmm.ts`, wrapping ~17 domain classes that hit `/rest` and legacy `/ajax` endpoints). The app is mature and actively maintained — several of the largest files show recent intentional refactoring (e.g. the calendar timezone work in recent commits). The strongest engineering is concentrated in the data/resilience layer (multi-tier message cache, offline detection) and the security-sensitive mail renderer (DOMPurify sanitization). The principal architectural debt is concentrated in three hubs — `rbwebmail.ts`, `app.component.ts`, and the `RMM` facade/model graph — plus a thin automated-test safety net over security-critical paths.

Analysis: 5 specialists → 52 raw findings → verified, deduplicated, and corrected to **13 strengths + 39 flaws** (3 of which are outright bugs, not smells).

## Strengths

### [S-1] Email HTML sanitized before trust bypass
- **Category:** S10 (Security built-in)
- **Impact:** High
- **Explanation:** The highest-risk surface in the app — rendering untrusted email HTML — is handled correctly: content is run through DOMPurify *before* Angular's trust bypass, and a hook hardens links.
- **Evidence:** `src/app/mailviewer/singlemailviewer.component.ts:576-577` `bypassSecurityTrustHtml(DOMPurify.sanitize(...))`; `afterSanitizeAttributes` hook at `:146-164` forces `target="_blank"` + `rel="noopener"`.
- **Found by:** Security & Code Quality

### [S-2] Multi-tier read cache with in-flight dedupe and offline degrade
- **Category:** S12 (Resilience patterns)
- **Impact:** High
- **Explanation:** The message read path is genuinely resilient: LRU in-memory → Dexie/IndexedDB (versioned) → network, with in-flight request deduplication and graceful offline read mode.
- **Evidence:** `src/app/rmmapi/messagecache.ts`, `lru-message-cache.ts`, `rbwebmail.ts:216-337`; 16 `rmm/*` models consistently `.pipe(timeout(60000), share())`.
- **Found by:** Integration & Data

### [S-3] No committed secrets; runtime key injection
- **Category:** S10 (Security built-in)
- **Impact:** High
- **Explanation:** No API keys, tokens, or credentials are committed. The config-bearing `env.ts` is gitignored, and the Stripe publishable key, 2FA secrets, and Stripe client secrets are all fetched from the backend at runtime.
- **Evidence:** `.gitignore:53` excludes `src/environments/env.ts`; `rbwebmail.ts:823` `getStripePubkey()`; grep for `pk_live|sk_|AIza|PRIVATE KEY` returns only runtime-fetched / form-bound values.
- **Found by:** Security & Code Quality

### [S-4] Central HTTP interceptor for offline / auth / progress
- **Category:** S7 (Robust error handling)
- **Impact:** Medium
- **Explanation:** A single interceptor maps 502/504 → offline mode, 403 → account re-check, and drives the global progress bar via `finalize` — one chokepoint for cross-cutting transport concerns.
- **Evidence:** `src/app/rmmapi/rmmhttpinterceptor.service.ts:84-108`.
- **Found by:** Error Handling & Observability

### [S-5] Centralized, translated backend-error surfacing
- **Category:** S7 (Robust error handling) / S6 (Consistent API contracts, partial)
- **Impact:** Medium
- **Explanation:** Folder/profile mutations route through one helper that translates backend error keys via i18n and shows a snackbar with a safe default — one place for user-facing error reporting (used in ~48 files).
- **Evidence:** `src/app/rmmapi/rbwebmail.ts:426-443` (`showBackendErrors` / `subscribeShowBackendErrors`).
- **Found by:** Error Handling & Observability, Integration & Data

### [S-6] Sentry ErrorHandler with deferred init and user context
- **Category:** S8 (Observability present)
- **Impact:** Medium
- **Explanation:** Sentry is registered as the Angular `ErrorHandler` across four modules, attaches uid/username/email, and carefully defers instantiation until login to avoid bootstrap-ordering crashes. (See F-22 — this is the *only* Sentry usage.)
- **Evidence:** `src/app/sentry-error-handler.ts:48,57-59`; DSN build-injected via `src/build/gen-env.js`.
- **Found by:** Error Handling & Observability

### [S-7] Auth guard fails closed across lazy modules
- **Category:** S10 (Security built-in)
- **Impact:** Medium
- **Explanation:** `canActivateChild` is applied at the root children array, so lazy feature modules inherit the guard; it redirects to `/login` on non-success while revalidating in the background.
- **Evidence:** `src/app/app.module.ts:99` `canActivateChild: [RMMAuthGuardService]`; `rmmauthguard.service.ts:100-120`.
- **Found by:** Security & Code Quality

### [S-8] 2FA verification is server-authoritative
- **Category:** S10 (Security built-in)
- **Impact:** Medium
- **Explanation:** TOTP checks and enablement are validated server-side; `otpauth` is used client-side only to render the provisioning QR. Passwords are held transiently, never persisted.
- **Evidence:** `src/app/rmm/account-security-2fa.ts:119-135`; `account-security/two-factor-authentication.component.ts:199-227`.
- **Found by:** Security & Code Quality

### [S-9] `common/util.ts` is focused, not a dumping ground
- **Category:** S14 (Simple, pragmatic abstractions) — counters Flaw 29
- **Impact:** Medium
- **Explanation:** Despite the classic "util" name, it contains only three tightly-related object-equality helpers with docs and a spec — no grab-bag accretion.
- **Evidence:** `src/app/common/util.ts:32-89` (`objectEqual`, `withKeys`, `objectEqualWithKeys`).
- **Found by:** Structure & Boundaries

### [S-10] Dependency-light, behavior-rich core value objects
- **Category:** S13 (Domain modeling strength) / S3 (Loose coupling)
- **Impact:** Medium
- **Explanation:** The most widely shared models are clean POJOs with little feature coupling, and `MailAddressInfo` is a genuine value object owning an RFC-style address-list parser.
- **Evidence:** `src/app/common/mailaddressinfo.ts:20-80` (`static parse`); `messageinfo.ts`, `folderlistentry.ts` import almost nothing feature-specific.
- **Found by:** Structure & Boundaries, Coupling & Dependencies

### [S-11] `DraftFormModel` co-locates reply/forward logic with data
- **Category:** S13 (Domain modeling) / S2 (High cohesion)
- **Impact:** Medium
- **Explanation:** Draft construction is encapsulated in named factories rather than scattered across components. (Caveat: the model lives inside a service file — see F-7.)
- **Evidence:** `src/app/compose/draftdesk.service.ts:70,90,161,169` (`create`/`reply`/`forward`/`trimmedPreview`).
- **Found by:** Structure & Boundaries

### [S-12] UID-namespaced storage with one owning service per key
- **Category:** S1 (Clear modular boundaries) / S2 (High cohesion) — counters Flaw 17/18
- **Impact:** Medium
- **Explanation:** `StorageService` namespaces every key by uid and exposes per-key subjects; each domain cache (`contactsCache`, `caldavCache`, `shoppingCart`, `saved-searches`, `webmailSettings`) has exactly one writer — the correct SPA analogue of clear data ownership.
- **Evidence:** `src/app/storage.service.ts:38-67` (`${uid}:${key}`).
- **Found by:** Integration & Data

### [S-13] Circular dependencies are measured and explained, not pervasive
- **Category:** S5 (Dependency management hygiene)
- **Impact:** Medium
- **Explanation:** `madge` confirms exactly 29 cycles; 16 stem from a single deliberate pattern (RMM facade ↔ models) and the worst service cycle is documented in-code with its reason. The cycles cluster in known hotspots rather than scattering.
- **Evidence:** `madge --circular`; `src/app/rmmapi/messagelist.service.ts:72-74` in-code explanation.
- **Found by:** Coupling & Dependencies

## Flaws/Risks

### [F-1] `RunboxWebmailAPI` god object
- **Category:** 2 (God object) — also 4 (inverted dependency)
- **Impact:** High
- **Explanation:** One ~999-line injectable is the backend gateway for nearly every unrelated domain — messages, folders, contacts, calendars, Stripe/PayPal/Bitpay payments, preferences, saved searches, profiles, DKIM domains — and it imports concrete leaf models, inverting the desired dependency direction.
- **Evidence:** `src/app/rmmapi/rbwebmail.ts` ~80 public methods (`getCalendars():735`, `addNewContact():698`, `getAvailableProducts():805`, `saveDraft():641`, `getUserDomains():984`); leaf imports at `:27-42`; fan-in 44 non-spec files.
- **Found by:** Structure & Boundaries, Coupling & Dependencies (agreed)

### [F-2] `AppComponent` god component (26 injected deps)
- **Category:** 2 (God object) / 11 (Low cohesion) / 23 (DI misuse)
- **Impact:** High
- **Explanation:** A 1465-line component injects 26 services and mixes folder CRUD, message ops, search, compose launching, canvas column-layout math, notifications, and routing in one class.
- **Evidence:** `src/app/app.component.ts:168-194` (26 injections); methods `createFolder`, `deleteMessages`, `trainSpam`, `autoAdjustColumnWidths`, `horizScroll`, `subscribeToNotifications`.
- **Found by:** Structure & Boundaries, Coupling & Dependencies (agreed)

### [F-3] Two parallel, overlapping backend-access facades
- **Category:** 13 (Inconsistent boundaries)
- **Impact:** High
- **Explanation:** `RunboxWebmailAPI` and the `RMM` facade coexist with no rule for which to use; both are injected into `AppComponent`. `Alias` is defined twice, in each stack, with different shapes.
- **Evidence:** `src/app/rmm.ts:38` (`class RMM`) vs `rmmapi/rbwebmail.ts`; `Alias` at `rbwebmail.ts:56` and `rmm/alias.ts:23`.
- **Found by:** Structure & Boundaries

### [F-11] Mail send has no idempotency key
- **Category:** 19 (Lack of idempotency)
- **Impact:** High
- **Explanation:** The send call carries no server-coordinated idempotency token; the only protection against double-send is a client-side boolean that the error path resets — so a network timeout where the backend actually sent the message lets a user retry into a duplicate send.
- **Evidence:** `src/app/rmmapi/rbwebmail.ts:641-690` (`saveDraft`, send=true, no nonce); `compose/compose.component.ts:692-696,795` (`savingInProgress` reset on error). Zero `idempotency` references in `src`.
- **Found by:** Integration & Data

### [F-22] Sentry is error-only; no business-logic observability
- **Category:** 21 (No observability plan)
- **Impact:** High
- **Explanation:** Sentry is wired solely as the crash `ErrorHandler`; there are no `captureMessage`/`captureException`/breadcrumb/span/metric calls anywhere in business logic, and console-capture is commented out. Crashes are reported; nothing else (send, move, index, payment) is observable.
- **Evidence:** `src/app/sentry-error-handler.ts:59`; `sentry.ts:26` (`captureConsoleIntegration` commented out); zero manual instrumentation in `src/app`.
- **Found by:** Error Handling & Observability

### [F-37] Security-critical code paths are untested
- **Category:** 32 (Missing test coverage for critical paths)
- **Impact:** High
- **Explanation:** No unit specs exist for the auth guard, HTTP interceptor, 2FA, login/logout, or Stripe payment dialog; `account-security/` has zero specs. Overall 35 specs cover 244 source files.
- **Evidence:** No sibling `.spec.ts` for `rmmapi/rmmauthguard.service.ts`, `rmmhttpinterceptor.service.ts`, `account-security/two-factor-authentication.component.ts`, `rmm/account-security-2fa.ts`, `login/login.component.ts`, `account-app/stripe-payment-dialog.component.ts`.
- **Found by:** Security & Code Quality

### [F-38] Top XSS surface has no regression test
- **Category:** 32 (Missing test coverage for critical paths)
- **Impact:** High
- **Explanation:** The mail renderer's sanitization (S-1) is correct today but nothing guards it: the spec exercises only the mailto interceptor, with no assertion that `<script>`, `onerror=`, or `javascript:` URIs are stripped or that the DOMPurify→bypass ordering holds.
- **Evidence:** `src/app/mailviewer/singlemailviewer.component.spec.ts` (461 LOC) — covers 'create', 'show mail', mailto only; no sanitize/XSS assertions.
- **Found by:** Security & Code Quality

### [F-4] RMM facade ↔ models cyclic construction
- **Category:** 5 (Circular dependencies)
- **Impact:** Medium
- **Explanation:** The facade builds each model with `new Model(this)` while every model imports `RMM` and stores `public app: RMM`, producing 16 of the 29 detected cycles; `AccountSecurity` repeats the pattern one level deeper across 7 sub-objects.
- **Evidence:** `src/app/rmm.ts:52-60`; `rmm/account-security.ts:33` (`public app: RMM`).
- **Found by:** Coupling & Dependencies

### [F-5] Anemic models reaching through the facade (feature envy)
- **Category:** 10 (Feature envy / anemic domain) / 6 (Leaky abstraction)
- **Impact:** Medium
- **Explanation:** `rmm/*` "models" hold no real state; they reach `this.app.ua.http` for HTTP and `this.app.show_error(...)` for UI snackbars — thin RPC wrappers entangled with both the parent facade and the UI layer. (Note: the cross-cutting `app.ua.http` reach occurs at **44** sites, correcting an earlier 136 estimate.)
- **Evidence:** `src/app/rmm/email.ts:29`, `rmm/alias.ts:33,41`, `rmm/account-security*.ts`.
- **Found by:** Structure & Boundaries, Coupling & Dependencies (agreed)

### [F-6] DI-defeating cycle worked around by manual external init
- **Category:** 5 (Circular dependencies) / 27 (Temporal coupling)
- **Impact:** Medium
- **Explanation:** `MessageListService` and `SearchService` mutually import; the cycle defeats DI, so the list service exposes an `AsyncSubject<SearchService>` that the search service populates from its own constructor — consumers must wait until that constructor runs.
- **Evidence:** `src/app/rmmapi/messagelist.service.ts:72-74` (in-code comment); `xapian/searchservice.ts:195-196` (`...searchservice.next(this)`).
- **Found by:** Coupling & Dependencies

### [F-7] Data models embedded inside service files
- **Category:** 5 (Circular dependencies) / 13 (Inconsistent boundaries)
- **Impact:** Medium
- **Explanation:** `DraftFormModel` (data) lives in `draftdesk.service.ts` alongside `DraftDeskService`, so importing the model drags in the service and creates a hub↔feature cycle. Same model+service mixing in `profile.service.ts` and `dkim/domain.service.ts`.
- **Evidence:** `src/app/compose/draftdesk.service.ts:46` (model) + `:236` (service); imported by `rbwebmail.ts:31`.
- **Found by:** Coupling & Dependencies

### [F-8] `Identity` defined twice and drifted (latent bug)
- **Category:** 9 (Shotgun surgery) / 13 (Inconsistent boundaries)
- **Impact:** Medium
- **Explanation:** Two `Identity` classes exist with near-identical fields that have drifted — one has `is_signature_html`, the other the typo `is_sigature_html` — and different modules import different copies.
- **Evidence:** `src/app/profiles/profile.service.ts:29` (`is_signature_html`) vs `rmm/profile.ts:28` (`is_sigature_html`); `rmm.ts:32` re-exports the latter.
- **Found by:** Structure & Boundaries

### [F-9] Untyped responses with three competing envelope conventions
- **Category:** 24 (Inconsistent API contracts)
- **Impact:** Medium
- **Explanation:** Every response is parsed as `any` into magic shapes; three success conventions coexist (`res['result']`, `res['results']`, `{status:'success'|'warning'|'error'}`), and a field typed as the literal `'success'` is assigned `'warning'` at runtime.
- **Evidence:** `src/app/rmmapi/rbwebmail.ts` (`res['result']` ~42×); `MessageContents.status` typed `'success'` at `:144`, assigned `'warning'` at `:254`.
- **Found by:** Integration & Data

### [F-10] Positional delimited-text parsing, duplicated across the worker
- **Category:** 24 (Inconsistent API contracts)
- **Impact:** Medium
- **Explanation:** The core message-list and send flows bypass JSON: `listAllMessages` splits text into 13 positional columns with a `size === -1` "deleted" sentinel, and `saveDraft` parses a pipe-delimited string. The list parser is copy-pasted into the Xapian web worker, so a backend column change must be fixed in two places.
- **Evidence:** `src/app/rmmapi/rbwebmail.ts:355-418` (`parts[0..12]`, `:408`); FIXME at `:353` "duplicated in restapi_standalone ... make there be no duplicates!".
- **Found by:** Integration & Data

### [F-12] Stripe pay/confirm not idempotent
- **Category:** 19 (Lack of idempotency)
- **Impact:** Medium
- **Explanation:** Payment and confirm POSTs are keyed only by `tid`/`confirmation_id` with no `Idempotency-Key` header; UI double-submit is well-guarded, so residual risk is a timeout-after-charge retry that relies entirely on backend dedupe.
- **Evidence:** `src/app/rmmapi/rbwebmail.ts:851-873`; `account-app/stripe-payment-dialog.component.ts:182-237`.
- **Found by:** Integration & Data

### [F-13] Optimistic local mutation with no rollback
- **Category:** 26 (Poor transactional boundaries)
- **Impact:** Medium
- **Explanation:** Several operations mutate local caches/counts and "lie" to the UI before firing the backend call, with no compensating path if the call fails — state stays diverged until a full refresh happens to correct it.
- **Evidence:** `src/app/rmmapi/messagelist.service.ts:292-402`; `:298` comment "Just lie a bit, we'll fix it in a mo..".
- **Found by:** Integration & Data

### [F-14] Two authorities for `folderCounts`
- **Category:** 17 (No clear ownership of data)
- **Impact:** Medium
- **Explanation:** Folder counts are written both by the optimistic mutators and recomputed wholesale from the Xapian worker, reconciled by ad-hoc "whoever ran last" heuristics; in-code comments show the author is unsure which path owns the truth.
- **Evidence:** `src/app/rmmapi/messagelist.service.ts:295` (mutate) vs `:143-183` (`refreshFolderCounts` recompute).
- **Found by:** Integration & Data

### [F-15] No write/outbox queue — offline degrades reads only
- **Category:** 16 (Synchronous-only integration)
- **Impact:** Medium
- **Explanation:** All mutations are direct request/response with no command queue; offline handling flips a read-side flag but never queues writes for replay, so offline writes fail and silently diverge from the optimistic local state.
- **Evidence:** `src/app/rmmapi/rmmoffline.service.ts:32-43`; interceptor sets offline on 502/504 and re-throws (`rmmhttpinterceptor.service.ts:88-92`).
- **Found by:** Integration & Data

### [F-16] Copy-paste bug: preference migration stores wrong value (bug)
- **Category:** 12 (Hidden side effects)
- **Impact:** Medium
- **Explanation:** A "load"-named migration writes `htmlDecision` into the `resizerPercentage` preference key — a latent data-corruption bug in a method that advertises only reading.
- **Evidence:** `src/app/common/preferences.service.ts:293-294`.
- **Found by:** Error Handling & Observability

### [F-17] `loadOldStyle` has large destructive side effects + asymmetric guard
- **Category:** 12 (Hidden side effects)
- **Impact:** Medium
- **Explanation:** Named "load," it removes ~18 localStorage keys and emits onto a subject; the `loadedOldStyle` idempotency guard is set only in one branch, so behavior depends on which preference group ran first.
- **Evidence:** `src/app/common/preferences.service.ts:218-322` (`removeItem` `:304-320`; guard `:301`).
- **Found by:** Error Handling & Observability

### [F-18] Empty catch swallows search-render failures
- **Category:** 20 (Weak error handling)
- **Impact:** Medium
- **Explanation:** The entire search-result rendering block is wrapped in `catch (e) {}` — no log, no Sentry, no user feedback; a broken render is invisible.
- **Evidence:** `src/app/app.component.ts:1370`.
- **Found by:** Error Handling & Observability

### [F-19] Index-fetch failure masked as "no partitions"
- **Category:** 20 (Weak error handling)
- **Impact:** Medium
- **Explanation:** A failed search-index partition request is converted to an empty map with no logging, making a genuine backend/network failure indistinguishable from an empty index and silently degrading local search.
- **Evidence:** `src/app/xapian/searchservice.ts:697` `catchError(() => of(new DownloadableSearchIndexMap()))`.
- **Found by:** Error Handling & Observability

### [F-20] Centralized error helper ignores transport errors
- **Category:** 20 (Weak error handling)
- **Impact:** Medium
- **Explanation:** `subscribeShowBackendErrors` subscribes with no error callback and only reacts to body `status`, so a timeout / 500-with-non-JSON / dropped connection on folder create/move/delete surfaces nothing to the user.
- **Evidence:** `src/app/rmmapi/rbwebmail.ts:420-424`.
- **Found by:** Error Handling & Observability

### [F-21] `is_offline` setter opens a snackbar as a side effect
- **Category:** 12 (Hidden side effects)
- **Impact:** Low
- **Explanation:** Assigning the boolean `is_offline` opens a Material snackbar, driven from inside the HTTP interceptor — couples transport state to presentation in a surprising place.
- **Evidence:** `src/app/rmmapi/rmmoffline.service.ts:32-43`.
- **Found by:** Error Handling & Observability

### [F-23] `console.*` is the de-facto logging strategy; inconsistent idioms
- **Category:** 34 (Inconsistent error/logging conventions) / 21 (No observability plan)
- **Impact:** Medium
- **Explanation:** 314 ungated `console.*` calls ship to production consoles (none gated by `environment.production`), and error idioms vary widely (log vs error vs rethrow-string vs snackbar) with no shared taxonomy.
- **Evidence:** 314 `console.*` in non-spec `src/app`; differing idioms across `rmmhttpinterceptor.service.ts:85-96`, `rbwebmail.ts:294`, `singlemailviewer.component.ts:474`.
- **Found by:** Error Handling & Observability

### [F-24] Interceptor logs failure on the success path; shared mutable counter
- **Category:** 21 (No observability plan)
- **Impact:** Low
- **Explanation:** The account-status check logs "Some query has failed" inside the success handler before checking status and has no error callback, and `httpRequestCount` is an unguarded shared mutable counter.
- **Evidence:** `src/app/rmmapi/rmmhttpinterceptor.service.ts:42-49` (`httpRequestCount` `:31`).
- **Found by:** Error Handling & Observability

### [F-25] Hardcoded external URLs in components; empty environments
- **Category:** 22 (Configuration sprawl)
- **Impact:** Medium
- **Explanation:** Third-party/backend endpoints are scattered string literals in UI components rather than centralized config, and the environment files are nearly empty (only `production` + build timestamp + Sentry DSN).
- **Evidence:** `singlemailviewer.component.ts:741,744,761` (pgpapp.no); `onscreen.component.ts:87` (video.runbox.com); `contacts.service.ts:353` (gravatar); Stripe JS in two dialogs; `src/environments/environment.ts`.
- **Found by:** Error Handling & Observability

### [F-26] Domain-registration business rules live in a 1763-LOC component
- **Category:** 25 (Business logic in the UI)
- **Impact:** Medium
- **Explanation:** Domain/SLD/TLD validation regexes, TLD validity, agreement/document validation, and CLDR postal data all sit in a UI component with no service/domain layer.
- **Evidence:** `src/app/domainregister/domainregister.component.ts:140-142,187,488,520,968`.
- **Found by:** Error Handling & Observability

### [F-27] Magic folder names and HTTP status codes scattered
- **Category:** 28 (Magic numbers/strings)
- **Impact:** Medium
- **Explanation:** Folder identity is compared against inline string literals across search/index logic, and HTTP status codes appear as inline magic numbers across many components rather than named constants.
- **Evidence:** `'Inbox'/'Sent'/'Drafts'/'Trash'/'Spam'` in `xapian/index.worker.ts:726,908`, `searchservice.ts:653`, `messagelist.ts:94`; status `403/500/502/504/200` across interceptor/authguard/compose; snackbar `10_000` inline at `rmmoffline.service.ts:40`.
- **Found by:** Error Handling & Observability

### [F-28] `static progressDialogRef` global mutable, unguarded
- **Category:** 1 (Global mutable state)
- **Impact:** Medium
- **Explanation:** Module-global mutable static dialog ref mutated via static `open/setValue/close`; `setValue` dereferences `.componentInstance` with no null check and will NPE if called before `open`, and concurrent callers share one ref.
- **Evidence:** `src/app/dialog/progress.dialog.ts:33,41-43`.
- **Found by:** Structure & Boundaries

### [F-29] Module-scope once-only loaders; Stripe loader duplicated
- **Category:** 1 (Global mutable state)
- **Impact:** Low
- **Explanation:** Several `let x = null` module-scope loader singletons exist, and the Stripe-loader logic is duplicated across two dialog components rather than shared.
- **Evidence:** `xapian/xapianwebloader.ts:27`, `xapianwebworkerloader.ts:27`; duplicated `stripeLoader` in `account-app/stripe-payment-dialog.component.ts:28` and `credit-cards/stripe-add-card-dialog.component.ts:26`.
- **Found by:** Structure & Boundaries

### [F-30] Low cohesion in `messageinfo.ts`
- **Category:** 11 (Low cohesion)
- **Impact:** Low
- **Explanation:** A pure `MessageInfo` DTO is bundled with the unrelated `IndexingTools` class (Xapian indexing/hashing) in the same module, mixing two responsibilities and dependency sets.
- **Evidence:** `src/app/common/messageinfo.ts:23` (`MessageInfo`) and `:64` (`IndexingTools`).
- **Found by:** Structure & Boundaries

### [F-31] Shared `common/` layer reaches up into features/hub
- **Category:** 4 (High/unstable dependencies)
- **Impact:** Low-Medium
- **Explanation:** A layer meant to be low-level shared kernel imports upward — pulling `SearchService` from `xapian/` and injecting `RunboxWebmailAPI` — inverting the intended direction.
- **Evidence:** `src/app/common/usage-reports.service.ts:23`; `common/preferences.service.ts:52`.
- **Found by:** Coupling & Dependencies

### [F-32] Mutually concrete-typed view component and action handler
- **Category:** 3 (Tight coupling)
- **Impact:** Low
- **Explanation:** `MessageActions` holds a concrete `SingleMailViewerComponent` while the component takes an `@Input()` of concrete `MessageActions`, so neither can be tested or reused without the other.
- **Evidence:** `src/app/mailviewer/messageactions.ts:20,23`; `singlemailviewer.component.ts:85`.
- **Found by:** Coupling & Dependencies

### [F-33] Unsanitized `bypassSecurityTrustHtml` in dialogs (latent)
- **Category:** 30 (Security as an afterthought)
- **Impact:** Medium
- **Explanation:** Two dialogs bypass Angular's sanitizer on `data.message` with no DOMPurify pass and bind via `[innerHtml]`. Current callers pass literals, so it is latent — but nothing prevents a future caller from routing user/server data through it.
- **Evidence:** `src/app/dialog/info.dialog.ts:53`; `dialog/simpleinput.dialog.ts:65`.
- **Found by:** Security & Code Quality

### [F-34] No CSRF/XSRF protection configured in-repo
- **Category:** 30 (Security as an afterthought)
- **Impact:** Medium
- **Explanation:** No `HttpClientXsrfModule` / token handling anywhere; cookie/session auth means state-changing requests rely entirely on the out-of-repo backend for CSRF defense — a trust-boundary assumption worth verifying with the backend team.
- **Evidence:** grep for `csrf|xsrf|XsrfConfiguration` in `src/app` returns nothing; `rmmhttpinterceptor.service.ts:51-110` adds no token.
- **Found by:** Security & Code Quality

### [F-35] Dead `InfoDialog` ships with the unsafe bypass
- **Category:** 31 (Dead code / unused dependencies)
- **Impact:** Low
- **Explanation:** `InfoDialog` is declared/exported but has no `dialog.open(InfoDialog)` call site anywhere; it ships unreachable and carries the unsafe `bypassSecurityTrustHtml` from F-33.
- **Evidence:** `src/app/dialog/info.dialog.ts`; declared in `dialog.module.ts:33,41,60`, no open() in codebase.
- **Found by:** Security & Code Quality

### [F-36] `DevModule` demo playground lazy-loaded in production
- **Category:** 31 (Dead code / unused dependencies)
- **Impact:** Low
- **Explanation:** A demo/playground module is routed at `/dev` and bundled in prod builds with no fileReplacement/exclusion. It is behind the auth guard (not a security exposure) but is dead UI shipped to users.
- **Evidence:** `src/app/app.module.ts:126`; `src/app/dev/`; no exclusion in `angular.json`.
- **Found by:** Security & Code Quality

### [F-39] Incorrect cache eviction (bug)
- **Category:** 12 (Hidden side effects) / 31 (Dead code)
- **Impact:** Low
- **Explanation:** On the error path of `getMessageContents`, the code uses `delete obj[key]` against an `LRUMessageCache` instance instead of its `.delete(id)` method, so the eviction is a no-op against a nonexistent indexed property.
- **Evidence:** `src/app/rmmapi/rbwebmail.ts:263` `delete this.messageContentsRequestCache[messageId]` vs `lru-message-cache.ts:65` (`delete(id)`); correct usage at `:267,314,326`.
- **Found by:** Integration & Data

## Coverage Checklist

### Flaw/Risk Types 1–34
| # | Type | Status | Finding |
|---|------|--------|---------|
| 1 | Global mutable state | Observed | F-28, F-29 |
| 2 | God object | Observed | F-1, F-2 |
| 3 | Tight coupling | Observed | F-32 |
| 4 | High/unstable dependencies | Observed | F-1, F-31 |
| 5 | Circular dependencies | Observed | F-4, F-6, F-7 |
| 6 | Leaky abstractions | Observed | F-5 |
| 7 | Over-abstraction | Not observed | — (system is under-, not over-, abstracted) |
| 8 | Premature optimization | Not observed | — (caching is evidence-driven; see S-2) |
| 9 | Shotgun surgery | Observed | F-8, F-3 |
| 10 | Feature envy / anemic domain | Observed | F-5 |
| 11 | Low cohesion | Observed | F-30, F-2 |
| 12 | Hidden side effects | Observed | F-16, F-17, F-21, F-39 |
| 13 | Inconsistent boundaries | Observed | F-3, F-7 |
| 14 | Distributed monolith | Not applicable | Browser SPA, single deployable |
| 15 | Chatty service calls | Not observed | Hot path batched (assessed; only minor per-flag PUTs) |
| 16 | Synchronous-only integration | Observed | F-15 |
| 17 | No clear ownership of data | Observed | F-14 (counter: S-12) |
| 18 | Shared database across services | Not applicable | Per-key storage ownership clean (S-12) |
| 19 | Lack of idempotency | Observed | F-11, F-12 |
| 20 | Weak error handling | Observed | F-18, F-19, F-20 |
| 21 | No observability plan | Observed | F-22, F-24 |
| 22 | Configuration sprawl | Observed | F-25 |
| 23 | Dependency injection misuse | Observed | F-2 |
| 24 | Inconsistent API contracts | Observed | F-9, F-10 |
| 25 | Business logic in the UI | Observed | F-26 |
| 26 | Poor transactional boundaries | Observed | F-13 |
| 27 | Temporal coupling | Observed | F-6, F-4 |
| 28 | Magic numbers/strings | Observed | F-27 |
| 29 | "Utility" dumping ground | Not observed | Counter-evidence S-9 |
| 30 | Security as an afterthought | Observed | F-33, F-34 |
| 31 | Dead code / unused dependencies | Observed | F-35, F-36 |
| 32 | Missing test coverage (critical paths) | Observed | F-37, F-38 |
| 33 | Hard-coded credentials/secrets | Not observed | Clean negative (S-3) |
| 34 | Inconsistent error/logging conventions | Observed | F-23 |

### Strength Categories S1–S14
| # | Category | Status | Finding |
|---|----------|--------|---------|
| S1 | Clear modular boundaries | Observed | S-12 |
| S2 | High cohesion | Observed | S-9, S-11 |
| S3 | Loose coupling | Observed | S-10 |
| S4 | Dependency direction is stable | Observed (partial) | downward DI to a single hub, undercut by F-1/F-31 |
| S5 | Dependency management hygiene | Observed | S-13 |
| S6 | Consistent API contracts | Observed (partial) | S-5 (undercut by F-9/F-10) |
| S7 | Robust error handling | Observed | S-4, S-5 |
| S8 | Observability present | Observed (limited) | S-6 (crash-only; see F-22) |
| S9 | Configuration discipline | Observed (partial) | build-time env gen (undercut by F-25) |
| S10 | Security built-in | Observed | S-1, S-3, S-7, S-8 |
| S11 | Testability & coverage | Observed (partial) | good seams on some services; major gaps F-37/F-38 |
| S12 | Resilience patterns | Observed | S-2 |
| S13 | Domain modeling strength | Observed | S-10, S-11 |
| S14 | Simple, pragmatic abstractions | Observed | S-9 |

## Hotspots

Top 3 areas to review:

1. **`src/app/rmmapi/rbwebmail.ts`** — the god object (F-1), the central source of inverted dependencies and cross-feature cycles, untyped/ad-hoc response contracts (F-9, F-10), the missing send idempotency (F-11), and a real cache bug (F-39). It is also a genuine strength anchor (S-2, S-5) — the highest-leverage file in the repo, both for risk and for value.
2. **`src/app/app.component.ts` + `src/app/rmm.ts` (+ `rmm/*`)** — the 26-dep god component (F-2) and the facade↔model cycle graph (F-4, F-5, F-7); the structural core whose responsibilities and dependency direction most need clarifying. The dual `RMM` / `RunboxWebmailAPI` stacks (F-3) are the main onboarding hazard.
3. **`src/app/mailviewer/singlemailviewer.component.ts` + its spec, and the security test gap generally** — the strongest defensive code in the app (S-1) sits with zero regression tests over it (F-38), alongside untested auth/2FA/payment paths (F-37). High strength + high fragility in the same place.

## Next Questions

1. Is the dual `RMM` / `RunboxWebmailAPI` split an in-progress migration toward one of them, or two stacks expected to coexist indefinitely? Which is the intended "front door" for new feature code?
2. Does the out-of-repo backend enforce idempotency for mail send and Stripe payment (server-side dedupe keyed on `mid`/`tid`/payment-intent), and does it rely on SameSite cookies or a server-issued token for CSRF — covering the gaps the client doesn't (F-11, F-12, F-34)?
3. For the optimistic local mutations (F-13) and dual-authority folder counts (F-14), what is the intended reconciliation contract when a backend write fails or a client is offline — is eventual self-heal on next sync the accepted design, or a known bug source?
4. Is the absence of proactive Sentry instrumentation (F-22) a deliberate cost/privacy decision, or simply unbuilt — and is the commented-out console capture blocked only on the self-hosted Sentry upgrade noted in `sentry.ts`?
5. Which critical paths (auth guard, interceptor, 2FA, send, payment, mail sanitization) are considered must-test for this product, given the current 35-spec / 244-file ratio (F-37, F-38)?

## Analysis Metadata

- **Agents dispatched:**
  - Structure & Boundaries — module organization, god objects, cohesion, domain modeling
  - Coupling & Dependencies — dependency direction, circular deps (madge), DI, temporal coupling
  - Integration & Data — API contracts, idempotency, data ownership, resilience, transactional boundaries
  - Error Handling & Observability — error strategy, logging/Sentry, config, side effects, business-logic placement
  - Security & Code Quality — sanitization, auth/2FA, secrets, dead code, test coverage
  - Verifier — re-read every finding at source, deduplicated, corrected impacts/counts
- **Scope:** Full `runbox7` application (`src/app`, ~244 non-spec TS files); `rmm6` library shares `src/`. Backend out of scope (external boundary).
- **Raw findings:** 52
- **Verified findings:** 52 (13 strengths, 39 flaws) after merges/corrections
- **Filtered out:** 1 dropped to NOTE (print-path innerHTML reconstruction — sanitized upstream), plus 4 merges (CD-F6→F-2, CD-F3→F-1, EH-F9→F-23, SC-F9→S-3) and 1 count correction (app.ua.http 136→44)
- **By impact:** 7 high, 24 medium, 11 low (flaws); 3 high + 10 medium (strengths)
- **Notable:** 3 findings are outright bugs, not smells — F-8 (Identity field-name drift), F-16 (resizer/htmlDecision swap), F-39 (no-op cache delete)
- **Steering files consulted:** `CLAUDE.md` (project), `CLAUDE.local.md`, `CONTRIBUTING.md`, `README.md` — no contradictions with code found; the architectural gap they leave undocumented is the dual `RMM` / `RunboxWebmailAPI` data-access split.
