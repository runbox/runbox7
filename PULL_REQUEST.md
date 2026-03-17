# Angular 17 & MDC Upgrade Migration

## Summary

This PR implements the Angular 17 upgrade and Material Design Components (MDC) migration for the Runbox7 application. The migration moves from legacy Angular Material components to MDC-based components, ensuring compatibility with Angular 17.2.x and positioning the codebase for future Angular 18/19 upgrades.

The upgrade includes updates to unit tests, e2e tests (Cypress), CI configuration, and package dependencies to ensure full compatibility with the new MDC component structure.

**Execution Plan:** [EP-02-Angular-17-MDC-Upgrade-Revised](.roo/execution-plans/EP-02-Angular-17-MDC-Upgrade-Revised.md)

---

## Key Changes

### Dependencies Upgraded
- Angular core packages: `17.2.0`
- Angular Material/CDK: `17.3.10`
- TypeScript: `5.2.2`
- angularx-qrcode: `17.0.1`

### Unit Test Fixes (13 files)
Fixed test selectors to work with MDC component DOM structure changes:

| File | Change |
|------|--------|
| [`calendar-app.component.spec.ts`](src/app/calendar-app/calendar-app.component.spec.ts) | mat-checkbox selection using `closest()` helper |
| [`singlemailviewer.component.spec.ts`](src/app/mailviewer/singlemailviewer.component.spec.ts) | mat-checkbox selection using `closest()` helper |
| [`popular-recipients.component.spec.ts`](src/app/popular-recipients/popular-recipients.component.spec.ts) | mat-checkbox selection using `closest()` helper |
| [`multiple-search-fields-input.component.spec.ts`](src/app/xapian/multiple-search-fields-input/multiple-search-fields-input.component.spec.ts) | mat-checkbox selection using `closest()` helper |
| [`search-expression-builder.component.spec.ts`](src/app/xapian/search-expression-builder/search-expression-builder.component.spec.ts) | mat-checkbox selection using `closest()` helper |
| [`progresssnackbarcomponent.spec.ts`](src/app/dialog/progresssnackbarcomponent.spec.ts) | mat-progress-bar selection using `closest()` helper |
| [`aliases.lister.spec.ts`](src/app/aliases/aliases.lister.spec.ts) | Updated for MDC compatibility |
| [`calendar.service.spec.ts`](src/app/calendar-app/calendar.service.spec.ts) | Updated for MDC compatibility |
| [`runbox-calendar-event.spec.ts`](src/app/calendar-app/runbox-calendar-event.spec.ts) | Updated for MDC compatibility |
| [`folderlist.component.spec.ts`](src/app/folder/folderlist.component.spec.ts) | Updated for MDC compatibility |
| [`progress.service.spec.ts`](src/app/http/progress.service.spec.ts) | Updated for MDC compatibility |
| [`rbwebmail.spec.ts`](src/app/rmmapi/rbwebmail.spec.ts) | Updated for MDC compatibility |
| [`searchservice.spec.ts`](src/app/xapian/searchservice.spec.ts) | Updated for MDC compatibility |

### E2E Test Fixes (22 files)
Updated Cypress e2e tests for Angular 17 MDC compatibility:

| File | Change |
|------|--------|
| [`.eslintrc.json`](.eslintrc.json) | Added ESLint configuration for Cypress test files |
| [`cypress.config.js`](cypress.config.js) | Fixed duplicate setupNodeEvents function |
| [`e2e/cypress/support/commands.ts`](e2e/cypress/support/commands.ts) | Added custom commands for improved test reliability |
| [`e2e/cypress/support/index.js`](e2e/cypress/support/index.js) | Updated imports and configurations |
| [`e2e/cypress/integration/account-access.ts`](e2e/cypress/integration/account-access.ts) | Updated selectors and waits for MDC components |
| [`e2e/cypress/integration/alias.ts`](e2e/cypress/integration/alias.ts) | Updated selectors for MDC compatibility |
| [`e2e/cypress/integration/calendar-import.ts`](e2e/cypress/integration/calendar-import.ts) | Removed obsolete Cypress reference directives |
| [`e2e/cypress/integration/calendar.ts`](e2e/cypress/integration/calendar.ts) | Updated selectors for MDC compatibility |
| [`e2e/cypress/integration/canvastable.ts`](e2e/cypress/integration/canvastable.ts) | Updated selectors and waits |
| [`e2e/cypress/integration/compose.ts`](e2e/cypress/integration/compose.ts) | Updated selectors for MDC form fields |
| [`e2e/cypress/integration/contacts.ts`](e2e/cypress/integration/contacts.ts) | Updated selectors for MDC compatibility |
| [`e2e/cypress/integration/domain_renewal.ts`](e2e/cypress/integration/domain_renewal.ts) | Removed obsolete Cypress reference directives |
| [`e2e/cypress/integration/domreg.ts`](e2e/cypress/integration/domreg.ts) | Removed obsolete Cypress reference directives |
| [`e2e/cypress/integration/folder-switching.ts`](e2e/cypress/integration/folder-switching.ts) | Updated selectors for MDC compatibility |
| [`e2e/cypress/integration/folders.ts`](e2e/cypress/integration/folders.ts) | Updated selectors and waits |
| [`e2e/cypress/integration/login.ts`](e2e/cypress/integration/login.ts) | Updated selectors for MDC form fields |
| [`e2e/cypress/integration/mailviewer.ts`](e2e/cypress/integration/mailviewer.ts) | Updated selectors and waits for MDC components |
| [`e2e/cypress/integration/message-caching.ts`](e2e/cypress/integration/message-caching.ts) | Updated selectors for MDC compatibility |
| [`e2e/cypress/integration/ordering.ts`](e2e/cypress/integration/ordering.ts) | Updated selectors and waits |
| [`e2e/cypress/integration/payment_methods.ts`](e2e/cypress/integration/payment_methods.ts) | Removed obsolete Cypress reference directives |
| [`e2e/cypress/integration/profile.ts`](e2e/cypress/integration/profile.ts) | Updated selectors for MDC compatibility |
| [`e2e/cypress/integration/search.ts`](e2e/cypress/integration/search.ts) | Updated selectors for MDC compatibility |

