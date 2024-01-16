/// <reference types="cypress" />

describe('Ordering products', { testIsolation: false }, () => {
    it('can place an order', () => {
        localStorage.removeItem('221:shoppingCart');
        cy.intercept('/rest/v1/account_product/available').as('availableProducts');
        cy.visit('/account/plans');

        cy.wait('@availableProducts', {'timeout':10000});
        cy.get('.productGrid .purchaseButton').contains('Purchase').click();
        cy.get('#shoppingCartButton').should('be.visible');
    });

    it('cart contains the purchased product', () => {
        cy.get('#shoppingCartButton').click();
        cy.url().should('include', '/account/cart');
        cy.get('.mat-table tbody tr')
            .and('contain', 'Runbox Test')
            .and('contain', '13.37 EUR');
    });

    it('can select a payment method and pay', () => {
        cy.contains('mat-expansion-panel-header', 'Other payment methods').click();
        cy.get('button#payDirectly').click();
        cy.url().should('include', '/account/receipt');
    });

    it('can order product twice to increase quantity', () => {
        cy.visit('/account/plans');

        cy.get('#shoppingCartButton').should('not.exist');

        cy.get('.productGrid #purchaseButton').contains('Purchase').click();
        cy.get('#shoppingCartButton').should('be.visible');
        cy.get('#shoppingCartButton .mat-badge-content').should('contain', '1');

        cy.get('.productGrid #purchaseButton').contains('Purchase').click();
        cy.get('#shoppingCartButton .mat-badge-content').should('contain', '1');

        cy.get('#shoppingCartButton').click();

        cy.get('tr.mat-row td:nth-of-type(1)').should('contain', 'Runbox Addon');
        cy.get('tr.mat-row td:nth-of-type(2)').should('contain', '2');
        cy.get('tr.mat-row td button').click();
        cy.contains('shopping cart is currently empty');
    });
});
