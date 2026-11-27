/// <reference types="cypress" />

describe('Unread-only empty state', () => {
    for (const viewport of [[1280, 800], [375, 667]]) {
        it(`explains the empty result at ${viewport[0]}px and hides it when unchecked`, () => {
            cy.viewport(viewport[0], viewport[1]);
            cy.intercept({
                pathname: '/mail/download_xapian_index',
                query: { listallmessages: '1', folder: 'Inbox' }
            }).as('inbox');
            cy.visit('/', {
                onBeforeLoad(win) {
                    win.localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
                }
            });
            cy.wait('@inbox');

            // The mock Inbox contains read messages; filtering them reproduces #689.
            cy.get('[data-testid="unread-empty-state"]').should('not.exist');
            cy.get('button[mattooltip="Show view options"]').click();
            cy.contains('mat-checkbox', 'Unread only').click();
            cy.get('body').type('{esc}');
            cy.get('[data-testid="unread-empty-state"]')
                .should('be.visible')
                .and('have.attr', 'role', 'status')
                .and('contain.text', 'No unread messages in this view.');

            cy.get('button[mattooltip="Show view options"]').click();
            cy.contains('mat-checkbox', 'Unread only').click();
            cy.get('body').type('{esc}');
            cy.get('[data-testid="unread-empty-state"]').should('not.exist');
        });
    }
});
