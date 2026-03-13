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
        cy.wait(['@getProfiles', '@getAliasLimits']);

        cy.get('#add-identity').click();
        // Wait for dialog content to be visible by checking for the form input
        cy.get('input[name="email"]', { timeout: 10000 }).should('be.visible').type('newprof@runbox.com');
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

        // Wait for dialog to close
        cy.get('app-profiles-edit', { timeout: 10000 }).should('not.exist');
    });

});
