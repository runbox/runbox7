// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';
import { DraftDeskComponent } from './draftdesk.component';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';

@Component({
    // Match the real compose selector used by Draft Desk.
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'compose',
    template: '<textarea>{{model.msg_body}}</textarea>'
})
class ComposeStubComponent {
    @Input() model: DraftFormModel;
    @Output() draftDeleted = new EventEmitter<number>();
    editing = false;
}

describe('Draft Desk preview visibility (#430)', () => {
    let fixture: ComponentFixture<DraftDeskComponent>;
    let drafts: DraftFormModel[];

    beforeEach(async () => {
        drafts = [11, 12, 13].map(mid => Object.assign(new DraftFormModel(), {
            mid, subject: `Draft ${mid}`, msg_body: `Unsent text ${mid}`
        }));
        await TestBed.configureTestingModule({
            imports: [CommonModule, MatCheckboxModule, NoopAnimationsModule],
            declarations: [DraftDeskComponent, ComposeStubComponent],
            providers: [
                { provide: RunboxWebmailAPI, useValue: {} },
                { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
                { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
                { provide: DraftDeskService, useValue: {
                    draftModels: new BehaviorSubject(drafts), fromsSubject: new BehaviorSubject([])
                } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(DraftDeskComponent);
        fixture.detectChanges();
    });

    function togglePreviews() {
        const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('mat-checkbox input');
        expect(checkbox).withContext('An accessible control must let the user hide other draft previews').not.toBeNull();
        checkbox.click();
        fixture.detectChanges();
    }

    function composeElements() {
        return fixture.debugElement.queryAll(By.directive(ComposeStubComponent));
    }

    it('initially shows the existing draft previews', () => {
        expect(composeElements().length).toBe(3);
        composeElements().forEach(el => expect(getComputedStyle(el.nativeElement).display).not.toBe('none'));
    });

    it('hides previews while retaining every open editor and its unsent content', () => {
        const elements = composeElements();
        elements[0].componentInstance.editing = true;
        elements[2].componentInstance.editing = true;
        const textarea: HTMLTextAreaElement = elements[0].nativeElement.querySelector('textarea');
        textarea.value = 'Still editing this unsaved text';
        togglePreviews();

        expect(getComputedStyle(elements[1].nativeElement).display).toBe('none');
        [0, 2].forEach(i => expect(getComputedStyle(elements[i].nativeElement).display).not.toBe('none'));
        expect(composeElements()[0].componentInstance).toBe(elements[0].componentInstance);
        expect(textarea.value).toBe('Still editing this unsaved text');
        expect(fixture.componentInstance.draftModelsInView).toEqual(drafts);
    });

    it('restores the same preview and editor components when the control is switched back on', () => {
        const elements = composeElements();
        elements[0].componentInstance.editing = true;
        togglePreviews();
        togglePreviews();

        composeElements().forEach((el, i) => {
            expect(el.componentInstance).toBe(elements[i].componentInstance);
            expect(getComputedStyle(el.nativeElement).display).not.toBe('none');
            expect(el.componentInstance.model).toBe(drafts[i]);
        });
        expect(elements[0].componentInstance.editing).toBeTrue();
    });

    it('keeps the control available after the last editor closes so the user can recover the list', () => {
        const elements = composeElements();
        elements[0].componentInstance.editing = true;
        togglePreviews();
        elements[0].componentInstance.editing = false;
        fixture.detectChanges();
        composeElements().forEach(el => expect(getComputedStyle(el.nativeElement).display).toBe('none'));

        togglePreviews();
        composeElements().forEach(el => expect(getComputedStyle(el.nativeElement).display).not.toBe('none'));
    });
});
