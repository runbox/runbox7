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

import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';
import { mergeMap, map } from 'rxjs/operators';
import { RecipientsService } from './recipients.service';

const MAX_DRAFTS_IN_VIEW = 10;

@Component({
    moduleId: 'angular2/app/compose/',
    templateUrl: 'draftdesk.component.html',
    providers: [RecipientsService],
    styleUrls: ['draftdesk.component.scss']
})
export class DraftDeskComponent implements OnInit, AfterViewInit {
    public draftModelsInView: DraftFormModel[];
    public hasMoreDrafts = false;
    public currentMaxDraftsInView: number = MAX_DRAFTS_IN_VIEW;

    constructor(
        public rmmapi: RunboxWebmailAPI,
        public router: Router,
        private route: ActivatedRoute,
        public draftDeskservice: DraftDeskService) {

    }

    ngOnInit() {
        if (this.draftDeskservice.draftModels.length > MAX_DRAFTS_IN_VIEW) {
            this.draftModelsInView = this.draftDeskservice.draftModels.slice(0, MAX_DRAFTS_IN_VIEW);
            this.hasMoreDrafts = true;
        } else {
            this.draftModelsInView = this.draftDeskservice.draftModels;
        }
    }

    ngAfterViewInit() {
        this.draftDeskservice.draftsRefreshed.pipe(
            mergeMap(() => this.route.queryParams),
            map((queryparams) => {
                if (queryparams['to']) {
                    this.draftDeskservice.newDraft(DraftFormModel.create(-1, this.draftDeskservice.froms[0],
                        queryparams['to'],
                        ''),
                        () => this.updateDraftsInView()
                    );
                } else if (queryparams['new']) {
                    this.newDraft();
                } else {
                    this.updateDraftsInView();
                }
            })
        ).subscribe();
    }

    updateDraftsInView() {
        this.draftModelsInView = this.draftDeskservice.draftModels.slice(0, this.currentMaxDraftsInView);
    }

    draftDeleted(messageId) {
        this.draftDeskservice.deleteDraft(messageId);
        this.updateDraftsInView();
    }

    exitToTable() {
        this.router.navigate(['/']);
    }

    newDraft() {
        this.draftDeskservice.newDraft(DraftFormModel.create(-1, this.draftDeskservice.froms[0], null, ''));
        this.updateDraftsInView();
    }

    showMore() {
        this.currentMaxDraftsInView += MAX_DRAFTS_IN_VIEW;
        this.updateDraftsInView();
        this.hasMoreDrafts = this.currentMaxDraftsInView < this.draftDeskservice.draftModels.length;
    }
}
