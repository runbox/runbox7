// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2020 Runbox Solutions AS (runbox.com).
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

import { Component, OnDestroy } from '@angular/core';
import { Location } from '@angular/common';
import { MobileQueryService } from '../mobile-query.service';
import { AsyncSubject } from 'rxjs';
import { RunboxWebmailAPI, RunboxMe } from '../rmmapi/rbwebmail';
import { ContactsService } from '../contacts-app/contacts.service';
import { ActivatedRoute } from '@angular/router';
import { StorageService } from '../storage.service';

let jitsiLoader: AsyncSubject<void> = null;
declare let JitsiMeetExternalAPI: any;

@Component({
    selector: 'app-onscreen-component',
    templateUrl: './onscreen.component.html',
    styleUrls: ['./onscreen.component.scss'],
})
export class OnscreenComponent implements OnDestroy {
    sideMenuOpened: boolean;
    jitsiAPI: any;
    role: string;

    meetingList: {
        code: string,
        name: string,
    }[] = [];

    activeMeeting: {
        name:       string,
        code:       string,
        createDate: Date,
        participants: {
            id:          string,
            displayName: string,
            email:       string,
            avatarUrl:   string,
        }[],
    };

    me = new AsyncSubject<RunboxMe>();
    form: {
        meetingCode: string,
        meetingName: string,
        yourName:    string,
        yourEmail:   string,
    } = {
        meetingCode: '',
        meetingName: '',
        yourName: '',
        yourEmail: '',
    };

    constructor(
        private contactsservice: ContactsService,
        public  mobileQuery: MobileQueryService,
        private rmmapi:      RunboxWebmailAPI,
                route:       ActivatedRoute,
        private location:    Location,
        private storage:     StorageService,
    ) {
        this.sideMenuOpened = !mobileQuery.matches;
        this.mobileQuery.changed.subscribe(mobile => this.sideMenuOpened = !mobile);

        if (jitsiLoader === null) {
            jitsiLoader = new AsyncSubject<void>();
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://video.runbox.com/external_api.js';
            script.onload = () => jitsiLoader.complete();
            document.getElementsByTagName('head')[0].appendChild(script);
        }

        this.rmmapi.me.subscribe(me => {
            this.form.yourName = `${me.first_name} ${me.last_name}`.trim();
            this.form.yourEmail = `${me.user_address}`;
            this.form.meetingName = `${me.username}'s meeting`;
            this.me.next(me);
            this.me.complete();
        });

        this.storage.get('onscreen-meetings').then(res => {
            if (res) {
                this.meetingList = res;
            }
            route.params.subscribe(params => {
                if (params['meetingCode'] && params['meetingCode'] !== this.activeMeeting?.code) {
                    this.leaveMeeting();
                    this.joinMeeting(params['meetingCode']);
                }
            });
        });
    }

    static generateMeetingName(name: string, host: string): string {
        return 'runbox7' + btoa(`${host}.${(new Date()).getTime()}.${name}`);
    }

    async createMeeting() {
        await jitsiLoader.toPromise();
        const name = await this.encodeMeetingName(this.form.meetingName);

        this.joinMeeting(name).then(() => {
            this.jitsiAPI.on('videoConferenceJoined', (joinEvent: any) => {
                const us = joinEvent.id;
                this.jitsiAPI.on('participantRoleChanged', (roleEvent: any) => {
                    if (roleEvent.id === us && roleEvent.role === 'moderator') {
                        this.jitsiAPI.executeCommand('subject', this.form.meetingName);
                        this.jitsiAPI.executeCommand('toggleLobby', true);
                    }
                });
            });
        });
    }

    async joinMeeting(code: string) {
        await jitsiLoader.toPromise();

        this.jitsiAPI = new JitsiMeetExternalAPI('video.runbox.com', {
            roomName: code,
            parentNode: document.querySelector('#jitsiContainer'),
            userInfo: {
                email:       this.form.yourEmail,
                displayName: this.form.yourName,
            },
            configOverwrite: {
                prejoinPageEnabled: false,
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', /*'embedmeeting',*/ 'fullscreen',
                    'fodeviceselection', /*'hangup',*/ 'profile', 'chat', /*'recording',*/
                    /*'livestreaming',*/ /*'etherpad',*/ /*'sharedvideo',*/ 'settings', 'raisehand',
                    'videoquality', 'filmstrip', /*'invite',*/ 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', /*'security'*/
                ],
                SHOW_JITSI_WATERMARK: false, // apparently not working
                HIDE_INVITE_MORE_HEADER: true,
            },
        });

        this.jitsiAPI.on('participantJoined', (ev: any) => {
            const participant = {
                id:          ev.id,
                displayName: ev.displayName,
                email:       this.jitsiAPI.getEmail(ev.id),
                avatarUrl:   null,
            };
            // XXX always false due to https://github.com/jitsi/jitsi-meet/issues/5677
            if (participant.email) {
                this.contactsservice.lookupAvatar(participant.email).then(url => {
                    participant.avatarUrl = url;
                });
            }
            this.activeMeeting.participants.push(participant);
        });
        this.jitsiAPI.on('participantLeft', (ev: any) => {
            this.activeMeeting.participants = this.activeMeeting.participants.filter(p => p.id !== ev.id);
        });
        this.onMeetingJoined(code);
    }

    copyMeetingCode() {
        const el = document.createElement('textarea');
        el.value = this.activeMeeting.code;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }

    async encodeMeetingName(name: string): Promise<string> {
        const me = await this.me.toPromise();

        return Promise.resolve(OnscreenComponent.generateMeetingName(name, me.uid.toString()));
    }

    onMeetingJoined(encodedName: string) {
        if (encodedName.startsWith('runbox7')) {
            const dec = atob(encodedName.split('7', 2)[1]);
            const metaparts = dec.split('.');
            const createDate = new Date();
            createDate.setTime(parseInt(metaparts[1], 10));
            const name = metaparts[2];
            this.activeMeeting = {
                code: encodedName,
                name,
                createDate,
                participants: [],
            };
        } else {
            this.activeMeeting = {
                code: encodedName,
                name: encodedName,
                createDate: null,
                participants: [],
            };
        }

        this.meetingList = [{ code: this.activeMeeting.code, name: this.activeMeeting.name }].concat(
            this.meetingList.filter(e => e.code !== this.activeMeeting.code)
        );
        this.storage.set('onscreen-meetings', this.meetingList);

        this.location.go('/onscreen/' + encodedName);
    }

    leaveMeeting() {
        if (this.jitsiAPI) {
            this.jitsiAPI.dispose();
            this.jitsiAPI = null;
            this.activeMeeting = null;
            this.location.go('/onscreen/');
        }
    }

    forgetMeeting(code: string) {
        this.meetingList = this.meetingList.filter(e => e.code !== code);
        this.storage.set('onscreen-meetings', this.meetingList);
    }

    ngOnDestroy() {
        this.leaveMeeting();
    }
}
