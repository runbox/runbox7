// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

import { Component, Input, OnInit, Output, EventEmitter, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { Filter } from '../../rmmapi/rbwebmail';
import { MessageListService } from '../../rmmapi/messagelist.service';
import { FormGroup, FormBuilder } from '@angular/forms';

@Component({
    selector: 'app-account-filter-editor',
    templateUrl: './filter-editor.component.html',
})
export class FilterEditorComponent implements OnInit {
    @ViewChild('cardComponent', { read: ElementRef }) cardComponent: ElementRef;
    @Input() filter: Filter;

    @Output() delete:   EventEmitter<void>   = new EventEmitter();
    @Output() save:     EventEmitter<Filter> = new EventEmitter();
    @Output() moveUp:   EventEmitter<void>   = new EventEmitter();
    @Output() moveDown: EventEmitter<void>   = new EventEmitter();

    isNegated: boolean;
    folders: string[] = [];
    form: FormGroup;

    constructor(
        private fb: FormBuilder,
        private renderer: Renderer2,
        messageListService: MessageListService,
    ) {
        messageListService.folderListSubject.subscribe(folders => {
            this.folders = folders.map(f => f.folderPath);
        });
    }

    negate(): void {
        this.isNegated = !this.isNegated;
        this.form.get('negated').setValue(this.isNegated);
        this.form.get('negated').markAsDirty();
    }

    ngOnInit() {
        this.reloadForm();
    }

    reloadForm(): void {
        this.form = this.fb.group({
            active:   this.fb.control(this.filter.active),
            location: this.fb.control(this.filter.location),
            negated:  this.fb.control(this.filter.negated),
            str:      this.fb.control(this.filter.str),
            action:   this.fb.control(this.filter.action),
            target:   this.fb.control(this.filter.target),
        });
        this.isNegated = this.filter.negated;
    }

    deleteFilter(): void {
        this.delete.emit();
    }

    saveFilter(): void {
        const newFilter = {id: this.filter.id};
        Object.assign(newFilter, this.form.value);
        this.save.emit(newFilter as Filter);
    }

    hilight(): void {
        this.renderer.addClass(this.cardComponent.nativeElement, 'hilight');
        this.cardComponent.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => this.renderer.removeClass(this.cardComponent.nativeElement, 'hilight'), 250);
    }
}
