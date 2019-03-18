import { browser, by, element, until, Key } from 'protractor';

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

  async setRecipientInputField(value: string) {
    const elm = element(by.css('mailrecipient-input input'));
    await elm.sendKeys(value);
    await elm.sendKeys(Key.TAB);
  }

  waitForMailRecipientErrorInputToBePresent() {
    return browser.wait(until.elementLocated(by.css('mailrecipient-input mat-error')), 10000);
  }

  waitForMailRecipientErrorInputToBeAbsent() {
    return browser.wait(
      element(by.css('mailrecipient-input mat-error'))
      .isPresent()
      .then(present => !present), 10000);
  }

  getRecipientErrorText() {
    return element(by.css('mailrecipient-input mat-error')).getText();
  }
}
