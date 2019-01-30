import { browser, by, element, until } from 'protractor';

export class AppPage {
  navigateTo() {
    return browser.get('/')
        .then(() => browser.executeScript(() => localStorage.setItem('localSearchPromptDisplayed221', 'true')))
        .then(() => browser.get('/'));
  }

  getUrl() {
    return browser.getCurrentUrl();
  }

  waitForRedirect() {
    return browser.wait(until.elementLocated(by.id('loginHeader')), 10000);
  }

  getLoginHeaderText() {
    return element(by.css('#loginHeader h1')).getText();
  }

  async fillLoginInputsAndClickLoginButton() {
    await element(by.css('input[placeholder=Username]')).sendKeys('testuser');
    await element(by.css('input[placeholder=Password]')).sendKeys('testpassword');
    return element(by.cssContainingText('button', 'Log in')).click();
  }

  expectProgressBarWhileWaitingForLogin() {
    return browser.wait(until.elementLocated(by.css('div.loginSection mat-progress-bar')));
  }

  waitForLoggedIn() {
    return browser.wait(until.elementLocated(by.id('sidenavGreeting')), 10000);
  }

  getSidenavGreetingText() {
    return element(by.id('sidenavGreeting')).getText();
  }
}
