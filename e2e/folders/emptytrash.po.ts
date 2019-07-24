import { browser, by, element, until } from 'protractor';

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

    browser.wait(() => trashFolderActionsButton.isPresent(), 5000);
    await trashFolderActionsButton.click();
    const emptyTrashButton = element(by.cssContainingText('div.mat-menu-content button', 'Empty trash'));
    browser.wait(() => emptyTrashButton.isPresent(), 5000);
    // Opening a sub menu seems to leave an overlay for some moment so we need to wait a bit more
    await (new Promise(r => setTimeout(r, 500))); // Not a good solution, but should be enough to wait for the overlay to disappear
    await emptyTrashButton.click();
  }

}
