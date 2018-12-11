import { AppPage } from './app.po';

describe('angular2 App', () => {
  let page: AppPage;

  beforeEach(() => {
    page = new AppPage();
  });

  it('should display welcome message', async () => {
    page.navigateTo();
    await page.waitForRedirect();
    expect(page.getLoginHeaderText()).toEqual('Welcome to Runbox 7');
  });
});
