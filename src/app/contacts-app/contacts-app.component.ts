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

import { Component, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Http, ResponseContentType } from '@angular/http';
import { MatDialog, MatSnackBar } from '@angular/material';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';

import { RunboxWebmailAPI } from '../rmmapi/rbwebmail';
import { Contact } from './contact';
import { ContactsService } from './contacts.service';
import { VcfImportDialogComponent } from './vcf-import-dialog.component';

@Component({
    moduleId: 'angular2/app/contacts-app/',
    // tslint:disable-next-line:component-selector
    selector: 'contacts-app-root',
    styleUrls: ['./contacts-app.component.css'],
    templateUrl: './contacts-app.component.html'
})
export class ContactsAppComponent {
    title = 'Contacts';
    contacts: Contact[] = [];
    shownContacts: Contact[] = [];
    selectedContact: Contact;
    sortMethod = 'lastname+';

    groups      = [];
    groupFilter = 'RUNBOX:ALL';
    searchTerm  = '';

    @ViewChild('vcfUploadInput') vcfUploadInput: any;

    constructor(
        private contactsservice: ContactsService,
        private dialog:          MatDialog,
        private http:            Http,
        private rmmapi:          RunboxWebmailAPI,
        private route:           ActivatedRoute,
        private router:          Router,
        private snackBar:        MatSnackBar
    ) {
        console.log('Contacts.app: waiting for backend contacts...');
        this.contactsservice.contactsSubject.subscribe(c => {
            console.log('Contacts.app: got the contacts!');
            this.contacts = c;
            this.filterContacts();
        });

        contactsservice.contactGroups.subscribe(groups => {
            this.groups = groups;
            this.filterContacts();
        });

        this.route.queryParams.subscribe(params => {
            const vcfUrl = params.import_from;
            if (!vcfUrl) { return; }
            this.http.get(vcfUrl, { responseType: ResponseContentType.Blob }).subscribe(
                res => (new Response(res.blob())).text().then(
                    text => this.processVcfImport(text)
                )
            );
        });

        this.contactsservice.informationLog.subscribe(
            msg => this.showNotification(msg)
        );

        this.contactsservice.errorLog.subscribe(
            e => this.showError(e)
        );
    }

    filterContacts(): void {
        this.shownContacts = this.contacts.filter(c => {
            if (this.groupFilter === 'RUNBOX:ALL') {
                return true;
            }
            if (this.groupFilter === 'RUNBOX:NONE' && c.categories.length === 0) {
                return true;
            }

            const target = this.groupFilter.substr(5); // strip 'USER:'

            return c.categories.find(g => g === target);
        }).filter(c => {
            return c.display_name() && (c.display_name().toLowerCase().indexOf(this.searchTerm.toLowerCase()) !== -1);
        });
        this.sortContacts();
    }

    importVcfClicked(): void {
        this.vcfUploadInput.nativeElement.click();
    }

    onVcfUploaded(uploadEvent: any) {
        const file = uploadEvent.target.files[0];
        const fr   = new FileReader();

        fr.onload = (ev: any) => {
            const vcf = ev.target.result;
            this.processVcfImport(vcf);
        };

        fr.readAsText(file);
    }

    processVcfImport(vcf: string) {
        this.contactsservice.importContacts(vcf).subscribe(contacts => {
            const dialogRef = this.dialog.open(VcfImportDialogComponent, {
                data: { contacts: contacts, groups: this.groups }
            });
            dialogRef.afterClosed().subscribe(result => {
                if (!result) {
                    return;
                }
                for (const c of contacts) {
                    if (result['group']) {
                        c.categories.push(result['group']);
                    }
                    this.contactsservice.saveContact(c);
                }
            });
        });
    }

    showNotification(message: string, action = 'Dismiss'): void {
        this.snackBar.open(message, action, {
            duration: 2000,
        });
    }

    showError(e: HttpErrorResponse): void {
        let message = '';

        if (e.status === 500) {
            message = 'Internal server error';
        } else {
            console.log('Error ' + e.status +  ': ' + e.message);
        }

        if (message) {
            this.snackBar.open(message, 'Ok :(', {
                duration: 5000,
            });
        }
    }

    sortContacts(): void {
        this.shownContacts.sort((a, b) => {
            let firstname_order: number;
            let lastname_order: number;

            // all this complexity is so that the null values are always treated
            // as last if they were alphabetically last
            if (a.first_name === b.first_name) {
                firstname_order = 0;
            } else if (a.first_name === null) {
                firstname_order = 1;
            } else if (b.first_name === null) {
                firstname_order = -1;
            } else {
                firstname_order = a.first_name.localeCompare(b.first_name);
            }

            if (a.last_name === b.last_name) {
                lastname_order = 0;
            } else if (a.last_name === null) {
                lastname_order = 1;
            } else if (b.last_name === null) {
                lastname_order = -1;
            } else {
                lastname_order = a.last_name.localeCompare(b.last_name);
            }

            if (this.sortMethod === 'lastname+') {
                return lastname_order || firstname_order;
            }

            if (this.sortMethod === 'lastname-') {
                return (1 - lastname_order) || (1 - firstname_order);
            }

            if (this.sortMethod === 'firstname+') {
                return firstname_order || lastname_order;
            }

            if (this.sortMethod === 'firstname-') {
                return (1 - firstname_order) || (1 - lastname_order);
            }
        });
    }
}
