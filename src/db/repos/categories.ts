import type { Category } from '../../domain/types';
import type { Db } from '../client';

interface CategoryRow {
  id: number;
  name: string;
  archived: number;
  sort_order: number;
}

const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  archived: row.archived === 1,
  sortOrder: row.sort_order,
});

export async function listCategories(db: Db): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT id, name, archived, sort_order FROM categories WHERE archived = 0 ORDER BY sort_order, name',
  );
  return rows.map(toCategory);
}

export async function getCategory(db: Db, id: number): Promise<Category | null> {
  const row = await db.getFirstAsync<CategoryRow>(
    'SELECT id, name, archived, sort_order FROM categories WHERE id = ?',
    id,
  );
  return row ? toCategory(row) : null;
}

/** Throws on a duplicate name (names are unique, case-insensitive). */
export async function createCategory(db: Db, name: string): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO categories (name, sort_order)
     VALUES (?, (SELECT COALESCE(MAX(sort_order) + 1, 0) FROM categories))`,
    name.trim(),
  );
  return result.lastInsertRowId;
}

/** Transactions point at the id, so a rename touches one row. Throws on a duplicate name. */
export async function renameCategory(db: Db, id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', name.trim(), id);
}

/**
 * Deletes the category and every transaction in it, matching the pre-overhaul behaviour.
 * Phase 2 replaces this with reassign-or-archive.
 */
export async function deleteCategoryWithTransactions(db: Db, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM transactions WHERE category_id = ?', id);
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  });
}
