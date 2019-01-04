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

import {Injectable} from '@angular/core';
import {BrowserXhr} from '@angular/http';

import {Subject, BehaviorSubject} from 'rxjs';

@Injectable()
export class ProgressService {
  downloadProgress: Subject<ProgressEvent> = new Subject();
  uploadProgress: Subject<ProgressEvent> = new Subject();
  httpRequestInProgress: Subject<Boolean> = new BehaviorSubject(false);
}

@Injectable()
export class ProgressBrowserXhr extends BrowserXhr {
  constructor(private service: ProgressService) {
    super();
  }

  build(): any {
    const xhr = super.build();
    xhr.onprogress = (event) => {
      this.service.downloadProgress.next(event);
    };

    xhr.upload.onprogress = (event) => {
      this.service.uploadProgress.next(event);
    };
    return <any>(xhr);
  }
}
