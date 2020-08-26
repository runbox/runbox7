import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StartDeskComponent } from './startdesk.component';
import { OverviewComponent } from './overview.component';
import { SenderHilightsComponent } from './sender-hilights.component';

import { MenuModule } from '../menu/menu.module';
import { RunboxCommonModule } from '../common/common.module';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs'; 
import { MatToolbarModule } from '@angular/material/toolbar';

@NgModule({
  declarations: [
    SenderHilightsComponent,
    StartDeskComponent,
    OverviewComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatSelectModule,
    MatTabsModule,
    MatToolbarModule,
    MenuModule,
    RouterModule,
    RunboxCommonModule,
  ]
})
export class StartDeskModule { }
