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
import { Component, Input } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { RMM } from '../rmm';

@Component({
    selector: 'app-runbox-dynamic',
    styles: [`
    `],
    template: `
    <div class="app-runbox-dynamic">
        <app-runbox-dynamic-builder-component
            [elem]="title"
        >
        </app-runbox-dynamic-builder-component>
        <app-runbox-dynamic-builder-component
            [elem]="multi_paragraphs"
        >
        </app-runbox-dynamic-builder-component>
        <app-runbox-dynamic-builder-component
            [elem]="my_form"
        >
        </app-runbox-dynamic-builder-component>
    </div>
    `
})

export class RunboxDynamicComponent {
  @Input() sidebar_opened = false;
  public test;
  public my_form;
  public title;
  public multi_paragraphs;
  public result;
  constructor(public dialog: MatDialog,
    public rmm: RMM,
    public snackBar: MatSnackBar,
  ) {
    this.build_my_form();
  }

  build_my_form () {
      const firstname = {
        style: '',
        class: '',
        type: 'input',
        // value: 'Hernan',
        label: {
            text: 'Firstname:'
        },
        input: {
            placeholder: 'Enter your firstname',
            type: 'text',
        },
      };

      firstname['validate'] = () => {
          firstname['errors'] = [];
          if ( ! firstname['value'] ) {
            firstname['errors'].push('Firstname is <strong>required</strong>');
          }
          return firstname['errors'].length ? false : true;
      };

      const lastname = {
        style: '',
        class: '',
        type: 'input',
        // value: 'Lopes',
        label: {
            text: 'Lastname:'
        },
        input: {
            placeholder: 'Enter your last',
            type: 'text',
        },
      };

      lastname['validate'] = () => {
          lastname['errors'] = [];
          if ( ! lastname['value'] ) {
            lastname['errors'].push('Lastname is <strong>required</strong>');
          }
          return lastname['errors'].length ? false : true;
      };

      const email = {
        style: '',
        class: '',
        type: 'input',
        label: {
            text: 'Email:'
        },
        input: {
            placeholder: 'Enter your email. ie. name@example.com',
            type: 'email',
        },
      };

      email['validate'] = () => {
          email['errors'] = [];
          if ( ! email['value'] ) {
            email['errors'].push('Email is <strong>required</strong>');
          } else {
            if ( ! email['value'].match(/.+@.+\..+/g) ) {
                email['errors'].push('Invalid format. ie. name@domain.com');
            }
          }
          return email['errors'].length ? false : true;
      };

      this.title = {
        style: '',
        class: 'mat-h1',
        type: 'h1',
        text: 'Runbox7 Dynamic Builder!',
      };

      const btn_subscribe = {
        style: '',
        class: '',
        type: 'button',
        button: {
            color: 'primary',
            text: 'Subscribe',
            disabled: false,
            'mat-button': true,
            event: {
                click: function () {
                  let has_error = false;
                  if ( ! firstname['validate']() ) { has_error = true; }
                  if ( ! lastname['validate']() ) { has_error = true; }
                  if ( ! email['validate']() ) { has_error = true; }
                  if ( ! has_error ) {
                      this.result = {
                        firstname: firstname['value'],
                        lastname: lastname['value'],
                        email: email['value'],
                      };
                      alert('Form validated. Make that POST with: \n' + JSON.stringify(this.result));
                  }
                },
            }
        }
      };

      const btn_load_values = {
        style: '',
        class: '',
        type: 'button',
        button: {
            color: 'warn',
            text: 'Load values',
            // disabled: true,
            event: {
                click: (e: any, col) => {
                    console.log(e);
                },
            }
        }
      };

      const paragraph_additional_notes = {
          style: '',
          class: '',
          type: 'p',
          text: 'This paragraph is an example of some notes. It could be used to describe the form fields or some other important property.'
      };

      const form_row_notes = {
        style: '' ,
        class: '',
        cols: [ paragraph_additional_notes, ],
      };

      const form_row_names = {
        style: '' ,
        class: '',
        cols: [ firstname, lastname, ],
      };

      const form_row_email = {
        style: '' ,
        class: '',
        cols: [ email, ],
      };

      const form_row_2 = {
        style: '' ,
        class: '',
        cols: [ btn_subscribe, btn_load_values ],
      };

      const form = {
        style: '',
        type: 'form',
        class: '',
        rows: [
          form_row_names,
          form_row_notes,
          form_row_email,
          form_row_2,
        ]
      };

      btn_load_values.button.event.click = ( e: any ) => {
        firstname['value'] = 'Hernan';
        lastname['value'] = 'Lopes';
        email['value'] = 'hernan604@runbox.com';
      };

      const row = {
        style: '' ,
        class: '',
        cols: [ form ],
      };

      this.my_form = {
        type: 'form',
            rows: [
              row
            ]
      };

      this.multi_paragraphs = {
        rows: [
            {
                style: '',
                class: '',
                cols: [
                    {
                    type: 'p',
                    text: 'Welcome to the runbox dynamic builder. This builder is a possible recursive html generator. ' +
                    'The objective of this builder is to create standard html across the runbox angular webapp.' +
                    ' The idea is to let the recursive html generator do its job of building the html, and ' +
                    'let the frontend developers focus on business logic instead. With this, the developer will ' +
                    'not need to type angular html.'
                    },
                ]
            },
            {
                style: '',
                class: '',
                cols: [
                    {
                    type: 'p',
                    text: 'It can transform the following structure:'
                    },
                ]
            },
            {
                style: '',
                class: '',
                cols: [
                    {
                    type: 'code',
                    text: JSON.stringify(this.my_form, null, 2)
                    },
                ]
            },
            {
                style: '',
                class: '',
                cols: [
                    {
                    type: 'p',
                    text: 'into the following form:'
                    },
                ]
            },

        ]
      };
  }

}

