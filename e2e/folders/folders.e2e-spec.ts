import { browser } from 'protractor';
import { FolderPage } from './folders.po';
import { MockServer } from '../mockserver/mockserver';

describe('Folders', () => {
  let page: FolderPage;

  let server: MockServer;
  beforeEach(() => {
    server = new MockServer();
    page = new FolderPage();

    server.start();
  });

  afterEach(() => {
    browser.manage().logs().get('browser').then(function(browserLogs) {
        // browserLogs is an array of objects with level and message fields
        browserLogs.forEach((log) => {
            console.log(log);
        });
     });
     server.stop();
  });

  it('should create folder at root level', async () => {
    await page.navigateTo();
    await page.waitForRedirect();
    browser.waitForAngularEnabled(false);
    await page.clickCreateFolder();

    await page.waitForInputDialog();

    expect(page.getInputDialogText()).toContain('root level');

    await page.enterFolderNameAndClickDone('Test');
    await page.waitForFolderToExistInTree('Test');
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

