import type { Detector } from '../types.js';

/** Value of each character in odd positions (1st, 3rd…), digits and letters share a slot. */
const ODD = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];

/** Italian tax code check character (DM 23/12/1976), including omocodia variants. */
export function isValidCodiceFiscale(candidate: string): boolean {
  const cf = candidate.toUpperCase();
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const code = cf.charCodeAt(i);
    const index = code <= 57 ? code - 48 : code - 65;
    sum += i % 2 === 0 ? (ODD[index] ?? 0) : index;
  }
  return cf.charCodeAt(15) === 65 + (sum % 26);
}

/** Digit slots also accept the omocodia letters L–V that replace digits in duplicate codes. */
const D = '[0-9LMNP-V]';

export const codiceFiscale: Detector = {
  name: 'codice-fiscale',
  label: 'CODICE_FISCALE',
  pattern: new RegExp(`\\b[A-Z]{6}${D}{2}[ABCDEHLMPRST]${D}{2}[A-Z]${D}{3}[A-Z]\\b`, 'gi'),
  validate: isValidCodiceFiscale,
};
