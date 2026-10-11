// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Runbox 7. If not, see <https://www.gnu.org/licenses/>.
// ---------- END RUNBOX LICENSE ----------

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { Identity } from '../profiles/profile.service';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { DraftDeskComponent } from './draftdesk.component';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';

interface DraftDeskServiceStub {
    draftModels: BehaviorSubject<DraftFormModel[]>;
    fromsSubject: BehaviorSubject<Identity[]>;
    isEditing: number;
    newDraft: jasmine.Spy;
    deleteDraft: jasmine.Spy;
}

describe('DraftDeskComponent', () => {
    let fixture: ComponentFixture<DraftDeskComponent>;
    let component: DraftDeskComponent;
    let queryParams: BehaviorSubject<Record<string, string>>;
    let draftDeskService: DraftDeskServiceStub;
    const defaultIdentity = Identity.fromObject({ email: 'me@example.com' });

    const createDraft = (mid: number) => DraftFormModel.create(
        mid,
        defaultIdentity,
        '',
        `Draft ${mid}`
    );

    beforeEach(async () => {
        queryParams = new BehaviorSubject({});
        draftDeskService = {
            draftModels: new BehaviorSubject<DraftFormModel[]>([]),
            fromsSubject: new BehaviorSubject<Identity[]>([defaultIdentity]),
            isEditing: -1,
            newDraft: jasmine.createSpy('newDraft').and.returnValue(Promise.resolve()),
            deleteDraft: jasmine.createSpy('deleteDraft')
        };

        await TestBed.configureTestingModule({
            declarations: [DraftDeskComponent],
            providers: [
                { provide: ActivatedRoute, useValue: { queryParams: queryParams.asObservable() } },
                { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
                { provide: RunboxWebmailAPI, useValue: {} },
                { provide: DraftDeskService, useValue: draftDeskService }
            ]
        })
            .overrideComponent(DraftDeskComponent, { set: { template: '' } })
            .compileComponents();

        fixture = TestBed.createComponent(DraftDeskComponent);
        component = fixture.componentInstance;
    });

    it('should open the draft requested by query parameter for editing', () => {
        draftDeskService.draftModels.next([createDraft(42)]);
        queryParams.next({ edit: '42' });

        fixture.detectChanges();

        expect(draftDeskService.isEditing).toBe(42);
        expect(component.draftModelsInView[0].mid).toBe(42);
    });

    it('should keep a requested draft visible when it is outside the first page', () => {
        const drafts = [110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 42]
            .map(createDraft);
        draftDeskService.draftModels.next(drafts);
        queryParams.next({ edit: '42' });

        fixture.detectChanges();

        expect(component.draftModelsInView.some((draft) => draft.mid === 42)).toBeTrue();
        expect(component.draftModelsInView.length).toBe(10);
    });

    it('should ignore invalid edit query parameters', () => {
        queryParams.next({ edit: 'not-a-number' });

        fixture.detectChanges();

        expect(draftDeskService.isEditing).toBe(-1);
        expect(component.draftModelsInView).toEqual([]);
    });
});
