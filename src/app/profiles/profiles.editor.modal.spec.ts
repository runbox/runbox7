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

import { Location } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import {
    MatLegacyDialogRef as MatDialogRef,
    MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA
} from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { of } from 'rxjs';
import { DraftDeskService } from '../compose/draftdesk.service';
import { RMM } from '../rmm';
import { Identity, ProfileService } from './profile.service';
import { ProfilesEditorModalComponent } from './profiles.editor.modal';

describe('ProfilesEditorModalComponent', () => {
    let component: ProfilesEditorModalComponent;
    let fixture: ComponentFixture<ProfilesEditorModalComponent>;
    let dialogRef;
    let identity: Identity;
    let profileService;

    beforeEach(waitForAsync(() => {
        identity = Object.assign(new Identity(), {
            email: 'identity@example.com',
            from_name: 'Identity User',
            name: 'Identity',
            reference: {},
            reference_type: 'preference',
            is_signature_html: false,
        });
        dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        profileService = {
            me: {first_name: 'Test', last_name: 'User'},
            global_domains: [],
            create: jasmine.createSpy('create').and.returnValue(of(true)),
            update: jasmine.createSpy('update').and.returnValue(of(true)),
            delete: jasmine.createSpy('delete').and.returnValue(of(true)),
            reValidate: jasmine.createSpy('reValidate'),
        };

        TestBed.configureTestingModule({
            declarations: [
                ProfilesEditorModalComponent,
            ],
            imports: [
                FormsModule,
            ],
            providers: [
                { provide: ProfileService, useValue: profileService },
                { provide: RMM, useValue: {} },
                { provide: Location, useValue: { prepareExternalUrl: url => url } },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: DraftDeskService, useValue: {} },
                { provide: MAT_DIALOG_DATA, useFactory: () => identity },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ProfilesEditorModalComponent);
        component = fixture.componentInstance;
    });

    it('shows clear field errors for missing name and incomplete email', () => {
        component.is_create = true;
        component.identity.from_name = '';
        component.identity.email = 'test';

        component.save();

        expect(component.field_errors.from_name).toEqual(['Please enter a name.']);
        expect(component.field_errors.email).toEqual(['Please enter an email address.']);
        expect(profileService.create).not.toHaveBeenCalled();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('shows a clear field error for invalid reply-to addresses', () => {
        component.is_create = true;
        component.is_different_reply_to = true;
        component.identity.reply_to = 'reply-to';

        component.save();

        expect(component.field_errors.reply_to).toEqual(['Please enter an email address.']);
        expect(profileService.create).not.toHaveBeenCalled();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('passes the field errors object to profile creation', () => {
        component.is_create = true;

        component.save();

        expect(profileService.create).toHaveBeenCalledWith(
            jasmine.objectContaining({
                email: 'identity@example.com',
                from_name: 'Identity User',
            }),
            component.field_errors
        );
        expect(dialogRef.close).toHaveBeenCalledWith({});
    });
});
