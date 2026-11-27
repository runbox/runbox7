# Unread-only empty results

With **Show view options > Unread only** enabled, an empty message list displays
"No unread messages in this view." The notice describes the current result set,
including any search restrictions, rather than the entire mailbox.

The notice disappears when unread results arrive or the option is disabled.
It is suppressed during folder fetching, websocket searches and index downloads,
before the selected folder has supplied a result, in child routes, in threaded
view, and in folders where the unread filter is ignored. It uses `role="status"`
so assistive technology can announce the change without moving keyboard focus.

## Reproduce with local fixtures

1. Install dependencies using the Node version specified in `package.json`.
2. Run `npm run mockserver` and `npm run start-use-mockserver` in two terminals.
3. Visit `http://localhost:4201/` and open Inbox. The mock Inbox contains read mail.
4. Enable **Show view options > Unread only**. The notice appears below the table
   header instead of leaving the result area blank.
5. Disable the option. The notice disappears. Repeat in a narrow mobile viewport.

The focused unit specs are in `src/app/app.component.spec.ts`. The browser
regression is `e2e/cypress/integration/unread-empty-state.ts` and checks both
1280-pixel and 375-pixel viewports. Run the complete checks with `npm run ci-tests`.

This change only explains empty unread results. The separate filter-reset bug
tracked in #1774 is outside its scope.
