import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface WidgetAccountLine {
  name: string;
  /** Already formatted with formatMoney. */
  balance: string;
}

interface BudgetWidgetProps {
  accounts: WidgetAccountLine[];
}

export function BudgetWidget({ accounts }: BudgetWidgetProps) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 16,
        padding: 16,
        height: 'match_parent',
        width: 'match_parent',
      }}
    >
      <TextWidget text="Saldo Akun" style={{ fontSize: 14, color: '#A0A0A0', marginBottom: 8 }} />
      {accounts.length === 0 ? (
        <TextWidget text="Buka aplikasi untuk memulai" style={{ fontSize: 14, color: '#FFFFFF' }} />
      ) : (
        accounts.slice(0, 3).map((account) => (
          <FlexWidget
            key={account.name}
            style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent', marginTop: 4 }}
          >
            <TextWidget text={account.name} style={{ fontSize: 14, color: '#A0A0A0' }} />
            <TextWidget text={account.balance} style={{ fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' }} />
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
