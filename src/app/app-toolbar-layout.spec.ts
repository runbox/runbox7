// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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

describe('Mail toolbar layout with initial index prompt (#2016)', () => {
    let toolbar: HTMLElement;

    afterEach(() => {
        if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.removeChild(toolbar);
        }
    });

    it('keeps enough width for message action buttons alongside #offerLocalIndex', () => {
        toolbar = document.createElement('div');
        toolbar.id = 'mailMenu';
        toolbar.style.display = 'flex';
        toolbar.style.width = '974px';
        toolbar.innerHTML = `
            <button style="width: 40px; flex-shrink: 0;">Menu</button>
            <div id="offerLocalIndex">
                <p>
                    Runbox will now synchronize with your device to give you an optimal webmail experience.
                    The data can be deleted at any time using the buttons beneath the folder list.
                    <a href="#">What's this?</a>
                </p>
                <mat-list>
                    <mat-list-item>
                        <button>OK!</button>
                        <button>Cancel</button>
                    </mat-list-item>
                </mat-list>
            </div>
            <div class="messageListActionButtonsRight">
                <button>Move</button>
                <button>Delete</button>
                <button>Unread</button>
                <button>More</button>
            </div>
        `;
        document.body.appendChild(toolbar);

        const actionsEl = toolbar.querySelector('.messageListActionButtonsRight') as HTMLElement;
        const promptEl = toolbar.querySelector('#offerLocalIndex') as HTMLElement;
        const toolbarListButtonWidth = 30;
        const moreListButtonIndex = Math.floor(actionsEl.clientWidth / toolbarListButtonWidth) - 1;

        expect(promptEl.clientWidth).toBeGreaterThan(200);
        expect(actionsEl.clientWidth).toBeGreaterThanOrEqual(120);
        expect(moreListButtonIndex).toBeGreaterThanOrEqual(3);
    });
});
