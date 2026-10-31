import { createTestDb, type TestDb } from '../../../test/sqljs-db';
import { serializeTransactions } from '../serialize';

let db: TestDb;
beforeEach(async () => {
  db = await createTestDb();
  await db.execAsync('CREATE TABLE t (n INTEGER)');
});
afterEach(() => db.close());

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const insertTwice = (n: number) =>
  db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO t (n) VALUES (?)', n);
    await tick(); // lets the other transaction start meanwhile
    await db.runAsync('INSERT INTO t (n) VALUES (?)', n);
  });

it('fails without serialization when two transactions overlap (the bug)', async () => {
  const results = await Promise.allSettled([insertTwice(1), insertTwice(2)]);
  expect(results.some((r) => r.status === 'rejected')).toBe(true);
});

it('runs overlapping transactions one after the other', async () => {
  serializeTransactions(db);
  await Promise.all([insertTwice(1), insertTwice(2)]);
  expect((await db.getAllAsync<{ n: number }>('SELECT n FROM t')).map((r) => r.n)).toEqual([1, 1, 2, 2]);
});

it('keeps going after a transaction rolls back', async () => {
  serializeTransactions(db);
  const failing = db.withTransactionAsync(async () => {
    await db.runAsync('INSERT INTO t (n) VALUES (1)');
    throw new Error('boom');
  });
  const next = insertTwice(2);
  await expect(failing).rejects.toThrow('boom');
  await next;
  expect((await db.getAllAsync<{ n: number }>('SELECT n FROM t')).map((r) => r.n)).toEqual([2, 2]);
});