### CI Configuration Updates
- Updated Node.js version in CI workflow for Angular 17 compatibility

### Module Updates (29 files)
All NgModules updated to use MDC-based Angular Material module imports:
- `MatButtonModule`, `MatCheckboxModule`, `MatRadioModule`
- `MatDialogModule`, `MatSnackBarModule`, `MatTooltipModule`
- `MatInputModule`, `MatSelectModule`, `MatAutocompleteModule`
- `MatTableModule`, `MatPaginatorModule`, `MatSortModule`
- `MatSidenavModule`, `MatToolbarModule`, `MatCardModule`
- `MatListModule`, `MatTabsModule`, `MatGridListModule`
- `MatProgressBarModule`, `MatProgressSpinnerModule`
- `MatChipsModule`, `MatExpansionModule`, `MatStepperModule`
- `MatDatepickerModule`, `MatNativeDateModule`
- And more...

### Template Updates (28 files)
HTML templates updated for MDC component structure:
- `mat-form-field` appearance attributes
- `mat-button` variants and styling
- `mat-card` content structure
- `mat-dialog` action alignments
- `mat-list-item` with `matListItemTitle`/`matListItemLine`
- `mat-chip` and `mat-chip-list` structures

### Style Updates (14 files)
SCSS/CSS files adapted for MDC theme compatibility:
- [`src/styles.scss`](src/styles.scss) - Global theme updates
- Component-specific style adaptations
- Updated selectors from `.mat-button` to `.mat-mdc-button`
- Updated `snack-bar-container` to `mat-snack-bar-container`

### Component Updates (66+ files)
TypeScript files updated for MDC API compatibility:
- Component imports updated
- ViewChild/ContentChild selectors adjusted
- Dialog configuration options updated
- Material component API calls updated

---

## Test Results

- **Unit Tests:** 157 tests passing
- **E2E Tests:** Updated for MDC compatibility

Both test suites run successfully after the MDC migration fixes.

---

## Breaking Changes

### Visual Changes
MDC components have different default styling and dimensions:
- **Buttons:** Slightly different padding and ripple effects
- **Form Fields:** Updated appearance and label positioning
- **Cards:** Modified content structure and spacing
- **Lists:** New line/title structure required
- **Dialogs:** Updated action button alignment

### DOM Structure Changes
The MDC migration changes the internal DOM structure of Material components. Any code that directly queries Material component internals may need updates.

### CSS Selector Changes
Legacy CSS selectors targeting Material components need updating:
- `.mat-button` → `.mat-mdc-button`
- `.mat-checkbox` → `.mat-mdc-checkbox`
- `.mat-dialog-container` → `.mat-mdc-dialog-container`

---

## Manual Testing Notes

Please verify the following areas during code review:

1. **Calendar App**
   - Event creation dialogs
   - Date picker functionality
   - Calendar settings

2. **Mail Viewer**
   - Email display and formatting
   - Attachment handling
   - Action buttons

3. **Compose**
   - Recipient input fields
   - Rich text editor integration
   - Send functionality

4. **Contacts**
   - Contact list display
   - Contact editing forms
   - Group management

5. **Account Settings**
   - Profile forms
   - Security settings
   - Payment dialogs

6. **Common Components**
   - Dialogs (confirm, info, error)
   - Progress indicators
   - Snackbars

---

## Commits

| Hash | Type | Description |
|------|------|-------------|
| `7b47d240` | fix(e2e) | Update Cypress tests for Angular 17 MDC compatibility |
| `36e8cb72` | fix(tests) | Update node on CI |
| `50ff9efa` | fix(stability) | Update package lock |
| `c25de48f` | build(deps) | Update package.json and remaining components for MDC |
| `e006d664` | fix(tests) | Update remaining spec files for Angular 17 MDC |
| `1fce9146` | refactor(components) | Update TypeScript files for MDC compatibility |
| `53b328ec` | style(scss) | Adapt styles for MDC theme compatibility |
| `b7d9821d` | refactor(templates) | Update HTML templates for MDC components |
| `ff7d064f` | refactor(angular) | Migrate all modules to Angular 17 MDC |
| `b3c1ce53` | fix(tests) | Resolve Angular 17+ test compatibility issues |

---

## References

- **Execution Plan:** [EP-02-Angular-17-MDC-Upgrade-Revised](.roo/execution-plans/EP-02-Angular-17-MDC-Upgrade-Revised.md)
- **Angular Material MDC Migration Guide:** https://material.angular.io/guide/mdc-migration
- **Angular 17 Release Notes:** https://blog.angular.io/angular-v17-is-here-437709b31ebe

---

## Next Steps

After this PR is merged:
1. Proceed to **EP-06: Angular 19 Finalization** for Angular 18/19 upgrade
2. Monitor for any visual regressions in production
3. Update any remaining legacy Material patterns discovered during testing
