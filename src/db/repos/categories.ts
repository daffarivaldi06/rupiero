import type { Category } from '../../domain/types';
import type { Db } from '../client';
import { notifyDataChanged } from '../events';

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

/** Archived categories, for bringing them back. */
export async function listArchivedCategories(db: Db): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT id, name, archived, sort_order FROM categories WHERE archived = 1 ORDER BY name',
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
  notifyDataChanged();
  return result.lastInsertRowId;
}

/** Transactions point at the id, so a rename touches one row. Throws on a duplicate name. */
export async function renameCategory(db: Db, id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', name.trim(), id);
  notifyDataChanged();
}

/** How many transactions use the category (all time). */
export async function countCategoryTransactions(db: Db, id: number): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?', id);
  return row?.n ?? 0;
}

/** Deletes an unused category. Throws (FOREIGN KEY) while transactions still use it. */
export async function deleteCategory(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  notifyDataChanged();
}

/** Moves every transaction to `targetId`, then deletes the category, all or nothing. */
export async function reassignAndDeleteCategory(db: Db, id: number, targetId: number): Promise<void> {
  if (id === targetId) throw new Error('Target category must differ');
  await db.withTransactionAsync(async () => {
    await db.runAsync("UPDATE transactions SET category_id = ?, updated_at = datetime('now') WHERE category_id = ?", targetId, id);
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  });
  notifyDataChanged();
}

/** Hides the category from lists and pickers; its transactions keep it. */
export async function setCategoryArchived(db: Db, id: number, archived: boolean): Promise<void> {
  await db.runAsync('UPDATE categories SET archived = ? WHERE id = ?', archived ? 1 : 0, id);
  notifyDataChanged();
}
