/// <reference types="cypress" />

describe('Import calendar event', () => {
    it('Should display import preview', () => {
        cy.visit('/calendar');

        cy.get('input[type=file]')
            // see https://docs.cypress.io/api/commands/selectfile#On-a-hidden-input
            .selectFile('e2e/cypress/fixtures/event.ics', {force: true});
        cy.contains('Pick up my car');
    });
});
