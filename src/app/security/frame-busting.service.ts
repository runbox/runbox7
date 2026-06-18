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

/**
 * Detects whether the application is running inside a frame. Used by
 * FrameDefenseGuard to refuse rendering sensitive routes when framed.
 *
 * This is defence-in-depth; the authoritative clickjacking control is the
 * server sending `Content-Security-Policy: frame-ancestors` and
 * `X-Frame-Options` (see SECURITY.md).
 */
@Injectable({ providedIn: 'root' })
export class FrameBustingService {
    /**
     * @param win window-like object (injectable for testing)
     * @returns true when the app is not the top-level window
     */
    isFramed(win: Window = window): boolean {
        try {
            return win.self !== win.top;
        } catch {
            // A cross-origin parent makes win.top access throw — we are framed.
            return true;
        }
    }
}
