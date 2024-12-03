import {
  Component,
  HostListener,
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
  ViewChild,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatIconModule } from '@angular/material/icon';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'accessible-table',
  standalone: true, // Make the component standalone
  imports: [MatIconModule, ScrollingModule, CommonModule, MatCheckboxModule],
  templateUrl: './accessible-table.component.html',
  styleUrls: ['./accessible-table.component.scss']
})
export class AccessibleTableComponent implements AfterViewChecked, OnChanges {
  @ContentChildren('th', { read: TemplateRef }) thTemplates!: QueryList<TemplateRef<any>>;
  @ContentChildren('td', { read: TemplateRef }) tdTemplates!: QueryList<TemplateRef<any>>;
  @ContentChild('preview', { read: TemplateRef }) previewTemplate!: TemplateRef<any> | null;

  @ViewChild('dragPreview') dragPreview!: ElementRef<HTMLDivElement>;

  @Input() rows: any[] = [];
  @Input() selected: any[] = [];

  @Output() rowClicked = new EventEmitter<any>();
  @Output() rowSelected = new EventEmitter<any>();
  @Output() selectionDragStarted = new EventEmitter<any>();

  private dragEvent: null | DragEvent = null;
  private selectedDragSize: number = 0;

  displayedColumns: string[] = ['date', 'from', 'subject', 'size'];
  lastCheckedIndex: number|null = null
  firstRowHeight: number = 100;

  constructor(
    private elementRef: ElementRef,
  ) { }

  ngAfterViewChecked() {
    this.updateFirstRowHeight();
  }

  ngOnChanges(changes) {
    if (changes.rows) {
      this.selected = []
      this.lastCheckedIndex = null
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
      || 100;
  }

  onAllCheckboxChange({checked}) {
    if (checked) {
      Object.assign(this.selected, this.rows)
    } else {
      this.selected = []
    }
    this.emitSelect()
  }

  // Change gets called before click.
  onCheckboxChange({checked}, index, message) {
    this.oneSelect(index, checked)
  }

  onRowClick(event, message, index) {
    let selection = false
    if (event.shiftKey) {
      this.rangeSelect(index, !this.selected[index])
      selection = true
    }

    if (event.ctrlKey || event.metaKey) {
      this.oneSelect(index, !this.selected[index])
      selection = true
    }

    this.lastCheckedIndex = index;

    if (!selection) {
      this.rowClicked.emit({ index, message });
    }
  }

  onRowKeydown(event, index, message) {
    // Only work on Enter and space.
    if (event.key !== 'Enter') return;

    return this.onRowClick(event, index, message)
  }

  // Click gets called before change.
  onCheckboxClick(event, index, message): void {
    // Prevent the table row click from triggering.
    event.stopPropagation();

    if (event.shiftKey) {
      this.rangeSelect(index, event.target.checked)
    }

    this.lastCheckedIndex = index;
  }

  oneSelect(index, checked) {
    this.rangeSelect(index, checked, index)
  }

  rangeSelect(to, checked, from = null) {
    const start = from ?? this.lastCheckedIndex

    if (start == null) return;

    const startIndex = Math.min(start, to);
    const endIndex = Math.max(start, to);

    for (let i = startIndex; i <= endIndex; i++) {
      this.selected[i] = checked ? this.rows[i] : null;  // Set the checked state based on the current checkbox
    }

    this.emitSelect()
  }

  selectedSet() {
    const selected = new Set(this.selected)

    selected.delete(null)
    selected.delete(undefined)

    return selected;
  }

  emitSelect() {
    this.rowSelected.emit({selected: this.selectedSet()})
  }

  get isIndeterminate() {
    // Has both selected and unselected items. Might be better to use a
    let hasSelected = false;
    let hasUnselected = false;

    return this.rows.find((_value, index) => {
      const v = this.selected[index]

      hasSelected = hasSelected || Boolean(v);
      hasUnselected = hasUnselected || Boolean(!v);

      return (hasSelected && hasUnselected)
    })
  }

  get allCheckboxIsChecked() {
    return this.selected.find(x => x != null)
  }

  @HostListener('document:drag', ['$event'])
  onDrag(event: DragEvent) {
    this.dragPreview.nativeElement.style.display = 'block'
    this.dragPreview.nativeElement.style.left = `${event.clientX}px`;
    this.dragPreview.nativeElement.style.top = `${event.clientY}px`;

  }

  onDragEnd() {
    this.dragEvent = null
    this.dragPreview.nativeElement.style.display = 'none'
  }

  onDragStart(event, row, index) {
    this.dragEvent = event;

    const emptyImage = new Image();
    event.dataTransfer?.setDragImage(emptyImage, 0, 0); // Set an empty image

    const isSelected = this.selected[index]

    const selected = isSelected
      ? this.selectedSet()
      : new Set([row]);

    this.selectedDragSize = selected.size;

    this.selectionDragStarted.emit({
      event,
      selected,
    })
  }

}
