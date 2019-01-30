import { AppPage } from './domainregister.po';
import { MockServer } from '../mockserver/mockserver';
import { browser } from 'protractor';

describe('domainregister', () => {
  let page: AppPage;

  let server: MockServer;

  beforeEach(() => {
    server = new MockServer();
    server.start();
    page = new AppPage();
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

  it('should display domainregister component', async () => {
    page.navigateTo();
    await page.waitForRedirect();
    expect(page.getDomainRegistrationText()).toEqual('Domain Registration');
  });
});
