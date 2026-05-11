export interface EmptyMessageListNoticeContext {
  hasVisibleRows: boolean;
  ignoredUnreadFolders?: string[];
  searchText?: string;
  selectedFolder?: string;
  showingSearchResults?: boolean;
  showingWebSocketSearchResults?: boolean;
  unreadOnly?: boolean;
}

export function getEmptyMessageListNotice(context: EmptyMessageListNoticeContext): string {
  if (context.hasVisibleRows) {
    return null;
  }

  const selectedFolder = context.selectedFolder || 'this folder';
  const ignoresUnreadOnly = (context.ignoredUnreadFolders || []).includes(selectedFolder);
  if (context.unreadOnly && !ignoresUnreadOnly) {
    return `No unread messages in ${selectedFolder}.`;
  }

  const searchIsActive = (context.searchText || '').length >= 3
    || context.showingWebSocketSearchResults;
  if (searchIsActive) {
    return 'No messages match this search.';
  }

  return `No messages in ${selectedFolder}.`;
}
