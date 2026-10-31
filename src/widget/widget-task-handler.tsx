import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, initDb } from '../db/init';
import { materializeDue } from '../db/repos/recurring';
import { todayLocal } from '../domain/dates';
import { widgetData, type WidgetData } from './data';
import { budgetWidgetRepresentation } from './Widget';

// Runs without the app UI: open the database the same way the app does (pragmas, migrations), record
// recurring transactions that fell due, then read what to show. On any failure, show the prompt.
//
// The task may run inside the app's process. expo-sqlite shares one native connection per database
// name by default, so a connection opened (and later closed or garbage-collected) here would take
// the app's connection down with it. Hence a dedicated connection, closed when done.
async function loadWidgetData(): Promise<WidgetData | null> {
  let db: SQLite.SQLiteDatabase | null = null;
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME, { useNewConnection: true });
    await initDb(db, { seed: false });
    const today = todayLocal();
    await materializeDue(db, today);
    return await widgetData(db, today);
  } catch (e) {
    console.error(e);
    return null;
  } finally {
    await db?.closeAsync().catch(() => {});
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(budgetWidgetRepresentation(await loadWidgetData()));
      break;

    default:
      break;
  }
}
