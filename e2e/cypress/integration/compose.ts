/// <reference types="cypress" />

describe('Composing emails', () => {
    beforeEach(() => {
        localStorage.setItem('localSearchPromptDisplayed221', 'true');
    });

    it('should display draft card', () => {
        cy.visit('/compose?new=true');
        cy.get('mat-card-actions div').should('contain', 'New message');
        cy.focused().should('have.attr', 'placeholder', 'To');
    });

    it('should update action bar text to subject', () => {
        cy.visit('/compose?new=true');

        cy.get('mat-card-actions div').should('contain', 'New message');
        cy.get('input[placeholder="Subject"]').type('Email about Subject X');
        cy.get('mat-card-actions div').should('contain', 'Subject X');
    });

    it('should complain on invalid email address', () => {
        cy.visit('/compose?new=true');

        cy.get('mailrecipient-input input').type('invalidaddress{enter}');
        cy.get('mailrecipient-input mat-error').should('contain', 'Please enter a valid email address');

        cy.get('mailrecipient-input input').clear().type('test@example.com{enter}');
        cy.get('mailrecipient-input mat-error').should('not.exist');
    });

    it('should open reply draft with HTML editor', () => {
        cy.visit('/#Inbox:1');
        cy.get('single-mail-viewer').should('exist');
        cy.get('mat-checkbox[mattooltip="Toggle HTML view"]').click();
        cy.contains('Manually toggle HTML').click();
        cy.get('mat-checkbox[mattooltip="Toggle HTML view"] input').should('be.checked');
        cy.get('button[mattooltip="Reply"]').click();
        // we assume that this is the tinymce frame
        cy.get('iframe').should('exist');
    });

    it('emailing a contact should not use their nickname', () => {
        cy.visit('/compose?new=true');
        cy.get('mailrecipient-input input').clear().type('postpat');
        // autocompletion should show the nickname...
        cy.get('mat-option:contains(Postpat)').click();
        // ...but the resulting contact should not
        cy.get('mat-chip').should('not.contain', 'Postpat');
    });

    it('closing a newly composed email should return where we started', () => {
        cy.visit('/compose');
        cy.visit('/compose?new=true');
        
        cy.get('button[mattooltip="Close draft"').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
            expect(loc.search).to.eq('');
        });
    });

    it('closing a new reply should return to inbox', () => {
        cy.visit('/#Inbox:1');
        cy.get('canvastable canvas:first-of-type').click({ x: 300, y: 10 });
        cy.get('single-mail-viewer').should('exist');
        cy.get('button[mattooltip="Reply"]').click();
        cy.get('button[mattooltip="Close draft"').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/');
            expect(loc.search).to.eq('');
        });
    });

    it('Send email on contacts page, composes an email', () => {
        cy.visit('/contacts');
        cy.contains('Welcome to Runbox 7 Contacts');
        cy.contains('Patrick Postcode').click();
        cy.contains('Send an email to this address').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/compose');
            expect(loc.search).to.eq('?to=patrick@post.no');
        });
        cy.get('mailrecipient-input mat-chip').should('contain', 'patrick@post.no');
    });

    it('closing a new email from contacts list, should return to contacts', () => {
        cy.visit('/contacts');
        cy.contains('Welcome to Runbox 7 Contacts');
        cy.contains('Patrick Postcode').click();
        cy.contains('Send an email to this address').click();
        // NB if we skip checking exist, we get an issue clicking the button
        // not loaded??
        cy.get('button[mattooltip="Close draft"').should('exist');
        cy.get('button[mattooltip="Close draft"').click();
        cy.location().should((loc) => {
            expect(loc.pathname).to.eq('/contacts/id-mr-postcode');
            expect(loc.search).to.eq('');
        }); 
    });

    it('should find the same address in original "To" and our "From" field in Reply', () => {
        cy.visit('/#Inbox:12');
        cy.get('single-mail-viewer').should('exist');
        const address = 'testmail@testmail.com';
        cy.get('.messageHeaderTo rmm7-contact-card a').contains(address, { matchCase: false });
        cy.get('button[mattooltip="Reply"]').click();
        cy.get('.mat-select-value-text span').contains(address, { matchCase: false });
    });
});
