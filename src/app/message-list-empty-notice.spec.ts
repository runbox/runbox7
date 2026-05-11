import { getEmptyMessageListNotice } from './message-list-empty-notice';

describe('getEmptyMessageListNotice', () => {
  it('shows a clear notice when Unread only hides all messages in a folder', () => {
    const notice = getEmptyMessageListNotice({
      hasVisibleRows: false,
      ignoredUnreadFolders: ['Sent'],
      selectedFolder: 'Inbox',
      unreadOnly: true,
    });

    expect(notice).toBe('No unread messages in Inbox.');
  });

  it('does not show an empty-state notice while rows are visible', () => {
    const notice = getEmptyMessageListNotice({
      hasVisibleRows: true,
      selectedFolder: 'Inbox',
      unreadOnly: true,
    });

    expect(notice).toBeNull();
  });
});
