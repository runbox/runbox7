/// <reference types="cypress" />

describe('Display contact details', () => {
    it('Should display a clickable contact on a list', () => {
        cy.visit('/contacts');
        cy.contains('Welcome to Runbox 7 Contacts');
        cy.contains('Patrick Postcode').click();
        cy.url().should('include', 'ID-MR-POSTCODE');
        cy.contains("Patrick Postcode's details");
    })
})
