import type { Detector } from '../types.js';
import { digitsOnly, longestValidPrefix } from './util.js';

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

function isCard(candidate: string): boolean {
  const digits = digitsOnly(candidate);
  return digits.length >= 13 && digits.length <= 19 && luhn(digits);
}

/** 13–19 digit card numbers, optionally grouped with spaces or dashes, confirmed by Luhn. */
export const card: Detector = {
  name: 'card',
  label: 'CARD',
  pattern: /\b(?:\d[ -]?){12,18}\d\b/g,
  validate: (match) => longestValidPrefix(match, isCard),
  partial: (match) => `****${digitsOnly(match).slice(-4)}`,
};
