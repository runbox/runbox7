export const MAIL_MENU_HEIGHT = 55;
export const MAIL_PROGRESS_BAR_HEIGHT = 4;

export function calculateMailContentTopOffset(
  hasDownloadProgress: boolean,
  hasSearchProgress: boolean,
  hasPartitionProgress: boolean
): number {
  return MAIL_MENU_HEIGHT
    + (hasDownloadProgress ? MAIL_PROGRESS_BAR_HEIGHT : 0)
    + (hasSearchProgress ? MAIL_PROGRESS_BAR_HEIGHT : 0)
    + (hasPartitionProgress ? MAIL_PROGRESS_BAR_HEIGHT : 0);
}
