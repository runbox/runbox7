/// <reference types="cypress" />

describe('Search', () => {
    it('should display multiple search field panel', () => {
        cy.visit('/');
        cy.closeWelcomeDialog();
        cy.get('mat-toolbar mat-form-field button').click();
        cy.get('input[placeholder=Subject]').type('testsubject');
        cy.get('mat-toolbar input[placeholder="Start typing to search messages"]')
            .should('have.value', 'subject:"testsubject"');
    });
});
