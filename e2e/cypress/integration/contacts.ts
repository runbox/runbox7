/// <reference types="cypress" />

describe('Display contact details', () => {
    it('Should display a clickable contact on a list', () => {
        cy.visit('/contacts');
        cy.contains('Welcome to Runbox 7 Contacts');
        cy.contains('Patrick Postcode').click();
        cy.url().should('include', 'id-mr-postcode');
        cy.get('input[placeholder="Company"').should('have.value', 'Post Office #42');
    });

    it('Should provide a sensible UI in mobile view', () => {
        cy.viewport('iphone-6');

        // entire contact list should be displayed first
        cy.visit('/contacts');
        cy.get('mat-toolbar').should('contain', 'Showing all contacts');
        cy.get('div.contactList app-contact-button').should('have.length', 2);

        // we should be able to summon the sidebar menu and choose a group
        cy.get('mat-toolbar button mat-icon[svgIcon="menu"]').click();
        cy.get('mat-sidenav mat-list-item:contains(Group #1)').click();
        cy.get('mat-toolbar').should('contain', 'Showing group');
        cy.url().should('match', /id-group1$/);

        // we should only see the group members, and we should be able to view them
        cy.get('div.contactList app-contact-button').should('have.length', 1).click();
        cy.get('textarea').should('have.value', 'member 1-1 note');
        cy.url().should('match', /id-group1-member1$/);

        // closing the member should take us back to the group
        cy.get('mat-toolbar button mat-icon[svgIcon="close"]').click();
        cy.url().should('match', /id-group1$/);

        // we should be able to view group details with the toolbar button, and go back
        cy.get('mat-toolbar button:contains("Group #1")').click();
        cy.url().should('match', /id-group1$/);
        cy.get('div.contactDetails').should('be.visible');
        cy.get('app-contact-details').should('contain', 'Group #1 member #1');
        cy.get('mat-toolbar button mat-icon[svgIcon="close"]').click();
        cy.get('div.contactDetails').should('not.be.visible');
        cy.get('div.contactList').should('be.visible');

        // we should be able to go back to all contacts
        cy.get('mat-toolbar button mat-icon[svgIcon="menu"]').click();
        cy.get('mat-sidenav mat-list-item:contains("Show all contacts")').click();
        cy.url().should('match', /contacts\/?$/);
        cy.get('mat-toolbar').should('contain', 'Showing all contacts');
        cy.get('div.contactList app-contact-button').should('have.length', 2);
    });
})
