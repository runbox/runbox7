/// <reference types="cypress" />

describe('Folder management', () => {
    function canvas() {
        return cy.get('canvastable canvas:first-of-type');
    }

    it('should create folder at root level', () => {
        cy.visit('/');

        cy.get('#createFolderButton').click();
        cy.get('.mat-dialog-title').should('contain', 'Add new folder');
        cy.get('mat-dialog-container mat-dialog-content').should('contain', 'root level');

        cy.get('mat-dialog-container input').type('Test');
        cy.get('mat-dialog-container #doneButton').click();
        cy.get('mat-tree-node:contains(Test)').should('have.length', 1);
    });

    it('should empty trash', () => {
        cy.visit('/');

        cy.contains('mat-tree-node', 'Trash')
            .find('button.mat-icon-button[mattooltip="Folder actions"]')
            .click();

        cy.intercept({
            method: 'PUT',
            path: '/rest/v1/email_folder/empty'}).as('emptyTrashReq');
        cy.contains('div.mat-menu-content button', 'Empty trash').click();
        cy.wait('@emptyTrashReq');
    });

    it('should create new draft on templates folder message click', () => {
	cy.visit('/')
	cy.contains('mat-tree-node', 'Templates').click()
        canvas().click({ x: 55, y: 40 });
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
    })
});
