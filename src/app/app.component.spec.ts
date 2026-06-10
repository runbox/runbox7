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

import { EMPTY, of } from 'rxjs';
import { AppComponent, isFolderDeleteBlockedByRule } from './app.component';

describe('isFolderDeleteBlockedByRule', () => {
  it('identifies successful delete responses blocked by filter rules', () => {
    expect(isFolderDeleteBlockedByRule({
      status: 'success',
      result: {
        msg: 'folder_has_rule'
      }
    })).toBeTrue();
  });

  it('ignores successful delete responses without a filter-rule block', () => {
    expect(isFolderDeleteBlockedByRule({
      status: 'success',
      result: {}
    })).toBeFalse();
  });
});

describe('AppComponent folder deletion', () => {
  const createComponent = (deleteFolderResponse: unknown) => {
    const snackBar = {
      open: jasmine.createSpy('open').and.returnValue({
        onAction: () => EMPTY
      })
    };
    const messagelistservice = {
      refreshFolderList: jasmine.createSpy('refreshFolderList')
    };
    const rmmapi = {
      deleteFolder: jasmine.createSpy('deleteFolder').and.returnValue(of(deleteFolderResponse))
    };
    const component = {
      messagelistservice,
      rmmapi,
      snackBar
    } as any as AppComponent;

    return { component, messagelistservice, rmmapi, snackBar };
  };

  it('warns without refreshing the folder list when a filter rule blocks deletion', () => {
    const { component, messagelistservice, rmmapi, snackBar } = createComponent({
      status: 'success',
      result: {
        msg: 'folder_has_rule'
      }
    });

    AppComponent.prototype.deleteFolder.call(component, 123);

    expect(rmmapi.deleteFolder).toHaveBeenCalledWith(123);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Folder cannot be deleted while a filter rule saves mail to it. Remove the rule first, then try again.',
      'Open filters'
    );
    expect(messagelistservice.refreshFolderList).not.toHaveBeenCalled();
  });

  it('refreshes the folder list after a completed deletion', () => {
    const { component, messagelistservice, snackBar } = createComponent({
      status: 'success',
      result: {}
    });

    AppComponent.prototype.deleteFolder.call(component, 123);

    expect(snackBar.open).not.toHaveBeenCalled();
    expect(messagelistservice.refreshFolderList).toHaveBeenCalled();
  });
});
