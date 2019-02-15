import { browser, by, until, element } from 'protractor';
import { MockServer } from '../mockserver/mockserver';

describe('Multiple search fields', () => {

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

  it('should display multiple search field panel', async () => {
    await browser.get('/')
        .then(() => browser.executeScript(() => localStorage.setItem('localSearchPromptDisplayed221', 'true')))
        .then(() => browser.get('/'));

    browser.waitForAngularEnabled(false);
    const toolbutton = element(
        by.css('mat-toolbar mat-form-field button'));
    await browser.wait(toolbutton.isPresent(), 5000);
    toolbutton.click();
    const subjectfield = element(
        by.css('input[placeholder=Subject]')
    );
    await browser.wait(subjectfield.isPresent(),  5000);
    subjectfield.sendKeys('testsubject');

    const mainSearchField  = element(by.css('mat-toolbar input[placeholder="Start typing to search messages"]'));
    console.log('searchfield value:', await mainSearchField.getAttribute('value'));
    await browser.wait(() => mainSearchField.getAttribute('value'), 5000);

    expect(await mainSearchField.getAttribute('value')).toBe('subject:"testsubject"');
  });

});

