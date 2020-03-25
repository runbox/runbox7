/// <reference types="cypress" />

describe('Payment methods', () => {
    it('can list available payment methods', () => {
        cy.visit('/account/components');
        cy.get('.componentCard mat-card-title:contains(Credit cards)').click();

        cy.contains('VISA ending in 1234');
        cy.contains('Mastercard (Apple Pay)');
    });
});
