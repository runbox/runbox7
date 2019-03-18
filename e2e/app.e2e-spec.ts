import { AppPage } from './app.po';
import { MockServer } from './mockserver/mockserver';

describe('angular2 App', () => {
  let page: AppPage;
  let server: MockServer;

  beforeEach(() => {
    server = new MockServer();
    server.loggedIn = false;
    server.start();
    page = new AppPage();
  });

  it('should display welcome message', async () => {
    page.navigateTo();
    await page.waitForRedirect();
    expect(page.getLoginHeaderText()).toEqual('Welcome to Runbox 7');
  });

  afterEach(() => {
    server.stop();
  });
});
