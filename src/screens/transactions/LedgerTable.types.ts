import type { LedgerItem } from '../../db/repos/ledger';
import type { LocalDate } from '../../domain/dates';
import type { DayTotal } from '../../domain/ledger';

export interface LedgerTableDayProps {
  date: LocalDate;
  totals?: DayTotal[];
}

export interface LedgerTableRowProps {
  item: LedgerItem;
  onPress: () => void;
}
