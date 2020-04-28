/// <reference types="cypress" />

describe('Ordering products from URLs', () => {
    it('can purchase product in a different currency', () => {
        // make sure we can purchase USD products even though the user uses EUR

        const order = {
            items: [{ pid: 12345, quantity: 1 }],
        };

        const product_data = {
            status: 'success',
            result: {
                products: [{
                    subtype: 'domain',
                    type: 'addon',
                    description: 'Domain Product 12345',
                    currency: 'USD',
                    name: 'Domain #12345',
                    price: 14.95,
                    pid: 12345,
                }]
            }
        };

        const txn_details = {
            status: 'success',
            result: {
                tid: 311,
                total: 14.95,
                currency: 'USD'
            }
        }

        cy.server();

        cy.route({
            method: 'GET',
            url: '/rest/v1/account_product/available?pids=12345',
            response: JSON.stringify(product_data),
        });

        cy.route({
            method: 'POST',
            url: '/rest/v1/account_product/order',
            response: JSON.stringify(txn_details),
        }).as('makeOrder');

        cy.visit('/account/cart?for=' + JSON.stringify(order));

        cy.get('app-payment-method[logo_alt*=Stripe]').get('button').contains('Proceed').click();

        cy.get('@makeOrder').should((xhr) => {
            const params = xhr.request.body;
            expect(params.currency).to.equal('USD');
        });
    });
});
