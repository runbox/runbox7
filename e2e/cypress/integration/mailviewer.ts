/// <reference types="cypress" />

describe('Interacting with mailviewer', () => {
    function canvas() {
        return cy.get('canvastable canvas:first-of-type');
    }

    beforeEach(() => {
        localStorage.setItem('localSearchPromptDisplayed221', 'true');
    });

    it('can open an email and go back and forth in browser history', () => {
        cy.visit('/');

        cy.wait(1000); // should be long enough for the canvas to appear
        canvas().click({ x: 400, y: 300 });

        cy.hash().should('equal', '#Inbox:9');
        cy.go('back');
        cy.hash().should('not.contain', 'Inbox:9');
        cy.go('forward');
        cy.hash().should('equal', '#Inbox:9');
        cy.get('button[mattooltip="Close"]').click();
        cy.hash().should('equal', '#Inbox');
    });

    it('can reply to an email with no "To"', () => {
        cy.visit('/#Inbox:11');

        cy.get('button[mattooltip="Reply"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.get('mat-card-actions div').should('contain', "Re: No 'To', just 'CC'");
    });

    it('can forward an email with no "To"', () => {
        cy.visit('/#Inbox:11');

        cy.get('button[mattooltip="Forward"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.get('mat-card-actions div').should('contain', "Fwd: No 'To', just 'CC'");
    });

    it('can reply to an email with no "To" or "Subject"', () => {
        cy.visit('/#Inbox:13');

        cy.get('button[mattooltip="Reply"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.get('mat-card-actions div').should('contain', "Re: ");
    });

    it('can forward an email with no "To" or "Subject"', () => {
        cy.visit('/#Inbox:13');

        cy.get('button[mattooltip="Forward"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.get('mat-card-actions div').should('contain', "Fwd: ");
    });

    it('Vertical to horizontal mode exposes full height button', () => {
        cy.visit('/#Inbox:11');

        // Make sure we're in vertical mode
        cy.get('button[mattooltip="Horizontal preview"]').click();

        cy.get('button[mattooltip="Full height"]').should('exist');        
    });

    it('Changing viewpane height is stored', () => {
        cy.visit('/#Inbox:11');

        // Make sure we're in horizontal mode
        cy.get('button[mattooltip="Horizontal preview"]').click();
        // set full height
        cy.get('button[mattooltip="Full height"]').click().should(() => {
            // full height 
            const resizerHeight = parseInt(localStorage.getItem('rmm7resizerheight'), 10);
            expect(resizerHeight).to.be.greaterThan(100);

        });
    });

    it('Half height reduces stored pane height', () => {
        cy.visit('/#Inbox:11');

        // Make sure we're in horizontal mode
        cy.get('button[mattooltip="Horizontal preview"]').click();
        // set full height
        var resizerHeight = 0;
        cy.get('button[mattooltip="Full height"]').click().and(() => {
        // full height 
            resizerHeight = parseInt(localStorage.getItem('rmm7resizerheight'), 10);
        });
        // half height 
        cy.get('button[mattooltip="Half height"]').click().should(() => {
            expect(parseInt(localStorage.getItem('rmm7resizerheight'), 10)).to.be.lessThan(resizerHeight);
        // collect new value
            resizerHeight = parseInt(localStorage.getItem('rmm7resizerheight'), 10);
        });

        // doesnt go away on pane close (persist for other emails)
        cy.get('button[mattooltip="Close"]').click().should(() => {
            expect(parseInt(localStorage.getItem('rmm7resizerheight'), 10)).to.equal(resizerHeight);
        });
    });
})
