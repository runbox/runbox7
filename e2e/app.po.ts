import { browser, by, element, until } from 'protractor';

export class AppPage {
  navigateTo() {
    return browser.get('/login');
  }

  waitForRedirect() {
    return browser.wait(until.elementLocated(by.id('loginHeader')), 10000);
  }

  getLoginHeaderText() {
    return element(by.css('#loginHeader h1')).getText();
  }
}
