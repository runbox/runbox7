/// <reference types="cypress" />

describe('Switching between folders (and not-folders)', () => {

    function goToInbox() {
        cy.get('rmm-folderlist mat-tree-node:contains(Inbox)').click();
        cy.url().should('match', /\/(#Inbox)?$/);
        cy.get('rmm-folderlist mat-tree-node:contains(Inbox)').should('have.class', 'selectedFolder');
    }

    it('can switch from welcome to inbox', () => {
        localStorage.setItem('localSearchPromptDisplayed221', 'true');

        // start of on /welcome, like a fresh new user
        cy.visit('/welcome');

        // should be able to switch to inbox...
        goToInbox();

        // then to compose...
        cy.get('#composeButton').click();
        cy.url().should('contain', '/compose?new=true');
        cy.get('#composeButton').should('have.class', 'selectedFolder');

        // then back to inbox...
        goToInbox();

        // then to drafts...
        cy.get('#draftsButton').click();
        cy.url().should('contain', '/compose');
        cy.get('#draftsButton').should('have.class', 'selectedFolder');

        // and back to inbox...
        goToInbox();
    });

    it('can switch from an open email to another folder', () => {
        localStorage.setItem('localSearchPromptDisplayed221', 'true');

        cy.visit('/#Inbox:1');
        cy.get('rmm-folderlist mat-tree-node:contains(Spam)').click();
        cy.url().should('contain', '/#Spam');
        cy.get('rmm-folderlist mat-tree-node:contains(Spam)').should('have.class', 'selectedFolder');
    });
})
