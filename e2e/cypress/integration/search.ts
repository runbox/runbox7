/// <reference types="cypress" />

describe('Search', () => {
    beforeEach(() => {
        localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
    });

    it('should display multiple search field panel', () => {
        cy.visit('/');
        cy.get('mat-toolbar mat-form-field button').click();
        cy.get('#multipleSearchFieldsContainer input[formcontrolname="subject"]').type('testsubject');
        cy.get('mat-toolbar #searchField input')
            .should('have.value', 'subject:"testsubject"');
    });
});
