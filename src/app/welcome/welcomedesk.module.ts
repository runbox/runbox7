import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WelcomeDeskComponent } from './welcomedesk.component';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [WelcomeDeskComponent],
  imports: [
    CommonModule,
    MatIconModule,
  ]
})
export class WelcomeDeskModule { }
