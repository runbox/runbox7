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

import { Directive, ElementRef, OnInit, Input, Renderer2 } from '@angular/core';

@Directive({
    selector: '[appResizable]' // Attribute selector
})
export class ResizerDirective implements OnInit {
    @Input() resizableGrabWidth = 8;
    @Input() resizableMinWidth = 10;
    @Input() position = 'start';

    dragging = false;

    constructor(
        private el: ElementRef,
        private renderer: Renderer2) {

        const mouseDrag = (evt) => {
            if (!this.dragging) {
                return;
            }
            if (this.position === 'end') {
                const newWidth = Math.max(this.resizableMinWidth,
                            ((el.nativeElement.offsetLeft + el.nativeElement.offsetWidth) - evt.clientX)) ;
                el.nativeElement.style.width = newWidth + 'px';
            } else {
                const newWidth = Math.max(this.resizableMinWidth, (evt.clientX - el.nativeElement.offsetLeft)) ;
                el.nativeElement.style.width = newWidth + 'px';
            }
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

        el.nativeElement.addEventListener('mousedown', mouseDown, true);

        el.nativeElement.addEventListener('mousemove', (evt) => {

            if (this.inDragRegion(evt) || this.dragging) {
                el.nativeElement.style.cursor = 'col-resize';
            } else {
                el.nativeElement.style.cursor = 'default';
            }
            //   if (evt)
        }, true);

        this.renderer.listen('window', 'touchmove',
            (evt: TouchEvent) => mouseDrag(Object.assign(evt, {
                clientX: evt.targetTouches[0].clientX,
                clientY: evt.targetTouches[0].clientY
            }))
        );
        this.renderer.listen('window', 'touchend', mouseUp);
        el.nativeElement.addEventListener('touchstart',
                (evt: TouchEvent) =>  mouseDown(Object.assign(evt, {
                    clientX: evt.targetTouches[0].clientX,
                    clientY: evt.targetTouches[0].clientY
            }))
        );
    }

    ngOnInit(): void {
        if (this.position !== 'end') {
            this.el.nativeElement.style['border-right'] = this.resizableGrabWidth + 'px solid darkgrey';
        } else {
            this.el.nativeElement.style['border-left'] = this.resizableGrabWidth + 'px solid darkgrey';
        }
        console.log('Applied appresizable');
    }

    inDragRegion(evt) {
        if (this.position === 'end') {
            const rect = this.el.nativeElement.getBoundingClientRect();
            const dragX1 = (rect.left );

            return  evt.clientX < dragX1 + this.resizableGrabWidth;
        } else {
            const rect = this.el.nativeElement.getBoundingClientRect();
            const dragX1 = (rect.left + rect.width);

            return  evt.clientX > dragX1 - this.resizableGrabWidth;
        }
    }

}
