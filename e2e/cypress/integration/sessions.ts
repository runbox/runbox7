describe('Sessions page', () => {
    it('can display active sessions', () => {
        cy.intercept('GET', '/ajax/ajax_mfa_list_sessions').as('getSessions');
        cy.visit('/account/sessions');
        cy.wait('@getSessions');
        cy.get('app-sessions', { timeout: 10000 }).should('exist');
    });

    it('shows session list', () => {
        cy.intercept('GET', '/ajax/ajax_mfa_list_sessions').as('getSessions');
        cy.visit('/account/sessions');
        cy.wait('@getSessions');
        cy.get('app-sessions', { timeout: 10000 });
        cy.get('mat-grid-list', { timeout: 10000 }).should('exist');
    });
});
