import type { Detector, MaskContext, MaskFn, MaskStrategy } from './types.js';

export const REDACTED = '[REDACTED]';

/** `****` plus the last 4 characters, or a full mask when the value is too short to hint safely. */
export function keepLast4(value: string, fallback: string): string {
  return value.length >= 12 ? `****${value.slice(-4)}` : fallback;
}

export type DetectorMask = (match: string, detector: Detector) => string;
export type KeyMask = (key: string, value: unknown) => string;

export function createMasks(strategy: MaskStrategy): { detector: DetectorMask; key: KeyMask } {
  if (typeof strategy === 'function') {
    const fn: MaskFn = strategy;
    return {
      detector: (match, d) =>
        fn(match, { type: 'detector', name: d.name, label: d.label, original: match }),
      key: (key, value) => fn(toText(value), keyContext(key, value)),
    };
  }

  switch (strategy) {
    case 'full':
      return { detector: () => REDACTED, key: () => REDACTED };
    case 'partial':
      return {
        detector: (match, d) =>
          d.partial ? d.partial(match) : keepLast4(match.replace(/\s/g, ''), `[${d.label}]`),
        key: (_key, value) => (typeof value === 'string' ? keepLast4(value, REDACTED) : REDACTED),
      };
    default:
      return { detector: (_match, d) => `[${d.label}]`, key: () => REDACTED };
  }
}

function keyContext(key: string, value: unknown): MaskContext {
  return { type: 'key', name: key, label: 'REDACTED', original: value };
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object') return String(value);
  return '';
}
