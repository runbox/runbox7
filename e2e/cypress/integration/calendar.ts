/// <reference types="cypress" />

describe('Create calendar event', () => {
    it('Should create an event', () => {
        cy.visit('/calendar');

        cy.get('.calendarListItem').should('have.length', 1).and('contain', 'Mock Calendar');

        cy.get('#addEventButton').should('contain', 'Add Event').click();
        cy.get('input[data-placeholder=Title]').type('my test event');
        cy.get('#eventSubmitButton').click();

        cy.get('.calendarMonthDayEvent').contains('my test event');
    });
});
