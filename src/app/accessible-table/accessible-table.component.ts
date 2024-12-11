import {
  OnDestroy,
  AfterViewChecked,
  ChangeDetectionStrategy,
  AfterViewInit,
  Component,
  ContentChild,
  ContentChildren,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ListRange } from '@angular/cdk/collections';
import { BehaviorSubject, Subscription } from 'rxjs';

// function withResize() {
//
//   // Detect on double click if the cursor is the resize one. This is how I know if the user wants to make the column auto or jump to shortest value.
//   // var cursor = e.target.style.cursor;
//
//   // 1. First let the table be rendered and do nothing. (unless absolute values have already been assigned).
//   // 2. On click we assign the absolute values to all columns and start resizing the current one. (Prevents other columns from moving during resize).
//   // 3. On resize done we remove the absolute values of all columns that have not been given an explicit width.
//   // 4. We store the latest configured value in the preferences service.
//
//   // - dblclick event remove the absolute value. It checks if the style.cursor is the resize one.
//
// }


// TODO: Consider use selection model in order to deal with reference issues. Either in here or app.component
// https://github.com/angular/components/blob/main/src/cdk/collections/selection-model.ts#L237
//   - Seriously consider placing the checkboxes outside of this component and in the app.component.
//     - This would make the app.component responsible for selection state which would make this component more dumb
//       The beneift of that is that we don't need to pass it equality checkers and such.
//   - Think about what to do with clicks on the row with shift and ctrl.
//   - Think about how to share whether a row is selected or not. (for styling).
//     - Changing the templating API might give more freedom to style.
@Component({
  selector: 'app-accessible-table',
  standalone: true, // Make the component standalone
  imports: [ScrollingModule, CommonModule, MatCheckboxModule],
  templateUrl: './accessible-table.component.html',
  styleUrls: ['./accessible-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessibleTableComponent implements OnDestroy, AfterViewChecked, AfterViewInit, OnChanges {
  @ContentChild('tbody', { read: TemplateRef }) tbodyTemplate!: TemplateRef<any> | null;
  @ContentChild('thead', { read: TemplateRef }) theadTemplate!: TemplateRef<any> | null;

  @ViewChild(CdkVirtualScrollViewport) viewport: CdkVirtualScrollViewport;

  @Output() renderedRangeChange = new EventEmitter<ListRange>();
  @Input() items: any[] = [];

  @Input() scrollToIndex: null | number = null

  private firstRowHeight = new BehaviorSubject<number>(100);

  private renderedRangeSub!: Subscription;

  constructor(
    private elementRef: ElementRef,
  ) { }

  ngAfterViewChecked() {
    this.updateFirstRowHeight();
  }

  ngAfterViewInit() {
    this.renderedRangeSub = this.viewport.renderedRangeStream.subscribe(range => {
      this.renderedRangeChange.emit(range)
    });
  }

  ngOnDestroy(): void {
    this.renderedRangeSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.scrollToIndex && this.items.length > this.scrollToIndex) {
      this.viewport?.scrollToIndex(this.scrollToIndex, 'smooth');
    }
  }

  private updateFirstRowHeight(): void {
    const value = this.elementRef
    .nativeElement
    .parentElement
      ?.querySelector('tbody')
      ?.offsetHeight
      || this.firstRowHeight.getValue();

    this.firstRowHeight.next(value)
  }
}
