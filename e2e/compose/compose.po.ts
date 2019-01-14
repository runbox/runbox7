import { browser, by, element, until } from 'protractor';

export class ComposePage {
  navigateTo() {
    return browser.get('/compose?new=true');
  }

  waitForRedirect() {
    return browser.wait(until.elementLocated(by.tagName('mat-card-actions')), 10000);
  }

  getDraftActionBarText() {
    return element(by.css('mat-card-actions div')).getText();
  }
}
