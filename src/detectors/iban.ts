import type { Detector } from '../types.js';
import { longestValidPrefix } from './util.js';

/** IBAN length per country (ISO 13616 registry). */
const LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20,
  LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19,
  MR: 27, MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29,
  RO: 24, RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28,
  TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

/** ISO 7064 mod 97-10: move the first 4 chars to the end, letters to numbers, remainder must be 1. */
export function isValidIban(candidate: string): boolean {
  const iban = candidate.replace(/ /g, '').toUpperCase();
  if (iban.length !== LENGTHS[iban.slice(0, 2)]) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    const value = code >= 65 ? code - 55 : code - 48;
    remainder = (remainder * (value > 9 ? 100 : 10) + value) % 97;
  }
  return remainder === 1;
}

export const iban: Detector = {
  name: 'iban',
  label: 'IBAN',
  pattern: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}\b/g,
  validate: (match) => longestValidPrefix(match, isValidIban),
  partial: (match) => {
    const compact = match.replace(/ /g, '');
    return `${compact.slice(0, 2)}**${compact.slice(-4)}`;
  },
};
