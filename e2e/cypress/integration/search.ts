describe('Search', () => {
    beforeEach(() => {
        localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
    });

    it('should display multiple search field panel', () => {
        cy.visit('/');
        cy.get('button.mat-mdc-icon-button[matTooltip="Show advanced search pane"]').click();
        cy.get('input[placeholder="Subject"]').type('testsubject', { force: true });
        cy.get('mat-toolbar input[placeholder="Start typing to search messages"]')
            .should('have.value', 'subject:"testsubject"');
    });
});
