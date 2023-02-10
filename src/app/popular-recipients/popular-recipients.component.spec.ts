// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatIconTestingModule } from '@angular/material/icon/testing';

import { PopularRecipientsComponent } from './popular-recipients.component';
import { RecipientsService } from '../compose/recipients.service';
import { MailAddressInfo } from '../common/mailaddressinfo';

import { of } from 'rxjs';

describe('PopularRecipientsComponent', () => {
    let component: PopularRecipientsComponent;
    let fixture: ComponentFixture<PopularRecipientsComponent>;

    beforeEach((() => {
        TestBed.overrideProvider(RecipientsService, { useValue: {
            recentlyUsed: of([
                new MailAddressInfo('foo', 'foo@runbox.com'),
                new MailAddressInfo('bar', 'bar@runbox.com'),
                new MailAddressInfo('baz', 'baz@runbox.com'),
            ])
        }});
        TestBed.configureTestingModule({
            declarations: [ PopularRecipientsComponent, MatIcon ],
            imports: [
                MatExpansionModule,
                MatIconModule,
                MatIconTestingModule,
                MatListModule,
                NoopAnimationsModule,
            ],
            providers: [ RecipientsService ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PopularRecipientsComponent);
        component = fixture.componentInstance;
        component.expanded = true;
        fixture.detectChanges();
    });

    it('should emit signals for clicked recipients', async () => {
        let event: string;
        component.recipientClicked.subscribe((e: string) => event = e);

        fixture.debugElement.nativeElement.querySelector('mat-list-item:nth-of-type(2)').click();

        expect(event).toBe('bar@runbox.com');
    });
});
