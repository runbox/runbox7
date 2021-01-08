/// <reference types="cypress" />

describe('Using the local index', () => {
    beforeEach(() => {
        localStorage.setItem('localSearchPromptDisplayed221', 'true');
    });

    it('can download and remove the local index', () => {
        cy.visit('/');
        const selector = 'mat-nav-list:nth-of-type(2) mat-list-item';

        cy.server();
        cy.route('POST', '**/verifymessages').as('messagesverified');

        cy.get(selector).should('contain', 'Synchronize index').click()
        cy.get(selector).should('contain', 'Stop index synchronization');

        cy.wait('@messagesverified');

        cy.get('#searchField input').type('default fix');
        cy.get('#searchField input').invoke('attr', 'placeholder').should('contain', 'showing 1 hit');

        cy.visit('/');
        cy.get(selector).should('contain', 'Stop index synchronization').click();
        cy.get(selector).should('contain', 'Synchronize index');
    });
})
