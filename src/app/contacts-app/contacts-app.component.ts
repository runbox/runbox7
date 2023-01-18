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
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenav } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, NavigationStart, Router, NavigationEnd } from '@angular/router';

import { UsageReportsService } from '../common/usage-reports.service';
import { Contact, ContactKind, GroupMember } from './contact';
import { ContactListComponent } from './contact-list.component';
import { ContactsService } from './contacts.service';
import { MobileQueryService } from '../mobile-query.service';
import { GroupPickerDialogComponent } from './group-picker-dialog-component';
import { VcfImportDialogComponent, VcfImportDialogResult } from './vcf-import-dialog.component';

import { v4 as uuidv4 } from 'uuid';
import { take } from 'rxjs/operators';

@Component({
    moduleId: 'angular2/app/contacts-app/',
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'contacts-app-root',
    styleUrls: ['contacts-app.component.scss'],
    templateUrl: './contacts-app.component.html'
})
export class ContactsAppComponent {
    title = 'Contacts';
    contacts: Contact[] = [];
    groups: Contact[] = [];
    shownContacts: Contact[] = [];

    shownGroup: Contact = null;
    showingDetails = false;

    selectedContacts: Set<string> = new Set();
    selectedCount = 0;

    categories  = [];

    appLayout = 'twoColumns';

    sideMenuOpened = true;

    @ViewChild(ContactListComponent) contactList: ContactListComponent;
    @ViewChild(MatSidenav) sideMenu: MatSidenav;
    @ViewChild('vcfUploadInput') vcfUploadInput: any;

    constructor(
        public  contactsservice: ContactsService,
        private dialog:          MatDialog,
        private http:            HttpClient,
        public  mobileQuery:     MobileQueryService,
        private route:           ActivatedRoute,
        private router:          Router,
        private snackBar:        MatSnackBar,
        private usage:           UsageReportsService,
    ) {
        console.log('Contacts.app: waiting for backend contacts...');
        this.contactsservice.contactsSubject.subscribe(contacts => {
            console.log('Contacts.app: got the contacts!');
            this.contacts = contacts;
            this.groups = this.contacts.filter(
                c => c.kind === ContactKind.GROUP
            ).sort(
                (a, b) => a.full_name.localeCompare(b.full_name)
            );
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
                    text => this.processVcfImport(text, false)
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

            this.determineLayout();
        });

        router.events.subscribe(event => {
            if (event instanceof NavigationStart) {
                if (mobileQuery.matches) {
                    this.sideMenu.close();
                }
            } else if (event instanceof NavigationEnd) {
                const url = router.parseUrl(router.url);
                const childPath = url.root.children.primary?.segments[1]?.path;
                if (childPath) {
                    this.showingDetails = true;
                    // we can't use this.groups, since at the point this fires they may not be loaded yet
                    this.contactsservice.contactsSubject.pipe(take(1)).subscribe(contacts => {
                        const group = contacts.filter(c => c.kind === ContactKind.GROUP).find(g => g.id === childPath);
                        if (group) {
                            this.shownGroup = group;
                            this.showingDetails = false;
                        }
                    });
                    // for details-only view, when we want the toolbar to be visible too
                    document.getElementById('contactsPageTop').scrollIntoView(true);
                    // for 3-column view, when the toolbar is always visible anyway
                    document.getElementById('detailsPageTop').scrollIntoView(true);
                } else {
                    this.showingDetails = false;
                    this.shownGroup = null;
                }
                this.filterContacts();
                this.determineLayout();
            }
        });

        this.usage.report('contacts');
    }

    addSelectedToGroup(): void {
        const toAdd = this.contacts.filter(c => this.selectedContacts.has(c.id));

        if (toAdd.find(c => c.kind === ContactKind.GROUP)) {
            this.snackBar.open('Groups cannot be added to groups', 'Ok', {
                duration: 5000,
            });
            return;
        }

        const dialogRef = this.dialog.open(GroupPickerDialogComponent, {
            data: { groups: this.contacts.filter(c => c.kind === ContactKind.GROUP) }
        });
        dialogRef.afterClosed().subscribe(group => {
            if (group) {
                this.addContactsToGroup(group, toAdd);
                this.contactList.resetSelection();
            }
        });
    }

    closeDetails(): void {
        this.showDetails(false);
        if (this.shownGroup) {
            this.router.navigate(['/contacts', this.shownGroup.id]);
        } else {
            this.router.navigate(['/contacts']);
        }
    }

