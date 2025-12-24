/// <reference types="cypress" />

describe('Search', () => {
    beforeEach(() => {
        localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
    });

    it('should display multiple search field panel', () => {
        cy.visit('/');
        cy.get('mat-toolbar #searchField', {timeout: 10000}).should('exist');
        cy.get('mat-toolbar #searchField button').click();
        cy.get('#multipleSearchFieldsContainer', {timeout: 10000}).should('exist');
        cy.get('input[placeholder=Subject]', {timeout: 10000})
            .should('exist')
            .type('testsubject', { force: true });
        cy.get('mat-toolbar input[placeholder="Start typing to search messages"]')
            .should('have.value', 'subject:"testsubject"');
    });
});
