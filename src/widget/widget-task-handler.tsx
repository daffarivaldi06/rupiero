import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { BudgetWidget, type WidgetAccountLine } from './Widget';
import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME } from '../db/init';
import { widgetAccountLines } from './data';

// Reads balances without React context. If the app has never been opened the schema does not
// exist yet and the widget asks the user to open it (Phase 4 initialises the DB from here).
async function fetchAccounts(): Promise<WidgetAccountLine[]> {
  try {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    return await widgetAccountLines(db);
  } catch {
    return [];
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<BudgetWidget accounts={await fetchAccounts()} />);
      break;

    default:
      break;
  }
}
