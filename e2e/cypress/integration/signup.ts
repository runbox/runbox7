/// <reference types="cypress" />

describe('Signup', () => {
    it('should render the deployed Angular signup page', () => {
        cy.visit('/app/signup?runbox7=1');

        cy.location('pathname').should('eq', '/app/signup');
        cy.location('search').should('contain', 'runbox7=1');
        cy.contains('h1', 'Create a Runbox Account').should('exist');
        cy.get('form.signup-form').should('have.attr', 'action').and('match', /signup/);
        cy.get('input[name="user"]').should('exist');
        cy.get('input[name="first_name"]').should('exist');
        cy.get('input[name="last_name"]').should('exist');
        cy.get('input[name="password"]').should('exist');
        cy.get('select[name="runboxDomain"]').find('option').should('have.length.greaterThan', 1);
        cy.get('select[name="runboxDomain"]').find('option').then((options) => {
            const domains = Array.from(options).map((option) => option.value);
            expect(domains).to.include('runbox.com');
        });
        cy.get('div.captcha-host').should('exist');
        cy.contains('button.submit', 'Set up my Runbox account').should('exist');
    });

    it('should show the public trust and transparency content', () => {
        cy.visit('/app/signup?runbox7=1');

        cy.get('header.signup-header .brand img').should('be.visible');
        cy.get('header.signup-header .brand').should('not.contain', 'Runbox 7');

        cy.contains('.hero-panel h2', 'Privacy by business model').should('exist');
        cy.contains('.hero-panel h2', 'Hosted in Norway').should('exist');
        cy.contains('.hero-panel h2', 'Sustainable and secure').should('exist');
        cy.contains('.hero-panel h2', 'How the trial works').should('exist');

        cy.contains('.hero-panel', 'customer email content is private').should('exist');
        cy.contains('.form-section', 'default sender name recipients will see').should('exist');

        cy.get('.info-chip').should('have.length.at.least', 3);
        cy.contains('.field-label, .field small', 'Existing email address').should('exist');
        cy.contains('.field-label, .field small', 'How did you hear about Runbox?').should('exist');

        cy.contains('.form-actions button.submit', 'Set up my Runbox account').should('exist');
        cy.contains('a', 'Use legacy signup page').should('not.exist');
    });
});
