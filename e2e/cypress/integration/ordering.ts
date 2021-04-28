/// <reference types="cypress" />

describe('Ordering products', () => {
    it('can place an order', () => {
        cy.visit('/account/upgrades');

        cy.get('#productGrid .contentButton').contains('Purchase').click();
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
        cy.visit('/account/addons');

        cy.get('#shoppingCartButton').should('not.exist');

        cy.get('button:contains(Purchase)').click();
        cy.get('#shoppingCartButton').should('be.visible');
        cy.get('#shoppingCartButton .mat-badge-content').should('contain', '1');

        cy.get('button:contains(Purchase)').click();
        cy.get('#shoppingCartButton .mat-badge-content').should('contain', '1');

        cy.get('#shoppingCartButton').click();

        cy.get('tr.mat-row td:nth-of-type(1)').should('contain', 'Runbox Addon');
        cy.get('tr.mat-row td:nth-of-type(2)').should('contain', '2');
        cy.get('tr.mat-row td button').click();
        cy.contains('shopping cart is currently empty');
    });
});
