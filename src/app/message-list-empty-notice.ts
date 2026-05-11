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
  return null;
}
