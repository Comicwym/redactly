import { getDefaultRedactor } from '../redactor.js';
import type { Redactor } from '../types.js';

/** The subset of pino options we set; typed locally so pino stays an optional peer. */
export interface PinoRedactOptions {
  formatters: { log: (object: Record<string, unknown>) => Record<string, unknown> };
  hooks: {
    logMethod: (
      this: unknown,
      args: unknown[],
      method: (this: unknown, ...args: unknown[]) => void,
    ) => void;
  };
}

/**
 * Pino options that redact both the merging object and string arguments (the message).
 *
 * ```ts
 * import pino from 'pino';
 * import { pinoOptions } from 'redactly/pino';
 * const logger = pino({ ...pinoOptions() });
 * ```
 */
export function pinoOptions(redactor: Redactor = getDefaultRedactor()): PinoRedactOptions {
  return {
    formatters: {
      log: (object) => redactor(object),
    },
    hooks: {
      logMethod(args, method) {
        // pino copies `err.message` into `msg` before `formatters.log` runs, so Errors go here too.
        method.apply(
          this,
          args.map((arg) =>
            typeof arg === 'string'
              ? redactor.string(arg)
              : arg instanceof Error
                ? redactor(arg)
                : arg,
          ),
        );
      },
    },
  };
}
