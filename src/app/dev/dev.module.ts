
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
import { RouterModule } from '@angular/router';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { DevComponent } from './dev.component';
import { RunboxComponentModule } from '../runbox-components/runbox-component.module';
import { RunboxCommonModule } from '../common/common.module';
import { LoadingDemoComponent } from './loading-demo.component';
import { RunboxIntroComponent } from '../runbox-components/runbox-intro';
import { RunboxDynamicComponent } from '../runbox-components/runbox-dynamic';
import { ListDemoComponent } from './list-demo.component';
import { ContainerDemoComponent } from './container-demo.component';
import { SectionDemoComponent } from './section-demo.component';
import { SlideToggleDemoComponent } from './slide-toggle-demo.component';
import { TimerDemoComponent } from './timer-demo.component';
import { ActivityIndicatorDemoComponent } from './activity-indicator.demo.component';

@NgModule({
    declarations: [
        ActivityIndicatorDemoComponent,
        DevComponent,
        LoadingDemoComponent,
        ListDemoComponent,
        ContainerDemoComponent,
        SectionDemoComponent,
        SlideToggleDemoComponent,
        TimerDemoComponent,
    ],
    imports: [
        RunboxComponentModule,
        RunboxCommonModule,
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
        RouterModule.forChild([
            {
                path: '',
                component: DevComponent,
                children: [
                    { path: '', redirectTo: 'app-runbox-intro' },
                    { path: 'app-activity-indicator', component: ActivityIndicatorDemoComponent },
                    { path: 'app-runbox-container', component: ContainerDemoComponent },
                    { path: 'app-runbox-dynamic', component: RunboxDynamicComponent },
                    { path: 'app-runbox-intro', component: RunboxIntroComponent },
                    { path: 'app-runbox-list', component: ListDemoComponent },
                    { path: 'app-runbox-loading', component: LoadingDemoComponent },
                    { path: 'app-runbox-section', component: SectionDemoComponent },
                    { path: 'app-runbox-slide-toggle', component: SlideToggleDemoComponent },
                    { path: 'app-runbox-timer', component: TimerDemoComponent },
                ],
            },
        ])
    ],
    exports: [],
    providers: [],
    bootstrap: []
})
export class DevModule { }


