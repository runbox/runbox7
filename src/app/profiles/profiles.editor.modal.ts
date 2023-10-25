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
import { Component, Input, Inject } from '@angular/core';

import { MatLegacyDialogRef as MatDialogRef, MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { Identity, ProfileService } from './profile.service';
import { RMM } from '../rmm';
import { Location } from '@angular/common';
import { DraftDeskService } from '../compose/draftdesk.service';
import { TinyMCEPlugin } from '../rmm/plugin/tinymce.plugin';

@Component({
    selector: 'app-profiles-edit',
    styleUrls: ['profiles.editor.modal.scss'],
    templateUrl: 'profiles.editor.modal.html',
})

export class ProfilesEditorModalComponent {
    @Input() value: any[];
    field_errors: Identity;
    allowed_domains = [];
    is_valid = false;

    is_update = false;
    is_create = false;
    type;
    is_visible_smtp_detail = false;
    is_different_reply_to = false;
    localpart;
    editor: any = null;
    selector: any;
    public tinymce_plugin: TinyMCEPlugin;
    constructor(
        public profileService: ProfileService,
        public rmm: RMM,
        private location: Location,
        public snackBar: MatSnackBar,
        public dialog_ref: MatDialogRef<ProfilesEditorModalComponent>,
        public draftDeskservice: DraftDeskService,
        @Inject(MAT_DIALOG_DATA) public identity: Identity
    ) {
        this.tinymce_plugin = new TinyMCEPlugin();
        if (!identity || !Object.keys(identity).length) {
            identity = new Identity;
            const self = this;
            identity.name = ['first_name', 'last_name'].map((attr) => {
                return self.profileService.me[attr];
            }).join(' ');
        }
        if (identity.email) {
            this.set_localpart(identity);
        }
        this.identity = identity;
        if (this.identity.is_signature_html) {
            this.init_tinymce();
        } else {
            this.identity.is_signature_html = false;
        }
        this.check_reply_to(this.identity);
    }
    check_reply_to(identity) {
        if (identity && identity.email && identity.reply_to &&
            identity.reply_to !== identity.email) {
            this.is_different_reply_to = true;
            return;
        }
        this.is_different_reply_to = false;
    }
    set_localpart(identity) {
        if (identity.email.match(/@/g)) {
            this.localpart = identity.email.replace(/@.+/g, '');
            const regex = /(.+)@(.+)/g;
            const match = regex.exec(identity.email);
            identity.preferred_runbox_domain = match[2];
        } else {
            this.localpart = identity.email;
            identity.preferred_runbox_domain = this.localpart;
        }
    }
    save() {
        if (this.is_create) {
            this.create();
        } else { this.update(); }
    }
    create() {
        const identity = this.identity;
        const values = {
            name: identity.name,
            email: identity.email,
            from_name: identity.from_name,
            reply_to: identity.reply_to,
            signature: identity.signature,
            smtp_address: identity.smtp_address,
            smtp_port: identity.smtp_port,
            smtp_username: identity.smtp_username,
            smtp_password: identity.smtp_password,
            type: this.type,
            is_signature_html: (identity.is_signature_html ? 1 : 0),
            is_smtp_enabled: (identity.is_smtp_enabled ? 1 : 0),
        };
        this.profileService.create(values).subscribe(
            res => this.close()
        );
    }
    delete() {
        const identity = this.identity;
        this.profileService.delete(identity.id).subscribe(
            res => this.close()
        );
    }
    update() {
        const identity = this.identity;
        const values = {
            name: identity.name,
            email: identity.email,
            from_name: identity.from_name,
            reply_to: identity.reply_to,
            signature: identity.signature,
            smtp_address: identity.smtp_address,
            smtp_port: identity.smtp_port,
            smtp_username: identity.smtp_username,
            smtp_password: identity.smtp_password,
            is_signature_html: (identity.is_signature_html ? 1 : 0),
            is_smtp_enabled: (identity.is_smtp_enabled ? 1 : 0),
        };
      this.profileService.update(this.identity.id, values).subscribe(
        res => this.close()
      );
    }
    close() {
        this.dialog_ref.close({});
    }
    show_error(message, action) {
        this.snackBar.open(message, action, {
            duration: 2000,
        });
    }
    onchange_field(field) {
        if (this.field_errors && this.field_errors[field]) {
            this.field_errors[field] = [];
        }
        if (field === 'preferred_runbox_domain') {
            const identity = this.identity;
            const selected_domain = identity.preferred_runbox_domain;
            ['email'].forEach((attr) => {
                let email = identity[attr];
                if (email && email.match(/@/g)) {
                    let is_replaced = false;
                    this.rmm.runbox_domain.data
                        .map((item) => item.name) // runbox domains array
                        .forEach((runbox_domain) => {
                            if (is_replaced) { return; }
                            const rgx = '@' + runbox_domain + '$';
                            const re = new RegExp(rgx, 'g');
                            if (email.match(re)) {
                                email = identity[attr].replace(re, '@' + selected_domain);
                                this.identity[attr] = email;
                                is_replaced = true;
                            }
                        });
                } else {
                    this.identity[attr] = [identity[attr], selected_domain].join('@');
                }
            });
        }
        if (field === 'is_different_reply_to') {
            if (!this.is_different_reply_to) {
                this.identity.reply_to = '';
            }
        }
    }
    get_form_field_style() {
        const styles = {};
        if (this.identity && this.identity.type === 'aliases') {
            styles['background'] = '#dedede';
        }
        return styles;
    }
    toggle_SMTP_details(action, item) {
        if (action === 'show') {
            this.is_visible_smtp_detail = true;
        } else {
            this.is_visible_smtp_detail = false;
        }
    }
    is_aliases_global_domain(identity) {
        return (identity.reference_type === 'aliases' && !identity.email.match(/@/g))
            || (identity.reference_type === 'aliases' && identity.email && this.global_domains().filter((d) => {
                const rgx = d.name;
                const re = new RegExp(rgx, 'g');
                if (identity.email.match(re)) {
                    return true;
                }
                return false;
            }).length);
    }
    global_domains() {
        if (!this.rmm.runbox_domain.data) {
            return [{ name: 'runbox.com' }, { name: 'runbox.no' }];
        } else {
            return this.rmm.runbox_domain.data;
        }
    }
    toggle_signature_html() {
        if (this.identity.is_signature_html) {
            this.init_tinymce();
        } else {
            this.hide_tinymce();
        }
    }
    hide_tinymce() {
        if (this.editor) {
            this.identity.signature = this.editor.getContent({ format: 'text' });
            this.tinymce_plugin.remove(this.editor);
            this.editor = null;
        }
    }
    init_tinymce() {
        this.selector = `html-editor-${Math.floor(Math.random() * 10000000000)}`;
        const options = {
            base_url: this.location.prepareExternalUrl('/tinymce/'), // Base for assets such as skins, themes and plugins
            selector: '#' + this.selector,
            setup: editor => {
                this.editor = editor;
                editor.on('Change', () => {
                    this.identity.signature = editor.getContent();
                });
            },
            init_instance_callback: (editor) => {
                editor.setContent(
                    this.identity.signature ?
                        this.identity.signature.replace(/\n/g, '<br />\n') :
                        ''
                );
            }
        };
        this.tinymce_plugin.create(options);
    }
    resend_validate_email(id) {
        this.profileService.reValidate(id);
    }
}
