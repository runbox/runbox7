describe('Receipt page', () => {
    it('can display receipt details', () => {
        cy.visit('/account/receipt/31337');
        cy.get('app-account-receipt-component', { timeout: 10000 }).should('exist');
        cy.contains('Payment receipt');
    });

    it('displays transaction information', () => {
        cy.visit('/account/receipt/31337');
        cy.get('app-account-receipt-component', { timeout: 10000 });
        cy.contains('Transaction summary');
    });
});
