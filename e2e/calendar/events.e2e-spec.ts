import { browser, by, until, element } from 'protractor';
import { MockServer } from '../mockserver/mockserver';

describe('Create an event', () => {
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

    it('can create an event', async () => {
        await browser.get('/calendar');
        browser.waitForAngularEnabled(false);

        const calendarLocator = by.css('.calendarListItem');
        await browser.wait(until.elementLocated(calendarLocator), 5000);
        const calendarItem = element(calendarLocator);
        expect(calendarItem.getText()).toContain('Mock Calendar', 'Calendar got loaded');

        const buttonLocator = by.css('#addEventButton');
        await browser.wait(until.elementLocated(buttonLocator), 5000);
        const addEventButton = element(buttonLocator);

        expect(
            addEventButton.getText()
        ).toContain('Add event', 'there is a button to create a calendar event');

        addEventButton.click();

        const titleLocator = by.css('input[placeholder=Title]');
        await browser.wait(until.elementLocated(titleLocator), 1000);

        await element(titleLocator).sendKeys('my test event');
        element(by.cssContainingText('mat-select', 'Calendar')).click();
        element(by.cssContainingText('mat-option', 'Mock Calendar')).click();
        element(by.css('#eventSubmitButton')).click();

        const eventLocator = by.css('.calendarMonthDayEvent');
        await browser.wait(until.elementLocated(eventLocator), 1000);

        expect(
            element(eventLocator).getText()
        ).toContain('my test event', 'event shows up with the right name');
    });
});
