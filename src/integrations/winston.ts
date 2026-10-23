import { getDefaultRedactor } from '../redactor.js';
import type { Redactor } from '../types.js';

/** Winston keeps the formatted line and the splat args under these registered symbols. */
const MESSAGE = Symbol.for('message');
const SPLAT = Symbol.for('splat');

/** Mirrors logform's `TransformableInfo`. */
export interface Info {
  level: string;
  message: unknown;
  [key: string | symbol]: unknown;
}

/** Structurally compatible with winston's `Format`, so winston isn't a dependency. */
export interface RedactFormat {
  transform(info: Info): Info;
}

/**
 * Winston format. Put it first in `format.combine()` so later formats only see clean data;
 * if it runs after `printf`/`json`, the already formatted line is redacted too.
 *
 * ```ts
 * import winston from 'winston';
 * import { redactFormat } from 'redactly/winston';
 * winston.createLogger({ format: winston.format.combine(redactFormat(), winston.format.json()) });
 * ```
 */
export function redactFormat(redactor: Redactor = getDefaultRedactor()): RedactFormat {
  return {
    transform(info) {
      // Winston relies on the info object's identity and symbol keys, so redact in place.
      const clean = redactor({ ...info } as Record<string, unknown>);
      for (const key of Object.keys(clean)) info[key] = clean[key];
      if (Array.isArray(info[SPLAT])) info[SPLAT] = redactor(info[SPLAT]);
      if (typeof info[MESSAGE] === 'string') info[MESSAGE] = redactor.string(info[MESSAGE]);
      return info;
    },
  };
}
