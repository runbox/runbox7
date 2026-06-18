// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2024 Runbox Solutions AS (runbox.com).
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

import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { FrameBustingService } from './frame-busting.service';

/**
 * Refuses to activate a route when the app is loaded inside a frame,
 * mitigating clickjacking of the actions reachable from that route. Scoped
 * per-route rather than applied globally so that any legitimate full-app
 * embedding is not broken wholesale.
 *
 * Defence-in-depth only — the authoritative control is the frame-ancestors /
 * X-Frame-Options response headers documented in SECURITY.md.
 */
@Injectable({ providedIn: 'root' })
export class FrameDefenseGuard implements CanActivate {
    constructor(private frameBusting: FrameBustingService) {}

    canActivate(): boolean {
        if (this.frameBusting.isFramed()) {
            console.warn('Runbox 7: refusing to render a sensitive route inside a frame (possible clickjacking).');
            return false;
        }
        return true;
    }
}
