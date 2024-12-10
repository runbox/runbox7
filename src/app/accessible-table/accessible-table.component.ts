import {
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
import { Subscription } from 'rxjs';

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


@Component({
  selector: 'app-accessible-table',
  standalone: true, // Make the component standalone
  imports: [ScrollingModule, CommonModule, MatCheckboxModule],
  templateUrl: './accessible-table.component.html',
  styleUrls: ['./accessible-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessibleTableComponent implements AfterViewChecked, AfterViewInit, OnChanges {
  @ContentChildren('th', { read: TemplateRef }) thTemplates!: QueryList<TemplateRef<any>>;
  @ContentChildren('td', { read: TemplateRef }) tdTemplates!: QueryList<TemplateRef<any>>;
  @ContentChild('preview', { read: TemplateRef }) previewTemplate!: TemplateRef<any> | null;

  @ViewChild(CdkVirtualScrollViewport) viewport: CdkVirtualScrollViewport;

  @Input() selectedRow: any = null;
  @Output() selectedRowChange = new EventEmitter<any>;

  @Input() selectedRows: any[] = [];
  @Output() selectedRowsChange = new EventEmitter<any[]>();

  @Output() renderedRangeChange = new EventEmitter<ListRange>();

  @Input() rows: any[] = [];

  @Output() selectionDragStarted = new EventEmitter<any>();

  firstRowHeight: number = 100;
  private lastCheckedRow: number|null = null

  private shiftKey = false;
  private ctrlKey = false;
  private metaKey = false;
  private renderedRangeSub!: Subscription;

  constructor(
    private elementRef: ElementRef,
  ) { }

  ngAfterViewChecked() {
    this.updateFirstRowHeight();
  }

  ngAfterViewInit() {
    console.log('this.viewport', this.viewport)

    this.renderedRangeSub = this.viewport.renderedRangeStream.subscribe(range => {
      this.renderedRangeChange.emit(range)
    });

    // this.viewport.elementScrolled().subscribe(() => {
    //   this.renderedRangeChange.emit(this.viewport.getRenderedRange())
    // });
  }

  ngOnDestroy(): void {
    this.renderedRangeSub?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('changes.rows', changes.rows)
    // this.viewport.checkViewportSize()

    if (changes.rows) {
      if (this.selectedRows.length) this.selectedRowsChange.emit([])

      // TODO: Figure out when and how to scroll to top.
      // this.viewport?.scrollToIndex(0, 'smooth')
    }

    if (changes.selectedRow) {
      const index = this.rows.indexOf(this.selectedRow)
      this.viewport?.scrollToIndex(index, 'smooth');
    }

  }

  private updateFirstRowHeight(): void {
    this.firstRowHeight = this.elementRef
    .nativeElement
    .parentElement
      ?.querySelector('tbody')
      ?.offsetHeight
      || this.firstRowHeight
  }

  onAllCheckboxChange({checked}) {
    if (checked) {
      this.selectedRowsChange.emit(this.rows)
    } else {
      this.selectedRowsChange.emit([])
    }
  }

  onCheckboxClick(event, row, index) {
    this.onRowClick(event, row, index, true)
    event.stopPropagation()
  }

  rangeSelect(to, check) {
    let from = this.rows.indexOf(this.lastCheckedRow)

    // When nothing is selected yet.
    if (from === -1) return this.oneSelect(to, check)

    return this.rangeSelectFrom(from, to, check)
  }

  oneSelect(index, check) {
    this.rangeSelectFrom(index, index, check)
  }

  rangeSelectFrom(from: number, to: number, check: boolean) {
      const left = Math.min(from, to)
      const right = Math.max(from, to)
      const clone = [...this.selectedRows]

      for (let i = left; i <= right; i++) {
        clone[i] = check ? this.rows[i] : null
      }

      // TODO: Consider filtering out selectedRows that are no longer part
      // of the this.rows.
      this.selectedRowsChange.emit(clone)
      this.lastCheckedRow = this.rows[to]
  }

  onRowClick(event, row, index, checkbox = false) {
    const shiftKey = event.getModifierState("Shift")

    if (shiftKey) {
      return this.rangeSelect(index, !this.selectedRows[index])
    }

    const ctrlKey = event.getModifierState("Control")
    const metaKey = event.getModifierState("Meta")

    if (ctrlKey || metaKey) {
      return this.oneSelect(index, !this.selectedRows[index])
    }

    if (!checkbox) {
      this.selectedRowChange.emit(row)
    }

    this.lastCheckedRow = row
  }

  onRowKeydown(event, row, index) {
    // Only work on Enter and space.
    if (event.key !== 'Enter') return;

    return this.onRowClick(event, row, index)
  }

  selectedSet() {
    const selected = new Set(this.selectedRows)

    selected.delete(null)
    selected.delete(undefined)

    return selected;
  }

  emitSelect() {
    return
  }

  get isIndeterminate() {
    // Has both selected and unselected items. Might be better to use a
    let hasSelected = false;
    let hasUnselected = false;

    return this.rows.find((_value, index) => {
      const v = this.selectedRows[index]

      hasSelected = hasSelected || Boolean(v);
      hasUnselected = hasUnselected || Boolean(!v);

      return (hasSelected && hasUnselected)
    })
  }

  get allCheckboxIsChecked() {
    return this.selectedRows.find(x => x != null)
  }

  onDragStart(event, row, index) {
    const emptyImage = new Image();
    event.dataTransfer?.setDragImage(emptyImage, 0, 0); // Set an empty image

    const isSelected = this.selectedRows[index]

    const selected = isSelected
      ? this.selectedSet()
      : new Set([row]);

    this.selectionDragStarted.emit({
      event,
      selected,
    })
  }

}
