import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StartDeskComponent } from './startdesk.component';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [StartDeskComponent],
  imports: [
    CommonModule,
    MatIconModule,
  ]
})
export class StartDeskModule { }
