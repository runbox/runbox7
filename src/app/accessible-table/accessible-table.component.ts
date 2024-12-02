import { Component, ContentChildren, ContentChild, QueryList, TemplateRef, AfterContentInit, ElementRef, Input } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'accessible-table',
  standalone: true, // Make the component standalone
  imports: [MatTableModule, MatSortModule, MatCardModule, ScrollingModule, CommonModule, MatCheckboxModule],
  templateUrl: './accessible-table.component.html',
  styleUrls: ['./accessible-table.component.scss']
})
export class AccessibleTableComponent {
  @ContentChildren('th', { read: TemplateRef }) thTemplates!: QueryList<TemplateRef<any>>;
  @ContentChildren('td', { read: TemplateRef }) tdTemplates!: QueryList<TemplateRef<any>>;
  @ContentChild('preview', { read: TemplateRef }) previewTemplate!: TemplateRef<any> | null;

  @Input() rows: any[] = [];
  // rows = [];
  selected = [];
  displayedColumns: string[] = ['date', 'from', 'subject', 'size'];
  lastCheckedIndex: number|null = null

  constructor(
    private elementRef: ElementRef,
  ) {
    // for (let i = 0; i < 1000; i++) {
    //   this.rows.push({
    //     date: new Date(2024, 10, i % 30 + 1).toISOString(),
    //     from: `user${i + 1}@example.com`,
    //     subject: `Subject ${i + 1}`,
    //     size: Math.floor(Math.random() * 20) + 5
    //   });
    // }
  }

  onAllCheckboxChange({checked}) {
    if (checked) {
      Object.assign(this.selected, this.rows)
    } else {
      this.selected = []
    }
  }

  // Change gets called before click.
  onCheckboxChange({checked}, index, message) {
    this.selected[index] = checked ? message : undefined;
  }

  onRowClick(event, message, index) {
    if (event.shiftKey) {
      this.rangeSelect(index, !this.selected[index])
    }

    if (event.ctrlKey || event.metaKey) {
      this.selected[index] = !this.selected[index]
    }

    this.lastCheckedIndex = index;
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

  rangeSelect(to, checked) {
      if (this.lastCheckedIndex == null) return;

      const startIndex = Math.min(this.lastCheckedIndex, to);
      const endIndex = Math.max(this.lastCheckedIndex, to);

      for (let i = startIndex; i <= endIndex; i++) {
        this.selected[i] = checked ? this.rows[i] : null;  // Set the checked state based on the current checkbox
      }
  }

  get isIndeterminite() {
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

  get firstRowHeight(): number {
      return this.elementRef
        .nativeElement
        .parentElement
        ?.querySelector('tbody')
        ?.offsetHeight
        ?? 100;
  }

}
