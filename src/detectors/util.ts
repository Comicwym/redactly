/**
 * Greedy patterns can swallow trailing groups (`IT60 X054… 2024`).
 * Tries the whole match, then each prefix ending before a space or dash, longest first.
 * Returns the length of the first prefix that passes `check`, or `false`.
 */
export function longestValidPrefix(match: string, check: (candidate: string) => boolean) {
  if (check(match)) return true;
  for (let i = match.length - 1; i > 0; i--) {
    const c = match[i];
    if ((c === ' ' || c === '-') && check(match.slice(0, i))) return i;
  }
  return false;
}

export function digitsOnly(text: string): string {
  return text.replace(/\D/g, '');
}
