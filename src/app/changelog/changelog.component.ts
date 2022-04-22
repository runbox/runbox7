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

import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterEvent, Scroll } from '@angular/router';
import { MatSidenav } from '@angular/material/sidenav';

import { MobileQueryService } from '../mobile-query.service';

import { ChangelogEntry, EntryType, changelog } from './changes';

@Component({
    selector: 'app-changelog',
      styleUrls: ['changelog.component.scss'],
    templateUrl: './changelog.component.html',
})
export class ChangelogComponent implements AfterViewInit, OnInit {
    since: string;

    features: ChangelogEntry[];
    fixes:    ChangelogEntry[];
    style:    ChangelogEntry[];
    docs:     ChangelogEntry[];
    tests:    ChangelogEntry[];

    sideMenuOpened = true;

    @ViewChild(MatSidenav) sideMenu: MatSidenav;

    @ViewChild('featuresElement') featuresElement: ElementRef;
    @ViewChild('bugfixesElement') bugfixesElement: ElementRef;
    @ViewChild('styleElement') styleElement:    ElementRef;

    @ViewChild('docsElement') docsElement:     ElementRef;
    @ViewChild('testsElement') testsElement:    ElementRef;

    constructor(
        public  mobileQuery: MobileQueryService,
        private router:      Router,
        private route:       ActivatedRoute,
    ) {
        this.loadChangelog(changelog);

        this.sideMenuOpened = !mobileQuery.matches;
        this.mobileQuery.changed.subscribe(mobile => {
            this.sideMenuOpened = !mobile;
        });
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.since = params['since'];
            if (this.since) {
                const entries = changelog.filter(c => c.epoch > parseInt(this.since, 10));
                this.loadChangelog(entries);
            } else {
                this.loadChangelog(changelog);
            }
        });
    }

    ngAfterViewInit() {
        this.router.events.subscribe((e: RouterEvent) => {
            // This should have been easy to handle using { anchorScrolling: 'enabled' }
            // in router options, but apparently that doesn't quite work (yet?).
            // Workaround borrowed from https://stackoverflow.com/a/56568668
            if (e instanceof Scroll) {
                const element = {
                    'features': this.featuresElement,
                    'bugfixes': this.bugfixesElement,
                    'style':    this.styleElement,
                    'docs':     this.docsElement,
                    'tests':    this.testsElement,
                }[e.anchor];
                if (element) {
                    element.nativeElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    }

    loadChangelog(log: ChangelogEntry[]): void {
        this.features = log.filter(c => c.type === EntryType.FEAT);
        this.fixes    = log.filter(c => c.type === EntryType.FIX);
        this.style    = log.filter(c => c.type === EntryType.STYLE);
        this.docs     = log.filter(c => c.type === EntryType.DOCS);
        this.tests    = log.filter(c => c.type === EntryType.TEST);
    }

    scrollTo(anchor: string): void {
        this.router.navigate(['./'], {
            fragment: anchor,
            relativeTo: this.route,
            skipLocationChange: true,
            queryParamsHandling: 'preserve',
        });
        if (this.mobileQuery.matches) {
            this.sideMenu.close();
        }
    }
}
