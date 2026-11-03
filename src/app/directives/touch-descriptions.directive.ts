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

import { Directive, ElementRef, Inject, NgZone, OnDestroy, OnInit, Optional, Self } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatLegacyTooltip as MatTooltip } from '@angular/material/legacy-tooltip';

@Directive({ selector: '[appTouchDescriptions]' })
export class TouchDescriptionsDirective implements OnInit, OnDestroy {
    private items = new Set<TouchDescriptionDirective>();
    private removeListeners: (() => void)[] = [];
    private gestureListeners: (() => void)[] = [];
    private holdTimer: ReturnType<typeof setTimeout>;
    private clickTimer: ReturnType<typeof setTimeout>;
    private identifier: number | null = null;
    private origin: Touch;
    private originatingItem: TouchDescriptionDirective | null = null;
    private current: TouchDescriptionDirective | null = null;
    private exploring = false;
    private suppressClick = false;
    private navigationBounds = new Map<TouchDescriptionDirective, DOMRect>();

    constructor(private element: ElementRef<HTMLElement>, private zone: NgZone,
                @Inject(DOCUMENT) private document: Document) {}

    ngOnInit() {
        this.zone.runOutsideAngular(() => {
            const host = this.element.nativeElement;
            this.listen(host, 'touchstart', event => this.start(event as TouchEvent));
            this.listen(host, 'click', event => this.click(event as MouseEvent));
            this.listen(host, 'pointerdown', event => {
                if ((event as PointerEvent).pointerType === 'mouse') { this.clearClickSuppression(); }
            });
            this.listen(host, 'contextmenu', event => {
                if (this.identifier !== null) { event.preventDefault(); }
            });
        });
    }

    register(item: TouchDescriptionDirective) { this.items.add(item); }

    unregister(item: TouchDescriptionDirective) {
        this.items.delete(item);
        this.navigationBounds.delete(item);
        if (this.originatingItem === item) { this.cancel(); }
        else if (this.current === item) { this.show(null); }
    }

    contains(element: HTMLElement): boolean { return this.element.nativeElement.contains(element); }

    private listen(target: EventTarget, type: string, listener: EventListener,
                   removers = this.removeListeners) {
        target.addEventListener(type, listener, { capture: true, passive: false });
        removers.push(() => target.removeEventListener(type, listener, true));
    }

    private eligible(item: TouchDescriptionDirective): boolean {
        return this.contains(item.element) && item.available;
    }

    private start(event: TouchEvent) {
        if (event.touches.length !== 1) { this.cancel(); return; }
        this.cancel();
        this.clearClickSuppression();
        const item = Array.from(this.items).find(candidate =>
            this.eligible(candidate) && candidate.control.contains(event.target as Node));
        if (!item) { return; }
        this.originatingItem = item;
        this.origin = event.touches[0];
        this.identifier = this.origin.identifier;
        this.trackGesture();
        this.navigationBounds.clear();
        this.items.forEach(candidate => {
            if (candidate.navigation && this.eligible(candidate)) {
                this.navigationBounds.set(candidate, candidate.control.getBoundingClientRect());
            }
        });
        this.holdTimer = setTimeout(() => {
            if (!this.eligible(item)) { this.cancel(); return; }
            this.exploring = true;
            this.suppressClick = true;
            this.show(item);
        }, 500);
    }

    private trackGesture() {
        // Only a pending/active hold needs document listeners; normal page scrolling stays untouched.
        this.listen(this.document, 'touchstart', event => {
            if ((event as TouchEvent).touches.length > 1) { this.cancel(); }
        }, this.gestureListeners);
        this.listen(this.document, 'touchmove', event => this.move(event as TouchEvent), this.gestureListeners);
        this.listen(this.document, 'touchend', event => this.end(event as TouchEvent), this.gestureListeners);
        this.listen(this.document, 'touchcancel', () => this.cancel(), this.gestureListeners);
        this.listen(this.document, 'scroll', () => this.cancel(), this.gestureListeners);
        if (this.document.defaultView) {
            this.listen(this.document.defaultView, 'resize', () => this.cancel(), this.gestureListeners);
            this.listen(this.document.defaultView, 'blur', () => this.cancel(), this.gestureListeners);
        }
    }

