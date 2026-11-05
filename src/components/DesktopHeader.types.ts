import type { Month } from '../domain/dates';

/** The header of a screen on wide web screens (DesktopHeader.web.tsx). */
export interface DesktopHeaderProps {
  /** Screen title on the left, for screens that show one. */
  title?: string;
  /** Month picker on the left, after the title. Both or neither. */
  month?: Month;
  onChangeMonth?: (month: Month) => void;
  /** The primary "+ Add transaction" button. */
  onAdd: () => void;
}
