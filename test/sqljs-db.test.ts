import { createTestDb } from './sqljs-db';

it('runs statements, reads rows and reports inserts', async () => {
  const db = await createTestDb();
  await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');

  const { lastInsertRowId, changes } = await db.runAsync('INSERT INTO t (name) VALUES (?)', 'a');
  expect({ lastInsertRowId, changes }).toEqual({ lastInsertRowId: 1, changes: 1 });
  await db.runAsync('INSERT INTO t (name) VALUES (?)', 'b');

  expect(await db.getFirstAsync('SELECT name FROM t WHERE id = ?', 2)).toEqual({ name: 'b' });
  expect(await db.getFirstAsync('SELECT name FROM t WHERE id = ?', 99)).toBeNull();
  expect(await db.getAllAsync('SELECT id FROM t ORDER BY id')).toEqual([{ id: 1 }, { id: 2 }]);
  db.close();
});

it('rolls back a failed transaction', async () => {
  const db = await createTestDb();
  await db.execAsync('CREATE TABLE t (id INTEGER PRIMARY KEY)');

  await expect(
    db.withTransactionAsync(async () => {
      await db.runAsync('INSERT INTO t (id) VALUES (1)');
      throw new Error('boom');
    }),
  ).rejects.toThrow('boom');

  expect(await db.getAllAsync('SELECT id FROM t')).toEqual([]);
  db.close();
});
