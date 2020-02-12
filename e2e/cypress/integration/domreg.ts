/// <reference types="cypress" />

describe('Domain registration', () => {
    it('Should display domreg component', () => {
        cy.visit('/domainregistration');
        cy.get('domain-register mat-card-title').should('contain', 'Domain Registration');
    });
});
