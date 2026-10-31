// Every user-facing string must come from src/i18n. This walks the TypeScript AST of the app's source
// (outside src/i18n and tests) and reports text that would reach the screen without translation.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';
import { id } from '../messages/id';

const ROOT = join(__dirname, '..', '..', '..');
const SCAN = [join(ROOT, 'src'), join(ROOT, 'App.tsx')];
const SKIP_DIRS = [join(ROOT, 'src', 'i18n'), '__tests__'];

/** JSX props that render text or are read aloud. */
const TEXT_PROPS = new Set(['title', 'label', 'placeholder', 'accessibilityLabel', 'accessibilityHint', 'text', 'subtitle', 'description', 'message']);
/** Object keys whose string values are shown (navigation titles, option lists). */
const TEXT_KEYS = new Set(['title', 'headerTitle', 'label', 'subtitle', 'description', 'message', 'text']);
/** Every message key, e.g. 'common.save': literals equal to one are keys, wherever they appear. */
const KEYS = new Set<string>();
(function collect(node: object, prefix: string) {
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string') KEYS.add(prefix + key);
    else collect(value, `${prefix}${key}.`);
  }
})(id, '');

/** Text that is the same in every language. */
const UNIVERSAL = /^[\s\d.,:;+\-−×÷=≈%/·•‹›✕⌫€()[\]#…]*$|^(EUR|IDR|Rp|€|Rupiero|OK)$/;

function hasWords(text: string): boolean {
  return /\p{L}{2,}/u.test(text) && !UNIVERSAL.test(text.trim());
}

/** A sentence-like literal: two or more words. Code strings (SQL, ids, styles) rarely look like this. */
function looksLikeProse(text: string): boolean {
  if (/^\s*</.test(text)) return false; // SVG/XML markup
  if (!/\p{L}+[\s ]+\p{L}+/u.test(text)) return false;
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|PRAGMA|ALTER|DROP|FROM|WHERE|VALUES|JOIN|AND|OR|ORDER BY|GROUP BY|IN)\b/.test(text)) return false;
  if (/^[MLHVCSQTAZ\d\s.,-]+$/i.test(text)) return false; // SVG path data
  return true;
}

function files(path: string): string[] {
  if (SKIP_DIRS.some((d) => path === d || path.endsWith(sep + d))) return [];
  if (statSync(path).isDirectory()) return readdirSync(path).flatMap((name) => files(join(path, name)));
  return /\.(ts|tsx)$/.test(path) && !/\.d\.ts$/.test(path) ? [path] : [];
}

/** Literals passed to these are for developers (logs, programming errors), not users. */
function isDeveloperContext(node: ts.Node): boolean {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isNewExpression(p) && ts.isIdentifier(p.expression) && /^(Error|RangeError|TypeError|RateFetchError|SchemaTooNewError)$/.test(p.expression.text)) return true;
    if (ts.isCallExpression(p)) {
      const callee = p.expression.getText();
      if (/^console\./.test(callee) || callee === 'require' || callee === 'it' || callee === 'describe') return true;
    }
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
    if (ts.isBlock(p) || ts.isSourceFile(p)) break;
  }
  return false;
}

/** Message keys are not text: passed to t() (also via a ternary), or any literal that names a key. */
function isTranslationKey(node: ts.Node): boolean {
  if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && KEYS.has(node.text)) return true;
  let child = node;
  let parent = node.parent;
  while (parent && (ts.isConditionalExpression(parent) || ts.isParenthesizedExpression(parent)) && child !== (parent as ts.ConditionalExpression).condition) {
    child = parent;
    parent = parent.parent;
  }
  return !!parent && ts.isCallExpression(parent) && /^(t|translate|i18n\.t|renderMessage|splitMessage)$/.test(parent.expression.getText());
}

/** Compared values (`phase === 'done'`) are code. */
function isComparison(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent || !ts.isBinaryExpression(parent)) return false;
  const op = parent.operatorToken.kind;
  return op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsEqualsToken;
}

/** `// i18n-ignore` on the line above opts a statement out (developer-only text). */
function isIgnored(node: ts.Node, source: ts.SourceFile): boolean {
  const line = source.getLineAndCharacterOfPosition(node.getStart()).line;
  const previous = source.text.split(/\r?\n/)[line - 1] ?? '';
  return previous.includes('i18n-ignore');
}

/**
 * A literal that ends up as rendered text: anywhere inside a JSX child expression, or inside a
 * text prop, e.g. {cond ? 'Hari ini' : 'Kemarin'} or title={x ? 'Ubah' : 'Baru'}.
 */
function inJsxText(node: ts.Node): boolean {
  if (isTranslationKey(node)) return false;
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return TEXT_PROPS.has(p.name.getText());
    if (ts.isJsxExpression(p)) {
      const owner = p.parent;
      if (owner && ts.isJsxAttribute(owner)) return TEXT_PROPS.has(owner.name.getText());
      return !!owner && (ts.isJsxElement(owner) || ts.isJsxFragment(owner));
    }
    if (ts.isArrowFunction(p) || ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isSourceFile(p)) return false;
    // Arguments of calls inside JSX (style helpers, formatters) are code, not text.
    if (ts.isCallExpression(p) && p !== node.parent?.parent) return false;
  }
  return false;
}

function literalText(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ');
  return null;
}

function violations(file: string): string[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const report = (node: ts.Node, text: string) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    found.push(`${relative(ROOT, file)}:${line + 1}  ${JSON.stringify(text.trim().slice(0, 60))}`);
  };

  const reported = new Set<ts.Node>();
  const flag = (node: ts.Node, text: string | null, test: (t: string) => boolean) => {
    if (text && test(text) && !reported.has(node) && !isTranslationKey(node) && !isComparison(node) && !isIgnored(node, source)) {
      reported.add(node);
      report(node, text);
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) flag(node, node.text, hasWords);
    else if (ts.isJsxAttribute(node) && TEXT_PROPS.has(node.name.getText()) && node.initializer) {
      const init = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
      if (init && !isTranslationKey(init)) flag(init, literalText(init), hasWords);
    } else if (ts.isPropertyAssignment(node) && TEXT_KEYS.has(node.name.getText())) {
      flag(node.initializer, literalText(node.initializer), hasWords);
    } else if (ts.isCallExpression(node) && node.expression.getText() === 'Alert.alert') {
      for (const arg of node.arguments) flag(arg, literalText(arg), hasWords);
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && inJsxText(node)) {
      flag(node, literalText(node), hasWords);
    } else if ((ts.isStringLiteral(node) || ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !isDeveloperContext(node) && !isTranslationKey(node)) {
      flag(node, literalText(node), looksLikeProse);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

it('has no user-facing strings outside src/i18n', () => {
  const all = SCAN.flatMap(files).flatMap(violations);
  if (process.env.I18N_REPORT) writeFileSync(process.env.I18N_REPORT, all.join(String.fromCharCode(10)));
  expect(all).toEqual([]);
});
