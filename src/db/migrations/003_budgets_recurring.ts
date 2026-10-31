import type { Db } from '../client';
import type { Migration } from './index';

export const migration003: Migration = {
  version: 3,
  async up(db: Db) {
    await db.execAsync(`
      -- Monthly limit per category and currency; spending = the category's expenses on accounts in that currency.
      CREATE TABLE budgets (
        id          INTEGER PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        month       TEXT    NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
        currency    TEXT    NOT NULL CHECK (currency IN ('IDR', 'EUR')),
        limit_minor INTEGER NOT NULL CHECK (limit_minor > 0),
        UNIQUE (category_id, month, currency)
      );

      -- Repeating transactions. Occurrences become real transactions up to today (materializeDue).
      CREATE TABLE recurring_rules (
        id                  INTEGER PRIMARY KEY,
        account_id          INTEGER NOT NULL REFERENCES accounts(id)   ON DELETE RESTRICT,
        category_id         INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        type                TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
        amount_minor        INTEGER NOT NULL CHECK (amount_minor > 0),
        note                TEXT    NOT NULL DEFAULT '',
        frequency           TEXT    NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
        interval_count      INTEGER NOT NULL DEFAULT 1 CHECK (interval_count >= 1),
        start_date          TEXT    NOT NULL CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        end_date            TEXT    CHECK (end_date IS NULL OR end_date >= start_date),
        paused              INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0, 1)),
        last_generated_date TEXT,
        created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      ALTER TABLE transactions ADD COLUMN recurring_rule_id INTEGER REFERENCES recurring_rules(id) ON DELETE SET NULL;
      -- One transaction per rule and date: makes materialization idempotent.
      CREATE UNIQUE INDEX idx_tx_rule_date ON transactions(recurring_rule_id, date) WHERE recurring_rule_id IS NOT NULL;
    `);
  },
};
