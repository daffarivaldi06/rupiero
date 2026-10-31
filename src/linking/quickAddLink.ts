// rupiero://add?account=<id>&category=<id> opens quick-add (budgetapp:// works too, the scheme named
// in PLAN.md). Parsed by hand: React Native's URLSearchParams is incomplete.

export const LINK_SCHEMES = ['rupiero', 'budgetapp'] as const;

export interface QuickAddLink {
  accountId?: number;
  categoryId?: number;
}

const positiveInt = (value: string | undefined) => (value !== undefined && /^[1-9]\d{0,8}$/.test(value) ? Number(value) : undefined);

/**
 * The quick-add request in `url`, or null if it is not one. Malformed ids are dropped (an unknown
 * but well-formed id is ignored later by the sheet), so a bad link still just opens quick-add.
 */
export function parseQuickAddLink(url: string): QuickAddLink | null {
  const match = /^([a-z]+):\/\/add\/?(?:\?([^#]*))?(?:#.*)?$/i.exec(url.trim());
  if (!match || !(LINK_SCHEMES as readonly string[]).includes(match[1].toLowerCase())) return null;

  const params = new Map<string, string>();
  for (const pair of (match[2] ?? '').split('&')) {
    if (!pair) continue;
    const [key, value = ''] = pair.split('=');
    try {
      params.set(decodeURIComponent(key), decodeURIComponent(value));
    } catch {
      // Ignore badly encoded pairs.
    }
  }
  const link: QuickAddLink = {};
  const accountId = positiveInt(params.get('account'));
  const categoryId = positiveInt(params.get('category'));
  if (accountId !== undefined) link.accountId = accountId;
  if (categoryId !== undefined) link.categoryId = categoryId;
  return link;
}
