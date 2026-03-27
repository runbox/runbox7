describe('Personal details page', () => {
    it('can load personal details page', () => {
        cy.visit('/account/details');
        cy.get('app-personal-details-component', { timeout: 10000 }).should('exist');
    });

    it('displays user information form', () => {
        cy.visit('/account/details');
        cy.get('app-personal-details-component', { timeout: 10000 });
        cy.get('input[formcontrolname="first_name"]', { timeout: 10000 }).should('exist');
    });
});
