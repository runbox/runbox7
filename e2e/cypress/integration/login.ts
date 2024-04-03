/// <reference types="cypress" />

describe('Login', () => {
    function expectLoginPage() {
        cy.visit('/');
        cy.get('#loginHeader h1').should('contain', 'Runbox');
    }

    function enterCredentials() {
        cy.get('input[data-placeholder=Username]').type('testuser');
        cy.get('input[data-placeholder=Password]').type('testpassword');
    }

    function clickLogin() {
        cy.get('button:contains(Log in)').click();
        cy.get('div.loginSection mat-progress-bar').should('exist');
    }

    function expectWebmail() {
        cy.get('#sidenavGreeting').should('contain', 'test@runbox.com');
        cy.get('#offerLocalIndex').should('contain', 'Runbox');
        cy.get('#offerLocalIndex mat-list-item button[data-cy="cancel-button"]').click().should(() => {
          expect(JSON.parse(localStorage.getItem('221:Desktop:localSearchPromptDisplayed'))).to.equal('true');
        });
    }

    it('should log in', () => {
        cy.request('/rest/e2e/logout');
        cy.request('/rest/e2e/disable2fa');

        expectLoginPage();
        enterCredentials();
        clickLogin();

        expectWebmail();
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

        expectWebmail();
    });
});
