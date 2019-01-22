import { browser } from 'protractor';
import { EmptyTrashPage } from './emptytrash.po';

describe('Empty trash', () => {
  let page: EmptyTrashPage;

  beforeEach(() => {
      page = new EmptyTrashPage();
  });

  afterEach(() => {
    browser.manage().logs().get('browser').then(function(browserLogs) {
        // browserLogs is an array of objects with level and message fields
        browserLogs.forEach((log) => {
            console.log(log);
        });
     });
  });

  it('should empty trash', async () => {
    await page.navigateTo();
    await page.waitForRedirect();
    browser.waitForAngularEnabled(false);
    await page.clickEmptyTrash();

    await page.waitForEmptyTrashProgress();
    await page.waitForEmptyTrashProgressFinished();
  });
});

