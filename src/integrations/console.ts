import { getDefaultRedactor } from '../redactor.js';
import type { Redactor } from '../types.js';

export type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'trace';

const DEFAULT_METHODS: readonly ConsoleMethod[] = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
];

const originals = new Map<ConsoleMethod, (...args: unknown[]) => void>();

/**
 * Redacts every argument passed to the global `console` methods.
 * Returns a function that restores the originals (same as `unpatchConsole()`).
 */
export function patchConsole(
  redactor: Redactor = getDefaultRedactor(),
  methods: readonly ConsoleMethod[] = DEFAULT_METHODS,
): () => void {
  for (const method of methods) {
    // Patching twice must not wrap the wrapper: always start from the real method.
    const original = originals.get(method) ?? console[method];
    originals.set(method, original);
    console[method] = (...args: unknown[]) => original.apply(console, args.map(redactor));
  }
  return unpatchConsole;
}

export function unpatchConsole(): void {
  for (const [method, original] of originals) console[method] = original;
  originals.clear();
}
