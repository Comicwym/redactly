import type { Detector } from '../types.js';
import { digitsOnly } from './util.js';

/** Luhn checksum, used by every major card network. */
export function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * The greedy pattern can swallow trailing groups (`4111 1111 1111 1111 12`), so try the whole
 * match, then shorter prefixes that end at a group separator. Digits are extracted once and only
 * 13–19 digit prefixes are tried: this runs for every candidate, including hostile digit runs.
 */
function validateCard(match: string): boolean | number {
  let digits = '';
  const ends: number[] = [];
  for (let i = 0; i < match.length; i++) {
    const code = match.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      digits += match[i];
      ends.push(i + 1);
    }
  }
  for (let n = Math.min(digits.length, 19); n >= 13; n--) {
    const end = ends[n - 1] as number;
    const atBoundary = end === match.length || match[end] === ' ' || match[end] === '-';
    if (atBoundary && luhn(digits.slice(0, n))) return end === match.length ? true : end;
  }
  return false;
}

/** 13–19 digit card numbers, optionally grouped with spaces or dashes, confirmed by Luhn. */
export const card: Detector = {
  name: 'card',
  label: 'CARD',
  pattern: /\b(?:\d[ -]?){12,18}\d\b/g,
  validate: validateCard,
  partial: (match) => `****${digitsOnly(match).slice(-4)}`,
};
