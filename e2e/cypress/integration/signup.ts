// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
//
// This file is part of Runbox 7.
//
// Runbox 7 is free software: You can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// Runbox 7 is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

/// <reference types="cypress" />

describe('Signup', () => {
    beforeEach(() => {
        cy.intercept('GET', '/signup?legacy=1&runbox7=1', {
            statusCode: 200,
            body: `
                <html>
                    <body>
                        <form name="signup" action="/mail/signup">
                            <select name="runboxDomain">
                                <option value="runbox.com">runbox.com</option>
                                <option value="runbox.no">runbox.no</option>
                                <option value="rbx.email">rbx.email</option>
                            </select>
                            <div class="h-captcha" data-sitekey="test-site-key"></div>
                        </form>
                    </body>
                </html>
            `,
            headers: {
                'content-type': 'text/html',
            },
        }).as('legacySignup');

        cy.intercept('GET', 'https://hcaptcha.com/1/api.js?render=explicit', {
            statusCode: 200,
            body: 'window.hcaptcha = { render: function() { return "test-widget"; } };',
            headers: {
                'content-type': 'application/javascript',
            },
        }).as('hcaptchaScript');
    });

    it('should render the Angular signup page in the local mock-backed environment', () => {
        cy.visit('/signup?runbox7=1');
        cy.wait('@legacySignup');
        cy.wait('@hcaptchaScript');

        cy.location('pathname').should('eq', '/signup');
        cy.location('search').should('contain', 'runbox7=1');
        cy.contains('h1', 'Create a Runbox Account').should('exist');
        cy.get('form.signup-form').should('have.attr', 'action', '/mail/signup');
        cy.get('input[name="user"]').should('exist');
        cy.get('input[name="first_name"]').should('exist');
        cy.get('input[name="last_name"]').should('exist');
        cy.get('input[name="password"]').should('exist');
        cy.get('select[name="runboxDomain"]').find('option').should('have.length', 3);
        cy.get('select[name="runboxDomain"]').find('option').then((options) => {
            const domains = Array.from(options).map((option) => option.value);
            expect(domains).to.include('runbox.com');
            expect(domains).to.include('rbx.email');
        });
        cy.get('div.captcha-host').should('exist');
        cy.contains('button.submit', 'Set up my Runbox account').should('exist');
    });

    it('should show the public trust and transparency content', () => {
        cy.visit('/signup?runbox7=1');
        cy.wait('@legacySignup');
        cy.wait('@hcaptchaScript');

        cy.get('header.signup-header .brand img').should('be.visible');
        cy.get('header.signup-header .brand').should('not.contain', 'Runbox 7');

        cy.contains('.hero-panel h2', 'Privacy by Design').should('exist');
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
