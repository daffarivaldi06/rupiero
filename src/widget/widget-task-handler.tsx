import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { BudgetWidget } from './Widget';
import * as SQLite from 'expo-sqlite';
import { getBalance } from '../db/database';

// A helper to safely get balance from SQLite without React Context
async function fetchBalance() {
  try {
    const db = await SQLite.openDatabaseAsync('budget.db');
    const balance = await getBalance(db);
    return balance;
  } catch (e) {
    return { balance: 0, totalIncome: 0, totalExpense: 0 };
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const data = await fetchBalance();

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(
        <BudgetWidget
          balance={data.balance}
          income={data.totalIncome}
          expense={data.totalExpense}
        />
      );
      break;

    case 'WIDGET_DELETED':
      // Not needed for now
      break;

    case 'WIDGET_CLICK':
      // Handle clicks
      break;

    default:
      break;
  }
}
