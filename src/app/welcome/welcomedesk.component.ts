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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RunboxMe, RunboxWebmailAPI } from '../rmmapi/rbwebmail';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcomedesk.component.html',
  styleUrls: ['./welcomedesk.component.scss']
})

export class WelcomeDeskComponent implements OnInit {
  public me: RunboxMe;

  constructor(
    private activatedRoute: ActivatedRoute,
    public rmmapi: RunboxWebmailAPI
  ) {
    this.rmmapi.me.subscribe(me => this.me = me);
  }
  
  public postSignup = ''
    
  ngOnInit() {
    this.activatedRoute.queryParams.subscribe(params => {
      this.postSignup = params['postSignup'];
    })
  }
}
