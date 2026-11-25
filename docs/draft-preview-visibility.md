# Hide draft previews while composing

Issue: https://github.com/runbox/runbox7/issues/430

Draft Desk normally displays an editor alongside the other draft preview cards.
With many drafts, those cards occupy space while the user writes a message.

The **Show draft previews** checkbox starts checked. Uncheck it to hide the
preview cards. Every draft already open for editing remains visible. Check it
again to restore the previews. The setting lasts until leaving Draft Desk.

Only visibility changes: the draft models, compose components, unsent text,
save operations and draft ordering are retained. Closing the last editor can
leave no visible cards; the checkbox and explanatory text remain available to
restore the list. The existing **Show more** control is hidden with the previews.

## Reproduction and checks

Use a mailbox containing several saved drafts, or the repository's local mock
server. This behavior does not depend on a local search index.

1. Open Draft Desk and start composing a message.
2. Enter text in the message body.
3. Uncheck **Show draft previews**. Preview cards disappear; open editors remain.
4. Check the control again. The previews return and the edited text is retained.
5. With previews hidden, close an editor, then check the control to restore its
   preview. No draft is deleted by changing this option.

`draftdesk.component.spec.ts` checks the default view, multiple open editors,
component and text retention, and recovery after the last editor closes.
`e2e/cypress/integration/draft-preview-visibility.ts` exercises the real compose
components and mock API at 1280 px and 375 px.

These checks address preview visibility. They do not replace the broader draft
list redesign requested in #22 or change draft sorting and persistence.
