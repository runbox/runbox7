import { ComposePage } from './compose.po';

import { browser } from 'protractor';
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
    page.navigateTo();
    await page.waitForRedirect();
    browser.waitForAngularEnabled(false);
    expect(page.getDraftActionBarText()).toEqual('New message');
  });

  it('should complain on invalid email address', async () => {
    page.navigateTo();
    await page.waitForRedirect();
    browser.waitForAngularEnabled(false);
    await page.setRecipientInputField('invalidaddress');
    await page.waitForMailRecipientErrorInputToBePresent();
    expect(page.getRecipientErrorText()).toEqual('Please enter a valid email address');
    await page.setRecipientInputField('test@example.com');
    await page.waitForMailRecipientErrorInputToBeAbsent();
  });
});

