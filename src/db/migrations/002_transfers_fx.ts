import type { Db } from '../client';
import type { Migration } from './index';

export const migration002: Migration = {
  version: 2,
  async up(db: Db) {
    await db.execAsync(`
      -- Money moved between two accounts. The actual rate is the ratio of the two amounts; no float is
      -- stored. The fee is in the source account's currency, on top of from_amount_minor.
      CREATE TABLE transfers (
        id                INTEGER PRIMARY KEY,
        from_account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        to_account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        from_amount_minor INTEGER NOT NULL CHECK (from_amount_minor > 0),
        to_amount_minor   INTEGER NOT NULL CHECK (to_amount_minor > 0),
        fee_minor         INTEGER NOT NULL DEFAULT 0 CHECK (fee_minor >= 0),
        date              TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        month             TEXT    GENERATED ALWAYS AS (substr(date, 1, 7)) STORED,
        note              TEXT    NOT NULL DEFAULT '',
        created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
        CHECK (from_account_id <> to_account_id)
      );
      CREATE INDEX idx_transfer_from ON transfers(from_account_id, date);
      CREATE INDEX idx_transfer_to   ON transfers(to_account_id, date);

      -- ECB reference rates (via Frankfurter), EUR→IDR only, one row per rate date. IDR→EUR is derived.
      CREATE TABLE fx_rates (
        date       TEXT    NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        base       TEXT    NOT NULL DEFAULT 'EUR' CHECK (base = 'EUR'),
        quote      TEXT    NOT NULL DEFAULT 'IDR' CHECK (quote = 'IDR'),
        rate_micro INTEGER NOT NULL CHECK (rate_micro > 0),
        source     TEXT    NOT NULL DEFAULT 'ecb-frankfurter',
        fetched_at TEXT    NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (date, base, quote)
      );

      -- Every movement of money per account, for balances and the transaction list.
      CREATE VIEW ledger AS
        SELECT 'tx' AS kind, id, account_id, category_id, date, month,
               CASE type WHEN 'income' THEN amount_minor ELSE -amount_minor END AS signed_minor, note
          FROM transactions
        UNION ALL
        SELECT 'transfer_out', id, from_account_id, NULL, date, month, -from_amount_minor, note FROM transfers
        UNION ALL
        SELECT 'transfer_in', id, to_account_id, NULL, date, month, to_amount_minor, note FROM transfers
        UNION ALL
        SELECT 'transfer_fee', id, from_account_id, NULL, date, month, -fee_minor, note FROM transfers WHERE fee_minor > 0;

      INSERT OR IGNORE INTO settings (key, value) VALUES ('base_currency', 'EUR');
    `);
  },
};
