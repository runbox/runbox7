describe('Interacting with mailviewer', () => {
    function canvas() {
        return cy.get('canvastable canvas:first-of-type');
    }

    function getResizerPercent(): number {
        return parseInt(JSON.parse(localStorage.getItem('221:Desktop:rmm7resizerpercentage') ?? '0'), 10);
    }

    beforeEach(async () => {
        localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
        localStorage.setItem('221:Global:messageSubjectDragTipShown', JSON.stringify('true'));
        localStorage.setItem('221:Desktop:mailViewerOnRightSide', JSON.stringify('true'));
        localStorage.setItem('221:preference_keys', '["Global:messageSubjectDragTipShown", "Desktop:mailViewerOnRightSide"]');

        (await indexedDB.databases())
            .filter(db => db.name && /messageCache/.test(db.name))
            .forEach(db => indexedDB.deleteDatabase(db.name!));
    });

    // it('Loading an email with loading errors displays an error', () => {
    //     cy.intercept('/rest/v1/email/14').as('get14');
    //     cy.visit('/');
    //     cy.wait('@get14', {'timeout':10000});
    //     cy.visit('/#Inbox:14');

    //     cy.get('.support-snackbar').contains('Email content missing');
    // });

    it('can open an email and go back and forth in browser history', () => {
        cy.intercept('/rest/v1/email/download/*').as('get11');
        cy.visit('/#Inbox:11');

         cy.wait('@get11', {'timeout':10000});
        // canvas().click(400, 300);

        cy.hash().should('equal', '#Inbox:11');
        /* TODO: apparently forward broke at some point
         * in headless mode. Works normally in a proper browser
        cy.go('back');
        cy.hash().should('not.contain', 'Inbox:11');
        cy.go('forward');
        cy.hash().should('equal', '#Inbox:11');
        cy.get('button[mattooltip="Close"]').click();
        cy.hash().should('equal', '#Inbox');
        */
    });

    it('can reply to an email with no "To"', () => {
        cy.intercept('/rest/v1/email/download/*').as('get11');
        cy.visit('/#Inbox:11');
        cy.wait('@get11', {'timeout':10000});
        // cy.get('#messageContents');

        cy.get('button[mattooltip="Reply"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.wait(500);
        cy.get('mat-card-actions div').should('contain', 'Re: No \'To\', just \'CC\'');
    });

    it('can forward an email with no "To"', () => {
        cy.intercept('/rest/v1/email/download/*').as('get11');
        cy.visit('/');
        cy.wait('@get11', {'timeout':10000});
        cy.visit('/#Inbox:11');
        // cy.get('#messageContents');

        cy.get('button[mattooltip="Forward"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.wait(500);
        cy.get('mat-card-actions div').should('contain', 'Fwd: No \'To\', just \'CC\'');
    });

    it('can reply to an email with no "To" or "Subject"', () => {
        cy.intercept('/rest/v1/email/download/*').as('get13');
        cy.visit('/');
        cy.wait('@get13', {'timeout':10000});
        cy.visit('/#Inbox:13');
        // cy.get('#messageContents');

        cy.get('button[mattooltip="Reply"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.wait(500);
        cy.get('mat-card-actions div').should('contain', 'Re: ');
    });

    it('can forward an email with no "To" or "Subject"', () => {
        cy.intercept('/rest/v1/email/download/*').as('get13');
        cy.visit('/');
        cy.wait('@get13', {'timeout':10000});
        cy.visit('/#Inbox:13');
        // cy.get('#messageContents');

        cy.get('button[mattooltip="Forward"]').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
        });
        cy.wait(500);
        cy.get('mat-card-actions div').should('contain', 'Fwd: ');
    });

    it('Vertical to horizontal mode exposes full height button', () => {
        cy.intercept('/rest/v1/email/download/*').as('get11');
        cy.visit('/');
        cy.wait('@get11', {'timeout':10000});
        cy.visit('/#Inbox:11');

        // Make sure we're in vertical mode
        cy.get('button[mattooltip="Horizontal preview"]').click();

        cy.get('button[mattooltip="Full height"]').should('exist');        
    });

    it('Changing viewpane height is stored', () => {
        cy.intercept('/rest/v1/email/download/*').as('get11');
        cy.visit('/');
        cy.wait('@get11', {'timeout':10000});
        cy.visit('/#Inbox:11');
        // cy.hash().should('equal', '#Inbox:11');

        // Make sure we're in horizontal mode
        cy.get('button[mattooltip="Horizontal preview"]').click();
        // set full height
        cy.get('button[mattooltip="Full height"]').click().should(() => {
            expect(getResizerPercent()).to.eq(100);
        });
    });

    it('Half height reduces stored pane height', () => {
        cy.intercept('/rest/v1/email/download/*').as('get11');
        cy.visit('/');
        cy.wait('@get11', {'timeout':10000});
        cy.visit('/#Inbox:11');
        // cy.hash().should('equal', '#Inbox:11');

        // Make sure we're in horizontal mode
        cy.get('button[mattooltip="Horizontal preview"]').click();
        // set full height
        let resizerPercent = 0;
        cy.get('button[mattooltip="Full height"]').click().and(() => {
            resizerPercent = getResizerPercent();
        });
        cy.get('button[mattooltip="Half height"]').click().should(() => {
            expect(getResizerPercent()).to.be.eq(50);
            resizerPercent = getResizerPercent();
        });

        cy.get('button[mattooltip="Close"]').click().should(() => {
            expect(getResizerPercent()).to.equal(resizerPercent);
        });
    });

    it('Revisit open email in horizontal mode loads it', () => {
        cy.intercept('/rest/v1/email/download/*').as('get11');
        cy.visit('/');
        cy.wait('@get11', {'timeout':10000});
        cy.visit('/#Inbox:11');
        // cy.hash().should('equal', '#Inbox:11');

        // Switch to horizontal mode
        cy.get('button[mattooltip="Horizontal preview"]').click();

        // revisit
        cy.visit('/#Inbox#11');
        // Half height email pane should still be open
        cy.get('button[mattooltip="Full height"]').should('exist');
    });

    it('Can go out of mailviewer and back and still see our email', () => {
        cy.intercept('/rest/v1/email/download/*').as('get12');
        cy.visit('/');
        cy.wait('@get12',{'timeout':10000});
        cy.visit('/#Inbox:12');
        // cy.hash().should('equal', '#Inbox:12');

        cy.get('div#messageHeaderSubject').contains('Default from fix test');
        cy.get('#composeButton').click();
        cy.go('back');
        cy.get('div#messageHeaderSubject').contains('Default from fix test');
    });

    it('displays avatar bar for emails', () => {
        cy.intercept('/rest/v1/email/download/*').as('getEmail');
        cy.visit('/#Inbox:1');
        cy.wait('@getEmail', { timeout: 10000 });
        cy.get('app-avatar-bar').should('exist');
    });

    it('switches between plain text and HTML view', () => {
        cy.intercept('/rest/v1/email/download/*').as('getEmail');
        cy.visit('/#Inbox:11');
        cy.wait('@getEmail', { timeout: 10000 });

        cy.get('.htmlButtons').should('exist');
        cy.get('.iframe-container').should('not.exist');

        // clicking the HTML option's label asks for confirmation the first time
        cy.get('.htmlButtons mat-radio-button').eq(1).find('label').click();
        cy.get('mat-dialog-container').contains('Manually toggle HTML').click();
        cy.get('.iframe-container').should('exist');
        cy.get('.htmlButtons mat-radio-button').eq(1).should('have.class', 'mat-mdc-radio-checked');

        // the checkbox half of the reported symptom: images toggle works
        cy.get('.htmlButtons mat-checkbox[mattooltip="Show external images"]').click()
            .should('have.class', 'mat-mdc-checkbox-checked');
        // and toggling it off works too
        cy.get('.htmlButtons mat-checkbox[mattooltip="Show external images"]').click()
            .should('not.have.class', 'mat-mdc-checkbox-checked');

        // real browsers re-dispatch a bubbling click on the input for label
        // clicks; that second click used to revert the view toggle
        cy.get('.htmlButtons mat-radio-button').eq(0).find('label').click();
        cy.get('.htmlButtons mat-radio-button').eq(0).find('input')
            .then($input => $input[0].dispatchEvent(new MouseEvent('click', { bubbles: true })));
        cy.get('.iframe-container').should('not.exist');
        cy.get('.htmlButtons mat-radio-button').eq(0).should('have.class', 'mat-mdc-radio-checked');
        cy.get('.htmlButtons mat-checkbox[mattooltip*="only in HTML view"]').should('exist');
    });

    it('dismissing the html confirmation keeps the plain view', () => {
        cy.intercept('/rest/v1/email/download/*').as('getEmail');
        cy.visit('/#Inbox:11');
        cy.wait('@getEmail', { timeout: 10000 });

        cy.get('.htmlButtons').should('exist');
        cy.get('.htmlButtons mat-radio-button').eq(1).find('label').click();
        cy.get('mat-dialog-container').should('exist');

        // Escape cancels: no HTML view, and the radio pair reflects plain
        cy.get('mat-dialog-container').type('{esc}');
        cy.get('mat-dialog-container').should('not.exist');
        cy.get('.iframe-container').should('not.exist');
        cy.get('.htmlButtons mat-radio-button').eq(0).should('have.class', 'mat-mdc-radio-checked');
    });

    it('html dialog confirm does not carry over to another message', () => {
        cy.intercept('/rest/v1/email/download/*').as('getEmail');
        cy.visit('/#Inbox:11');
        cy.wait('@getEmail', { timeout: 10000 });

        cy.get('.htmlButtons').should('exist');
        cy.get('.htmlButtons mat-radio-button').eq(1).find('label').click();
        cy.get('mat-dialog-container').should('exist');

        // arrow-key navigation still works while the dialog is open; the
        // pending confirm must not enable HTML on the newly opened message
        cy.get('body').type('{downarrow}');
        cy.hash().should('not.eq', '#Inbox:11');
        cy.get('mat-dialog-container').contains('Manually toggle HTML').click();
        cy.wait(500);
        cy.get('.iframe-container').should('not.exist');
    });
});
