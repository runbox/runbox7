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
  OnInit,
  ChangeDetectionStrategy,
  AfterViewInit,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ListRange } from '@angular/cdk/collections';
import { Subject, Subscription, BehaviorSubject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-virtual-scroll-table',
  standalone: true,
  imports: [ScrollingModule, CommonModule, MatCheckboxModule],
  templateUrl: './virtual-scroll-table.component.html',
  styleUrls: ['./virtual-scroll-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualScrollTableComponent implements OnInit, OnDestroy, AfterViewInit {
  @ContentChild('tbody', { read: TemplateRef }) tbodyTemplate!: TemplateRef<any> | null;
  @ContentChild('thead', { read: TemplateRef }) theadTemplate!: TemplateRef<any> | null;

  @ViewChild(CdkVirtualScrollViewport) viewport: CdkVirtualScrollViewport;

  @Output() renderedRangeChange = new EventEmitter<ListRange>();
  @Input() items: any[] = [];

  @Input() scrollToIndex$!: BehaviorSubject<number>;

  firstRowHeight: number = 24;
  maxBufferPx: number;

  private renderedRangeSub!: Subscription;
  private inputChangesSub!: Subscription;
  private scrollToIndexSub!: Subscription;
  private inputChanges$ = new Subject<void>();

  private mutationObserver?: MutationObserver;
  private pendingScrollToIndex: number | null = null;

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.scrollToIndexSub = this.scrollToIndex$.subscribe(index => {
      this.pendingScrollToIndex = index;
      this.inputChanges$.next()
    });
  }

  ngAfterViewInit() {
    this.renderedRangeSub = this.viewport.renderedRangeStream
      .pipe(debounceTime(50))
      .subscribe(range => {
        this.renderedRangeChange.emit(range);
      });

    this.inputChangesSub = this.inputChanges$
      .pipe(debounceTime(50))
      .subscribe(() => {
        this.updateFirstRowHeight();

        this.doScrollToIndex(this.pendingScrollToIndex);
      });

    const elem = this.elementRef.nativeElement;

    this.mutationObserver = new MutationObserver((mutations) => {
      this.inputChanges$.next();
    });

    this.mutationObserver.observe(elem, {
      childList: true,  
      subtree: true,    
      attributes: false 
    });
  }

  ngOnDestroy(): void {
    this.renderedRangeSub.unsubscribe();
    this.scrollToIndexSub.unsubscribe();
    this.inputChangesSub.unsubscribe();
    this.mutationObserver.disconnect();
  }

  trackBy(index: number) {
    return index;
  }

  doScrollToIndex(index: number, retries: number = 5, delayMs: number = 500): void {
    if (!this.viewport || index == null) return;
    if (this.pendingScrollToIndex == null) return

    const scrollPosBefore = this.viewport.measureScrollOffset();

    this.viewport.scrollToIndex(index, 'smooth');

    setTimeout(() => {
      const scrollPosAfter = this.viewport.measureScrollOffset();

      const isStable = Math.abs(scrollPosAfter - scrollPosBefore) < 1;

      if (!isStable && retries > 0) {
        this.doScrollToIndex(index, retries - 1, delayMs);
      } else {
        this.pendingScrollToIndex = null;
      }
    }, delayMs);
  }

  private updateFirstRowHeight(): void {
    const elem = this.elementRef.nativeElement.querySelector('tbody');

    this.firstRowHeight = elem?.offsetHeight || this.firstRowHeight;
  }
}
