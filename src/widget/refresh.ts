import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { Db } from '../db/client';
import { widgetAccountLines } from './data';
import { BudgetWidget } from './Widget';

/** Redraws placed widgets now (e.g. after balances are hidden), instead of at the next update period. */
export async function refreshWidgets(db: Db): Promise<void> {
  if (Platform.OS !== 'android') return;
  const accounts = await widgetAccountLines(db);
  await requestWidgetUpdate({
    widgetName: 'BudgetWidget',
    renderWidget: () => React.createElement(BudgetWidget, { accounts }),
    widgetNotFound: () => {},
  });
}
