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

import { UntypedFormBuilder } from '@angular/forms';
import { NgZone } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';

import { ComposeComponent } from './compose.component';
import { DraftFormModel } from './draftdesk.service';

describe('ComposeComponent', () => {
    function createComponent() {
        const formBuilder = new UntypedFormBuilder();
        const component = new ComposeComponent(
            {} as any,
            {} as any,
            {} as any,
            {
                fromsSubject: new BehaviorSubject([]),
                isEditing: -1,
                composingNewDraft: null,
            } as any,
            {} as any,
            {} as any,
            formBuilder,
            {} as any,
            {} as any,
            { recentlyUsed: of([]) } as any,
            {
                prefGroup: 'global',
                preferences: of(new Map<string, string>()),
                set: jasmine.createSpy('set'),
            } as any,
            new NgZone({ enableLongStackTrace: false }),
        );

        component.model = new DraftFormModel();
        component.formGroup = formBuilder.group(component.model);

        return component;
    }

    it('closes the empty CC recipient field', () => {
        const component = createComponent();
        component.hasCC = true;

        component.closeRecipientField('cc');

        expect(component.hasCC).toBeFalse();
        expect(component.model.cc).toEqual([]);
        expect(component.formGroup.controls.cc.value).toBe('');
    });

    it('closes the empty BCC recipient field', () => {
        const component = createComponent();
        component.hasBCC = true;

        component.closeRecipientField('bcc');

        expect(component.hasBCC).toBeFalse();
        expect(component.model.bcc).toEqual([]);
        expect(component.formGroup.controls.bcc.value).toBe('');
    });
});
