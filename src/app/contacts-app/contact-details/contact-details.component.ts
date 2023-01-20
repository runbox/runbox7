// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2019 Runbox Solutions AS (runbox.com).
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

import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { Contact, ContactKind, AddressDetails, Address, GroupMember } from '../contact';
import { ErrorDialog, ConfirmDialog, SimpleInputDialog, SimpleInputDialogParams } from '../../dialog/dialog.module';
import { filter, take } from 'rxjs/operators';

import { ContactsService } from '../contacts.service';
import { MobileQueryService } from '../../mobile-query.service';
import { ContactPickerDialogComponent } from '../contact-picker-dialog.component';
import { AppSettings, AppSettingsService } from '../../app-settings';
import { DraftDeskService } from '../../compose/draftdesk.service';
import { RunboxWebmailAPI } from '../../rmmapi/rbwebmail';
import { OnscreenComponent } from '../../onscreen/onscreen.component';
import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';

@Component({
    selector: 'app-contact-details',
    styleUrls: ['../contacts-app.component.scss'],
    templateUrl: './contact-details.component.html',
    providers: [Location, {provide: LocationStrategy, useClass: PathLocationStrategy}],
})
export class ContactDetailsComponent {
    contact: Contact;

    @Output() contactSaved = new EventEmitter<Contact>();
    @Output() contactDeleted = new EventEmitter<Contact>();

    @ViewChild('picUploadInput') picUploadInput: any;

    contactForm = this.createForm();

    categories = [];

    groupMembers: GroupMember[] = [];
    // GroupMember or resolved Contact
    loadedGroupMembers = [];
    contactPhotoURI: string;
    contactPhotoSource: string;

    // needed so that templates can refer to enum values through `kind.GROUP` etc
    kind = ContactKind;

    contactIcon: string;

    contactIsDragged = false;
    memberIsDragged  = false;

    AvatarSource = AppSettings.AvatarSource; // makes enum visible in template

    constructor(
        public dialog: MatDialog,
        public mobileQuery: MobileQueryService,
        public settingsService: AppSettingsService,
        private fb: UntypedFormBuilder,
        private rmmapi: RunboxWebmailAPI,
        private router: Router,
        private route: ActivatedRoute,
        private snackBar: MatSnackBar,
        private contactsservice: ContactsService,
        private draftDeskService: DraftDeskService,
        private location: Location,
    ) {
        this.contactForm = this.createForm();

        this.route.params.subscribe(params => {
            const contactid = params.id;
            if (contactid === 'new') {
                this.route.queryParams.subscribe(queryParams => this.loadNewContact(queryParams));
            } else if (contactid === 'new_group') {
                this.loadNewGroup();
            } else if (contactid) {
                this.loadExistingContact(contactid);
            }
        });

        contactsservice.contactCategories.subscribe(categories => this.categories = categories);

        document.addEventListener('dragstart', (ev) => this.contactIsDragged = !!ev.dataTransfer.getData('contact'));
        document.addEventListener('dragend',   ()   => this.contactIsDragged = this.memberIsDragged = false);
    }

    private contactDiffersFrom(other: Contact): boolean {
        return JSON.stringify(this.contact.toDict()) !== JSON.stringify(other.toDict());
    }

    loadExistingContact(id: string): void {
        this.contactsservice.contactsSubject.subscribe(contacts => {
            const contact = contacts.find(c => c.id === id);
            if (!contact) {
                // we may have been displaying something that was just deleted
                this.router.navigateByUrl('/contacts');
            } else if (!this.contact || this.contactDiffersFrom(contact)) { // don't reload the form if current contact hasn't changed
                this.contact = contact;
                // TODO: maybe theck if the form is dirty,
                // and if it is, ask before reloading
                console.log('contact changed, (re)loading contact form');
                this.loadContactForm();
            }
        });
    }

    loadNewContact(params: any): void {
        this.contact = new Contact({});

        if (params.email) {
            this.contact.emails = [
                { types: ['home'], value: params.email }
            ];
        }

        if (params.name) {
            const nameParts = params.name.split(' ');
            if (nameParts.length === 2) {
                // probably "firstName lastName"
                this.contact.first_name = nameParts[0];
                this.contact.last_name = nameParts[1];
            } else {
                // no clue
                this.contact.nickname = params.name;
            }
        }

        this.loadContactForm();
    }

    loadNewGroup(): void {
        this.contact = new Contact({
            kind: ContactKind.GROUP,
        });
        this.loadContactForm();
    }

