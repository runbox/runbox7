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
          expect(JSON.parse(localStorage.getItem('221:localSearchPromptDisplayed'))).to.equal('true');
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

    it('keeps message actions visible while offering the initial index', () => {
        cy.viewport(1025, 600);
        cy.request('/rest/e2e/logout');
        cy.request('/rest/e2e/disable2fa');

        expectLoginPage();
        enterCredentials();
        clickLogin();

        cy.get('#offerLocalIndex').should('be.visible');
        cy.get('canvastable canvas:first-of-type').click({ x: 15, y: 40 });
        cy.get('.messageListActionButtonsRight').should('be.visible');
        cy.get('.messageListActionButtonsRight > button').its('length').should('be.greaterThan', 2);
        cy.get('.messageListActionButtonsRight > button').eq(1).find('mat-icon')
            .should('have.attr', 'svgicon', 'delete');
        cy.get('.messageListActionButtonsRight > button').then(($buttons) => {
            const actionArea = $buttons[0].parentElement.getBoundingClientRect();
            const menu = $buttons[0].ownerDocument.querySelector('#mailMenuContainer').getBoundingClientRect();
            for (let i = 0; i < 3; i++) {
                const button = $buttons[i].getBoundingClientRect();
                expect(button.left).to.be.at.least(actionArea.left);
                expect(button.right).to.be.at.most(actionArea.right);
                expect(button.right).to.be.at.most(menu.right);
            }
        });
        cy.get('#offerLocalIndex button').each(($button) => {
            const rect = $button[0].getBoundingClientRect();
            expect(rect.left).to.be.at.least(0);
            expect(rect.right).to.be.at.most(Cypress.config('viewportWidth'));
            cy.wrap($button).should('be.visible').and('not.be.disabled');
        });
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
