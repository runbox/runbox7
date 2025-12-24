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

import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EmailHostingService } from './email-hosting.service';
import { Domain } from './domain';

export interface DomainEditorData {
    mode: 'create' | 'edit' | 'delete';
    domain?: Domain;
}

@Component({
    selector: 'app-domain-editor',
    templateUrl: './domain-editor.component.html',
    styleUrls: ['./domain-editor.component.scss'],
    standalone: false
})
export class DomainEditorComponent {
    domainName = '';
    catchAll = false;
    isLoading = false;
    errorMessage = '';

    constructor(
        private dialogRef: MatDialogRef<DomainEditorComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DomainEditorData,
        private emailHostingService: EmailHostingService
    ) {
        if (data.domain) {
            this.domainName = data.domain.name;
            this.catchAll = data.domain.catch_all === 'y';
        }
    }

    get isCreate(): boolean {
        return this.data.mode === 'create';
    }

    get isEdit(): boolean {
        return this.data.mode === 'edit';
    }

    get isDelete(): boolean {
        return this.data.mode === 'delete';
    }

    get title(): string {
        switch (this.data.mode) {
            case 'create': return 'Add Email Domain';
            case 'edit': return 'Edit Email Domain';
            case 'delete': return 'Delete Email Domain';
        }
    }

    save(): void {
        if (this.isCreate) {
            this.createDomain();
        } else if (this.isEdit) {
            this.updateDomain();
        }
    }

    createDomain(): void {
        if (!this.domainName.trim()) {
            this.errorMessage = 'Domain name is required';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        this.emailHostingService.addDomain(this.domainName.trim(), this.catchAll).subscribe({
            next: (response) => {
                this.isLoading = false;
                if (response.status === 'success') {
                    this.dialogRef.close(response.result);
                } else if (response.error) {
                    this.errorMessage = response.error.join(' ');
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMessage = err.error?.errors?.join(' ') || 'Failed to add domain';
            }
        });
    }

    updateDomain(): void {
        if (!this.data.domain) return;

        this.isLoading = true;
        this.errorMessage = '';

        this.emailHostingService.updateDomain(this.data.domain.name, this.catchAll).subscribe({
            next: (response) => {
                this.isLoading = false;
                if (response.status === 'success') {
                    this.dialogRef.close(response.result);
                } else if (response.error) {
                    this.errorMessage = response.error.join(' ');
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMessage = err.error?.errors?.join(' ') || 'Failed to update domain';
            }
        });
    }

    deleteDomain(): void {
        if (!this.data.domain) return;

        this.isLoading = true;
        this.errorMessage = '';

        this.emailHostingService.deleteDomain(this.data.domain.name).subscribe({
            next: (response) => {
                this.isLoading = false;
                if (response.status === 'success') {
                    this.dialogRef.close(true);
                } else if (response.error) {
                    this.errorMessage = response.error.join(' ');
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.errorMessage = err.error?.errors?.join(' ') || 'Failed to delete domain';
            }
        });
    }

    cancel(): void {
        this.dialogRef.close();
    }
}
