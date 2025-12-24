// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2024 Runbox Solutions AS (runbox.com).
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
import { MatDialog } from '@angular/material/dialog';
import { EmailHostingService } from './email-hosting.service';
import { DomainEditorComponent } from './domain-editor.component';
import { Domain, DomainQuota } from './domain';

@Component({
    selector: 'app-domain-list',
    templateUrl: './domain-list.component.html',
    styleUrls: ['./domain-list.component.scss'],
    standalone: false
})
export class DomainListComponent implements OnInit {
    domains: Domain[] = [];
    quota: DomainQuota | null = null;
    displayedColumns: string[] = ['name', 'status', 'created', 'catchAll', 'actions'];

    constructor(
        private emailHostingService: EmailHostingService,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.emailHostingService.domains$.subscribe(domains => {
            this.domains = domains;
        });
        this.emailHostingService.quota$.subscribe(quota => {
            this.quota = quota;
        });
        this.emailHostingService.loadDomains();
        this.emailHostingService.loadQuota();
    }

    getStatusText(status: number): string {
        switch (status) {
            case 1: return 'Active';
            case 0: return 'Inactive';
            default: return 'Unknown';
        }
    }

    getStatusClass(status: number): string {
        switch (status) {
            case 1: return 'status-active';
            case 0: return 'status-inactive';
            default: return 'status-unknown';
        }
    }

    addDomain(): void {
        const dialogRef = this.dialog.open(DomainEditorComponent, {
            width: '500px',
            data: { mode: 'create' }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Domain was added, list will refresh via service
            }
        });
    }

    editDomain(domain: Domain): void {
        const dialogRef = this.dialog.open(DomainEditorComponent, {
            width: '500px',
            data: { mode: 'edit', domain }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Domain was updated, list will refresh via service
            }
        });
    }

    deleteDomain(domain: Domain): void {
        const dialogRef = this.dialog.open(DomainEditorComponent, {
            width: '500px',
            data: { mode: 'delete', domain }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Domain was deleted, list will refresh via service
            }
        });
    }

    canAddDomain(): boolean {
        // Allow adding if quota not loaded yet (backend will reject if over quota)
        if (!this.quota) return true;
        return this.quota.domain_quota_used < this.quota.domain_quota_allowed;
    }
}
