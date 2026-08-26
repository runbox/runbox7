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
            rowSelected: (rowIndex: number, colIndex: number, rowContent: any, multiSelect?: boolean): void => {

            },
            saveColumnWidthsPreference: (widths: any): void => {
            }
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

    it('should resolve function tooltip text for an existing row', async () => {
        const fixture = TestBed.createComponent(CanvasTableContainerComponent);
        const tooltipText = jasmine.createSpy('tooltipText').and.returnValue('Function tooltip');
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
                tooltipText
            },
        ];
        fixture.componentInstance.canvastable.rows = new MessageList([
            { id: 1, col1: 'subject1', col2: 'hello' },
            { id: 2, col1: 'subject2', col2: 'world' }
        ]);
        fixture.componentInstance.canvastable.rowWrapMode = false;
        fixture.detectChanges();

        fixture.componentInstance.canvastable.canvRef.nativeElement.dispatchEvent(new MouseEvent('mousemove', {
            clientX: 270,
            clientY: 50
        }));

        await new Promise(resolve => setTimeout(resolve, 0));
        fixture.detectChanges();
        expect(tooltipText).toHaveBeenCalledWith(0);
        expect(fixture.componentInstance.canvastable.floatingTooltip.tooltipText).toEqual('Function tooltip');
    });

    it('should not expose function tooltip source when hovering outside rows', async () => {
        const fixture = TestBed.createComponent(CanvasTableContainerComponent);
        const tooltipText = jasmine.createSpy('tooltipText').and.returnValue('Function tooltip');
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
                tooltipText
            },
        ];
        fixture.componentInstance.canvastable.rows = new MessageList([
            { id: 1, col1: 'subject1', col2: 'hello' }
        ]);
        fixture.componentInstance.canvastable.rowWrapMode = false;
        fixture.detectChanges();

        fixture.componentInstance.canvastable.canvRef.nativeElement.dispatchEvent(new MouseEvent('mousemove', {
            clientX: 270,
            clientY: 100
        }));

        await new Promise(resolve => setTimeout(resolve, 0));
        fixture.detectChanges();
        expect(tooltipText).not.toHaveBeenCalled();
        expect(fixture.componentInstance.canvastable.floatingTooltip).toBeNull();
    });
});
