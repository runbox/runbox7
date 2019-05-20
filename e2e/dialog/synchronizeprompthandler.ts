import { browser, until, element, by } from 'protractor';

export async function closesyncdialog() {
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
}
