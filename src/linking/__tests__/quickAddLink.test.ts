import { parseQuickAddLink } from '../quickAddLink';

describe('parseQuickAddLink', () => {
  it('reads account and category ids', () => {
    expect(parseQuickAddLink('rupiero://add?account=1&category=7')).toEqual({ accountId: 1, categoryId: 7 });
    expect(parseQuickAddLink('rupiero://add?account=2')).toEqual({ accountId: 2 });
    expect(parseQuickAddLink('rupiero://add')).toEqual({});
    expect(parseQuickAddLink('rupiero://add/?account=3')).toEqual({ accountId: 3 });
  });

  it('accepts the budgetapp scheme from the plan', () => {
    expect(parseQuickAddLink('budgetapp://add?account=999')).toEqual({ accountId: 999 });
  });

  it('drops malformed ids but still opens quick-add', () => {
    expect(parseQuickAddLink('rupiero://add?account=abc&category=-1')).toEqual({});
    expect(parseQuickAddLink('rupiero://add?account=1.5&category=0')).toEqual({});
    expect(parseQuickAddLink('rupiero://add?account=%E0%A4%A&category=4')).toEqual({ categoryId: 4 });
    expect(parseQuickAddLink('rupiero://add?account=99999999999')).toEqual({});
  });

  it('ignores links that are not quick-add', () => {
    expect(parseQuickAddLink('rupiero://settings')).toBeNull();
    expect(parseQuickAddLink('https://example.com/add?account=1')).toBeNull();
    expect(parseQuickAddLink('otherapp://add?account=1')).toBeNull();
    expect(parseQuickAddLink('')).toBeNull();
  });
});
