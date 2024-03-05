/// <reference types="cypress" />

describe('Profiles settings page', () => {

    const ALLOWED_DOMAINS = ['runbox.com', 'example.com'];

    it('lists currently existing profiles', () => {
        cy.intercept('GET', '/rest/v1/profiles').as('getProfiles');
        cy.intercept('GET', '/rest/v1/aliases/limits').as('getAliasLimits');
        cy.visit('/account/identities');
        cy.wait('@getProfiles');

        // 1 compose profile, 5 valid ones:
        cy.get('mat-card-content.profile-content').should('have.length', 6);
    });

    it('can create new profiles', () => {
        cy.intercept('GET', '/rest/v1/profiles').as('getProfiles');
        cy.intercept('GET', '/rest/v1/aliases/limits').as('getAliasLimits');
        cy.visit('/account/identities');
        cy.wait('@getAliasLimits');

        cy.get('#add-identity').click();

        // open dialog, fill in fields, submit
        cy.get('app-profiles-edit').should('be.visible');
        cy.get('input[name="email"]').type('newprof@runbox.com');
        cy.get('input[name="from"]').type('My Name');
        cy.get('input[name="name"]').type('My Profile');
        cy.get('textarea[name="signature"]').type('My Sig');

        cy.intercept('POST', '/rest/v1/profile', {
            statusCode: 200,
            body: {
                status: 'success',
                result: {id: 1}
            }
        }).as('postProfile');
        cy.get('button#save').click();
        cy.wait('@postProfile');

        cy.get('app-profiles-edit').should('not.exist');
    });

});
