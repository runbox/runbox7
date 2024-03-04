/// <reference types="cypress" />

describe('Search', () => {
    beforeEach(() => {
        localStorage.setItem('221:Desktop:localSearchPromptDisplayed', JSON.stringify('true'));
        localStorage.setItem('221:Mobile:localSearchPromptDisplayed', JSON.stringify('true'));
        localStorage.setItem('221:preference_keys', '["Desktop:localSearchPromptDisplayed","Mobile:localSearchPromptDisplayed"]');
    });

    it('should display multiple search field panel', () => {
        cy.visit('/');
        cy.get('mat-toolbar mat-form-field button').click();
        cy.get('input[data-placeholder=Subject]').type('testsubject');
        cy.get('mat-toolbar input[data-placeholder="Start typing to search messages"]')
            .should('have.value', 'subject:"testsubject"');
    });
});
