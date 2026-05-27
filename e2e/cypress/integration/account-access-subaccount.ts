describe('Account access control', () => {
    function becomeSubaccount() {
        cy.intercept('/rest/v1/me', (req) => {
            req.continue((res) => {
                const payload = JSON.parse(res.body);
                payload.result.owner = {
                    uid: 666,
                    username: 'mastermind@runbox.com',
                };
              res.send(JSON.stringify(payload));
            });
        });
    }

    it('should not be able to renew as a subaccount', () => {
        becomeSubaccount();

        // Navigate directly to subscriptions page - subaccounts should be blocked
        cy.visit('/account/subscriptions');
        cy.url().should('not.include', '/account/subscriptions');
        cy.contains('mastermind@runbox.com');
    });

    it('should be able to access account security as a subaccount', () => {
        becomeSubaccount();

        cy.visit('/account/');
        cy.get('mat-expansion-panel-header').contains('Security').click();
        cy.get('mat-list-item').contains('Two-Factor Authentication').click();

        cy.url().should('include', '/account/2fa');
    });

    it('subaccount cannot access product pages', () => {
        becomeSubaccount();
        // Navigate directly to plans page - subaccounts should be redirected
        cy.visit('/account/plans');
        cy.url().should('include', '/account/not-for-subaccounts');
    });
});
