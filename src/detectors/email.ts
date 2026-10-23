import type { Detector } from '../types.js';

/**
 * Practical email matcher (not full RFC 5322). The lookbehind stops matches from
 * starting mid-token and the bounded quantifiers keep scanning linear.
 */
export const email: Detector = {
  name: 'email',
  label: 'EMAIL',
  pattern:
    /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){0,8}\.[A-Za-z]{2,24}\b/g,
  partial: (match) => {
    const at = match.indexOf('@');
    return `${match[0]}***${match.slice(at)}`;
  },
};
