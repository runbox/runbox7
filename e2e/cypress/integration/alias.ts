/// <reference types="cypress" />

describe('Aliases settings page', () => {
    const ALIASES = [
        {
            id: 1,
            localpart: 'test',
            domain: 'runbox.com',
            forward_to: 'mctestface@runbox.com'
        },
        {
            id: 2,
            localpart: 'akalou',
            domain: 'runbox.com',
            forward_to: 'a.kalou@shadowcat.co.uk'
        }
    ];

    const ALLOWED_DOMAINS = ['runbox.com', 'shadowcat.co.uk'];

    it('lists currently existing aliases', () => {
        cy.intercept('GET', '/rest/v1/aliases', {
            status: 'success', 
            result: {aliases: ALIASES}
        }).as('getAliases');
        cy.visit('/account/aliases');
        cy.wait('@getAliases');

        cy.get('mat-form-field.alias').should('have.length', ALIASES.length);
    });

    it('can create new aliases', () => {
        cy.intercept('GET', '/rest/v1/aliases', {
            status: 'success', 
            result: {aliases: []}
        }).as('getAliases');
        cy.intercept('GET', '/rest/v1/alias/allowed_domains', {
            status: 'success',
            result: {allowed_domains: ALLOWED_DOMAINS}
        }).as('getAllowedDomains');
        cy.visit('/account/aliases');

        cy.get('#create-new-alias').click();
        cy.wait('@getAllowedDomains');

        // open dialog, fill in fields, submit
        cy.get('app-aliases-edit').should('be.visible');
        cy.get('mat-select[name="domain"]').click();
        cy.get('mat-option').first().click();
        cy.get('input[name="localpart"]').type('mctestface');
        cy.get('input[name="forward_to"]')
            // check forward to is already filled in as the users email
            .should('have.value', 'test@runbox.com')
            // erase and use a different forward
            .clear().type('akalou@shadowcat.co.uk');

        cy.intercept('POST', '/rest/v1/alias', {
            statusCode: 200,
            body: {
                status: 'success',
                result: {alias: {id: 1}}
            }
        }).as('postAlias');
        cy.get('button#save').click();
        cy.wait('@postAlias');
        
        // check we have the right number of aliases
        cy.get('mat-form-field.alias').should('have.length', 1);

        cy.get('mat-form-field.forward_to')
            .first()
            .find('input')
            .should('have.value', 'akalou@shadowcat.co.uk');
        
        cy.get('mat-form-field.alias')
            .first()
            .find('input')
            .should('have.value', `mctestface@${ALLOWED_DOMAINS[0]}`);
    });

    it('can edit an alias', () => {
        cy.intercept('GET', '/rest/v1/aliases', {
            status: 'success', 
            result: {aliases: ALIASES}
        }).as('getAliases');
        cy.intercept('GET', '/rest/v1/alias/allowed_domains', {
            status: 'success',
            result: {allowed_domains: ALLOWED_DOMAINS}
        }).as('getAllowedDomains');
        cy.visit('/account/aliases');
        cy.wait('@getAliases');

        cy.get('button#edit-alias').first().click();
        cy.wait('@getAllowedDomains');

        // open dialog, fill in fields, submit
        cy.get('app-aliases-edit').should('be.visible');
        cy.get('mat-select[name="domain"]').click();
        cy.get('mat-option').first().click();
        // can't change localpart after its been set
        cy.get('input[name="localpart"]').should('have.attr', 'readonly');
        cy.get('input[name="forward_to"]')
            // check forward to is already filled in as the users email
            .should('have.value', 'mctestface@runbox.com')
            // erase and use a different forward
            .clear().type('akalou@shadowcat.co.uk');

        cy.intercept('PUT', `/rest/v1/alias/${ALIASES[0].id}`, {
            statusCode: 200,
            body: {
                status: 'success',
                result: {alias: {id: ALIASES[0].id}}
            }
        }).as('postAlias');
        cy.get('button#save').click();
        cy.wait('@postAlias');

        // check we have the right number of aliases
        cy.get('mat-form-field.alias').should('have.length', 2);

        cy.get('mat-form-field.forward_to')
            .first()
            .find('input')
            .should('have.value', 'akalou@shadowcat.co.uk');
    });

    it('can delete an alias', () => {
        cy.intercept('GET', '/rest/v1/aliases', {
            status: 'success', 
            result: {aliases: ALIASES}
        }).as('getAliases');
        cy.visit('/account/aliases');
        cy.wait('@getAliases');

        cy.get('button#delete-alias').first().click();

        cy.intercept('DELETE', `/rest/v1/alias/${ALIASES[0].id}`, {
            statusCode: 200,
            body: {
                status: 'success',
                result: {alias: {id: ALIASES[0].id}}
            }
        }).as('postAlias');
        cy.get('button#delete').click();
        cy.wait('@postAlias');

        // one less than we started with
        cy.get('mat-form-field.alias').should('have.length', 1);
    });
});