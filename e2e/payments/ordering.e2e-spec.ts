import { browser, by, until, element } from 'protractor';
import { MockServer } from '../mockserver/mockserver';

describe('Purchase a subscription', () => {
    let server: MockServer;

    beforeEach(() => {
        server = new MockServer();
        server.start();
    });

    afterEach(() => {
        browser.manage().logs().get('browser').then(function(browserLogs) {
            // browserLogs is an array of objects with level and message fields
            browserLogs.forEach((log) => {
                console.log(log);
            });
        });
        server.stop();
    });

    it('can purchase a subscription', async () => {
        await browser.get('/account/upgrades');
        browser.waitForAngularEnabled(false);

        let buttonLocator = by.css('#productGrid .contentButton');
        await browser.wait(until.elementLocated(buttonLocator), 5000);
        const upgradeButton = element(buttonLocator);

        expect(
            upgradeButton.getText()
        ).toContain('Upgrade', 'there is a button that offers to upgrade your subscription');

        upgradeButton.click();
        buttonLocator = by.css('#shoppingCartButton');
        await browser.wait(until.elementLocated(buttonLocator), 5000);
        const cartButton = element(buttonLocator);
        expect(
            cartButton.getText()
        ).toContain('shopping_cart', 'a button pops up with a shopping cart icon');

        cartButton.click();

        expect(
            browser.getCurrentUrl()
        ).toContain('/account/cart', 'we got redirected to the shopping cart');

        const tableLocator = by.css('.mat-table');
        await browser.wait(until.elementLocated(tableLocator), 5000);

        element.all(by.css('.mat-table tbody tr')).then(rows => {
            expect(rows.length).toBe(1, '1 row in the shopping cart table');
        });

        const otherPayments = element(by.css('mat-expansion-panel-header'));
        otherPayments.click();

        const giroLocator = by.css('button#payDirectly');
        await browser.wait(until.elementLocated(giroLocator), 5000);
        const giro = element(giroLocator);
        giro.click();

        expect(
            browser.getCurrentUrl()
        ).toContain('/account/receipt', 'we got redirected to the receipt page');
    });
});
