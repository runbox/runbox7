/// <reference types="cypress" />

describe('Ordering products', () => {
    it('can place an order', () => {
        localStorage.removeItem('221:shoppingCart');
        cy.intercept('/rest/v1/account_product/upgrades').as('availableProducts');
        cy.visit('/account/plans');

        cy.wait('@availableProducts', {'timeout':10000});
        cy.get('#pricePlans .purchaseButton').contains('Select').click();
        cy.get('#shoppingCartButton').should('be.visible');

        cy.get('#shoppingCartButton').click();
        cy.url().should('include', '/account/cart');
        cy.get('.mat-table tbody tr')
            .and('contain', 'Runbox Test')
            .and('contain', '13.37 EUR');

        cy.contains('mat-expansion-panel-header', 'Other payment methods').click();
        cy.get('button#payDirectly').click();
        cy.url().should('include', '/account/receipt');
    });

    it('shows correct price per year for 3-year plans', () => {
        cy.intercept('/rest/v1/account_product/upgrades', {
            status: 'success',
            result: {
                products: [{
                    pid: 9001, name: 'Runbox Test 3-year', type: 'subscription', subtype: 'mini3',
                    description: 'Test 3-year plan', price: '84.95', currency: 'EUR',
                    quotas: { Disk: { type: 'bytes', quota: 10737418240 }, File: { type: 'bytes', quota: 10737418240 },
                              VirtualDomain: { type: 'count', quota: 1 }, Alias: { type: 'count', quota: 100 },
                              EmailSize: { type: 'bytes', quota: 104857600 }, MessagesReceived: { type: 'count', quota: 5000 },
                              SentMail: { type: 'count', quota: 1000 } },
                    over_quota: [], addons_needed: [], addon_usages: [], allow_multiple: false
                }, {
                    pid: 9002, name: 'Runbox Test', type: 'subscription', subtype: 'mini',
                    description: 'Test 1-year plan', price: '34.95', currency: 'EUR',
                    quotas: { Disk: { type: 'bytes', quota: 10737418240 }, File: { type: 'bytes', quota: 10737418240 },
                              VirtualDomain: { type: 'count', quota: 1 }, Alias: { type: 'count', quota: 100 },
                              EmailSize: { type: 'bytes', quota: 104857600 }, MessagesReceived: { type: 'count', quota: 5000 },
                              SentMail: { type: 'count', quota: 1000 } },
                    over_quota: [], addons_needed: [], addon_usages: [], allow_multiple: false
                }]
            }
        }).as('availableProducts');
        cy.intercept('/rest/v1/account_product/available*', { status: 'success', result: { products: [] } });
        cy.visit('/account/plans');
        cy.wait('@availableProducts', {'timeout':10000});

        // 84.95 / 3 = 28.3167 -> displayed as 28.32
        cy.get('.productGrid mat-card')
            .contains('Test 3-year')
            .parents('mat-card')
            .should('contain', 'Price per year: EUR 28.32');
    });

    it('can order product twice to increase quantity', () => {
        cy.visit('/account/plans');

        cy.get('#shoppingCartButton').should('not.exist');

        cy.get('.productGrid .purchaseButton').contains('Add').click();
        cy.get('#shoppingCartButton').should('be.visible');
        cy.get('#shoppingCartButton .mat-badge-content').should('contain', '1');

        cy.get('.productGrid .purchaseButton').contains('Add').click();
        cy.get('#shoppingCartButton .mat-badge-content').should('contain', '1');

        cy.get('#shoppingCartButton').click();

        cy.get('tr.mat-row td:nth-of-type(1)').should('contain', 'Runbox Addon');
        cy.get('tr.mat-row td:nth-of-type(2)').should('contain', '2');

        // Test increase/decrease addon amount:
        cy.get('tr.mat-row td button[name="increaseProduct"]').should('be.visible');
        cy.get('tr.mat-row td button[name="increaseProduct"]').click();
        cy.get('tr.mat-row td:nth-of-type(2)').should('contain', '3');
        // Test removing entire product
        cy.get('tr.mat-row td button[name="removeProduct"]').click();
        cy.contains('shopping cart is currently empty');
    });
});
