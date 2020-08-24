import { NgModule } from '@angular/core';
import { StartDeskComponent } from './startdesk.component';
import { OverviewComponent } from './overview.component';

import { MenuModule } from '../menu/menu.module';

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

@NgModule({
  declarations: [
    OverviewComponent,
    StartDeskComponent
  ],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    MenuModule,
  ]
})
export class StartDeskModule { }
