describe('Folder management', () => {
    function canvas() {
        return cy.get('canvastable canvas:first-of-type');
    }

    it('should create folder at root level', () => {
        const folderName = `TestFolder${Date.now()}`;
        cy.visit('/');

        cy.get('#createFolderButton').click();
        cy.get('.mat-mdc-dialog-title').should('contain', 'Add new folder');
        cy.get('.mat-mdc-dialog-container mat-dialog-content').should('contain', 'root level');

        cy.get('.mat-mdc-dialog-container mat-form-field input').type(folderName);
        cy.get('.mat-mdc-dialog-container #doneButton').click();
        cy.get('mat-tree-node').contains(folderName).should('have.length', 1);
    });

    it('should empty trash', () => {
        cy.visit('/');

        cy.contains('mat-tree-node', 'Trash')
            .find('button.mat-mdc-icon-button[mattooltip="Folder actions"]')
            .click();

        cy.intercept({
            method: 'PUT',
            path: '/rest/v1/email_folder/empty'}).as('emptyTrashReq');
        cy.contains('.mat-mdc-menu-content button', 'Empty trash').click();
        cy.wait('@emptyTrashReq');
    });

    it('should create new draft on templates folder message click', () => {
	cy.visit('/');
	cy.contains('mat-tree-node', 'Templates').click();
        canvas().click( 55, 40 );
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
    });
});