    loadContactForm(): void {
        // prepare room in the form for all the emails, addresses etc
        this.initializeFormArray('emails',    () => this.createEmailFG());
        this.initializeFormArray('addresses', () => this.createAdrFG());

        // no typo, they're just like emails: types and a string value
        this.initializeFormArray('urls',      () => this.createEmailFG());
        this.initializeFormArray('phones',    () => this.createEmailFG());
        this.initializeFormArray('related',   () => this.createEmailFG());

        const formValue = this.contact.toDict();
        for (const email of formValue.emails) {
            email.canVideoCall = email.value.match(/@runbox\.\w+$/);
        }
        this.contactForm.patchValue(formValue);

        if (this.contact.show_as_company()) {
            this.contactIcon = 'domain';
        } else if (this.contact.kind === ContactKind.GROUP) {
            this.contactIcon = 'account-multiple';
        } else {
            this.contactIcon = 'account';
        }

        this.groupMembers = this.contact.members;
        this.loadGroupMembers();

        this.loadContactPhoto(this.contact.photo);
    }

    loadContactPhoto(uri: string): void {
        this.contactPhotoURI = uri;
        this.contactPhotoSource = null;
        if (!this.contactPhotoURI && this.contact.primary_email()) {
            this.contactsservice.lookupAvatar(this.contact.primary_email()).then(url => {
                if (!url) { return; }
                this.contactPhotoURI = url;
                const sourceMatch = url.match(/(:\/\/?)([^\/]+)/);
                if (sourceMatch) {
                    this.contactPhotoSource = sourceMatch[2];
                }
            });
        }
    }

    loadGroupMembers(): void {
        this.loadedGroupMembers = this.groupMembers.map(member => {
            if (member.uuid) {
                return this.contactsservice.lookupByUUID(member.uuid).then(c => c || member);
            } else {
                return Promise.resolve(member);
            }
        });
    }

    createForm(): UntypedFormGroup {
        return this.fb.group({
            id:         this.fb.control(''),
            full_name:  this.fb.control(''),
            nickname:   this.fb.control(''),
            first_name: this.fb.control(''),
            last_name:  this.fb.control(''),
            company:    this.fb.control(''),
            department: this.fb.control(''),
            birthday:   this.fb.control(''),
            note:       this.fb.control(''),
            categories: this.fb.control(''),

            emails:    this.fb.array([]),
            phones:    this.fb.array([]),
            addresses: this.fb.array([]),
            urls:      this.fb.array([]),
            related:   this.fb.array([]),
        });
    }

    initializeFormArray(property, formGroupCreator): void {
        const formArray = this.contactForm.get(property) as UntypedFormArray;
        formArray.clear();
        for (let i = 0; i < this.contact[property].length; i++) {
            const formGroup = formGroupCreator();
            formArray.push(formGroup);
        }
    }

    createEmailFG(types = []): UntypedFormGroup {
        return this.fb.group({
            types:        this.fb.control(types),
            value:        this.fb.control(''),
            canVideoCall: this.fb.control(false),
        });
    }

    createAdrFG(types = []): UntypedFormGroup {
        return this.fb.group({
            types: this.fb.control(types),
            value: this.fb.group({
                street:      this.fb.control(''),
                city:        this.fb.control(''),
                region:      this.fb.control(''),
                post_code:   this.fb.control(''),
                country:     this.fb.control(''),
            }),
        });
    }

    addFGtoFA(fg: UntypedFormGroup, faName: string): void {
        const fa = this.contactForm.get(faName) as UntypedFormArray;
        fa.push(fg);
    }

    newEmail():    void { this.addFGtoFA(this.createEmailFG([]), 'emails');    }
    newAdr():      void { this.addFGtoFA(this.createAdrFG([]),   'addresses'); }
    newPhone():    void { this.addFGtoFA(this.createEmailFG([]), 'phones');    }
    newUrl():      void { this.addFGtoFA(this.createEmailFG([]), 'urls');      }
    newRelative(): void { this.addFGtoFA(this.createEmailFG([]), 'related');   }

    save(): void {
        for (const name of Object.keys(this.contactForm.controls)) {
            const ctl = this.contactForm.get(name);
            if (ctl.dirty) {
                let value = ctl.value;
                if (name === 'addresses') {
                    value = value.map(
                        (entry: any) => new Address(entry.types, AddressDetails.fromDict(entry.value))
                    );
                }
                this.contact[name] = value;
            }
        }
        if (this.contact.kind === ContactKind.GROUP) {
            this.contact.members = this.groupMembers;
        }
        console.log('Saving contact:', this.contact);
        this.contactsservice.saveContact(this.contact).then(
            id => this.router.navigateByUrl('/contacts/' + id)
        ).catch(err => this.snackBar.open(err.message, 'Ok'));
    }

