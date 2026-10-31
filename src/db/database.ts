import * as SQLite from 'expo-sqlite';

export interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
  date: string;
  currency: 'IDR' | 'EUR';
  isRecurring: number; // 0 or 1
}

export interface Category {
  id: number;
  name: string;
}

export interface AppSettings {
  id: number;
  displayCurrency: 'IDR' | 'EUR';
  eurToIdrRate: number;
}

export const initDb = async (db: SQLite.SQLiteDatabase) => {
  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'IDR',
      is_recurring INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      displayCurrency TEXT NOT NULL DEFAULT 'IDR',
      eurToIdrRate REAL NOT NULL DEFAULT 17000
    );
  `);

  // Migrations
  try {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'IDR';`);
  } catch (e) {}
  
  try {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {}

  // Seed default categories if empty
  const catCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories;');
  if (catCount?.count === 0) {
    await db.runAsync('INSERT INTO categories (name) VALUES (?), (?), (?);', 'Prancis', 'Food', 'Bills');
  }

  // Ensure default settings exist
  await db.runAsync(`
    INSERT OR IGNORE INTO settings (id, displayCurrency, eurToIdrRate) VALUES (1, 'IDR', 17000);
  `);
};

export const getSettings = async (db: SQLite.SQLiteDatabase): Promise<AppSettings> => {
  const settings = await db.getFirstAsync<AppSettings>('SELECT * FROM settings WHERE id = 1;');
  return settings || { id: 1, displayCurrency: 'IDR', eurToIdrRate: 17000 };
};

export const updateSettings = async (db: SQLite.SQLiteDatabase, displayCurrency: 'IDR' | 'EUR', rate: number) => {
  await db.runAsync(
    'UPDATE settings SET displayCurrency = ?, eurToIdrRate = ? WHERE id = 1;',
    displayCurrency,
    rate
  );
};

// CATEGORY CRUD
export const getCategories = async (db: SQLite.SQLiteDatabase): Promise<Category[]> => {
  return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name ASC;');
};

export const addCategory = async (db: SQLite.SQLiteDatabase, name: string) => {
  await db.runAsync('INSERT INTO categories (name) VALUES (?);', name);
};

export const updateCategory = async (db: SQLite.SQLiteDatabase, id: number, oldName: string, newName: string) => {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE categories SET name = ? WHERE id = ?;', newName, id);
    await db.runAsync('UPDATE transactions SET category = ? WHERE category = ?;', newName, oldName);
  });
};

export const deleteCategory = async (db: SQLite.SQLiteDatabase, id: number, name: string) => {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM categories WHERE id = ?;', id);
    await db.runAsync('DELETE FROM transactions WHERE category = ?;', name);
  });
};

// TRANSACTION CRUD
export const addTransaction = async (
  db: SQLite.SQLiteDatabase,
  transaction: Omit<Transaction, 'id'>
) => {
  const result = await db.runAsync(
    'INSERT INTO transactions (amount, type, category, note, date, currency, is_recurring) VALUES (?, ?, ?, ?, ?, ?, ?);',
    transaction.amount,
    transaction.type,
    transaction.category,
    transaction.note || '',
    transaction.date,
    transaction.currency,
    transaction.isRecurring
  );
  return result.lastInsertRowId;
};

export const getTransactions = async (
  db: SQLite.SQLiteDatabase, 
  filter?: { month?: string; category?: string }
): Promise<Transaction[]> => {
  let query = 'SELECT * FROM transactions';
  const params: any[] = [];

  if (filter?.month && filter?.category) {
    query += " WHERE (category = ?) AND (strftime('%Y-%m', date) = ? OR (is_recurring = 1 AND strftime('%Y-%m', date) <= ?))";
    params.push(filter.category, filter.month, filter.month);
  } else if (filter?.month) {
    query += " WHERE (strftime('%Y-%m', date) = ? OR (is_recurring = 1 AND strftime('%Y-%m', date) <= ?))";
    params.push(filter.month, filter.month);
  } else if (filter?.category) {
    query += ' WHERE category = ?';
    params.push(filter.category);
  }

  query += ' ORDER BY date DESC;';
  
  const results = await db.getAllAsync<any>(query, ...params);
  return results.map(r => ({
    ...r,
    isRecurring: r.is_recurring
  }));
};

export const deleteTransaction = async (db: SQLite.SQLiteDatabase, id: number) => {
  await db.runAsync('DELETE FROM transactions WHERE id = ?;', id);
};

export const getBalance = async (
  db: SQLite.SQLiteDatabase,
  filter?: { month?: string; category?: string }
) => {
  const transactions = await getTransactions(db, filter);
  const settings = await getSettings(db);
  
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((t) => {
    let amount = t.amount;
    
    // Convert logic to Display Currency
    if (settings.displayCurrency === 'IDR' && t.currency === 'EUR') {
      amount = amount * settings.eurToIdrRate;
    } else if (settings.displayCurrency === 'EUR' && t.currency === 'IDR') {
      amount = amount / settings.eurToIdrRate;
    }
    
    if (t.type === 'income') totalIncome += amount;
    if (t.type === 'expense') totalExpense += amount;
  });

  return {
    balance: totalIncome - totalExpense,
    totalIncome,
    totalExpense,
    displayCurrency: settings.displayCurrency,
  };
};

export const resetTransactions = async (db: SQLite.SQLiteDatabase) => {
  await db.runAsync('DELETE FROM transactions;');
};
