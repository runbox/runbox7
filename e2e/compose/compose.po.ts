import { browser, by, element, until, Key } from 'protractor';

export class ComposePage {
  navigateTo() {
    return browser.get('/')
        .then(() => browser.executeScript(() => localStorage.setItem('localSearchPromptDisplayed221', 'true'))
        .then(() => browser.get('/compose?new=true')));
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

  async checkToRecipientInputFocus() {
    const elm = element(by.css('mailrecipient-input input[placeholder="To"]'));
    const elmPlaceHolder = await elm.getAttribute('placeholder');
    console.log('Mail recipient input placeholder', elmPlaceHolder);
    browser.wait(async () => {
      return (await browser.driver.switchTo().activeElement().getAttribute('placeholder')) === 'To';
    });
    const activeElement = await browser.driver.switchTo().activeElement();
    const activeElementPlaceHolder = await activeElement.getAttribute('placeholder');
    console.log('Active element placeholder', activeElementPlaceHolder);
    return elmPlaceHolder === 'To' && elmPlaceHolder === activeElementPlaceHolder;
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
