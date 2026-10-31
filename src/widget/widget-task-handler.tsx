import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getDatabase } from '../db/DatabaseProvider';
import { materializeDue } from '../db/repos/recurring';
import { todayLocal } from '../domain/dates';
import { widgetData, type WidgetData } from './data';
import { budgetWidgetRepresentation } from './Widget';

// Runs with or without the app UI. Uses the process-wide connection (see db/DatabaseProvider): a
// separate connection would release the app's when closed. On any failure, show the prompt.
async function loadWidgetData(): Promise<WidgetData | null> {
  try {
    const db = await getDatabase();
    const today = todayLocal();
    await materializeDue(db, today);
    return await widgetData(db, today);
  } catch (e) {
    console.error(e);
    return null;
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
