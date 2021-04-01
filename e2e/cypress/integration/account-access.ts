/// <reference types="cypress" />

describe('Account access control', () => {
    function becomeSubaccount() {
        cy.intercept('/rest/v1/me', (req) => {
            req.reply((res) => {
                const payload = JSON.parse(res.body);
                payload.result.owner = {
                    uid: 666,
                    username: 'mastermind@runbox.com',
                };
                res.body = JSON.stringify(payload);
            });
        });
    }

    it('should be able to renew as a main account', () => {
        cy.visit('/account/');
        cy.get('mat-expansion-panel-header').contains('Subscriptions').click();
        cy.get('mat-list-item').contains('Renewals').click();

        cy.url().should('include', '/account/renewals');
    });

    it('should not be able to renew as a subaccount', () => {
        becomeSubaccount();

        cy.visit('/account/');
        cy.get('mat-expansion-panel-header').contains('Subscriptions').click();
        cy.get('mat-list-item').contains('Renewals').click();

        cy.url().should('not.include', '/account/renewals');
        cy.contains('mastermind@runbox.com');
    });

    it('should be able to access account security as a main account', () => {
        cy.visit('/account/');
        cy.get('mat-expansion-panel-header').contains('Security').click();
        cy.get('mat-list-item').contains('Security').click();

        cy.url().should('include', '/account/security');
    });

    it('should be able to access account security as a subaccount', () => {
        becomeSubaccount();

        cy.visit('/account/');
        cy.get('mat-expansion-panel-header').contains('Security').click();
        cy.get('mat-list-item').contains('Security').click();

        cy.url().should('include', '/account/security');
    });
});
