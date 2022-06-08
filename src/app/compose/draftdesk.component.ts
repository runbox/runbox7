// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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

import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { DraftDeskService, DraftFormModel } from './draftdesk.service';
import { RecipientsService } from './recipients.service';

const MAX_DRAFTS_IN_VIEW = 10;

@Component({
    moduleId: 'angular2/app/compose/',
    templateUrl: 'draftdesk.component.html',
    providers: [RecipientsService],
    styleUrls: ['draftdesk.component.scss']
})
export class DraftDeskComponent implements OnInit {
    public draftModelsInView: DraftFormModel[];
    public hasMoreDrafts = false;
    public currentMaxDraftsInView: number = MAX_DRAFTS_IN_VIEW;
    private hasInitialized = false;

    constructor(
        public rmmapi: RunboxWebmailAPI,
        public router: Router,
        private route: ActivatedRoute,
        public draftDeskservice: DraftDeskService) {

        this.draftDeskservice.draftModels.subscribe(
            drafts => this.draftModelsInView = drafts,
            err => console.log(err)
        );
    }

    ngOnInit() {
        this.route.queryParams
            .subscribe(params => {
                if (params['to']) {
                    this.draftDeskservice.newDraft(
                        DraftFormModel.create(-1, this.draftDeskservice.fromsSubject.value[0], params['to'], '')
            ).then(() => this.updateDraftsInView());
                } else if (params['new']) {
                    // Can't create a new draft until froms has been loaded
                    // FIXME: This needs to only happen once (after froms loaded)
                    this.draftDeskservice.fromsSubject.subscribe((froms) => {
                        if (froms.length > 0 && !this.hasInitialized) {
                            this.newDraft();
                            this.hasInitialized = true;
                        }
                    });
                    this.draftDeskservice.shouldReturnToPreviousPage = true;
                    // this.router.navigate(['/compose']);
                }
            });
    }

    updateDraftsInView() {
        this.draftModelsInView = this.draftDeskservice.draftModels.value.slice(0, this.currentMaxDraftsInView);
    }

    draftDeleted(messageId) {
        this.draftDeskservice.deleteDraft(messageId);
        this.updateDraftsInView();
    }

    exitToTable() {
        this.router.navigate(['/']);
    }

    newDraft() {
        this.draftDeskservice.newDraft(DraftFormModel.create(-1, this.draftDeskservice.fromsSubject.value[0], null, ''));
        this.updateDraftsInView();
    }

    showMore() {
        this.currentMaxDraftsInView += MAX_DRAFTS_IN_VIEW;
        this.updateDraftsInView();
        this.hasMoreDrafts = this.currentMaxDraftsInView < this.draftDeskservice.draftModels.value.length;
    }
}
