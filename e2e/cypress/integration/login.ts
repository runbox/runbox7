/// <reference types="cypress" />

describe('Login', () => {
    function expectLoginPage() {
        cy.visit('/');
        cy.get('#loginHeader h1').should('contain', 'Welcome to Runbox 7');
    }

    function enterCredentials() {
        cy.get('input[data-placeholder=Username]').type('testuser');
        cy.get('input[data-placeholder=Password]').type('testpassword');
    }

    function clickLogin() {
        cy.get('button:contains(Log in)').click();
        cy.get('div.loginSection mat-progress-bar').should('exist');
    }

    function expectmail() {
        cy.get('#sidenavGreeting').should('contain', 'test@runbox.com');
        cy.get('confirm-dialog').should('contain', 'Welcome to Runbox 7');
        cy.get('confirm-dialog .mat-dialog-actions button mat-icon[svgIcon="cancel"]').click().should(() => {
            expect(localStorage.getItem('localSearchPromptDisplayed221')).to.equal('true');
        });
    }

    it('should log in', () => {
        cy.request('/rest/e2e/logout');
        cy.request('/rest/e2e/disable2fa');

        expectLoginPage();
        enterCredentials();
        clickLogin();

        expectmail();
    });

    it('should log in with 2fa', () => {
        cy.request('/rest/e2e/logout');
        cy.request('/rest/e2e/require2fa');

        expectLoginPage();
        enterCredentials();
        clickLogin();

        cy.get('mat-button-toggle:contains(TOTP)').click();
        cy.get('input[data-placeholder="Timed one-time password"]').type('123456');
        clickLogin();

        expectmail();
    });
});
