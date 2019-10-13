import { ComposePage } from './compose.po';

import { browser, element, by, until } from 'protractor';
import { MockServer } from '../mockserver/mockserver';

describe('Compose', () => {
  let page: ComposePage;

  let server: MockServer;

  beforeEach(() => {
    server = new MockServer();
    server.start();
    page = new ComposePage();
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

  it('should display draft card', async () => {
    await page.navigateTo();
    await page.waitForRedirect();
    browser.waitForAngularEnabled(false);
    expect(page.getDraftActionBarText()).toEqual('New message');
    expect(await page.checkToRecipientInputFocus()).toBeTruthy();
  });

  it('should update action bar text to subject', async () => {
    await page.navigateTo();
    await page.waitForRedirect();
    browser.waitForAngularEnabled(false);

    expect(page.getDraftActionBarText()).toEqual('New message');
    await page.setSubjectInputField('Email about Subject X');

    await page.waitForDraftActionBarTextToEqual('Email about Subject X');
  });

  it('should complain on invalid email address', async () => {
    await page.navigateTo();
    await page.waitForRedirect();
    browser.waitForAngularEnabled(false);
    await page.setRecipientInputField('invalidaddress');
    await page.waitForMailRecipientErrorInputToBePresent();
    expect(page.getRecipientErrorText()).toEqual('Please enter a valid email address');
    await page.setRecipientInputField('test@example.com');
    await page.waitForMailRecipientErrorInputToBeAbsent();
  });

  it('should open reply draft with HTML editor', async () => {
    browser.waitForAngularEnabled(false);
    await page.replyToMessage();

    const iframelocator = by.tagName('iframe');
    await browser.wait(until.elementLocated(iframelocator), 10000);

    console.log('tinymce iframe located');
    await browser.switchTo().frame(element(iframelocator).getWebElement());

    console.log('switched to tinymce iframe');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(await element(by.tagName('body')).getText());
    expect(await element(by.tagName('body')).getText()).toContain('Testing session timeout');
    console.log('reply text located');
  });
});

