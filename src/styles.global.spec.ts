// --------- BEGIN RUNBOX LICENSE ---------
// Copyright (C) 2016-2026 Runbox Solutions AS (runbox.com).
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
import { TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';

import { TOOLBAR_LIST_BUTTON_WIDTH } from './app/app.component';

// The canvas list draws unread rows with the "Avenir Next Pro Medium" face, so whichever
// file each @font-face compiles to decides the visible read/unread weight difference.
function findFontFaceRule(family: string): CSSFontFaceRule {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch (_e) {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSFontFaceRule &&
          rule.style.getPropertyValue('font-family').replace(/"/g, '') === family) {
        return rule;
      }
    }
  }
  throw new Error(`No @font-face rule found for "${family}"`);
}

describe('Global stylesheet font faces', () => {
  it('maps the bold canvas face to the Medium font file', () => {
    const rule = findFontFaceRule('Avenir Next Pro Medium');
    expect(rule.style.getPropertyValue('src')).toContain('AvenirNextLTPro-Medium');
  });

  it('maps the regular canvas face to the Regular font file', () => {
    const rule = findFontFaceRule('Avenir Next Pro Regular');
    expect(rule.style.getPropertyValue('src')).toContain('Avenir-Next-LT-Pro');
  });
});

@Component({
  template: '<div class="messageListActionButtonsRight"><button mat-icon-button></button></div>',
  standalone: true,
  imports: [MatButtonModule]
})
class SelectionToolbarHostComponent { }

describe('Global stylesheet icon button sizing', () => {
  it('keeps selection toolbar buttons at the width the morelistbuttonindex budget assumes', () => {
    TestBed.configureTestingModule({
      imports: [SelectionToolbarHostComponent]
    });
    const fixture = TestBed.createComponent(SelectionToolbarHostComponent);
    const host: HTMLElement = fixture.nativeElement;
    document.body.appendChild(host);
    fixture.detectChanges();

    try {
      const buttons = host.querySelectorAll('.messageListActionButtonsRight button');
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of Array.from(buttons)) {
        // Height shares the state-layer token; a width-only override leaves 44px height
        expect(button.getBoundingClientRect().width).toBe(TOOLBAR_LIST_BUTTON_WIDTH);
        expect(button.getBoundingClientRect().height).toBe(TOOLBAR_LIST_BUTTON_WIDTH);
      }

      const touchTargets = host.querySelectorAll('.messageListActionButtonsRight .mat-mdc-button-touch-target');
      expect(touchTargets.length).toBe(buttons.length);
      for (const touchTarget of Array.from(touchTargets)) {
        expect(getComputedStyle(touchTarget as HTMLElement).display).toBe('none');
      }
    } finally {
      document.body.removeChild(host);
    }
  });
});
