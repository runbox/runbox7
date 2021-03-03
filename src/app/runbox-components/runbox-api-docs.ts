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
import {
  Component,
  OnInit
} from '@angular/core';
import { RMM } from '../rmm';
import 'rxjs/add/operator/toPromise';

@Component({
    selector: 'app-runbox-api-docs',
    styles: [`
        .docs-container {
            display: flex;
            flex-grow: 1;
        }
        .docs-container .row {
            display: flex;
            flex-direction: row;
            flex-grow: 1;
        }
        .docs-container .col {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
        }
    `],
    template: `
    <div class="app-runbox-api-docs" >
        <section class="mat-typography" *ngIf="docs">
            <div class="docs-container">
                <div class="row" style="">
                    <div class="col" style="flex-grow: 0;">
                        <mat-list>
                            <div *ngFor="let section of sections">
                              <mat-list-item (click)="open_section(section)"><a>{{section}}</a></mat-list-item>
                              <mat-divider></mat-divider>
                            </div>
                        </mat-list>
                    </div>
                    <div class="col" style="">
                        <div class="row" style="flex-grow: 0;">
                            <div style="max-width: 700px">
                                <mat-tab-group [(selectedIndex)]="tab_index" style="">
                                  <mat-tab *ngFor="let subsection of subsections" [label]="subsection">
                                      <app-runbox-section>
                                          <div runbox-section-header>
                                            <h1 class="runbox-section-header">{{docs.sections[section][subsection].section}} &#62; {{docs.sections[section][subsection].title}}</h1>
                                          </div>
                                          <div runbox-section-content class="runbox-section-content">
                                              <div class="description">
                                                <p><strong>Description:</strong> {{docs.sections[section][subsection].details}}</p>
                                                <p><strong>Url:</strong> https:&#47;&#47;runbox.com{{docs.sections[section][subsection].request.url}}</p>
                                                <p><strong>Method:</strong> {{docs.sections[section][subsection].request.method}}</p>
                                                <mat-divider></mat-divider>
                                              </div>
                                              <div class="request">
                                                <h2>Request</h2>
                                                <p><strong>Headers:</strong> {{docs.sections[section][subsection].request.headers | json}}</p>
                                                <p><strong>Content:</strong> {{docs.sections[section][subsection].request.content}}</p>
                                                <mat-divider></mat-divider>
                                              </div>
                                              <div class="response">
                                                <h2>Response</h2>
                                                <p><strong>Headers:</strong> {{docs.sections[section][subsection].response.headers | json}}</p>
                                                <p><strong>Content:</strong> {{docs.sections[section][subsection].response.content}}</p>
                                              </div>
                                          </div>
                                      </app-runbox-section>
                                  </mat-tab>
                                </mat-tab-group>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
    `
})

export class RunboxApiDocsComponent implements OnInit {
  docs_url: '/_js/docs.json';
  docs: any;
  section: any;
  sections: any;
  subsections: any;
  public tab_index: any;
  constructor(
    public rmm: RMM,
  ) {
  }

  ngOnInit() {
    this.load_docs();
  }

  sort_alphanumeric(a, b) {
    if ( a < b )  { return -1; }
    if ( a > b )  { return  1; }
    return 0;
  }

  load_docs() {
    const req = this.rmm.docs.load_docs();
    req.toPromise().then( (data) => {
        this.docs = data;
        this.sections = Object.keys( this.docs.sections ).sort( this.sort_alphanumeric );
        this.open_section(this.sections[0]);
    });
  }

  open_section(section) {
    this.section = section;
    this.subsections = Object.keys(this.docs.sections[this.section]).sort( this.sort_alphanumeric );
    setTimeout( () => { this.tab_index = 0; }, 200 );
  }
}

