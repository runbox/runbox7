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

import { Directive, ElementRef, OnInit, Input, OnDestroy, Renderer2, Output, EventEmitter } from '@angular/core';

@Directive({
    selector: '[appHorizResizable]' // Attribute selector
})
export class HorizResizerDirective implements OnInit {
    @Input() resizableGrabHeight = 8;
    @Input() resizableMinHeight = 80;
    @Input() resizableDisabled = false;

    fullHeightThreshold = 20;
    @Output() resized = new EventEmitter<number>();

    isFullHeight: boolean;
    dragging = false;

    constructor(private el: ElementRef,
        private renderer: Renderer2) {


    }

    ngOnInit(): void {
        if (!this.resizableDisabled) {
            this.el.nativeElement.style['border-top'] = `${this.resizableGrabHeight}px solid darkgrey`;

            const self = this;

            const mouseDrag = (evt) => {
                if (this.inDragRegion(evt) || this.dragging) {
                    this.el.nativeElement.style.cursor = 'ns-resize';
                } else {
                    this.el.nativeElement.style.cursor = 'default';
                }

                if (!this.dragging) {
                    return;
                }

                const elementRect = this.el.nativeElement.getBoundingClientRect();

                const newTop = Math.min(elementRect.bottom - this.resizableMinHeight,
                    evt.clientY);

                const parentOffsetTop = this.getParentOffsetTop();
                this.el.nativeElement.style.top = `${Math.max(0, newTop - parentOffsetTop)}px`;

                this.isFullHeight = newTop - parentOffsetTop < this.fullHeightThreshold;

                this.resized.emit(elementRect.bottom - newTop);
            };

            const mouseUp = (evt) => {
                if (!this.dragging) {
                    return;
                }
                this.dragging = false;
                //       console.log(" REMOVE DRAGGER ");
                evt.preventDefault();
            };

            const mouseDown = (evt) => {
                //        console.log("Mouse down");
                if (this.inDragRegion(evt)) {
                    this.dragging = true;
                    //          console.log("IN DRAG REGION");
                    evt.preventDefault();
                }
            };

            this.renderer.listen('window', 'mousemove', mouseDrag);
            this.renderer.listen('window', 'mouseup', mouseUp);

            this.renderer.listen('window', 'touchmove',
                (evt: TouchEvent) => mouseDrag(Object.assign(evt, {
                    clientX: evt.targetTouches[0].clientX,
                    clientY: evt.targetTouches[0].clientY
                }))
            );
            this.renderer.listen('window', 'touchend', mouseUp);

            this.el.nativeElement.addEventListener('mousedown', mouseDown, true);
            this.el.nativeElement.addEventListener('touchstart',
                (evt: TouchEvent) => mouseDown(Object.assign(evt, {
                    clientX: evt.targetTouches[0].clientX,
                    clientY: evt.targetTouches[0].clientY
                }))
            );

        }
    }


    getParentOffsetTop(): number {
        const toolbarelement = document.querySelector('rmm-headertoolbar mat-toolbar');
        return toolbarelement ? toolbarelement.clientHeight : 0;
    }

    resizePercentage(percentage: number): void {
        const elementRect = this.el.nativeElement.getBoundingClientRect();
        const fullheight = elementRect.bottom - this.getParentOffsetTop();
        const newHeight = Math.round((fullheight * percentage) / 100);
        const newTop = fullheight - newHeight;

        this.el.nativeElement.style.top = `${newTop}px`;
        this.resized.emit(newHeight);

        this.isFullHeight = newTop - this.getParentOffsetTop() < this.fullHeightThreshold;
    }

    resizePixels(pixels: number): void {
        const elementRect = this.el.nativeElement.getBoundingClientRect();
        const fullheight = elementRect.bottom - this.getParentOffsetTop();
        const newTop = fullheight - pixels;

        this.el.nativeElement.style.top = `${newTop}px`;
        this.resized.emit(pixels);

        this.isFullHeight = newTop - this.getParentOffsetTop() < this.fullHeightThreshold;
    }

    inDragRegion(evt) {
        const elementTop = this.el.nativeElement.getBoundingClientRect().top;
        return evt.clientY < elementTop + this.resizableGrabHeight;
    }

}
