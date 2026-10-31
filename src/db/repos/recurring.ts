import { addDays, type LocalDate } from '../../domain/dates';
import type { CurrencyCode } from '../../domain/money';
import { occurrences, type Frequency, type RecurrenceRule } from '../../domain/recurrence';
import type { TransactionType } from '../../domain/types';
import type { Db } from '../client';
import { notifyDataChanged } from '../events';

export interface RecurringRule extends RecurrenceRule {
  id: number;
  accountId: number;
  categoryId: number;
  type: TransactionType;
  amountMinor: number;
  note: string;
  /** Occurrences up to this day have been turned into transactions. */
  lastGeneratedDate: LocalDate | null;
}

export interface RecurringRuleDetail extends RecurringRule {
  accountName: string;
  currency: CurrencyCode;
  categoryName: string;
}

export interface NewRecurringRule {
  accountId: number;
  categoryId: number;
  type: TransactionType;
  amountMinor: number;
  note?: string;
  frequency: Frequency;
  interval?: number;
  startDate: LocalDate;
  endDate?: LocalDate | null;
}

interface RuleRow {
  id: number;
  account_id: number;
  category_id: number;
  type: TransactionType;
  amount_minor: number;
  note: string;
  frequency: Frequency;
  interval_count: number;
  start_date: string;
  end_date: string | null;
  paused: number;
  last_generated_date: string | null;
  account_name: string;
  currency: CurrencyCode;
  category_name: string;
}

const toDetail = (row: RuleRow): RecurringRuleDetail => ({
  id: row.id,
  accountId: row.account_id,
  categoryId: row.category_id,
  type: row.type,
  amountMinor: row.amount_minor,
  note: row.note,
  frequency: row.frequency,
  interval: row.interval_count,
  startDate: row.start_date,
  endDate: row.end_date,
  paused: row.paused === 1,
  lastGeneratedDate: row.last_generated_date,
  accountName: row.account_name,
  currency: row.currency,
  categoryName: row.category_name,
});

const SELECT_DETAIL = `
  SELECT r.id, r.account_id, r.category_id, r.type, r.amount_minor, r.note, r.frequency, r.interval_count,
         r.start_date, r.end_date, r.paused, r.last_generated_date,
         a.name AS account_name, a.currency, c.name AS category_name
  FROM recurring_rules r
  JOIN accounts a   ON a.id = r.account_id
  JOIN categories c ON c.id = r.category_id`;

export async function createRecurringRule(db: Db, rule: NewRecurringRule): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO recurring_rules (account_id, category_id, type, amount_minor, note, frequency, interval_count, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    rule.accountId,
    rule.categoryId,
    rule.type,
    rule.amountMinor,
    rule.note?.trim() ?? '',
    rule.frequency,
    rule.interval ?? 1,
    rule.startDate,
    rule.endDate ?? null,
  );
  notifyDataChanged();
  return result.lastInsertRowId;
}

/**
 * Changes apply to occurrences not generated yet; transactions already created stay as they are
 * (and can be edited one by one).
 */
export async function updateRecurringRule(db: Db, id: number, rule: NewRecurringRule): Promise<void> {
  await db.runAsync(
    `UPDATE recurring_rules
     SET account_id = ?, category_id = ?, type = ?, amount_minor = ?, note = ?, frequency = ?, interval_count = ?,
         start_date = ?, end_date = ?
     WHERE id = ?`,
    rule.accountId,
    rule.categoryId,
    rule.type,
    rule.amountMinor,
    rule.note?.trim() ?? '',
    rule.frequency,
    rule.interval ?? 1,
    rule.startDate,
    rule.endDate ?? null,
    id,
  );
  notifyDataChanged();
}

export async function setRecurringRulePaused(db: Db, id: number, paused: boolean): Promise<void> {
  await db.runAsync('UPDATE recurring_rules SET paused = ? WHERE id = ?', paused ? 1 : 0, id);
  notifyDataChanged();
}

/** No occurrences after `today`. A rule that has not started yet is paused instead (end may not precede start). */
export async function stopRecurringRule(db: Db, id: number, today: LocalDate): Promise<void> {
  await db.runAsync(
    `UPDATE recurring_rules
     SET end_date = CASE WHEN start_date > ? THEN start_date ELSE ? END,
         paused   = CASE WHEN start_date > ? THEN 1 ELSE paused END
     WHERE id = ?`,
    today,
    today,
    today,
    id,
  );
  notifyDataChanged();
}

/** Generated transactions stay (their link is cleared). */
export async function deleteRecurringRule(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', id);
  notifyDataChanged();
}

export async function getRecurringRule(db: Db, id: number): Promise<RecurringRuleDetail | null> {
  const row = await db.getFirstAsync<RuleRow>(`${SELECT_DETAIL} WHERE r.id = ?`, id);
  return row ? toDetail(row) : null;
}

export async function listRecurringRules(db: Db): Promise<RecurringRuleDetail[]> {
  const rows = await db.getAllAsync<RuleRow>(`${SELECT_DETAIL} ORDER BY r.paused, r.start_date, r.id`);
  return rows.map(toDetail);
}

/**
 * Turns every occurrence due up to `today` (never later) into a transaction, then remembers how far
 * it got. Safe to run any number of times: the unique (rule, date) index and last_generated_date
 * keep it from creating duplicates. Returns how many transactions were created.
 */
export async function materializeDue(db: Db, today: LocalDate): Promise<number> {
  let created = 0;
  await db.withTransactionAsync(async () => {
    const rules = await db.getAllAsync<RuleRow>(
      `${SELECT_DETAIL}
       WHERE r.paused = 0 AND r.start_date <= ? AND (r.last_generated_date IS NULL OR r.last_generated_date < ?)`,
      today,
      today,
    );
    for (const rule of rules.map(toDetail)) {
      const from = rule.lastGeneratedDate ? addDays(rule.lastGeneratedDate, 1) : rule.startDate;
      for (const date of occurrences(rule, from, today)) {
        const result = await db.runAsync(
          `INSERT OR IGNORE INTO transactions (account_id, category_id, type, amount_minor, date, note, recurring_rule_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          rule.accountId,
          rule.categoryId,
          rule.type,
          rule.amountMinor,
          date,
          rule.note,
          rule.id,
        );
        created += result.changes;
      }
      await db.runAsync('UPDATE recurring_rules SET last_generated_date = ? WHERE id = ?', today, rule.id);
    }
  });
  if (created > 0) notifyDataChanged();
  return created;
}
