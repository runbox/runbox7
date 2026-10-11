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
            rowSelected: (): void => undefined,
            saveColumnWidthsPreference: (): void => undefined
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

    it('should select a checkbox range with shift click', () => {
        const fixture = TestBed.createComponent(CanvasTableContainerComponent);
        const messageList = new MessageList([
            { id: 1, seenFlag: false, subject: 'one' },
            { id: 2, seenFlag: false, subject: 'two' },
            { id: 3, seenFlag: false, subject: 'three' },
            { id: 4, seenFlag: false, subject: 'four' },
            { id: 5, seenFlag: false, subject: 'five' },
        ]);

        fixture.componentInstance.canvastableselectlistener = {
            rowSelected: (rowIndex: number, colIndex: number, multiSelect?: boolean): void => {
                messageList.rowSelected(rowIndex, colIndex, multiSelect);
            },
            saveColumnWidthsPreference: (): void => undefined
        };
        fixture.componentInstance.canvastable.columns = [
            {
                name: '',
                cacheKey: 'selectbox',
                sortColumn: null,
                getValue: (rowIndex: number) => messageList.isSelectedRow(rowIndex),
                width: 40,
                checkbox: true
            },
            {
                name: 'Subject',
                cacheKey: 'subject',
                sortColumn: null,
                getValue: (rowIndex: number) => messageList.getRow(rowIndex).subject,
                width: 200
            },
        ];
        fixture.componentInstance.canvastable.rows = messageList;
        fixture.componentInstance.canvastable.rowWrapMode = false;
        fixture.detectChanges();

        const canvas = fixture.componentInstance.canvastable.canvRef.nativeElement;
        spyOn(canvas, 'getBoundingClientRect').and.returnValue({
            left: 0,
            top: 0,
            right: 300,
            bottom: 200,
            width: 300,
            height: 200,
            x: 0,
            y: 0,
            toJSON: () => ({})
        } as DOMRect);

        clickCanvas(canvas, 5, 14);
        clickCanvas(canvas, 5, 98, true);

        expect(messageList.isSelectedRow(0)).toBeTrue();
        expect(messageList.isSelectedRow(1)).toBeTrue();
        expect(messageList.isSelectedRow(2)).toBeTrue();
        expect(messageList.isSelectedRow(3)).toBeTrue();
        expect(messageList.isSelectedRow(4)).toBeFalse();
    });
});

function clickCanvas(canvas: HTMLCanvasElement, clientX: number, clientY: number, shiftKey = false): void {
    canvas.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        clientX,
        clientY,
        shiftKey
    }));
    canvas.dispatchEvent(new MouseEvent('mouseup', {
        bubbles: true,
        clientX,
        clientY,
        shiftKey
    }));
}
