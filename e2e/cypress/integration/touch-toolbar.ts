/// <reference types="cypress" />

describe('Exploring toolbar descriptions with native touch', () => {
    interface Point { x: number; y: number; }
    type TouchPhase = 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel';
    let touching = false;
    const touchListeners: (() => void)[] = [];

    function protocol(command: string, params: Record<string, unknown>) {
        return Cypress.automation('remote:debugger:protocol', { command, params });
    }

    function sendTouch(type: TouchPhase, point?: Point) {
        return protocol('Input.dispatchTouchEvent', {
            type,
            touchPoints: point ? [{ x: point.x, y: point.y, id: 1, radiusX: 1, radiusY: 1, force: 1 }] : []
        }).then(() => { touching = !!point; });
    }

    function pointOn(selector: string) {
        let stableElement: HTMLElement | undefined;
        let stableBounds: DOMRect | undefined;
        let stableSince = 0;
        return cy.get<HTMLElement>(selector).should('be.visible').should(elements => {
            expect(elements.length, 'one native touch target').to.equal(1);
            const element = elements[0];
            const bounds = element.getBoundingClientRect();
            const now = performance.now();
            // The viewer animates its layout for 200 ms; measure only after a quiet interval.
            if (element !== stableElement || !stableBounds ||
                Math.abs(bounds.left - stableBounds.left) > 0.25 ||
                Math.abs(bounds.top - stableBounds.top) > 0.25 ||
                Math.abs(bounds.width - stableBounds.width) > 0.25 ||
                Math.abs(bounds.height - stableBounds.height) > 0.25) {
                stableElement = element;
                stableBounds = bounds;
                stableSince = now;
            }
            expect(now - stableSince, 'native touch target bounds have settled for 250 ms').to.be.at.least(250);
        }).then(elements => {
            const element = elements[0];
            const bounds = element.getBoundingClientRect();
            const localX = bounds.left + bounds.width / 2;
            const localY = bounds.top + bounds.height / 2;
            expect(element.contains(element.ownerDocument.elementFromPoint(localX, localY)),
                'native touch target is not covered').to.equal(true);

            // Cypress 12 owns this runner iframe; the cross-origin AUT's frameElement is null.
            const runner = Cypress as typeof Cypress & { $autIframe?: JQuery<HTMLIFrameElement> };
            expect(runner.$autIframe?.length, 'one Cypress AUT iframe').to.equal(1);
            const frame = runner.$autIframe?.[0];
            if (!frame) { throw new Error('Cypress did not expose its AUT iframe'); }
            expect(frame.contentWindow === element.ownerDocument.defaultView,
                'iframe belongs to the selected AUT document').to.equal(true);
            const frameBounds = frame.getBoundingClientRect();
            const view = frame.ownerDocument.defaultView;
            if (!view) { throw new Error('The Cypress iframe has no runner window'); }
            expect(frame.offsetWidth, 'unscaled iframe width').to.be.greaterThan(0);
            expect(frame.offsetHeight, 'unscaled iframe height').to.be.greaterThan(0);
            const x = frameBounds.left + (localX + frame.clientLeft) * frameBounds.width / frame.offsetWidth;
            const y = frameBounds.top + (localY + frame.clientTop) * frameBounds.height / frame.offsetHeight;
            expect(x, 'touch x is inside the runner viewport').to.be.within(0, view.innerWidth);
            expect(y, 'touch y is inside the runner viewport').to.be.within(0, view.innerHeight);
            expect(frame.ownerDocument.elementFromPoint(x, y) === frame,
                'native input reaches the AUT iframe').to.equal(true);
            return { x, y, target: element };
        });
    }

    function startTouch(selector: string) {
        let received: TouchEvent | undefined;
        let control: Element | undefined;
        const observe = (event: Event) => { received = event as TouchEvent; };
        return pointOn(selector).then(point => {
            control = point.target.closest('a, button, [role="button"]') || point.target;
            control.addEventListener('touchstart', observe, { capture: true, once: true });
            touchListeners.push(() => control?.removeEventListener('touchstart', observe, true));
            return sendTouch('touchStart', point);
        }).should(() => {
            expect(received?.isTrusted, `trusted touchstart reaches ${selector}`).to.equal(true);
            expect(control?.contains(received?.target as Node), 'touchstart targets the intended AUT control').to.equal(true);
        });
    }

    function tap(selector: string) {
        return startTouch(selector).then(() => Cypress.Promise.delay(50)).then(() => sendTouch('touchEnd'));
    }

    function navigationDescription(selector: string, visible: boolean) {
        return cy.get<HTMLElement>(`${selector} .mainMenuDesc`).should(elements => {
            const label = elements[0];
            const bounds = label.getBoundingClientRect();
            const toolbarElement = label.closest('mat-toolbar');
            if (!toolbarElement) { throw new Error('The navigation description has no toolbar'); }
            const toolbar = toolbarElement.getBoundingClientRect();
            const hit = label.ownerDocument.elementFromPoint(
                bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
            const exposed = bounds.top >= toolbar.top && bounds.bottom <= toolbar.bottom && label.contains(hit);
            expect(exposed, `${label.textContent?.trim()} description is exposed in the toolbar`).to.equal(visible);
        });
    }

    function visit(path: string) {
        cy.visit(path, {
            onBeforeLoad(win) {
                win.localStorage.setItem('221:localSearchPromptDisplayed', JSON.stringify('true'));
                win.localStorage.setItem('221:Global:messageSubjectDragTipShown', JSON.stringify('true'));
                win.localStorage.setItem('221:Desktop:mailViewerOnRightSide', JSON.stringify('true'));
                win.localStorage.setItem('221:preference_keys',
                    '["Global:messageSubjectDragTipShown", "Desktop:mailViewerOnRightSide"]');
            }
        });
    }

    before(() => {
        expect(Cypress.browser.family,
            'native touch acceptance requires Chromium (including the default Electron browser)').to.equal('chromium');
    });

    beforeEach(() => {
        cy.viewport(1920, 1080);
        cy.then(() => protocol('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 }));
    });

    afterEach(() => {
        cy.then(() => {
            touchListeners.splice(0).forEach(remove => remove());
            const release = touching ? sendTouch('touchCancel') : Cypress.Promise.resolve();
            return release.then(() => protocol('Emulation.setTouchEmulationEnabled', { enabled: false }));
        });
    });

    it('holds and slides across header descriptions without navigating, then accepts a normal tap', () => {
        const contacts = '#mainMenuContainer a[routerlink="/contacts"]';
        const calendar = '#mainMenuContainer a[routerlink="/calendar"]';
        visit('/');
        cy.location('pathname').should('equal', '/');

        startTouch(`${contacts} mat-icon`);
        cy.wait(550);
        navigationDescription(contacts, true);
        pointOn(`${calendar} mat-icon`).then(point => sendTouch('touchMove', point));
        navigationDescription(calendar, true);
        navigationDescription(contacts, false);
        cy.location('pathname').should('equal', '/');
        cy.then(() => sendTouch('touchEnd'));
        navigationDescription(calendar, false);

        // Include Chromium's delayed compatibility-click window before asserting no action.
        cy.wait(350);
        cy.location('pathname').should('equal', '/');
        tap(`${contacts} mat-icon`);
        cy.location('pathname').should('equal', '/contacts');
        cy.contains('Runbox 7 Contacts').should('be.visible');
    });

    it('describes Reply on hold without composing, then replies on a normal tap', () => {
        const reply = 'single-mail-viewer button[mattooltip="Reply"]';
        visit('/#Inbox:11');
        cy.get('#messageHeaderSubject').should('contain', 'No \'To\', just \'CC\'');
        cy.hash().should('equal', '#Inbox:11');

        startTouch(reply);
        cy.get('.mat-tooltip-show').should('be.visible').and('have.text', 'Reply');
        cy.location('pathname').should('equal', '/');
        cy.then(() => sendTouch('touchEnd'));
        cy.get('.mat-tooltip-show').should('not.exist');
        cy.wait(350);
        cy.location('pathname').should('equal', '/');
        cy.hash().should('equal', '#Inbox:11');

        tap(reply);
        cy.location('pathname').should('equal', '/compose');
        cy.get('mat-card-actions div').should('contain', 'Re: No \'To\', just \'CC\'');
    });

    it('describes the mobile attachment button without opening its picker until a normal tap', () => {
        cy.viewport('iphone-6');
        visit('/compose?new=true');
        cy.get('#attachMobile').should('be.visible').scrollIntoView();
        cy.get('#attachMobile').closest('mat-card').find<HTMLInputElement>('input[type="file"]').then(inputs => {
            expect(inputs.length, 'one file input for the editing draft').to.equal(1);
            cy.stub(inputs[0], 'click').as('chooseFiles');
        });

        startTouch('#attachMobile');
        cy.get('.mat-tooltip-show').should('be.visible').and('have.text', 'Attach files');
        cy.get('@chooseFiles').should('not.have.been.called');
        cy.then(() => sendTouch('touchEnd'));
        cy.get('.mat-tooltip-show').should('not.exist');
        cy.wait(350);
        cy.get('@chooseFiles').should('not.have.been.called');

        tap('#attachMobile');
        cy.get('@chooseFiles').should('have.been.calledOnce');
        cy.location('pathname').should('equal', '/compose');
    });
});
