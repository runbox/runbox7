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
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';

import { Contact } from './contact';
import { ContactsService } from './contacts.service';
import { MobileQueryService } from '../mobile-query.service';
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

    selectingMultiple = false;
    selectedCount = 0;
    selectedIDs = {};

    categories  = [];
    categoryFilter = 'RUNBOX:ALL';
    searchTerm  = '';

    sideMenuOpened = true;
    @ViewChild(MatSidenav) sideMenu: MatSidenav;
    @ViewChild('vcfUploadInput') vcfUploadInput: any;

    constructor(
        public  contactsservice: ContactsService,
        private dialog:          MatDialog,
        private http:            HttpClient,
        public  mobileQuery:     MobileQueryService,
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

        contactsservice.contactCategories.subscribe(categories => {
            this.categories = categories;
            this.filterContacts();
        });

        this.route.queryParams.subscribe(params => {
            const vcfUrl = params.import_from;
            if (!vcfUrl) { return; }
            this.http.get(vcfUrl, { responseType: 'blob' }).subscribe(
                res => (new Response(res)).text().then(
                    text => this.processVcfImport(text)
                )
            );
            this.router.navigate(['/contacts'], { queryParams: {}, replaceUrl: true });
        });

        this.contactsservice.informationLog.subscribe(
            msg => this.showNotification(msg)
        );

        this.contactsservice.errorLog.subscribe(
            e => this.showError(e)
        );

        this.sideMenuOpened = !mobileQuery.matches;
        this.mobileQuery.changed.subscribe(mobile => {
            this.sideMenuOpened = !mobile;
        });

        router.events.subscribe(event => {
            if (event instanceof NavigationStart) {
                if (mobileQuery.matches) {
                    this.sideMenu.close();
                }
            }
        });
    }

    deleteSelected(): void {
        const toDelete = this.contacts.filter(c => this.selectedIDs[c.id]);
        this.contacts = this.contacts.filter(c => !this.selectedIDs[c.id]);
        this.filterContacts();
        this.selectedIDs = {};
        this.selectedCount = 0;

        this.contactsservice.deleteMultiple(toDelete).then(_ => {
            this.showNotification(`Deleted ${toDelete.length} contacts`);
            this.contactsservice.reload();
        });
    }

    filterContacts(): void {
        this.shownContacts = this.contacts.filter(c => {
            if (this.categoryFilter === 'RUNBOX:ALL') {
                return true;
            }
            if (this.categoryFilter === 'RUNBOX:NONE' && c.categories.length === 0) {
                return true;
            }

            const target = this.categoryFilter.substr(5); // strip 'USER:'

            return c.categories.find(g => g === target);
        }).filter(c => {
            return c.display_name() && (c.display_name().toLowerCase().indexOf(this.searchTerm.toLowerCase()) !== -1);
        });
        this.sortContacts();
    }

    importVcfClicked(): void {
        this.vcfUploadInput.nativeElement.click();
    }

    onContactChecked(): void {
        this.selectedCount = Object.values(this.selectedIDs).filter(x => x).length;
    }

    onSelectMultipleChange(): void {
        if (!this.selectingMultiple) {
            // uncheck all contacts if we're switching this off to prevent confusing leftovers
            this.selectedIDs = {};
            this.selectedCount = 0;
        }
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
        let contacts: Contact[];
        try {
            contacts = Contact.fromVcf(vcf);
        } catch {
            this.showError('Error parsing contacts: is it a proper VCF file?');
            return;
        }
        const dialogRef = this.dialog.open(VcfImportDialogComponent, {
            data: { contacts: contacts, categories: this.categories }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (!result) {
                return;
            }
            for (const c of contacts) {
                if (result['category']) {
                    c.categories = c.categories.concat(result['category']);
                }
                this.contactsservice.saveContact(c);
            }
        });
    }

    selectAll(): void {
        for (const c of this.shownContacts) {
            this.selectedIDs[c.id] = true;
        }
        this.onContactChecked();
    }

    showNotification(message: string, action = 'Dismiss'): void {
        this.snackBar.open(message, action, {
            duration: 2000,
        });
    }

    showError(e: any): void {
        let message = '';
        console.log('Showing error:', e);

        if (typeof e === 'string') {
            message = e;
        } else if (e.error.error) {
            message = e.error.error;
        } else if (e.status === 500) {
            message = 'Internal server error';
        } else {
            message = 'Error ' + e.status +  ': ' + e.message;
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
            } else if (!a.first_name) {
                firstname_order = 1;
            } else if (!b.first_name) {
                firstname_order = -1;
            } else {
                firstname_order = a.first_name.localeCompare(b.first_name);
            }

            if (a.last_name === b.last_name) {
                lastname_order = 0;
            } else if (!a.last_name) {
                lastname_order = 1;
            } else if (!b.last_name) {
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

    dragStarted(ev: DragEvent, contact_id: string) {
        ev.dataTransfer.setData('contact', contact_id);
    }
}
