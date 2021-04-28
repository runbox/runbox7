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
import { Component } from '@angular/core';

@Component({
  moduleId: 'angular2/app/dev/',
  selector: 'app-dev',
  templateUrl: 'dev.component.html'
})
export class DevComponent {
    routes = [
        { path: 'app-activity-indicator',  name: 'Activity Indicator' },
        { path: 'app-runbox-intro',        name: 'Intro'              },
        { path: 'app-runbox-list',         name: 'List'               },
        { path: 'app-runbox-container',    name: 'Container'          },
        { path: 'app-runbox-section',      name: 'Section'            },
        { path: 'app-runbox-slide-toggle', name: 'Slide Toggle'       },
        { path: 'app-runbox-timer',        name: 'Timer'              },
        { path: 'app-runbox-dynamic',      name: 'Dynamic'            },
        { path: 'app-runbox-loading',      name: 'Loading indicator'  },
    ];
}
