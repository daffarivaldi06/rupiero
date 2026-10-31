import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { Db } from '../db/client';
import { todayLocal } from '../domain/dates';
import { widgetData } from './data';
import { budgetWidgetRepresentation } from './Widget';

/** Redraws placed widgets now (after a data change) instead of at the next update period. */
export async function refreshWidgets(db: Db): Promise<void> {
  if (Platform.OS !== 'android') return;
  const data = await widgetData(db, todayLocal());
  await requestWidgetUpdate({
    widgetName: 'BudgetWidget',
    renderWidget: () => budgetWidgetRepresentation(data),
    widgetNotFound: () => {},
  });
}
