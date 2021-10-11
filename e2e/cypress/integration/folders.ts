/// <reference types="cypress" />

describe('Folder management', () => {
    it('should create folder at root level', () => {
        cy.visit('/');
        cy.closeWelcomeDialog();

        cy.get('#createFolderButton').click();
        cy.get('.mat-dialog-title').should('contain', 'Add new folder');
        cy.get('mat-dialog-container mat-dialog-content').should('contain', 'root level');

        cy.get('mat-dialog-container input').type('Test');
        cy.get('mat-dialog-container #doneButton').click();
        cy.get('mat-tree-node:contains(Test)').should('have.length', 1);
    });

    it('should empty trash', () => {
        cy.visit('/');
        cy.closeWelcomeDialog();

        cy.contains('mat-tree-node', 'Trash')
            .find('button.mat-icon-button[mattooltip="Folder actions"]')
            .click();

        cy.intercept({
            method: 'PUT',
            path: '/rest/v1/email_folder/empty'}).as('emptyTrashReq');
        cy.contains('div.mat-menu-content button', 'Empty trash').click();
        cy.wait('@emptyTrashReq');
    });
});
