import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { buildMarkSvg, markColors } from '../brand/mark';
import { palettes, type ColorScheme, type Palette } from '../theme/tokens';
import { fontFamily } from '../theme/typography';
import { t } from '../i18n';
import type { WidgetData, WidgetLine } from './data';

/** Deep link that opens quick-add for an account (see linking/quickAddLink.ts). */
export const quickAddUri = (accountId: number) => `rupiero://add?account=${accountId}`;

type Hex = `#${string}`;
const hex = (value: string) => value as Hex;

interface BudgetWidgetProps {
  data: WidgetData | null;
  scheme: ColorScheme;
}

/** Home-screen widget in the Buku Kas style: per-currency figure, ruled, with quick-add buttons. */
export function BudgetWidget({ data, scheme }: BudgetWidgetProps) {
  const color: Palette = palettes[scheme];
  const codeColor = (currency: string) => hex(currency === 'EUR' ? color.eur : color.idrText);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={t('widget.open')}
      style={{
        flexDirection: 'column',
        backgroundColor: hex(color.bg),
        borderRadius: 16,
        padding: 14,
        height: 'match_parent',
        width: 'match_parent',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <SvgWidget svg={buildMarkSvg(markColors(color))} style={{ width: 18, height: 18 }} />
        <TextWidget
          text="Rupiero"
          style={{ fontSize: 14, fontFamily: fontFamily.bold, color: hex(color.ink), marginLeft: 6 }}
        />
        <FlexWidget style={{ flex: 1 }} />
        <TextWidget text={data?.monthLabel ?? ''} style={{ fontSize: 12, fontFamily: fontFamily.regular, color: hex(color.inkMuted) }} />
      </FlexWidget>
      <FlexWidget style={{ height: 1, width: 'match_parent', backgroundColor: hex(color.ink), marginTop: 6 }} />

      {data === null ? (
        <TextWidget
          text={t('widget.empty')}
          style={{ fontSize: 14, fontFamily: fontFamily.regular, color: hex(color.inkMuted), marginTop: 12 }}
        />
      ) : (
        data.lines.map((line) => (
          <FlexWidget
            key={line.currency}
            style={{
              flexDirection: 'column',
              width: 'match_parent',
              paddingVertical: 4,
              borderBottomWidth: 1,
              borderBottomColor: hex(color.line),
            }}
          >
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
              <TextWidget text={line.currency} style={{ fontSize: 11, fontFamily: fontFamily.mono, color: codeColor(line.currency) }} />
              <TextWidget
                text={t(line.kind === 'budget' ? 'widget.budgetLeft' : 'widget.balance')}
                style={{ fontSize: 11, fontFamily: fontFamily.regular, color: hex(color.inkMuted), marginLeft: 6 }}
              />
              <FlexWidget style={{ flex: 1 }} />
              <TextWidget
                text={line.amount}
                style={{ fontSize: 18, fontFamily: fontFamily.bold, color: hex(line.negative ? color.expense : color.ink) }}
              />
            </FlexWidget>
            {line.budget && <BudgetRow budget={line.budget} color={color} />}
          </FlexWidget>
        ))
      )}

      <FlexWidget style={{ flex: 1 }} />
      {data && data.quickAdd.length > 0 && (
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent' }}>
          {data.quickAdd.map((button, index) => (
            <FlexWidget
              key={button.currency}
              clickAction="OPEN_URI"
              clickActionData={{ uri: quickAddUri(button.accountId) }}
              accessibilityLabel={t('widget.add', { currency: button.currency })}
              style={{
                flex: 1,
                height: 34,
                marginLeft: index > 0 ? 8 : 0,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 4,
                borderWidth: 1,
                borderColor: hex(color.lineStrong),
              }}
            >
              <TextWidget
                text={`+ ${button.currency}`}
                style={{ fontSize: 13, fontFamily: fontFamily.medium, color: codeColor(button.currency) }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

/** Same colours as the app's BudgetBar: ink while fine, IDR text colour from 80 %, expense once over. */
const levelColor = (level: NonNullable<WidgetLine['budget']>['level'], color: Palette) =>
  hex(level === 'over' ? color.expense : level === 'warning' ? color.idrText : color.ink);

/** A thin ledger bar of what is spent, then "dari € 300,00" / "of €300.00". Widgets have no percentage widths, so flex weights split the track. */
function BudgetRow({ budget, color }: { budget: NonNullable<WidgetLine['budget']>; color: Palette }) {
  const filled = Math.min(Math.max(budget.percent, 0), 100);
  const tint = levelColor(budget.level, color);
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', marginTop: 3 }}>
      <FlexWidget style={{ flex: 1, flexDirection: 'row', height: 4, borderRadius: 2, backgroundColor: hex(color.line) }}>
        {filled > 0 && <FlexWidget style={{ flex: filled, height: 4, borderRadius: 2, backgroundColor: tint }} />}
        {filled < 100 && <FlexWidget style={{ flex: 100 - filled, height: 4 }} />}
      </FlexWidget>
      <TextWidget
        text={budget.level === 'ok' ? budget.limit : `${budget.limit} · ${budget.percent}%`}
        style={{ fontSize: 11, fontFamily: fontFamily.regular, color: budget.level === 'ok' ? hex(color.inkMuted) : tint, marginLeft: 8 }}
      />
    </FlexWidget>
  );
}

/**
 * Light and dark versions for the launcher to pick with the system theme, or just the one the user
 * chose in Settings → Theme.
 */
export const budgetWidgetRepresentation = (data: WidgetData | null) => {
  const theme = data?.theme ?? 'system';
  if (theme !== 'system') return <BudgetWidget data={data} scheme={theme} />;
  return {
    light: <BudgetWidget data={data} scheme="light" />,
    dark: <BudgetWidget data={data} scheme="dark" />,
  };
};
