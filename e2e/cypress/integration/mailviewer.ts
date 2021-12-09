/// <reference types="cypress" />

describe('Interacting with mailviewer', () => {
    function canvas() {
        return cy.get('canvastable canvas:first-of-type');
    }

    beforeEach(() => {
        localStorage.setItem('localSearchPromptDisplayed221', 'true');
        localStorage.setItem('messageSubjectDragTipShown', 'true');
        indexedDB.deleteDatabase('messageCache');
    });

    it('Loading an email with loading errors displays an error', () => {
        cy.intercept('/rest/v1/email/14').as('get14');
        cy.visit('/');
        cy.wait('@get14', {'timeout':10000});
        cy.visit('/#Inbox:14');

        cy.get('.support-snackbar').contains('Email content missing');
    });

    it('can open an email and go back and forth in browser history', () => {
        cy.intercept('/rest/v1/email/11').as('get11');
        cy.visit('/');

        cy.wait('@get11', {'timeout':10000});
        canvas().click(400, 300);

        cy.hash().should('equal', '#Inbox:11');
        cy.go('back');
        cy.hash().should('not.contain', 'Inbox:11');
        /* TODO: apparently forward broke at some point
         * in headless mode. Works normally in a proper browser
        cy.go('forward');
        cy.hash().should('equal', '#Inbox:11');
        cy.get('button[mattooltip="Close"]').click();
        cy.hash().should('equal', '#Inbox');
        */
    });

    it('can reply to an email with no "To"', () => {
        cy.intercept('/rest/v1/email/11').as('get11');
        cy.visit('/#Inbox:11')
        cy.wait('@get11', {'timeout':10000});

        cy.get('button[mattooltip="Reply"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.wait(500);
        cy.get('mat-card-actions div').should('contain', "Re: No 'To', just 'CC'");
    });

    it('can forward an email with no "To"', () => {
        cy.intercept('/rest/v1/email/11').as('get11');
        cy.visit('/');
        cy.wait('@get11', {'timeout':10000});
        cy.visit('/#Inbox:11');

        cy.get('button[mattooltip="Forward"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.wait(500);
        cy.get('mat-card-actions div').should('contain', "Fwd: No 'To', just 'CC'");
    });

    it('can reply to an email with no "To" or "Subject"', () => {
        cy.intercept('/rest/v1/email/13').as('get13');
        cy.visit('/');
        cy.wait('@get13', {'timeout':10000});
        cy.visit('/#Inbox:13');

        cy.get('button[mattooltip="Reply"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.wait(500);
        cy.get('mat-card-actions div').should('contain', "Re: ");
    });

    it('can forward an email with no "To" or "Subject"', () => {
        cy.intercept('/rest/v1/email/13').as('get13');
        cy.visit('/');
        cy.wait('@get13', {'timeout':10000});
        cy.visit('/#Inbox:13');

        cy.get('button[mattooltip="Forward"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.wait(500);
        cy.get('mat-card-actions div').should('contain', "Fwd: ");
    });

    it('Vertical to horizontal mode exposes full height button', () => {
        cy.intercept('/rest/v1/email/11').as('get11');
        cy.visit('/');
        cy.wait('@get11', {'timeout':10000});
        cy.visit('/#Inbox:11');

        // Make sure we're in vertical mode
        cy.get('button[mattooltip="Horizontal preview"]').click();

        cy.get('button[mattooltip="Full height"]').should('exist');        
    });

    it('Changing viewpane height is stored', () => {
        cy.intercept('/rest/v1/email/11').as('get11');
        cy.visit('/');
        cy.wait('@get11', {'timeout':10000});
        cy.visit('/#Inbox:11');

        // Make sure we're in horizontal mode
        cy.get('button[mattooltip="Horizontal preview"]').click();
        // set full height
        cy.get('button[mattooltip="Full height"]').click().should(() => {
            // full height 
            const resizerPercent = parseInt(localStorage.getItem('rmm7resizerpercentage'), 10);
            expect(resizerPercent).to.eq(100);
        });
    });

    it('Half height reduces stored pane height', () => {
        cy.intercept('/rest/v1/email/11').as('get11');
        cy.visit('/');
        cy.wait('@get11', {'timeout':10000});
        cy.visit('/#Inbox:11');

        // Make sure we're in horizontal mode
        cy.get('button[mattooltip="Horizontal preview"]').click();
        // set full height
        var resizerPercent = 0;
        cy.get('button[mattooltip="Full height"]').click().and(() => {
        // full height
            resizerPercent = parseInt(localStorage.getItem('rmm7resizerpercentage'), 10);
        });
        // half height 
        cy.get('button[mattooltip="Half height"]').click().should(() => {
            expect(parseInt(localStorage.getItem('rmm7resizerpercentage'), 10)).to.be.eq(50);
        // collect new value
            resizerPercent = parseInt(localStorage.getItem('rmm7resizerpercentage'), 10);
        });

        // doesnt go away on pane close (persist for other emails)
        cy.get('button[mattooltip="Close"]').click().should(() => {
            expect(parseInt(localStorage.getItem('rmm7resizerpercentage'), 10)).to.equal(resizerPercent);
        });
    });

    it('Revisit open email in horizontal mode loads it', () => {
        cy.intercept('/rest/v1/email/11').as('get11');
        cy.visit('/');
        cy.wait('@get11', {'timeout':10000});
        cy.visit('/#Inbox:11');

        // Switch to horizontal mode
        cy.get('button[mattooltip="Horizontal preview"]').click();

        // revisit
        cy.visit('/#Inbox#11');
        // Half height email pane should still be open
        cy.get('button[mattooltip="Full height"]').should('exist');
    });

    it('Can go out of mailviewer and back and still see our email', () => {
        cy.intercept('/rest/v1/email/12').as('get12');
        cy.visit('/');
        cy.wait('@get12',{'timeout':10000});
        cy.visit('/#Inbox:12');

        cy.get('div#messageHeaderSubject').contains('Default from fix test');
        cy.get('#composeButton').click();
        cy.go('back');
        cy.get('div#messageHeaderSubject').contains('Default from fix test');
    });
})
