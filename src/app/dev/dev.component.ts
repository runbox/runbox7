
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
import { timeout } from 'rxjs/operators';
import { SecurityContext, Component, Input, TemplateRef, ElementRef, ContentChild, Output, EventEmitter, NgZone, ViewChild, AfterViewInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgressService } from '../http/progress.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatInputModule,
  MatListModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatSelectModule,
  MatSnackBarModule,
  MatTableModule,
  MatTabsModule,
  MatChipsModule,
  MatDialog,
  MatPaginator,
  MatSnackBar,
} from '@angular/material';

import {MatFormFieldModule} from '@angular/material/form-field'; 
import { RMM } from '../rmm';
import { RunboxIntro } from '../runbox-components/runbox-intro';
import { RunboxList } from '../runbox-components/runbox-list';

@Component({
  moduleId: 'angular2/app/dev/',
  selector: 'dev',
  templateUrl: 'dev.component.html'
})

export class DevComponent implements AfterViewInit {
  panelOpenState = false;
  @ViewChild(MatPaginator, {static: false}) paginator: MatPaginator;
  @Output() onClose: EventEmitter<string> = new EventEmitter();
  selected_component;
  values_runbox_list;
  dialog_ref : any;

  ngAfterViewInit() {
  }

  constructor(
    public snackBar: MatSnackBar,
    public dialog: MatDialog,
    public rmm: RMM,
    public route: ActivatedRoute,
    private router: Router,
  ) {
    if ( !route || !route.params && route.params['getValue'] || !route.params['getValue']().selected_component ) {
        this.router.navigate(['/dev', 'runbox-intro']);
        return;
    }
    this.init();
  }

  init() {
    this.load_runbox_list();
  }

  load_runbox_list() {
    //prepares data to be used with <runbox-list>
    this.values_runbox_list = [
        {id:1, firstname:'Bob', lastname: 'Sponja', email: 'random@email.com'},
        {id:2, firstname:'Emliy', lastname: 'Sparrow', email: 'emily@email.com'},
        {id:3, firstname:'Nicole', lastname:'Leconi', email: 'nicoleconi@runbox.com'},
    ]
  }

  edit(item) {
    console.log('edit', item)
    this.router.navigate(['/dev', 'runbox-list', 'edit', item.id]);
  }

  log(item) {
    console.log('item', item)
  }

  runbox_list_edit(item) {
    console.log('edit runbox list item', item)
  }

}
