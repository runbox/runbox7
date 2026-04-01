describe('Storage page', () => {
    it('can display storage usage', () => {
        cy.visit('/account/storage');
        cy.get('app-storage-data-component', { timeout: 10000 }).should('exist');
    });
});
