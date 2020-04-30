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
    });

    it('Vertical to horizontal mode exposes full height button', () => {
        cy.visit('/');
        cy.closeWelcomeDialog();
        cy.clearLocalStorage();

        canvas().click({ x: 400, y: 350 });
        // Make sure we're in vertical mode
        cy.get('button[mattooltip="Horizontal preview"]').click();

        cy.get('button[mattooltip="Full height"]').should('exist');        
    });

    it('Changing viewpane height is stored', () => {
        cy.visit('/');
        cy.closeWelcomeDialog();
        cy.clearLocalStorage();

        canvas().click({ x: 400, y: 350 });
        // Make sure we're in vertical mode
        cy.get('button[mattooltip="Horizontal preview"]').click();
        // set full height
        cy.get('button[mattooltip="Full height"]').click().should(() => {
            expect(localStorage.getItem('rmm7resizerheight').to.exist());
        });
        
    });
})
