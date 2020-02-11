/// <reference types="cypress" />

describe('Composing emails', () => {
    function closeWelcomeDialog() {
        cy.get('confirm-dialog').should('contain', 'Welcome to Runbox 7');
        cy.get('confirm-dialog .mat-dialog-actions button:nth-child(3)').click();
    }

    function composeNew() {
        cy.visit('/compose?new=true');
        cy.closeWelcomeDialog();
    }

    it('should display draft card', () => {
        composeNew();
        cy.get('mat-card-actions div').should('contain', 'New message');
        cy.focused().should('have.attr', 'placeholder', 'To');
    });

    it('should update action bar text to subject', () => {
        composeNew();

        cy.get('mat-card-actions div').should('contain', 'New message');
        cy.get('input[placeholder="Subject"]').type('Email about Subject X');
        cy.get('mat-card-actions div').should('contain', 'Subject X');
    });

    it('should complain on invalid email address', () => {
        composeNew();

        cy.get('mailrecipient-input input').type('invalidaddress{enter}');
        cy.get('mailrecipient-input mat-error').should('contain', 'Please enter a valid email address');

        cy.get('mailrecipient-input input').clear().type('test@example.com{enter}');
        cy.get('mailrecipient-input mat-error').should('not.exist');
    });

    it('should open reply draft with HTML editor', () => {
        cy.visit('/');
        cy.closeWelcomeDialog();
        cy.get('canvastable canvas:first-of-type').click({ x: 300, y: 10 });
        cy.get('single-mail-viewer').should('exist');
        cy.get('mat-checkbox[mattooltip="Toggle HTML view"]').click();
        cy.contains('Manually toggle HTML').click();
        cy.get('mat-checkbox[mattooltip="Toggle HTML view"] input').should('be.checked');
        cy.get('button[mattooltip="Reply"]').click();
        // we assume that this is the tinymce frame
        cy.get('iframe').should('exist');
    });
});
