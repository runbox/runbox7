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

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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
    field_errors;
    allowed_domains = [];
    is_valid = false;
    aliases_unique = [];
    is_busy = false;
    is_delete = false;
    is_update = false;
    is_create = false;
    is_create_main = false;
    type;
    is_visible_smtp_detail = false;
    is_different_reply_to = false;
    localpart;
    editor: any = null;
    selector: any;
    public tinymce_plugin: TinyMCEPlugin;
    constructor(
        public rmm: RMM,
        private location: Location,
        public snackBar: MatSnackBar,
        public dialog_ref: MatDialogRef<ProfilesEditorModalComponent>,
        public draftDeskservice: DraftDeskService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.tinymce_plugin = new TinyMCEPlugin();
        if (data && data.type) {
            this.type = data.type;
            delete data.type;
        }
        if (data.profile && data.profile.email) {
            this.set_localpart(data);
        }
        if (!data || !Object.keys(data).length || !data.profile) {
            data = { profile: {} };
            const self = this;
            data.profile.name = ['first_name', 'last_name'].map((attr) => {
                return self.rmm.me.data[attr];
            }).join(' ');
        }
        this.data = data;
        if (this.data.profile.is_signature_html) {
            this.init_tinymce();
        } else {
            this.data.profile.is_signature_html = false;
        }
        this.check_reply_to(this.data);
    }
    check_reply_to(data) {
        if (data && data.profile.email && data.profile.reply_to &&
            data.profile.reply_to !== data.profile.email) {
            this.is_different_reply_to = true;
            return;
        }
        this.is_different_reply_to = false;
    }
    set_localpart(data) {
        if (data.profile.email.match(/@/g)) {
            this.localpart = data.profile.email.replace(/@.+/g, '');
            const regex = /(.+)@(.+)/g;
            const match = regex.exec(data.profile.email);
            data.profile.preferred_runbox_domain = match[2];
        } else {
            this.localpart = data.profile.email;
            data.profile.preferred_runbox_domain = this.localpart;
        }
    }
    save() {
        if (this.is_create || this.is_create_main) {
            this.create();
        } else { this.update(); }
    }
    create() {
        this.is_busy = true;
        const data = this.data;
        const values = {
            name: data.profile.name,
            email: data.profile.email,
            from_name: data.profile.from_name,
            reply_to: data.profile.reply_to,
            signature: data.profile.signature,
            smtp_address: data.profile.smtp_address,
            smtp_port: data.profile.smtp_port,
            smtp_username: data.profile.smtp_username,
            smtp_password: data.profile.smtp_password,
            type: this.type,
            is_signature_html: (data.profile.is_signature_html ? 1 : 0),
            is_smtp_enabled: (data.profile.is_smtp_enabled ? 1 : 0),
        };
        const req = this.rmm.profile.create(values, this.field_errors);
        req.subscribe(reply => {
            if (reply['status'] === 'success') {
                this.rmm.profile.load();
                this.rmm.profile.load_verified();
                this.draftDeskservice.refreshFroms();
                this.close();
                return;
            }
            this.is_busy = false;
        });
    }
    delete() {
        this.is_busy = true;
        const data = this.data;
        const req = this.rmm.profile.delete(data.profile.id);
        req.subscribe(reply => {
            if (reply['status'] === 'success') {
                this.rmm.profile.load();
                this.close();
                return;
            } else if (reply['status'] === 'error') {
                this.show_error(reply['errors'].join(' '), 'Dismiss');
            }
            this.is_busy = false;
        });
    }
    update() {
        this.is_busy = true;
        const data = this.data;
        const values = {
            name: data.profile.name,
            email: data.profile.email,
            from_name: data.profile.from_name,
            reply_to: data.profile.reply_to,
            signature: data.profile.signature,
            smtp_address: data.profile.smtp_address,
            smtp_port: data.profile.smtp_port,
            smtp_username: data.profile.smtp_username,
            smtp_password: data.profile.smtp_password,
            is_signature_html: (data.profile.is_signature_html ? 1 : 0),
            is_smtp_enabled: (data.profile.is_smtp_enabled ? 1 : 0),
        };
        const req = this.rmm.profile.update(this.data.profile.id, values, this.field_errors);
        req.subscribe(reply => {
            this.is_busy = false;
            if (reply['status'] === 'success') {
                this.rmm.profile.load();
                this.draftDeskservice.refreshFroms();
                this.close();
                return;
            } else {
                if (reply['field_errors']) {
                    this.field_errors = reply['field_errors'];
                }
            }
        });
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
            const data = this.data;
            const selected_domain = data.profile.preferred_runbox_domain;
            ['email'].forEach((attr) => {
                let email = data.profile[attr];
                if (email && email.match(/@/g)) {
                    let is_replaced = false;
                    this.rmm.runbox_domain.data
                        .map((item) => item.name) // runbox domains array
                        .forEach((runbox_domain) => {
                            if (is_replaced) { return; }
                            const rgx = '@' + runbox_domain + '$';
                            const re = new RegExp(rgx, 'g');
                            if (email.match(re)) {
                                email = data.profile[attr].replace(re, '@' + selected_domain);
                                this.data.profile[attr] = email;
                                is_replaced = true;
                            }
                        });
                } else {
                    this.data.profile[attr] = [data.profile[attr], selected_domain].join('@');
                }
            });
        }
        if (field === 'is_different_reply_to') {
            if (!this.is_different_reply_to) {
                this.data.profile.reply_to = '';
            }
        }
    }
    get_form_field_style() {
        const styles = {};
        if (this.data.profile && this.data.profile.type === 'aliases') {
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
    is_aliases_global_domain(data) {
        return (data.profile.reference_type === 'aliases' && !data.profile.email.match(/@/g))
            || (data.profile.reference_type === 'aliases' && data.profile.email && this.global_domains().filter((d) => {
                const rgx = d.name;
                const re = new RegExp(rgx, 'g');
                if (data.profile.email.match(re)) {
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
        if (this.data.profile.is_signature_html) {
            this.init_tinymce();
        } else {
            this.hide_tinymce();
        }
    }
    hide_tinymce() {
        if (this.editor) {
            this.data.profile.signature = this.editor.getContent({ format: 'text' });
            this.tinymce_plugin.remove(this.editor);
            this.editor = null;
        }
    }
    init_tinymce() {
        this.is_busy = true;
        const self = this;
        this.selector = `html-editor-${Math.floor(Math.random() * 10000000000)}`;
        const options = {
            base_url: this.location.prepareExternalUrl('/tinymce/'), // Base for assets such as skins, themes and plugins
            selector: '#' + this.selector,
            setup: editor => {
                self.editor = editor;
                editor.on('Change', () => {
                    self.data.profile.signature = editor.getContent();
                });
            },
            init_instance_callback: (editor) => {
                this.is_busy = false;
                editor.setContent(
                    self.data.profile.signature ?
                        self.data.profile.signature.replace(/\n/g, '<br />\n') :
                        ''
                );
            }
        };
        this.tinymce_plugin.create(options);
    }
    resend_validate_email(id) {
        const req = this.rmm.profile.resend(id);
        req.subscribe(
            data => {
                const reply = data;
                if (reply['status'] === 'success') {
                    this.show_error('Email validation sent', 'Dismiss');
                    this.rmm.profile.load();
                    return;
                }
            },
        );
    }
}
