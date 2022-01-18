/// <reference types="cypress" />

describe('Payment methods', () => {
    it('can list available payment methods', () => {
        cy.visit('/account/payment_cards');

        cy.contains('VISA ending in 1234');
        cy.contains('Mastercard (Apple Pay)');
    });
});
