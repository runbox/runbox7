/// <reference types="cypress" />

describe('Domain registration', () => {
    it('Shows the registration form when numeric-string quota has room (#1994)', () => {
        cy.intercept('GET', '/rest/v1/email_hosting/domains_quota', {
            result: { domain_quota_used: '7', domain_quota_allowed: '20' },
        });
        cy.intercept('GET', '/rest/v1/domain_registration/enom/tld_list', {
            result: {
                product_list: [{
                    tld: 'com', currency: 'USD', price: '10', supports_whois_privacy: false,
                    period: [{ period: 1, period_unit: 'year', price: '10' }],
                }],
            },
        });
        cy.visit('/domainregistration');
        cy.contains('domain-register h2', 'Register a new domain name').should('be.visible');
        cy.contains('domain-register h2', 'Email Domain quota limit').should('not.exist');
    });

    it('Should display domreg component', () => {
        cy.visit('/domainregistration');
        cy.get('domain-register mat-card-title').should('contain', 'Domain Registration');
    });
});
