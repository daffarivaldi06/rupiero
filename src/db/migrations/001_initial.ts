import type { Db } from '../client';
import type { Migration } from './index';

export const migration001: Migration = {
  version: 1,
  async up(db: Db) {
    await db.execAsync(`
      CREATE TABLE accounts (
        id                    INTEGER PRIMARY KEY,
        name                  TEXT    NOT NULL UNIQUE COLLATE NOCASE,
        currency              TEXT    NOT NULL CHECK (currency IN ('IDR', 'EUR')),
        opening_balance_minor INTEGER NOT NULL DEFAULT 0,
        archived              INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
        sort_order            INTEGER NOT NULL DEFAULT 0,
        created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE categories (
        id         INTEGER PRIMARY KEY,
        name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
        archived   INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE transactions (
        id           INTEGER PRIMARY KEY,
        account_id   INTEGER NOT NULL REFERENCES accounts(id)   ON DELETE RESTRICT,
        category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        type         TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
        amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
        date         TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        month        TEXT    GENERATED ALWAYS AS (substr(date, 1, 7)) STORED,
        note         TEXT    NOT NULL DEFAULT '',
        created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_tx_account_date   ON transactions(account_id, date);
      CREATE INDEX idx_tx_month_category ON transactions(month, category_id);

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    // Default accounts are added by ensureDefaults (db/defaults.ts), in the install's language.
  },
};
