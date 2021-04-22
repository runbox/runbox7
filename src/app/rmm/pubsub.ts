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
import { Observable } from 'rxjs';

export class PubSub {
  public subject = {};
  publish(subject, args) {
    args = args || [];
    this.subject[subject].forEach( ( callback ) => {
        callback.apply( args );
    } );
  }
  subscribe(subject, callback) {
    this.subject[subject] = this.subject[subject] || [];
    this.subject[subject].push(callback);
    const subscription = [subject, callback];
    return subscription;
  }
  unsubscribe(subscription) {
    const subject = subscription[0];
    const callback = subscription[1];
    this.subject[subject].forEach( (v, i) => {
        if ( v === callback ) { this.subject[subject].splice(i, 1); }
    } );
  }
}