    private move(event: TouchEvent) {
        if (this.identifier === null) { return; }
        const point = Array.from(event.touches).find(touch => touch.identifier === this.identifier);
        if (!point || event.touches.length !== 1) { this.cancel(); return; }
        if (!this.exploring) {
            // Moving before the hold is a native scroll, not a request to explore descriptions.
            if (Math.hypot(point.clientX - this.origin.clientX, point.clientY - this.origin.clientY) > 10) {
                this.cancel();
            }
            return;
        }
        event.preventDefault();
        const hit = this.document.elementFromPoint(point.clientX, point.clientY);
        const host = this.element.nativeElement;
        if (!hit || !host.contains(hit)) { this.show(null); return; }
        const item = Array.from(this.items).find(candidate => {
            if (!this.eligible(candidate)) { return false; }
            if (candidate.control.contains(hit)) { return true; }
            // Header labels move on reveal; retain their original horizontal touch targets.
            const bounds = this.navigationBounds.get(candidate);
            const toolbarBounds = host.getBoundingClientRect();
            return !!bounds && point.clientX >= bounds.left && point.clientX <= bounds.right &&
                point.clientY >= toolbarBounds.top && point.clientY <= toolbarBounds.bottom;
        });
        this.show(item || null);
    }

    private end(event: TouchEvent) {
        if (this.identifier === null) { return; }
        if (!Array.from(event.changedTouches).some(touch => touch.identifier === this.identifier)) { return; }
        if (this.exploring) { event.preventDefault(); }
        this.cancel();
    }

    private click(event: MouseEvent) {
        const pointer = event as PointerEvent;
        const source = event as MouseEvent & { sourceCapabilities?: { firesTouchEvents: boolean } };
        if (this.suppressClick && (event.detail > 0 || pointer.pointerType === 'touch' ||
            source.sourceCapabilities?.firesTouchEvents)) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }

    private show(item: TouchDescriptionDirective | null) {
        if (this.current === item) { return; }
        this.zone.run(() => {
            this.current?.hide();
            this.current = item;
            this.current?.show();
        });
    }

    private cancel() {
        clearTimeout(this.holdTimer);
        this.gestureListeners.forEach(remove => remove());
        this.gestureListeners = [];
        this.identifier = null;
        this.originatingItem = null;
        if (this.exploring) {
            clearTimeout(this.clickTimer);
            this.clickTimer = setTimeout(() => this.clearClickSuppression(), 1000);
        }
        this.exploring = false;
        this.show(null);
    }

    private clearClickSuppression() {
        clearTimeout(this.clickTimer);
        this.suppressClick = false;
    }

    ngOnDestroy() {
        this.cancel();
        this.clearClickSuppression();
        this.removeListeners.forEach(remove => remove());
        this.items.clear();
    }
}

@Directive({
    // Augment existing descriptions only inside an explicitly opted-in toolbar.
    // eslint-disable-next-line @angular-eslint/directive-selector
    selector: '[matTooltip], .mainMenu'
})
export class TouchDescriptionDirective implements OnInit, OnDestroy {
    element: HTMLElement;
    control: HTMLElement;
    navigation: boolean;
    private registered = false;

    constructor(element: ElementRef<HTMLElement>,
                @Optional() private toolbar: TouchDescriptionsDirective,
                @Optional() @Self() private tooltip: MatTooltip) {
        this.element = element.nativeElement;
        this.navigation = this.element.classList.contains('mainMenu');
    }

    get available(): boolean {
        return !!this.control && !this.control.matches(':disabled, [aria-disabled="true"]') &&
            (this.navigation || !!this.tooltip?.message && !this.tooltip.disabled);
    }

    ngOnInit() {
        this.control = this.navigation ? this.element.querySelector('a, button') :
            this.element.closest('a, button, [role="button"]');
        if (!this.toolbar || !this.control || !this.toolbar.contains(this.element)) { return; }
        // Disable Material's own hold timer before its ngAfterViewInit installs touch listeners.
        if (this.tooltip) { this.tooltip.touchGestures = 'off'; }
        this.toolbar.register(this);
        this.registered = true;
    }

    show() {
        if (this.navigation) { this.element.classList.add('touch-description-visible'); }
        else { this.tooltip.show(0); }
    }

    hide() {
        if (this.navigation) { this.element.classList.remove('touch-description-visible'); }
        else { this.tooltip.hide(0); }
    }

    ngOnDestroy() {
        if (this.registered) { this.toolbar.unregister(this); }
    }
}
