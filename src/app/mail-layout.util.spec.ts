import {
  calculateMailContentTopOffset,
  MAIL_MENU_HEIGHT,
  MAIL_PROGRESS_BAR_HEIGHT,
} from './mail-layout.util';

describe('mail layout utility', () => {
  it('keeps the mail content directly below the toolbar when no progress bars are shown', () => {
    expect(calculateMailContentTopOffset(false, false, false)).toBe(MAIL_MENU_HEIGHT);
  });

  it('adds one progress bar height for each visible progress indicator', () => {
    expect(calculateMailContentTopOffset(true, false, false)).toBe(
      MAIL_MENU_HEIGHT + MAIL_PROGRESS_BAR_HEIGHT
    );
    expect(calculateMailContentTopOffset(true, true, false)).toBe(
      MAIL_MENU_HEIGHT + (MAIL_PROGRESS_BAR_HEIGHT * 2)
    );
    expect(calculateMailContentTopOffset(true, true, true)).toBe(
      MAIL_MENU_HEIGHT + (MAIL_PROGRESS_BAR_HEIGHT * 3)
    );
  });
});
