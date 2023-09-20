/// <reference types="cypress" />

describe('Selecting rows in canvastable', () => {
    function canvas() {
        return cy.get('canvastable canvas:first-of-type');
    }

    function moveButton() {
        return cy.get('button[mattooltip*="Move"]');
    }

    it('should select one row', () => {
        cy.viewport('iphone-6');
        cy.visit('/');
        cy.closeWelcomeDialog();

        // select
        canvas().click({ x: 15, y: 40 });
        moveButton().should('be.visible');
        // unselect
        canvas().click({ x: 21, y: 41, force: true });
        moveButton().should('not.exist');
    })

    it('should select multiple rows', () => {
        cy.viewport('iphone-6');
        cy.visit('/');
        cy.closeWelcomeDialog();

        canvas().trigger('mousedown', { x: 15, y: 10 });
        for (let ndx = 0; ndx <= 5; ndx++) {
            canvas().trigger('mousemove', { x: 20, y: 36 * ndx + 11 });
        }
        moveButton().should('be.visible');

        // unselect by moving mouse back up
        canvas().trigger('mousemove', { x: 21, y: 12 });
        moveButton().should('not.exist');
    })
})
