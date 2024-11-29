/// <reference types="cypress" />

import { checkMessage, checkedMessages, rangeCheckMessages } from '../component/message_list.ts';

function moveButton() {
    return cy.get('button[mattooltip*="Move"]');
}

describe('Selecting rows in canvastable', () => {
    it('should select and deselect one row', () => {
        cy.viewport('iphone-6');
        cy.visit('/');

        moveButton().should('not.exist');
        checkMessage(0)
        moveButton().should('be.visible');
        checkedMessages().should('have.length', 1)
        checkMessage(0)
        moveButton().should('not.exist');
    })

    it('should select multiple rows', () => {
        cy.viewport('iphone-6');
        cy.visit('/');

        rangeCheckMessages(0, 5)


        // Verify multiple checkboxes are checked
        checkedMessages().should('have.length', 6);

        moveButton().should('be.visible');

        checkMessage(0)

        // Verify count decreases
        checkedMessages().should('have.length', 5)

        rangeCheckMessages(1, 5)
        checkedMessages().should('have.length', 0)
        moveButton().should('not.exist');
    });

})
