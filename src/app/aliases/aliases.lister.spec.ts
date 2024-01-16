// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2023 Runbox Solutions AS (runbox.com).
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

import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { AliasesListerComponent } from "./aliases.lister";
import { MatLegacyDialogModule } from "@angular/material/legacy-dialog";
import { MatLegacySnackBarModule } from "@angular/material/legacy-snack-bar";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { RunboxWebmailAPI } from "../rmmapi/rbwebmail";
import { RMM } from "../rmm";
import { of } from "rxjs";
import { CommonModule } from "@angular/common";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { AliasesEditorModalComponent } from "./aliases.editor.modal";
import { MatLegacyCommonModule, MatLegacyOptionModule } from "@angular/material/legacy-core";
import { HttpClient } from "@angular/common/http";

describe('AliasesListerComponent', () => {
    let component: AliasesListerComponent;
    let fixture: ComponentFixture<AliasesListerComponent>;

    const DEFAULT_EMAIL = 'a.kalou@shadowcat.co.uk';
    const ALLOWED_DOMAINS = ['runbox.com', 'shadowcat.co.uk'];
    const ALIASES = [
        {localpart: "testyface", domain: "runbox.com", forward_to: "mctestface@runbox.com"},
        {localpart: "testface", domain: "runbox.com", forward_to: "mctestface@runbox.com"},
        {localpart: "akalou", domain: "runbox.com", forward_to: "a.kalou@shadowcat.co.uk"},
    ];

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                HttpClientTestingModule,
                MatLegacyCommonModule,
                MatLegacySnackBarModule,
                MatLegacyDialogModule,
                NoopAnimationsModule,
            ],
            providers: [
                AliasesListerComponent,
                { provide: RunboxWebmailAPI, useValue: {
                  me: of({user_address: DEFAULT_EMAIL}),
                  getRunboxDomains() { return of([{'name':'runbox.com'}, {'name':'runbox.xyz'}]); },
                } },
                { provide: HttpClient, useValue: {
                    get(url: string) {
                        if (/alias\/allowed_domains$/.test(url)) {
                            return of({
                                status: 'success',
                                result: {allowed_domains: ALLOWED_DOMAINS}
                            });
                        } else {
                            return of({
                                status: 'error',
                                result: 'unimplemented'
                            })
                        }
                    }
                } },
                { provide: RMM, useValue: {
                    alias: { 
                        load: () => of({
                            status: 'success', 
                            result: {aliases: ALIASES}
                        }),
                        create: (alias) => of({
                            status: 'success',
                            result: {alias: alias}
                        }),
                    }
                } },
            ],
            declarations: [
                AliasesListerComponent,
                AliasesEditorModalComponent,
            ],
        });
        fixture = TestBed.createComponent(AliasesListerComponent);
        component = fixture.componentInstance;
    })

    it('loads aliases through RMM', () => {
        expect(component.aliases).toEqual(ALIASES);
    })

    it('sets the default email to current user email', () => {
        expect(component.defaultEmail).toBe(DEFAULT_EMAIL);
    });

    it('lists no aliases if none are defined', () => {
        component.aliases = [];
        fixture.detectChanges();

        const aliases = fixture.nativeElement.querySelectorAll('mat-form-field.alias');
        expect(aliases.length).toBe(0, 'no aliases should be shown');
    });

    it('lists all available aliases', () => {
        component.aliases = [
            {localpart: "testyface", domain: "runbox.com", forward_to: "mctestface@runbox.com"},
            {localpart: "testface", domain: "runbox.com", forward_to: "mctestface@runbox.com"},
            {localpart: "akalou", domain: "runbox.com", forward_to: "a.kalou@shadowcat.co.uk"},
        ];
        fixture.detectChanges();

        const aliases = fixture.nativeElement.querySelectorAll('mat-form-field.alias');
        expect(aliases.length).toBe(component.aliases.length, 'all aliases should be shown');
        const forwards = fixture.nativeElement.querySelectorAll('mat-form-field.forward_to');
        expect(forwards.length).toBe(component.aliases.length, 'all forwards should be shown');
    });

    it('sets the default email to the current users email', fakeAsync(() => {
        expect(component.defaultEmail).toBe(DEFAULT_EMAIL);

        // spawn a modal
        component.create();
        fixture.detectChanges();

        const modal = 
            fixture.nativeElement.nextSibling.querySelector('app-aliases-edit');
        expect(modal).toBeTruthy();

        fixture.detectChanges();
        const forwardTo: HTMLInputElement = 
            modal.querySelector("input[name='forward_to']");
        // FIXME: doesn't work, value isn't set, probably because of ngModel
        // expect(forwardTo.value)
        //     .toBe(DEFAULT_EMAIL, "Forward to should default to the user's email");
    }));

    it('dialog loads allowed domains', () => {
        // spawn a modal
        component.create();
        fixture.detectChanges();

        const modal = 
            fixture.nativeElement.nextSibling.querySelector('app-aliases-edit');
        expect(modal).toBeTruthy();

        const domain: HTMLSelectElement = 
            modal.querySelector("mat-select[name='domain']");

        ALLOWED_DOMAINS.forEach(allowed_domain => {
            expect(domain.textContent).toContain(allowed_domain);
        });
    });
});
