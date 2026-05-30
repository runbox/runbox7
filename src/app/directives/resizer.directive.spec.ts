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

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResizerDirective } from './resizer.directive';

@Component({
    template: '<div appResizable></div>'
})
class HostComponent {}

describe('ResizerDirective', () => {
    let fixture: ComponentFixture<HostComponent>;
    let directive: ResizerDirective;
    let hostElement: HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [HostComponent, ResizerDirective],
        }).compileComponents();

        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();

        hostElement = fixture.nativeElement.querySelector('div');
        directive = fixture.debugElement.children[0].injector.get(ResizerDirective);
        spyOn(hostElement, 'getBoundingClientRect').and.returnValue({
            left: 0,
            width: 100,
        } as DOMRect);
    });

    it('keeps the desktop drag region at the configured grab width', () => {
        spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
        spyOnProperty(window.navigator, 'maxTouchPoints', 'get').and.returnValue(0);

        expect(directive.inDragRegion({ clientX: 80 })).toBeFalse();
        expect(directive.inDragRegion({ clientX: 95 })).toBeTrue();
    });

    it('widens the drag region on touch devices', () => {
        spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);

        expect(directive.inDragRegion({ clientX: 80 })).toBeTrue();
    });
});
