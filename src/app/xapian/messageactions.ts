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

export enum PostMessageAction {
  localSearchActivated = 'localSearchActivated',
  indexUpdated = 'indexUpdated',
  refreshContentCache = 'refreshContentCache',
  openProgressSnackBar = 'openProgressSnackBar',
  updateProgressSnackBar = 'updateProgressSnackBar',
  closeProgressSnackBar = 'closeProgressSnackBar',
  updateMessageListService = 'updateMessageListService',
  indexDeleted = 'indexDeleted',
  newMessagesNotification = 'newMessagesNotification',
  opendb = 'opendb',
  updateIndexWithNewChanges = 'updateIndexWithNewChanges',
  stopIndexUpdates = 'stopIndexUpdates',
  deleteLocalIndex = 'deleteLocalIndex',
  folderListUpdate = 'folderListUpdate',
  messageCache = 'messageCache',
  moveMessagesToFolder = 'moveMessagesToFolder',
  deleteMessages = 'deleteMessages',
  addMessageToIndex = 'addMessageToIndex',
  addTermToDocument = 'addTermToDocument',
  removeTermFromDocument = 'removeTermFromDocument',
  setCurrentFolder = 'setCurrentFolder'
}