    rollback(): void {
        this.loadContactForm();
    }

    delete(): void {
        const confirmDialog = this.dialog.open(ConfirmDialog);
        confirmDialog.componentInstance.title = `Delete this contact?`;
        confirmDialog.componentInstance.question =
            `Are you sure that you want to delete this contact?`;
        confirmDialog.componentInstance.noOptionTitle = 'no';
        confirmDialog.componentInstance.yesOptionTitle = 'yes';
        confirmDialog.afterClosed().pipe(
            filter(res => res === true)
        ).subscribe(() => {
            this.contactsservice.deleteContact(this.contact).then(() => {
                this.router.navigateByUrl('/contacts');
            });
        });
    }

    addMember(ev: DragEvent) {
        const id = ev.dataTransfer.getData('contact');
        if (id && !this.groupMembers.find(g => g.uuid === id)) {
            this.groupMembers.push(GroupMember.fromUUID(id));
            this.loadGroupMembers();
        }
    }

    async askForMoreMembers(): Promise<void> {
        let contacts = await this.contactsservice.contactsSubject.pipe(take(1)).toPromise();
        contacts = contacts.filter(c => {
            if (c.kind !== ContactKind.INVIDIDUAL) {
                return false;
            }
            if (this.groupMembers.find(gm => gm.uuid === c.id)) {
                return false;
            }
            return true;
        });
        const dialog = this.dialog.open(ContactPickerDialogComponent, { data: {
            contacts,
            title: 'Add members to ' + this.contact.full_name
        }});
        dialog.afterClosed().pipe(
            filter(res => res)
        ).subscribe(res => {
            for (const id of res.selectedContacts) {
                if (!this.groupMembers.find(g => g.uuid === id)) {
                    this.groupMembers.push(GroupMember.fromUUID(id));
                }
            }
            this.loadGroupMembers();
        });
    }

    memberDragged(ev: DragEvent, index: number) {
        ev.dataTransfer.setData('memberIdx', '' + index);
        this.memberIsDragged = true;
    }

    memberDropped(ev: DragEvent) {
        // if we were dragging something else, then `index` will eval to NaN and won't break anything
        const index = parseInt(ev.dataTransfer.getData('memberIdx'), 10);
        this.memberIsDragged = false;
        this.removeGroupMember(index);
    }

    removeGroupMember(index: number): void {
        this.groupMembers = this.groupMembers.filter((_, i) => i !== index);
        this.loadGroupMembers();
    }

    onPicUploaded(uploadEvent: any) {
        const file = uploadEvent.target.files[0];

        const mimeType = file.type;
        if (!mimeType.match('image/(jpeg|gif|png|webp)')) {
            this.dialog.open(ErrorDialog, { data: {
                message: 'Invalid image type: use jpeg, gif, png or webp'
            } });
            return;
        }

        const fr = new FileReader();
        fr.onload = (ev: any) => {
            if ((<string>fr.result).length > (256 * 1024)) {
                // TODO: Or we could resize+compress it ourselves with a canvas:
                // https://github.com/eyalc4/ts-image-resizer
                this.dialog.open(ErrorDialog, { data: {
                    message: 'Image is too big: please use something smaller than 256KB'
                } });
                return;
            }
            this.loadContactPhoto(this.contact.photo = <string>fr.result);
        };

        fr.readAsDataURL(file);
    }

    removePhoto() {
        this.loadContactPhoto(this.contact.photo = undefined);
    }

    showUploadDialog() {
        this.picUploadInput.nativeElement.click();
    }

    async newVideoCall(email: string) {
        const name = await this.dialog.open(SimpleInputDialog, {
            data: new SimpleInputDialogParams(
                'Meeting invitation',
                'Pick a name for your meeting',
                'Meeting name (optional)',
            )
        }).afterClosed().toPromise();
        const me = await this.rmmapi.me.toPromise();
        const meetingCode = OnscreenComponent.generateMeetingName(name, me.uid.toString());
        const meetingUrl = new URL(this.location.prepareExternalUrl(`/onscreen/${meetingCode}`), window.location.origin);
        this.draftDeskService.newVideoCallInvite(email, meetingUrl).then(() => {
            this.router.navigate(['/compose']);
        });
    }
}
