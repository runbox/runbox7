// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2022 Runbox Solutions AS (runbox.com).
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

import { TestBed } from '@angular/core/testing';
import { CanvasTableModule, CanvasTableContainerComponent } from './canvastable';
import { MessageList } from '../common/messagelist';

describe('canvastable', () => {
    const selectListener = {
        rowSelected: (): void => {
            return undefined;
        },
        saveColumnWidthsPreference: (): void => {
            return undefined;
        }
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                CanvasTableModule
            ]
        });
    });

    it('should activate draggable column overlay on mouseover', async () => {
        const fixture = TestBed.createComponent(CanvasTableContainerComponent);
        fixture.componentInstance.canvastableselectlistener = selectListener;
        fixture.componentInstance.canvastable.columns = [
            {
                name: 'Column1',
                cacheKey: 'col1',
                sortColumn: null,
                getValue: (row) => row.col1,
                width: 200
            },
            {
                name: 'Column2',
                cacheKey: 'col2',
                sortColumn: null,
                getValue: (row) => row.col2,
                width: 200,
                draggable: true
            },
        ];
      fixture.componentInstance.canvastable.rows = new MessageList([
            { col1: 'subject1', col2: 'fld' },
            { col1: 'test', col2: 'hello' }
      ]);
        fixture.componentInstance.canvastable.rowWrapMode = false;
        fixture.detectChanges();

        fixture.componentInstance.canvastable.canvRef.nativeElement.dispatchEvent(new MouseEvent('mousemove', {
            clientX: 270,
            clientY: 50
        }));

        await new Promise(resolve => setTimeout(resolve, 500));
        fixture.detectChanges();
        expect(fixture.componentInstance.canvastable.floatingTooltip).toBeTruthy();
        expect(fixture.componentInstance.canvastable.columnOverlay).toBeTruthy();
    });

    it('should move the deleted message follower to the top after row removal', () => {
        const fixture = TestBed.createComponent(CanvasTableContainerComponent);
        fixture.componentInstance.canvastableselectlistener = selectListener;
        fixture.componentInstance.canvastable.columns = [
            {
                name: 'Subject',
                cacheKey: 'subject',
                sortColumn: null,
                getValue: (row) => row.subject,
                width: 200
            }
        ];
        fixture.componentInstance.canvastable.rows = new MessageList(
            Array.from({ length: 40 }, (_, index) => ({
                id: index + 1,
                subject: `Message ${index + 1}`
            }))
        );
        fixture.componentInstance.canvastable.topindex = 4;
        fixture.detectChanges();

        fixture.componentInstance.canvastable.removeMessages([6, 11, 21]);

        expect(fixture.componentInstance.canvastable.rows.rowCount()).toBe(37);
        expect(fixture.componentInstance.canvastable.topindex).toBe(18);
        expect(fixture.componentInstance.canvastable.rows.getRowMessageId(18)).toBe(22);
    });
});
