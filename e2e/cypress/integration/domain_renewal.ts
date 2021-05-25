/// <reference types="cypress" />

describe('Renewing domains', () => {
    it('can renew a domain through domreg', () => {
        cy.visit('/account/subscriptions');

        cy.get('tr:contains("INC 10 year(s)")').get('.contentButton').contains('Renew').click();
        cy.url().should('include', '/domainregistration?renew_domain=monsters.inc');
    });
});
