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

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuModule } from '../menu/menu.module';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { RunboxIntroComponent } from '../runbox-components/runbox-intro';
import { RunboxListComponent } from '../runbox-components/runbox-list';
import { RunboxContainerComponent } from '../runbox-components/runbox-container';
import { RunboxSectionComponent } from '../runbox-components/runbox-section';
import { RunboxSlideToggleComponent } from '../runbox-components/runbox-slide-toggle';
import { RunboxTimerComponent } from '../runbox-components/runbox-timer';
import { RunboxDynamicComponent } from '../runbox-components/runbox-dynamic';
import { RunboxDynamicBuilderComponent } from './runbox-dynamic-builder';

@NgModule({
    declarations: [
        RunboxIntroComponent,
        RunboxListComponent,
        RunboxContainerComponent,
        RunboxSectionComponent,
        RunboxSlideToggleComponent,
        RunboxTimerComponent,
        RunboxDynamicComponent,
        RunboxDynamicBuilderComponent,
    ],
    imports: [
        CommonModule,
        MatGridListModule,
        MatCheckboxModule,
        FormsModule,
        MatInputModule,
        MatButtonModule,
        MatCardModule,
        MatMenuModule,
        MatIconModule,
        MatListModule,
        MatProgressBarModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatSidenavModule,
        MatToolbarModule,
        MatTooltipModule,
        MatTableModule,
        MenuModule,
    ],
    exports: [
        RunboxIntroComponent,
        RunboxListComponent,
        RunboxContainerComponent,
        RunboxSectionComponent,
        RunboxSlideToggleComponent,
        RunboxTimerComponent,
        RunboxDynamicComponent,
        RunboxDynamicBuilderComponent,
    ],
    providers: [],
    bootstrap: []
})

export class RunboxComponentModule { }


