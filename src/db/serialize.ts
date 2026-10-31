import type { Db } from './client';

/**
 * Makes transactions on a shared connection wait for each other. The app and the widget task share
 * one connection in one JS runtime, and both start `materializeDue` on launch; two overlapping
 * withTransactionAsync calls would otherwise send a second BEGIN inside the first transaction
 * ("cannot start a transaction within a transaction"). Transactions must not be nested.
 */
export function serializeTransactions<T extends Db>(db: T): T {
  const begin = db.withTransactionAsync.bind(db);
  let tail: Promise<unknown> = Promise.resolve();
  db.withTransactionAsync = (task) => {
    const run = tail.then(() => begin(task));
    // The next transaction waits for this one whether it commits or rolls back.
    tail = run.catch(() => {});
    return run;
  };
  return db;
}