    deleteSelected(): void {
        const toDelete = this.contacts.filter(c => this.selectedContacts.has(c.id));
        this.contacts = this.contacts.filter(c => !this.selectedContacts.has(c.id));
        this.filterContacts();
        this.contactList.resetSelection();

        this.contactsservice.deleteMultiple(toDelete).then(_ => {
            this.showNotification(`Deleted ${toDelete.length} contacts`);
        });
    }

    determineLayout(): void {
        if (!this.mobileQuery.matches) {
            this.appLayout = 'twoColumns';
        } else {
            if (this.showingDetails) {
                this.appLayout = 'showDetails';
            } else {
                this.appLayout = 'showList';
            }
        }
    }

    filterContacts(): void {
        this.shownContacts = this.contacts.filter(c => {
            if (c.kind === ContactKind.GROUP
              || c.kind === ContactKind.SETTINGSONLY) {
                return false;
            }

            if (this.shownGroup) {
                if (!this.shownGroup.members.find(gm => gm.uuid === c.id)) {
                    return false;
                }
            }

            return true;
        });
    }

    importVcfClicked(): void {
        this.vcfUploadInput.nativeElement.click();
    }

    onContactsSelected(selection: Set<string>) {
        this.selectedContacts = selection;
        this.selectedCount = selection.size;
    }

    onVcfUploaded(uploadEvent: any) {
        const file = uploadEvent.target.files[0];
        const fr   = new FileReader();

        let type_check_warning = false;
        if (file.type !== 'text/vcard') {
            type_check_warning = true;
        }

        fr.onload = (ev: any) => {
            // Empty element so we can directly retry / upload more files
            this.vcfUploadInput.nativeElement.value = '';

            const vcf = ev.target.result;
            if (vcf.startsWith('BEGIN:VCARD')) {
                // Maybe its fine after all, lets parse it and see what happens
                type_check_warning = false;
            }
            this.processVcfImport(vcf, type_check_warning);
        };

        fr.readAsText(file);
    }

    processVcfImport(vcf: string, warning: boolean) {
        let contacts: Contact[];
        try {
            contacts = Contact.fromVcf(vcf);
        } catch (e) {
            if (warning) {
                // we predicted this:
                this.showError('Only .vcf contacts files are supported, this does not look like one');
            } else {
                this.showError('Error parsing contacts: is it a proper VCF file?\n' + 'ParserError: ' + e.message);
            }
            return;
        }
        const dialogRef = this.dialog.open(VcfImportDialogComponent, {
            data: {
                contacts: contacts,
                categories: this.categories,
                groups: this.contacts.filter(c => c.kind === ContactKind.GROUP)
            }
        });
        dialogRef.afterClosed().subscribe((result: VcfImportDialogResult) => {
            if (!result) {
                return;
            }
            const promises = [];
            for (const c of contacts) {
                // Assign an uuid unless it already has one.
                // Without it we won't be able to add them to groups if requested
                if (!c.id) {
                    c.id = uuidv4().toUpperCase();
                }
                // Check if contact already present:
                const foundContact = this.contacts.find(contact => contact.id === c.id);
                if (foundContact) {
                    this.showNotification('Contact already exists, not importing: ' + c.id);
                } else {
                    if (result.stripCategories) {
                        c.categories = [];
                    }
                    if (result.newCategory) {
                        c.categories = c.categories.concat(result.newCategory);
                    }
                    promises.push(this.contactsservice.saveContact(c, false));
                }
            }
            Promise.all(promises).finally(() => this.contactsservice.reload());
            if (result.addToGroup) {
                this.addContactsToGroup(result.addToGroup, contacts);
            }
        });
    }

    showDetails(yes: boolean): void {
        this.showingDetails = yes;
        this.determineLayout();
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
        } else if (e instanceof Error) {
            message = 'Error: ' + e.message;
        } else if (e?.error?.error) {
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

    dropContactTo(group: Contact, ev: DragEvent) {
        const id = ev.dataTransfer.getData('contact');
        if (!id) {
            return;
        }
        const target = this.contacts.find(c => c.id === id);
        if (target) {
            this.addContactsToGroup(group, [target]);
        }
    }

    private addContactsToGroup(group: Contact, members: Contact[]): void {
        const newMembers = members.filter(
            nm => !group.members.find(gm => gm.uuid === nm.id)
        ).map(c => GroupMember.fromUUID(c.id));
        group.members = group.members.concat(newMembers);
        this.contactsservice.saveContact(group);
    }
}
