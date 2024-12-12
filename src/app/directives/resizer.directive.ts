// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
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

import { Directive, ElementRef, OnInit, Input, Renderer2, Output, EventEmitter } from '@angular/core';

@Directive({
    selector: '[appResizable]' // Attribute selector
})
export class ResizerDirective implements OnInit {
    @Input() resizableGrabWidth = 8;
    @Input() resizableMinWidth = 10;
    @Input() position = 'start';

    @Output() resizeStart = new EventEmitter<{ startWidth: number, position: string }>();  // Emit initial width and position
    @Output() resizing = new EventEmitter<number>();   // Emit current width during resizing
    @Output() resizeEnd = new EventEmitter<{ finalWidth: number, position: string }>();    // Emit final width and position

    @Output() valueChange = new EventEmitter<number>();  // Custom event to emit width changes
    @Input() value: number;  // Input to set the width (can be bound to parent component)

    dragging = false;

    constructor(
        private el: ElementRef,
        private renderer: Renderer2) {

        const mouseDrag = (evt) => {
            if (!this.dragging) {
                return;
            }
            let newWidth: number;

            if (this.position === 'end') {
                newWidth = Math.max(this.resizableMinWidth,
                                    (el.nativeElement.offsetLeft + el.nativeElement.offsetWidth) - evt.clientX);
                el.nativeElement.style.width = newWidth + 'px';
            } else {
                newWidth = Math.max(this.resizableMinWidth, evt.clientX - el.nativeElement.offsetLeft);
                el.nativeElement.style.width = newWidth + 'px';
            }

            this.resizing.emit(newWidth);  // Emit during resizing
            this.value = newWidth;  // Update local value
            this.valueChange.emit(newWidth);  // Emit the change to parent component
        };

        const mouseUp = (evt) => {
            if (!this.dragging) {
                return;
            }
            this.dragging = false;
            this.resizeEnd.emit({
                finalWidth: el.nativeElement.offsetWidth,  // Emit final width and position when resizing ends
                position: this.position
            });
        };

        const mouseDown = (evt) => {
            if (this.inDragRegion(evt)) {
                this.dragging = true;
                evt.preventDefault();
                this.resizeStart.emit({
                    startWidth: el.nativeElement.offsetWidth,  // Emit initial width and position when resizing starts
                    position: this.position
                });
            }
        };

        this.renderer.listen('window', 'mousemove', mouseDrag);
        this.renderer.listen('window', 'mouseup', mouseUp);
        el.nativeElement.addEventListener('mousedown', mouseDown, true);

        el.nativeElement.addEventListener('mousemove', (evt) => {
            if (this.inDragRegion(evt) || this.dragging) {
                el.nativeElement.style.cursor = 'col-resize';
            } else {
                el.nativeElement.style.cursor = 'default';
            }
        }, true);

        this.renderer.listen('window', 'touchmove',
            (evt: TouchEvent) => mouseDrag(Object.assign(evt, {
                clientX: evt.targetTouches[0].clientX,
                clientY: evt.targetTouches[0].clientY
            }))
        );
        this.renderer.listen('window', 'touchend', mouseUp);
        el.nativeElement.addEventListener('touchstart',
            (evt: TouchEvent) => mouseDown(Object.assign(evt, {
                clientX: evt.targetTouches[0].clientX,
                clientY: evt.targetTouches[0].clientY
            }))
        );
    }

    ngOnInit(): void {
        this.renderer.addClass(this.el.nativeElement, 'resizable');

        if (this.position !== 'end') {
            this.el.nativeElement.style['border-right'] = this.resizableGrabWidth + 'px solid darkgrey';
        } else {
            this.el.nativeElement.style['border-left'] = this.resizableGrabWidth + 'px solid darkgrey';
        }

        // Set initial width if the value is provided from the parent component
        if (this.value) {
            this.el.nativeElement.style.width = this.value + 'px';
        }
    }

    inDragRegion(evt) {
        const rect = this.el.nativeElement.getBoundingClientRect();
        const dragX1 = this.position === 'end' ? rect.left : rect.left + rect.width;

        return this.position === 'end'
            ? evt.clientX < dragX1 + this.resizableGrabWidth
            : evt.clientX > dragX1 - this.resizableGrabWidth;
    }
}
