describe('Receipt page', () => {
    it('can display receipt details', () => {
        cy.intercept('GET', '/rest/v1/me').as('getMe');
        cy.intercept('GET', '/rest/v1/account_product/receipt/**').as('getReceipt');
        cy.visit('/account/receipt/31337');
        cy.wait('@getMe');
        cy.wait('@getReceipt');
        cy.get('app-account-receipt-component', { timeout: 10000 }).should('exist');
        cy.contains('Payment receipt');
    });

    it('displays transaction information', () => {
        cy.intercept('GET', '/rest/v1/me').as('getMe');
        cy.intercept('GET', '/rest/v1/account_product/receipt/**').as('getReceipt');
        cy.visit('/account/receipt/31337');
        cy.wait('@getMe');
        cy.wait('@getReceipt');
        cy.get('app-account-receipt-component', { timeout: 10000 });
        cy.contains('Transaction summary');
    });
});
