import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface BudgetWidgetProps {
  balance: number;
  income: number;
  expense: number;
}

export function BudgetWidget({ balance, income, expense }: BudgetWidgetProps) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        height: 'match_parent',
        width: 'match_parent',
      }}
    >
      <TextWidget
        text="Total Balance"
        style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 4 }}
      />
      <TextWidget
        text={`Rp ${balance.toLocaleString('id-ID')}`}
        style={{ fontSize: 24, color: '#FFFFFF', fontWeight: 'bold' }}
      />

      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 16,
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text="Income" style={{ fontSize: 12, color: '#A0A0A0' }} />
          <TextWidget text={`+Rp ${income.toLocaleString('id-ID')}`} style={{ fontSize: 14, color: '#00E676' }} />
        </FlexWidget>

        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <TextWidget text="Expense" style={{ fontSize: 12, color: '#A0A0A0' }} />
          <TextWidget text={`-Rp ${expense.toLocaleString('id-ID')}`} style={{ fontSize: 14, color: '#FF3D00' }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
