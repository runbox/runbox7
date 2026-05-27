describe('Account access control', () => {
    it('should be able to renew as a main account', () => {
        cy.intercept('GET', '/rest/v1/me').as('getMe');
        cy.visit('/account/');
        cy.wait('@getMe');
        cy.get('mat-expansion-panel-header').contains('Subscriptions').click();
        cy.get('mat-list-item').contains('Your Subscriptions').click();

        cy.url().should('include', '/account/subscriptions');
    });

    it('should be able to access account security as a main account', () => {
        cy.intercept('GET', '/rest/v1/me').as('getMe');
        cy.visit('/account/');
        cy.wait('@getMe');
        cy.get('mat-expansion-panel-header').contains('Security').click();
        cy.get('mat-list-item').contains('Two-Factor Authentication').click();

        cy.url().should('include', '/account/2fa');
    });
});
