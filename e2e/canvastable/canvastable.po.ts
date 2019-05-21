import { browser, by, element, until } from 'protractor';

export class CanvasTablePage {

    async selectRows() {
        const canvasLocator = by.css('canvastable canvas:first-of-type');

        await until.elementLocated(canvasLocator);
        const canvas = element(canvasLocator);

        await browser.actions()
            .mouseMove(canvas, {x: 15, y: 10})
            .perform();

        await new Promise(resolve => setTimeout(resolve, 500));
        await browser.actions().mouseDown().perform();

        await new Promise(resolve => setTimeout(resolve, 100));

        for (let ndx = 0; ndx <= 5; ndx++) {
            await browser.actions().mouseMove(canvas, {x: 20, y: 36 * ndx + 11}).perform();
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        await browser.wait(() => element(by.css('button[mattooltip*="Move"]')).isPresent(), 5000);

        // unselect by moving mouse back up
        await browser.actions().mouseMove(canvas, {x: 21, y: 12}).perform();

        await browser.wait(async () => !(await element(by.css('button[mattooltip*="Move"]')).isPresent()), 5000);
    }

    async selectOneRow() {
        const canvasLocator = by.css('canvastable canvas:first-of-type');

        await until.elementLocated(canvasLocator);
        const canvas = element(canvasLocator);

        await browser.actions()
            .mouseMove(canvas, {x: 15, y: 40})
            .perform();

        await new Promise(resolve => setTimeout(resolve, 500));
        await browser.actions().click().perform();

        await new Promise(resolve => setTimeout(resolve, 500));

        await browser.wait(() => element(by.css('button[mattooltip*="Move"]')).isPresent(), 5000);

        // unselect
        await browser.actions().mouseMove(canvas, {x: 21, y: 41}).click().perform();

        await new Promise(resolve => setTimeout(resolve, 500));

        await browser.wait(async () => !(await element(by.css('button[mattooltip*="Move"]')).isPresent()), 5000);
    }
}
