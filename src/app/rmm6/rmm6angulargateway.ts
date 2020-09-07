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

/* 
 *  Copyright 2010-2016 FinTech Neo AS ( fintechneo.com )- All rights reserved
 */

import { ComponentRef } from '@angular/core';
import { RMM6Module } from './rmm6.module';
import { SingleMailViewerComponent } from '../mailviewer/singlemailviewer.component';
import { RMM6SearchComponent } from './rmm6search.component';
import { DomainRegisterComponent } from '../domainregister/domainregister.component';

export class RMM6AngularGateway {

    static lastMailViewerRef: ComponentRef<any>;

    constructor(private appmod: RMM6Module) {

    }

    public openDomreg() {
        const aelm = document.createElement('domain-register');
        document.querySelector('#domreg-container').appendChild(aelm);
        this.appmod.ngZone.run(() => {
            const component = this.appmod.componentFactoryResolver
                .resolveComponentFactory(DomainRegisterComponent)
                .create(this.appmod.injector, [], aelm);
            this.appmod.appref.attachView(component.hostView);
        });
    }

    public openSearch() {
        const replaceElement = document.getElementById('messagecell');
        const replaceElementParent = replaceElement.parentElement;

        const componentHostElement = document.createElement('div');
        const previousReplaceElementStyleDisplay = replaceElement.style.display;
        replaceElement.style.display = 'none';

        replaceElementParent.appendChild(componentHostElement);

        this.appmod.ngZone.run(() => {
            const component = this.appmod.componentFactoryResolver
                .resolveComponentFactory(RMM6SearchComponent)
                .create(this.appmod.injector, [], componentHostElement);
            component.instance.onclose.subscribe(() => {
                this.destroyAngularComponent(component);
                replaceElementParent.removeChild(componentHostElement);
                replaceElement.style.display = previousReplaceElementStyleDisplay;
            });
            this.appmod.appref.attachView(component.hostView);
        });
    }

    public openMailViewer(messageId) {
        if (RMM6AngularGateway.lastMailViewerRef) {
            document.documentElement.removeChild(
                document.getElementsByTagName('angular-rmm-mailviewer')[0]
            );
            this.destroyAngularComponent(RMM6AngularGateway.lastMailViewerRef);
            RMM6AngularGateway.lastMailViewerRef = null;
        }

        const aelm = document.createElement('angular-rmm-mailviewer');

        document.documentElement.appendChild(aelm);

        this.appmod.ngZone.run(() => {
            const component = this.appmod.componentFactoryResolver
                .resolveComponentFactory(SingleMailViewerComponent)
                .create(this.appmod.injector, [], aelm);
            component.instance['messageId'] = messageId;
            component.instance['messageActionsHandler'] = this.appmod.messageActionsHandler;
            component.instance['onClose'].subscribe((ret) => {
                this.destroyAngularComponent(component);
                document.documentElement.removeChild(aelm);
                RMM6AngularGateway.lastMailViewerRef = null;
            });
            this.appmod.appref.attachView(component.hostView);
            RMM6AngularGateway['lastMailViewerRef'] = component;
            component.instance['afterViewInit'].subscribe(() => {
                const messageViewerElement = document.getElementById('messageViewer');
                messageViewerElement.style.position = 'fixed';
                messageViewerElement.style.left = (document.getElementById('mailfoldertable').offsetWidth + 1) + 'px';
                messageViewerElement.style.right = '0px';
                messageViewerElement.style.bottom = '0px';
                messageViewerElement.style.backgroundColor = '#fff';

                messageViewerElement.style.zIndex = '5';
                let lastScrollTop = null;
                const intervalHandle = setInterval(() => {
                    if (RMM6AngularGateway.lastMailViewerRef) {
                        if (lastScrollTop !== document.documentElement.scrollTop) {
                            lastScrollTop = document.documentElement.scrollTop;
                            let newMarginTop = (68 - lastScrollTop);
                            if (newMarginTop < 0) {
                                newMarginTop = 0;
                            }
                            messageViewerElement.style.marginTop = newMarginTop + 'px';
                        }
                    } else {
                        clearInterval(intervalHandle);
                    }
                }, 50);
            });
        });
    }

    public destroyAngularComponent(ref: ComponentRef<any>) {
        this.appmod.ngZone.run(() => {
            ref.destroy();
        });
    }
}
