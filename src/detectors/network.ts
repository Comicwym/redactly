import type { Detector } from '../types.js';
import { digitsOnly } from './util.js';

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';

export const ipv4: Detector = {
  name: 'ipv4',
  label: 'IP',
  pattern: new RegExp(`(?<![\\d.])(?:${OCTET}\\.){3}${OCTET}(?![\\d.])`, 'g'),
};

const HEX_GROUP = /^[0-9a-f]{1,4}$/i;

export function isValidIpv6(candidate: string): boolean {
  const halves = candidate.split('::');
  if (halves.length > 2) return false;
  const groups = halves.flatMap((half) => (half === '' ? [] : half.split(':')));
  if (groups.length === 0 || !groups.every((g) => HEX_GROUP.test(g))) return false;
  return halves.length === 2 ? groups.length < 8 : groups.length === 8;
}

/** Full and `::`-compressed IPv6. The broad candidate is narrowed down by `isValidIpv6`. */
export const ipv6: Detector = {
  name: 'ipv6',
  label: 'IP',
  pattern: /(?<![\w:])[0-9A-Fa-f:]{2,39}(?![\w:])/g,
  validate: isValidIpv6,
};

/** International numbers in `+CC …` form (E.164 allows 8–15 digits). */
export const phone: Detector = {
  name: 'phone',
  label: 'PHONE',
  pattern: /(?<![\w+])\+\d{1,3}[ .-]?(?:\(\d{1,4}\)[ .-]?)?\d{1,4}(?:[ .-]?\d{1,4}){1,4}(?!\w)/g,
  validate: (match) => {
    const n = digitsOnly(match).length;
    return n >= 8 && n <= 15;
  },
};
