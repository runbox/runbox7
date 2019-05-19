import { browser, by, until, element } from 'protractor';
import { MockServer } from '../mockserver/mockserver';
import { CanvasTablePage } from './canvastable.po';
import { closesyncdialog } from '../dialog/synchronizeprompthandler';

describe('canvastable', () => {

  let server: MockServer;

  beforeEach(async () => {
    server = new MockServer();
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

  it('should select multiple rows', async () => {
    browser.waitForAngularEnabled(false);
    await browser.get('/');
    await closesyncdialog();

    const page = new CanvasTablePage();
    await page.selectRows();
  });

});

