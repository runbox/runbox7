describe('Onscreen (Jitsi) page', () => {
    it('can load onscreen page', () => {
        cy.visit('/onscreen');
        cy.get('app-onscreen-component', { timeout: 10000 }).should('exist');
    });
});
