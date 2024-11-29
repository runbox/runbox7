// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2025 Runbox Solutions AS (runbox.com).
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

import {
  OnDestroy,
  ChangeDetectionStrategy,
  AfterViewInit,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ListRange } from '@angular/cdk/collections';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-virtual-scroll-table',
  standalone: true, // Make the component standalone
  imports: [ScrollingModule, CommonModule, MatCheckboxModule],
  templateUrl: './virtual-scroll-table.component.html',
  styleUrls: ['./virtual-scroll-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualScrollTableComponent implements OnDestroy, AfterViewInit, OnChanges {
  @ContentChild('tbody', { read: TemplateRef }) tbodyTemplate!: TemplateRef<any> | null;
  @ContentChild('thead', { read: TemplateRef }) theadTemplate!: TemplateRef<any> | null;

  @ViewChild(CdkVirtualScrollViewport) viewport: CdkVirtualScrollViewport;

  @Output() renderedRangeChange = new EventEmitter<ListRange>();
  @Input() items: any[] = [];

  @Input() scrollToIndex: null | number = null

  firstRowHeight: number = 100;
  maxBufferPx: number;

  private renderedRangeSub!: Subscription;
  private resizeObserver: ResizeObserver;

  constructor(
    private elementRef: ElementRef,
  ) { }

  ngAfterViewInit() {
    this.renderedRangeSub = this.viewport.renderedRangeStream
      .pipe(debounceTime(50))
      .subscribe(range => {
        this.renderedRangeChange.emit(range)
      });

    setTimeout(() => {
      this.updateFirstRowHeight()
    }, 1000)

    this.resizeObserver = new ResizeObserver((entries) => {
      this.maxBufferPx = window.innerHeight
      this.updateFirstRowHeight()
    });

    this.resizeObserver.observe(this.elementRef.nativeElement.parentElement.querySelector('table'));
  }

  ngOnDestroy(): void {
    this.renderedRangeSub.unsubscribe();
    this.resizeObserver.disconnect();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.scrollToIndex && this.items.length > this.scrollToIndex) {
      this.doScrollToIndex(this.scrollToIndex)
    }
  }

  trackBy(index: number) {
    return index;
  }

  doScrollToIndex(index: number) {
    return this.viewport?.scrollToIndex(index, 'smooth');
  }

  private updateFirstRowHeight(): void {
    const elem = this
      .elementRef
      .nativeElement
      .parentElement
        ?.querySelector('tbody')

    this.firstRowHeight = elem
        ?.offsetHeight
        || this.firstRowHeight;
  }
}
