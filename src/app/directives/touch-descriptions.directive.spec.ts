// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
//
// This file is part of Runbox 7.
//
// Runbox 7 is free software: You can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// Runbox 7 is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Platform } from '@angular/cdk/platform';
import { OverlayContainer } from '@angular/cdk/overlay';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { RunboxCommonModule } from '../common/common.module';

@Component({
    template: `
        <div appTouchDescriptions style="position: fixed; top: 20px; left: 20px; display: flex">
            <button id="first" matTooltip="First action" (click)="actions.push('first')"
                    style="width: 80px; height: 40px"><span>First</span></button>
            <button id="second" matTooltip="Second action" (click)="actions.push('second')"
                    style="width: 80px; height: 40px">Second</button>
            <button id="nested" (click)="actions.push('nested')" style="width: 80px; height: 40px">
                <span matTooltip="Save draft">Save</span>
            </button>
            <button id="menu" matTooltip="More actions" [matMenuTriggerFor]="menu">More</button>
            <mat-menu #menu="matMenu"><button mat-menu-item>Menu option</button></mat-menu>
            <input id="input" matTooltip="Search text" />
            <div class="mainMenu">
                <a id="nav" href="#contacts" (click)="$event.preventDefault(); actions.push('nav')">
                    Contacts<p class="mainMenuDesc">Contacts</p>
                </a>
            </div>
            <button *ngIf="showDynamic" id="dynamic" matTooltip="Dynamic action"
                    (click)="actions.push('dynamic')">Dynamic</button>
        </div>
        <button id="outside" matTooltip="Outside action">Outside</button>
    `
})
class TouchDescriptionTestComponent {
    actions: string[] = [];
    showDynamic = false;
}

