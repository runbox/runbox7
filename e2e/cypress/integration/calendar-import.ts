/// <reference types="cypress" />

describe('Import calendar event', () => {
    it('Should display import preview', () => {
        cy.visit('/calendar');

        cy.get('input[type=file]').attachFile({ filePath: 'event.ics' });
        cy.contains('Pick up my car');
    });
});
