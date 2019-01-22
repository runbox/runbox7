import { browser, by, element, until, Key } from 'protractor';

export class EmptyTrashPage {
  navigateTo() {
    return browser.get('/')
        .then(() => browser.executeScript(() => localStorage.setItem('localSearchPromptDisplayed221', 'true')))
        .then(() => browser.get('/'));
  }

  waitForRedirect() {
    return browser.wait(until.elementLocated(by.css('button[aria-label="toggle Trash"]')), 20000);
  }

  waitForEmptyTrashProgress() {
    return browser.wait(element(by.cssContainingText('snack-bar-container', 'Deleting')).isPresent(), 10000);
  }

  waitForEmptyTrashProgressFinished() {
    return browser.wait(element(by.cssContainingText('snack-bar-container', 'Deleting'))
      .isPresent()
      .then(present => !present), 10000);
  }

  async clickEmptyTrash() {
    const trashFolderActionsButton = element(by.cssContainingText('mat-tree-node', 'Trash'))
                .element(by.css('button.mat-icon-button[mattooltip="Folder actions"]'));

    trashFolderActionsButton.click();
    await browser.wait(until.elementLocated(by.css('div.mat-menu-content button')), 10000);
    const emptyTrashButton = element(by.cssContainingText('div.mat-menu-content button', 'Empty trash'));
    emptyTrashButton.click();
  }

}
