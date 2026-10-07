// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

import { ElementRef, Renderer2 } from '@angular/core';

import { ResizerDirective } from './resizer.directive';

interface ResizerEvent {
    clientX: number;
    preventDefault?: () => void;
}

interface MockNativeElement {
    offsetLeft: number;
    offsetWidth: number;
    style: {
        width?: string;
        'border-right'?: string;
        'border-left'?: string;
    };
    addEventListener: (eventName: string, callback: (event: ResizerEvent) => void) => void;
    getBoundingClientRect: () => {
        left: number;
        width: number;
    };
}

class MockRenderer {
    listeners = new Map<string, (event: ResizerEvent) => void>();

    listen(target: string, eventName: string, callback: (event: ResizerEvent) => void): () => void {
        this.listeners.set(`${target}:${eventName}`, callback);
        return () => undefined;
    }
}

describe('ResizerDirective', () => {
    function createDirective() {
        const elementListeners = new Map<string, (event: ResizerEvent) => void>();
        const nativeElement: MockNativeElement = {
            offsetLeft: 100,
            offsetWidth: 200,
            style: {},
            addEventListener: (eventName: string, callback: (event: ResizerEvent) => void) => {
                elementListeners.set(eventName, callback);
            },
            getBoundingClientRect: () => ({
                left: 100,
                width: 200
            })
        };
        const renderer = new MockRenderer();
        const directive = new ResizerDirective(
            new ElementRef(nativeElement),
            renderer as unknown as Renderer2
        );

        return { directive, elementListeners, nativeElement, renderer };
    }

    it('emits resized width while dragging from the start edge', () => {
        const { directive, elementListeners, nativeElement, renderer } = createDirective();
        const widths: number[] = [];
        directive.resized.subscribe(width => widths.push(width));
        directive.ngOnInit();

        elementListeners.get('mousedown')({
            clientX: 298,
            preventDefault: () => undefined
        });
        renderer.listeners.get('window:mousemove')({ clientX: 250 });

        expect(nativeElement.style.width).toBe('150px');
        expect(widths).toEqual([150]);
    });

    it('uses the left drag edge and emits resized width for end-positioned panes', () => {
        const { directive, elementListeners, nativeElement, renderer } = createDirective();
        const widths: number[] = [];
        directive.position = 'end';
        directive.resized.subscribe(width => widths.push(width));
        directive.ngOnInit();

        elementListeners.get('mousedown')({
            clientX: 102,
            preventDefault: () => undefined
        });
        renderer.listeners.get('window:mousemove')({ clientX: 160 });

        expect(nativeElement.style.width).toBe('140px');
        expect(widths).toEqual([140]);
    });
});
