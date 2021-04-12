// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2021 Runbox Solutions AS (runbox.com).
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

import { Component } from '@angular/core';

@Component({
  moduleId: 'angular2/app/dev/',
  template: `
<app-runbox-list [values]='values_runbox_list'>
    <ng-template #runbox_list_row_small let-item>
        <h1 style="color:red;">{{ item.firstname }}</h1>
        <div>{{ item.lastname }}</div>
    </ng-template>
    <ng-template #runbox_list_row_medium let-item>
        <h1 style="color:red;">{{ item.firstname }}</h1>
        <div>{{ item.firstname }}</div>
        <br>
        <div>{{ item.lastname }}</div>
        <br>
        This is a medium row. Its bigger than the small row.. it displays more content.
        <button (click)="edit(item)">EDIT ITEM</button>
    </ng-template>
</app-runbox-list>
  `
})
export class ListDemoComponent {
    values_runbox_list = [
        {id: 1, firstname: 'Bob', lastname: 'Sponja', email: 'random@email.com'},
        {id: 2, firstname: 'Emliy', lastname: 'Sparrow', email: 'emily@email.com'},
        {id: 3, firstname: 'Nicole', lastname: 'Leconi', email: 'nicoleconi@runbox.com'},
    ];

    edit(item) {
        console.log('edit', item);
        // this.router.navigate(['/dev', 'app-runbox-list', 'edit', item.id]);
    }
}
