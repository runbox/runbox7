/// <reference types="cypress" />

describe('Selecting rows in canvastable', () => {
    beforeEach(() => {
        // keep the local index prompt from rendering over the message list
        localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
    });

    function canvas() {
        return cy.get('canvastable canvas:first-of-type');
    }

    function moveButton() {
        return cy.get('button[mattooltip*="Move"]');
    }

    // the message data can arrive after the canvas does; retry the click
    // until the selection registers instead of racing the render
    function clickFirstRow(attempt = 0) {
        canvas().click({ x: 15, y: 40 });
        cy.get('body').then(($body) => {
            if (!$body.find('button[mattooltip*="Move"]').length && attempt < 20) {
                cy.wait(250);
                clickFirstRow(attempt + 1);
            }
        });
    }

    // same retry for the drag sweep used by the multi-row selection
    function sweepSelect(attempt = 0) {
        canvas().trigger('mousedown', { x: 15, y: 10 });
        for (let ndx = 0; ndx <= 5; ndx++) {
            canvas().trigger('mousemove', { x: 20, y: 36 * ndx + 11 });
        }
        cy.get('body').then(($body) => {
            if (!$body.find('button[mattooltip*="Move"]').length && attempt < 20) {
                cy.wait(250);
                sweepSelect(attempt + 1);
            }
        });
    }

    it('should select one row', () => {
        cy.viewport('iphone-6');
        cy.visit('/');

        // select
        clickFirstRow();
        moveButton().should('be.visible');
        // unselect
        canvas().click({ x: 21, y: 41, force: true });
        moveButton().should('not.exist');
    })

    it('should select multiple rows', () => {
        cy.viewport('iphone-6');
        cy.visit('/');

        sweepSelect();
        moveButton().should('be.visible');

        // unselect by moving mouse back up
        canvas().trigger('mousemove', { x: 21, y: 12 });
        moveButton().should('not.exist');
    })
})
