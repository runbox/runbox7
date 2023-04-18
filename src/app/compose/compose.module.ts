// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2018 Runbox Solutions AS (runbox.com).
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

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MAT_LEGACY_FORM_FIELD_DEFAULT_OPTIONS as MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DraftDeskService } from './draftdesk.service';
import { DraftDeskComponent } from './draftdesk.component';
import { ComposeComponent } from './compose.component';
export { ComposeComponent } from './compose.component';
import { MenuModule } from '../menu/menu.module';
import { MailRecipientInputComponent} from './mailrecipientinput.component';
export { MailRecipientInputComponent} from './mailrecipientinput.component';

@NgModule({
  imports: [
      CommonModule,
      MatAutocompleteModule,
      MatCheckboxModule,
      MatButtonModule,
      MatInputModule,
      MatChipsModule,
      MatToolbarModule,
      MatCardModule,
      MatIconModule,
      MatSelectModule,
      MatProgressBarModule,
      FormsModule,
      ReactiveFormsModule,
      MenuModule,
      MatTooltipModule
  ],
  declarations: [DraftDeskComponent, ComposeComponent, MailRecipientInputComponent],
  exports: [DraftDeskComponent, ComposeComponent, MailRecipientInputComponent],
  providers: [
    {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { float: 'always' }},
    DraftDeskService
  ]
})
export class ComposeModule {

}
