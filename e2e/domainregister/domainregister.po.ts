import { browser, by, element, until } from 'protractor';

export class AppPage {
  navigateTo() {
    return browser.get('/')
        .then(() => browser.executeScript(() => localStorage.setItem('localSearchPromptDisplayed221', 'true')))
        .then(() => browser.get('/domainregistration'));
  }

  getUrl() {
    return browser.getCurrentUrl();
  }

  waitForRedirect() {
    return browser.wait(until.elementLocated(by.css('domain-register')), 10000);
  }

  getDomainRegistrationText() {
    return element(by.css('domain-register mat-card-title')).getText();
  }

}
