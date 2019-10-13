import { browser, by, element, until, Key } from 'protractor';

export class ComposePage {
  navigateTo() {
    return browser.get('/')
        .then(() => browser.executeScript(() => localStorage.setItem('localSearchPromptDisplayed221', 'true'))
        .then(() => browser.get('/compose?new=true')));
  }

  async replyToMessage() {
    await browser.get('/');

    let shouldclosesyncdialog = true;
    await browser.wait(until.elementLocated(
            by.tagName('confirm-dialog')), 5000
          ).catch(() => {
            shouldclosesyncdialog = false;
          })
          .then(async () => {
            if (shouldclosesyncdialog) {
              const buttonLocator = by.css('.mat-dialog-actions button:nth-child(3)');
              await browser.wait(until.elementLocated(buttonLocator), 10000);
              await new Promise(resolve => setTimeout(resolve, 1000));
              await element(buttonLocator).click();
              console.log(await element(buttonLocator).getWebElement().getText());
            }
          });

    browser.wait(async () => !(await element(
        by.tagName('confirm-dialog')).isPresent()), 10000
    );

    const canvaselement = element(by.tagName('canvastable'));
    await browser.wait(until.elementLocated(by.tagName('canvastable')), 10000);

    await browser.actions()
      .mouseMove(canvaselement, {x: 300, y: 10})
      .click()
      .perform();

    await browser.wait(until.elementLocated(
        by.tagName('single-mail-viewer')), 10000
      );

    const toggleHtmlCheckboxLocator = by.css('mat-checkbox[mattooltip="Toggle HTML view"]');
    await browser.wait(until.elementLocated(toggleHtmlCheckboxLocator));
    await new Promise(resolve => setTimeout(resolve, 500));
    await element(toggleHtmlCheckboxLocator).click();

    const htmlDialogDontAskButtonLocator = by.cssContainingText('button', 'Manually toggle HTML');
    browser.wait(() => element(htmlDialogDontAskButtonLocator).isPresent(), 10000);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (await element(htmlDialogDontAskButtonLocator).isPresent()) {
      element(htmlDialogDontAskButtonLocator).click();
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    const replyButtonLocator = by.css('button[mattooltip="Reply"]');
    await browser.wait(until.elementLocated(replyButtonLocator));
    await element(replyButtonLocator).click();
  }

  waitForRedirect() {
    return browser.wait(until.elementLocated(by.tagName('mat-card-actions')), 10000);
  }

  getDraftActionBarText() {
    return element(by.css('mat-card-actions div')).getText();
  }

  waitForDraftActionBarTextToEqual(subject: string) {
    const elm = element(by.css('mat-card-actions div'));
    return browser.wait(until.elementTextIs(elm.getWebElement(), subject), 10000);
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

  async setSubjectInputField(value: string) {
    const elm = element(by.css('input[placeholder="Subject"]'));
    await elm.sendKeys(value);
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
