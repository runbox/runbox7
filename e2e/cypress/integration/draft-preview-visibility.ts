/// <reference types="cypress" />

describe('Draft preview visibility (#430)', () => {
    beforeEach(async () => {
        localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
        (await indexedDB.databases())
            .filter(db => db.name && /messageCache/.test(db.name))
            .forEach(db => indexedDB.deleteDatabase(db.name!));
    });

    [1280, 375].forEach(width => {
        it(`hides other draft previews and restores them without losing edited text at ${width}px`, { retries: 0 }, () => {
            cy.viewport(width, 812);
            cy.visit('/compose?new=true');
            cy.get('compose .draftPreview').should('have.length.greaterThan', 0);
            cy.get('textarea[formcontrolname="msg_body"]:visible').first()
                .type('Keep this unsent message while hiding other drafts.');

            cy.contains('mat-checkbox', 'Show draft previews').scrollIntoView().should('be.visible').as('previewControl');
            cy.get('@previewControl').find('input').should('be.checked');
            cy.get('@previewControl').find('label').click();
            cy.get('compose .draftPreview').each($preview => {
                cy.wrap($preview).should('not.be.visible');
                expect($preview[0].getBoundingClientRect().height).to.equal(0);
            });
            cy.get('textarea[formcontrolname="msg_body"]:visible').first()
                .should('have.value', 'Keep this unsent message while hiding other drafts.');

            cy.get('@previewControl').find('label').click();
            cy.get('compose .draftPreview').first().scrollIntoView().should('be.visible');
            cy.get('compose .draft-card:not(.draftPreview) textarea[formcontrolname="msg_body"]').first()
                .should('have.value', 'Keep this unsent message while hiding other drafts.');
        });
    });
});
