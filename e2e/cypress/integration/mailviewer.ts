/// <reference types="cypress" />

describe('Interacting with mailviewer', () => {
    function canvas() {
        return cy.get('canvastable canvas:first-of-type');
    }

    it('can reply to an email with no "To"', () => {
        cy.visit('/');
        cy.closeWelcomeDialog();

        canvas().click({ x: 400, y: 350 });
        cy.get('button[mattooltip="Reply"]').click();
        cy.contains("Re: No 'To', just 'CC'");
    })
})
