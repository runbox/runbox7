describe('Sessions page', () => {
    it('can display active sessions', () => {
        cy.visit('/account/sessions');
        cy.get('app-sessions', { timeout: 10000 }).should('exist');
    });

    it('shows session list', () => {
        cy.visit('/account/sessions');
        cy.get('app-sessions', { timeout: 10000 });
        cy.get('mat-grid-list', { timeout: 10000 }).should('exist');
    });
});
