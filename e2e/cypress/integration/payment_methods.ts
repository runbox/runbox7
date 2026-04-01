describe('Payment methods', () => {
    it('can list available payment methods', () => {
        cy.visit('/account/payment_cards');

        cy.contains('VISA ending in 1234');
        cy.contains('Mastercard (Apple Pay)');
    });

    it('can open add card dialog', () => {
        cy.visit('/account/payment_cards');
        cy.contains('VISA ending in 1234'); // Wait for page load

        cy.intercept('POST', '/rest/v1/account_product/payment_methods/', {
            body: { status: 'success', result: { client_secret: 'seti_test_secret_e2e' } }
        }).as('setupCard');

        cy.contains('button', 'Add a new card').click();
        cy.wait('@setupCard');

        cy.get('mat-dialog-container').should('exist');
    });
});