describe('Touch toolbar descriptions (#2002)', () => {
    let fixture: ComponentFixture<TouchDescriptionTestComponent>;
    let overlay: OverlayContainer;

    function element(id: string): HTMLElement {
        return fixture.nativeElement.querySelector('#' + id);
    }

    function contact(id: string, identifier = 1): Touch {
        const target = element(id);
        const rect = target.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;
        return { identifier, target, clientX, clientY, pageX: clientX, pageY: clientY,
            screenX: clientX, screenY: clientY, force: 1, radiusX: 1, radiusY: 1, rotationAngle: 0 };
    }

    function touch(type: string, target: HTMLElement, current: Touch[], changed = current): TouchEvent {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperties(event, {
            touches: { value: current }, targetTouches: { value: current },
            changedTouches: { value: changed }
        });
        target.dispatchEvent(event);
        return event as TouchEvent;
    }

    function click(id: string, detail = 1): MouseEvent {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true, detail });
        element(id).dispatchEvent(event);
        return event;
    }

    function start(id = 'first'): Touch {
        const point = contact(id);
        touch('touchstart', element(id), [point]);
        return point;
    }

    function settle(ms = 0) {
        tick(ms);
        fixture.detectChanges();
        tick();
        fixture.detectChanges();
    }

    function visibleDescription(): string {
        return overlay.getContainerElement().textContent?.trim() || '';
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [CommonModule, MatTooltipModule, MatMenuModule, RunboxCommonModule, NoopAnimationsModule],
            declarations: [TouchDescriptionTestComponent],
            providers: [{ provide: Platform, useValue: {
                isBrowser: true, ANDROID: true, IOS: false, FIREFOX: true,
                SAFARI: false, WEBKIT: false, BLINK: false, EDGE: false, TRIDENT: false
            } }]
        });
        fixture = TestBed.createComponent(TouchDescriptionTestComponent);
        fixture.detectChanges();
        overlay = TestBed.inject(OverlayContainer);
    });

    afterEach(() => {
        if (!fixture.componentRef.hostView.destroyed) { fixture.destroy(); }
        overlay.ngOnDestroy();
    });

    it('shows the description on hold and prevents the release click from running the action', fakeAsync(() => {
        const point = start();
        settle(600);
        expect(visibleDescription()).toContain('First action');
        touch('touchend', element('first'), [], [point]);
        const generatedClick = click('first');
        settle();
        expect(fixture.componentInstance.actions).toEqual([]);
        expect(generatedClick.defaultPrevented).toBeTrue();
        flush();
    }));

    it('follows the finger to another description without activating either control', fakeAsync(() => {
        start();
        settle(600);
        const point = contact('second');
        touch('touchmove', element('first'), [point]);
        settle();
        expect(visibleDescription()).toContain('Second action');
        expect(visibleDescription()).not.toContain('First action');
        touch('touchend', element('first'), [], [point]);
        click('first');
        click('second');
        settle();
        expect(fixture.componentInstance.actions).toEqual([]);
        flush();
    }));

    it('lets a later deliberate tap activate the original control', fakeAsync(() => {
        const first = start();
        settle(600);
        touch('touchend', element('first'), [], [first]);
        click('first');
        const second = start();
        settle(50);
        touch('touchend', element('first'), [], [second]);
        click('first');
        settle();
        expect(fixture.componentInstance.actions).toEqual(['first']);
        flush();
    }));

    it('allows a scrolling gesture before the hold threshold without showing a description', fakeAsync(() => {
        const point = start();
        const moved = { ...point, clientX: point.clientX + 30 } as Touch;
        const move = touch('touchmove', element('first'), [moved]);
        settle(600);
        expect(move.defaultPrevented).toBeFalse();
        expect(visibleDescription()).toBe('');
        expect(element('first').style.touchAction).not.toBe('none');
        touch('touchcancel', element('first'), [], [moved]);
        settle();
        flush();
    }));

    it('keeps normal short taps working without showing a description', fakeAsync(() => {
        const point = start();
        settle(50);
        touch('touchend', element('first'), [], [point]);
        click('first');
        expect(fixture.componentInstance.actions).toEqual(['first']);
        expect(visibleDescription()).toBe('');
        flush();
    }));

    it('suppresses a compatibility mouse sequence generated after the hold', fakeAsync(() => {
        const point = start();
        settle(600);
        touch('touchend', element('first'), [], [point]);
        element('first').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        element('first').dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        click('first');
        expect(fixture.componentInstance.actions).toEqual([]);
        flush();
    }));

    it('allows a real mouse pointer to activate a control after a held touch', fakeAsync(() => {
        const point = start();
        settle(600);
        touch('touchend', element('first'), [], [point]);
        const pointer = new Event('pointerdown', { bubbles: true });
        Object.defineProperty(pointer, 'pointerType', { value: 'mouse' });
        element('second').dispatchEvent(pointer);
        click('second');
        expect(fixture.componentInstance.actions).toEqual(['second']);
        flush();
    }));

    it('allows keyboard activation after exploring descriptions', fakeAsync(() => {
        const point = start();
        settle(600);
        touch('touchend', element('first'), [], [point]);
        click('second', 0);
        expect(fixture.componentInstance.actions).toEqual(['second']);
        flush();
    }));

    it('cancels a pending hold when a second finger lands outside the toolbar', fakeAsync(() => {
        const point = start();
        touch('touchstart', element('outside'), [point, contact('outside', 2)]);
        settle(600);
        expect(visibleDescription()).not.toContain('First action');
        expect(visibleDescription()).toContain('Outside action');
        flush();
    }));

    it('cancels a pending hold on touchcancel', fakeAsync(() => {
        const point = start();
        touch('touchcancel', element('first'), [], [point]);
        settle(600);
        expect(visibleDescription()).toBe('');
        flush();
    }));

    it('reveals the existing header label without following its link', fakeAsync(() => {
        const point = start('nav');
        settle(600);
        expect(element('nav').parentElement.classList).toContain('touch-description-visible');
        touch('touchend', element('nav'), [], [point]);
        click('nav');
        expect(fixture.componentInstance.actions).toEqual([]);
        expect(element('nav').parentElement.classList).not.toContain('touch-description-visible');
        flush();
    }));

    it('uses the whole button hit area when its tooltip belongs to a child icon', fakeAsync(() => {
        const point = start('nested');
        settle(600);
        expect(visibleDescription()).toContain('Save draft');
        touch('touchend', element('nested'), [], [point]);
        click('nested');
        expect(fixture.componentInstance.actions).toEqual([]);
        flush();
    }));

    it('prevents a menu trigger from opening on release and lets a subsequent tap open it', fakeAsync(() => {
        const point = start('menu');
        settle(600);
        touch('touchend', element('menu'), [], [point]);
        click('menu');
        settle();
        expect(overlay.getContainerElement().querySelector('[role="menu"]')).toBeNull();
        const next = start('menu');
        touch('touchend', element('menu'), [], [next]);
        click('menu');
        settle();
        expect(overlay.getContainerElement().querySelector('[role="menu"]')).not.toBeNull();
        flush();
    }));

    it('supports controls created and destroyed while the toolbar remains present', fakeAsync(() => {
        fixture.componentInstance.showDynamic = true;
        fixture.detectChanges();
        const original = element('dynamic');
        const point = start('dynamic');
        settle(600);
        expect(visibleDescription()).toContain('Dynamic action');
        fixture.componentInstance.showDynamic = false;
        fixture.detectChanges();
        settle();
        expect(visibleDescription()).not.toContain('Dynamic action');
        touch('touchend', original, [], [point]);
        const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        element('first').dispatchEvent(context);
        expect(context.defaultPrevented).toBeFalse();
        const move = touch('touchmove', element('first'), [contact('first')]);
        expect(move.defaultPrevented).toBeFalse();
        flush();
    }));

    it('suppresses the native context menu only during an eligible touch gesture', fakeAsync(() => {
        const ordinary = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        element('nav').dispatchEvent(ordinary);
        expect(ordinary.defaultPrevented).toBeFalse();
        const point = start('nav');
        const held = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        element('nav').dispatchEvent(held);
        expect(held.defaultPrevented).toBeTrue();
        touch('touchcancel', element('nav'), [], [point]);
        flush();
    }));

    it('hides the description outside the toolbar while keeping the release inert', fakeAsync(() => {
        start();
        settle(600);
        const point = { ...contact('first'), clientX: 1000, clientY: 600 } as Touch;
        touch('touchmove', element('first'), [point]);
        settle();
        expect(visibleDescription()).toBe('');
        touch('touchend', element('first'), [], [point]);
        click('first');
        expect(fixture.componentInstance.actions).toEqual([]);
        flush();
    }));

    it('leaves search-input touches outside toolbar exploration', fakeAsync(() => {
        const point = contact('input');
        const beginning = touch('touchstart', element('input'), [point]);
        const move = touch('touchmove', element('input'), [{ ...point, clientX: point.clientX + 30 }]);
        expect(beginning.defaultPrevented).toBeFalse();
        expect(move.defaultPrevented).toBeFalse();
        touch('touchend', element('input'), [], [point]);
        flush();
    }));

    it('cleans up a pending hold when the toolbar is destroyed', fakeAsync(() => {
        start();
        fixture.destroy();
        tick(600);
        expect(visibleDescription()).toBe('');
        flush();
    }));

    it('cleans up a visible description when the toolbar is destroyed', fakeAsync(() => {
        start();
        settle(600);
        fixture.destroy();
        tick(600);
        expect(visibleDescription()).toBe('');
        flush();
    }));

    it('keeps the eventual release inert if a different preview target disappears', fakeAsync(() => {
        fixture.componentInstance.showDynamic = true;
        fixture.detectChanges();
        start();
        settle(600);
        const point = contact('dynamic');
        touch('touchmove', element('first'), [point]);
        settle();
        expect(visibleDescription()).toContain('Dynamic action');
        fixture.componentInstance.showDynamic = false;
        fixture.detectChanges();
        settle(1500);
        touch('touchend', element('first'), [], [point]);
        click('first');
        expect(fixture.componentInstance.actions).toEqual([]);
        flush();
    }));

    it('cancels a pending hold when its originating control is removed', fakeAsync(() => {
        fixture.componentInstance.showDynamic = true;
        fixture.detectChanges();
        const original = element('dynamic');
        const point = start('dynamic');
        fixture.componentInstance.showDynamic = false;
        fixture.detectChanges();
        touch('touchend', original, [], [point]);
        const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        element('first').dispatchEvent(context);
        expect(context.defaultPrevented).toBeFalse();
        settle(600);
        expect(visibleDescription()).toBe('');
        flush();
    }));
});
