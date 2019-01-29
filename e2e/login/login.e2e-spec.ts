import { AppPage } from './login.po';
import { MockServer } from '../mockserver/mockserver';
import { browser } from 'protractor';

describe('login', () => {
  let page: AppPage;

  let server: MockServer;

  beforeEach(() => {
    server = new MockServer();
    server.start();
    server.loggedIn = false;
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

  it('should display welcome message', async () => {
    page.navigateTo();
    await page.waitForRedirect();

    expect(page.getLoginHeaderText()).toEqual('Welcome to Runbox 7');
    expect(await page.getUrl()).toContain('/login');
  });

  it('should log in', async () => {
    page.navigateTo();
    await page.waitForRedirect();

    await page.fillLoginInputsAndClickLoginButton();
    await page.waitForLoggedIn();
    browser.waitForAngularEnabled(false);
    expect(await page.getSidenavGreetingText()).toContain('test@runbox.com');
  });
});
