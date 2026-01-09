/// <reference types="cypress" />

describe('Overview navigation', () => {
    const buildIndexResponse = () => {
        const now = Math.floor(Date.now() / 1000);
        return [
            `1\t${now}\t${now}\tInbox\t1\t0\t0\t"Test" <test@runbox.com>\tTest2<test2@lalala.no>\tOverview test message\t709\tn\t `,
            `2\t${now}\t${now}\tInbox\t1\t0\t0\t"Test" <test@runbox.com>\tTest2<test2@lalala.no>\tOverview test message 2\t709\tn\t `
        ].join('\n');
    };

    const setPreference = (win: Window, key: string, value: string) => {
        const prefKey = `${key}`;
        const existingKeys = JSON.parse(win.localStorage.getItem('221:preference_keys') || '[]') as string[];
        const nextKeys = Array.from(new Set([...existingKeys, prefKey]));
        win.localStorage.setItem('221:preference_keys', JSON.stringify(nextKeys));
        win.localStorage.setItem(`221:${prefKey}`, JSON.stringify(value));
    };

    const visitOverview = () => {
        cy.intercept('/mail/download_xapian_index*', {
            body: buildIndexResponse()
        }).as('downloadIndex');

        cy.visit('/', {
            onBeforeLoad(win) {
                win.localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
                setPreference(win, 'Desktop:showPopularRecipients', 'true');
                win.localStorage.setItem('221:preferences_version', JSON.stringify(1));
            }
        });
    };

    const openFirstOverviewMessage = () => {
        cy.get('app-overview-sender-hilights a', { timeout: 20000 }).first().click();
        cy.get('single-mail-viewer', { timeout: 20000 }).should('exist');
        cy.get('app-virtual-scroll-table tbody.selected', { timeout: 20000 }).should('exist');
    };

    // Skip: This test requires full Xapian WASM initialization which is not available
    // in the e2e mock environment. The index download mock provides message list data
    // but Xapian needs actual database files to initialize localSearchActivated.
    it.skip('opens messages after returning to overview', () => {
        visitOverview();

        cy.get('app-popular-recipients', { timeout: 20000 }).should('be.visible');
        cy.get('app-popular-recipients mat-expansion-panel-header', { timeout: 20000 })
            .should('be.visible')
            .click();
        cy.get('app-popular-recipients mat-expansion-panel-header')
            .should('have.attr', 'aria-expanded', 'true');
        cy.contains('app-popular-recipients mat-list-item', 'Synchronize index in order to use this feature')
            .should('be.visible')
            .click();
        cy.wait('@downloadIndex', { timeout: 20000 });

        cy.get('#overviewButton', { timeout: 30000 }).should('be.visible').click();
        cy.get('app-overview-sender-hilights a', { timeout: 20000 }).should('have.length.greaterThan', 0);

        openFirstOverviewMessage();

        cy.get('#overviewButton', { timeout: 30000 }).should('be.visible').click();
        cy.get('app-overview-sender-hilights a', { timeout: 20000 }).should('have.length.greaterThan', 0);

        openFirstOverviewMessage();
    });
});
