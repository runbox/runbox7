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
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                CanvasTableModule
            ]
        });
    });

    it('should activate draggable column overlay on mouseover', async () => {
        const fixture = TestBed.createComponent(CanvasTableContainerComponent);
        fixture.componentInstance.canvastableselectlistener = {
            rowSelected: (_rowIndex: number, _colIndex: number, _multiSelect?: boolean): void => undefined,
            saveColumnWidthsPreference: (_widths: unknown): void => undefined
        };
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

    it('should draw row-wrap status icons for hidden status columns', () => {
        const fixture = TestBed.createComponent(CanvasTableContainerComponent);
        fixture.componentInstance.canvastableselectlistener = {
            rowSelected: (_rowIndex: number, _colIndex: number, _multiSelect?: boolean): void => undefined,
            saveColumnWidthsPreference: (_widths: unknown): void => undefined
        };
        fixture.componentInstance.canvastable.columns = [
            {
                name: '',
                cacheKey: 'selectbox',
                sortColumn: null,
                getValue: () => false,
                width: 40,
                checkbox: true
            },
            {
                name: 'Date',
                cacheKey: 'date',
                sortColumn: null,
                rowWrapModeMuted: true,
                getValue: () => '2026-06-10',
                width: 100
            },
            {
                name: 'From',
                cacheKey: 'from',
                sortColumn: null,
                getValue: () => 'sender@example.com',
                width: 120
            },
            {
                name: 'Subject',
                cacheKey: 'subject',
                sortColumn: null,
                getValue: () => 'Compact status row',
                width: 200
            },
            {
                name: '',
                cacheKey: 'answered',
                sortColumn: null,
                rowWrapModeHidden: true,
                rowWrapModeStatusIcon: true,
                font: '16px \'Material Icons\'',
                getValue: (rowIndex: number) => fixture.componentInstance.canvastable.rows.getRow(rowIndex).answeredFlag,
                getFormattedValue: (val) => val ? '\uE15E' : ''
            },
            {
                name: '',
                cacheKey: 'flagged',
                sortColumn: null,
                rowWrapModeHidden: true,
                rowWrapModeStatusIcon: true,
                font: '16px \'Material Icons\'',
                getValue: (rowIndex: number) => fixture.componentInstance.canvastable.rows.getRow(rowIndex).flaggedFlag,
                getFormattedValue: (val) => val ? '\uE153' : ''
            },
        ];
        fixture.componentInstance.canvastable.rows = new MessageList([
            {
                id: 1,
                seenFlag: true,
                answeredFlag: true,
                flaggedFlag: true
            }
        ]);
        fixture.componentInstance.canvastable.rowWrapMode = true;
        fixture.detectChanges();

        const canvas = fixture.componentInstance.canvastable.canvRef.nativeElement;
        Object.defineProperty(canvas, 'scrollWidth', { value: 300, configurable: true });
        Object.defineProperty(canvas, 'scrollHeight', { value: 100, configurable: true });
        const context = canvas.getContext('2d');
        spyOn(context, 'fillText').and.callThrough();

        fixture.componentInstance.canvastable['dopaint']();

        const drawnText = (context.fillText as jasmine.Spy).calls.allArgs()
            .map((args) => args[0]);
        expect(drawnText).toContain('\uE15E');
        expect(drawnText).toContain('\uE153');
    });
});
