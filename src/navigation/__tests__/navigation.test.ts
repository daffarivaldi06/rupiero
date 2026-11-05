import { getPathFromState, getStateFromPath } from '@react-navigation/native';
import { linking } from '../linking';
import { activeSection, MAIN_SECTIONS, SETTINGS_SECTION } from '../sections';

const config = linking.config!;

/** The stack inside "Main" for a path: route names and params, bottom to top. */
function stackFor(path: string) {
  const state = getStateFromPath(path, config);
  const main = state?.routes[0];
  expect(main?.name).toBe('Main');
  return (main?.state?.routes ?? []).map((r) => ({ name: r.name, params: r.params }));
}

describe('activeSection', () => {
  it('is the screen itself for a section', () => {
    expect(activeSection(['Dashboard'])).toBe('Dashboard');
    expect(activeSection(['Dashboard', 'Transactions'])).toBe('Transactions');
    expect(activeSection(['Dashboard', 'Insights'])).toBe('Insights');
  });

  it('is the section a detail screen was opened from', () => {
    expect(activeSection(['Dashboard', 'Transactions', 'CategoryDetail'])).toBe('Transactions');
    expect(activeSection(['Dashboard', 'Settings', 'Accounts', 'AccountForm'])).toBe('Settings');
    expect(activeSection(['Dashboard', 'CategoryDetail'])).toBe('Dashboard');
  });

  it('is the topmost section when several are stacked', () => {
    expect(activeSection(['Dashboard', 'Budget', 'Transactions'])).toBe('Transactions');
  });

  it('falls back to the Dashboard', () => {
    expect(activeSection([])).toBe('Dashboard');
  });
});

describe('linking', () => {
  it('gives every sidebar section its own URL', () => {
    const paths = Object.fromEntries(
      [...MAIN_SECTIONS, SETTINGS_SECTION].map((s) => [s.route, getPathFromState({ routes: [{ name: 'Main', state: { routes: [{ name: s.route }] } }] }, config)]),
    );
    expect(paths).toEqual({ Dashboard: '/', Transactions: '/transactions', Budget: '/budget', Insights: '/charts', Settings: '/settings' });
  });

  it('opens each section URL on its screen, with the Dashboard underneath', () => {
    expect(stackFor('/')).toEqual([{ name: 'Dashboard', params: undefined }]);
    expect(stackFor('/transactions').map((r) => r.name)).toEqual(['Dashboard', 'Transactions']);
    expect(stackFor('/budget').map((r) => r.name)).toEqual(['Dashboard', 'Budget']);
    expect(stackFor('/charts').map((r) => r.name)).toEqual(['Dashboard', 'Insights']);
    expect(stackFor('/settings').map((r) => r.name)).toEqual(['Dashboard', 'Settings']);
  });

  it('parses ids in reloaded URLs back to numbers', () => {
    expect(stackFor('/category?categoryId=3&month=2026-11').at(-1)).toEqual({ name: 'CategoryDetail', params: { categoryId: 3, month: '2026-11' } });
    expect(stackFor('/transactions?month=2026-10&accountId=2').at(-1)).toEqual({ name: 'Transactions', params: { month: '2026-10', accountId: 2 } });
    expect(stackFor('/account-form?accountId=5').at(-1)).toEqual({ name: 'AccountForm', params: { accountId: 5 } });
    expect(stackFor('/transfer?transferId=7').at(-1)).toEqual({ name: 'TransferForm', params: { transferId: 7 } });
  });

  it('writes params into the URL', () => {
    const path = getPathFromState(
      { routes: [{ name: 'Main', state: { routes: [{ name: 'Dashboard' }, { name: 'Transactions', params: { month: '2026-10', accountId: 2 } }] } }] },
      config,
    );
    expect(path).toBe('/transactions?month=2026-10&accountId=2');
  });
});
