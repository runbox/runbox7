import {
  HostListener,
  Component,
  ContentChildren,
  ContentChild,
  QueryList,
  TemplateRef,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  AfterViewChecked,
  OnChanges,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-accessible-table',
  standalone: true, // Make the component standalone
  imports: [ScrollingModule, CommonModule, MatCheckboxModule],
  templateUrl: './accessible-table.component.html',
  styleUrls: ['./accessible-table.component.scss']
})
export class AccessibleTableComponent implements AfterViewChecked, OnChanges {
  @ContentChildren('th', { read: TemplateRef }) thTemplates!: QueryList<TemplateRef<any>>;
  @ContentChildren('td', { read: TemplateRef }) tdTemplates!: QueryList<TemplateRef<any>>;
  @ContentChild('preview', { read: TemplateRef }) previewTemplate!: TemplateRef<any> | null;

  @Input() selectedRow: any = null;
  @Output() selectedRowChange = new EventEmitter<any>;

  @Input() selectedRows: any[] = [];
  @Output() selectedRowsChange = new EventEmitter<any[]>();

  @Input() rows: any[] = [];

  @Output() rowClicked = new EventEmitter<any>();
  @Output() selectionDragStarted = new EventEmitter<any>();

  firstRowHeight: number = 100;
  private lastCheckedRow: number|null = null

  private shiftKey = false;
  private ctrlKey = false;
  private metaKey = false;

  constructor(
    private elementRef: ElementRef,
  ) { }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.shiftKey = true;
    }
    if (event.key === 'Control') {
      this.ctrlKey = true;
    }
    if (event.key === 'Meta') {
      this.metaKey = true;
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      this.shiftKey = false;
    }
    if (event.key === 'Control') {
      this.ctrlKey = false;
    }
    if (event.key === 'Meta') {
      this.metaKey = false;
    }
  }

  ngAfterViewChecked() {
    this.updateFirstRowHeight();
  }

  ngOnChanges(changes) {
    // TODO: Add scroll to index behavior.
    if (changes.rows) {
      this.elementRef
        .nativeElement
        .querySelector('cdk-virtual-scroll-viewport')
        .scrollTop = 0;

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

  // Change gets called before click.
  onCheckboxChange(event, row, index) {
    this.onRowClick(event, row, index)
  }

  onCheckboxClick(event, row, index) {
    // We don not want to trigger the row click when clicking on checkbox.
    event.stopPropagation()
  }

  rangeSelect(to, check) {
    return this.rangeSelectFrom(this.rows.indexOf(this.lastCheckedRow), to, check)
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

      this.selectedRowsChange.emit(clone)
      this.lastCheckedRow = this.rows[to]
  }

  onRowClick(event, row, index) {
    if (this.shiftKey) {
      return this.rangeSelect(index, !this.selectedRows[index])
    }

    if (this.ctrlKey || this.metaKey) {
      return this.oneSelect(index, !this.selectedRows[index])
    }

    this.selectedRowChange.emit(row)
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
