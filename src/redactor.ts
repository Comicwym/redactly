import { createKeyMatcher } from './keys.js';
import { createMasks } from './masks.js';
import { resolveDetectors } from './presets.js';
import type { Detector, Redactor, RedactorOptions } from './types.js';

const DEFAULT_MAX_DEPTH = 20;
/** Shortest string any built-in detector can match; skips the regex pass for tiny values. */
const MIN_SCAN_LENGTH = 6;

export function createRedactor(options: RedactorOptions = {}): Redactor {
  const detectors = resolveDetectors(options.presets ?? ['common'], options.detectors ?? []).map(
    compile,
  );
  const isSensitiveKey = createKeyMatcher(
    options.keys,
    options.ignoreKeys,
    options.defaultKeys ?? true,
  );
  const masks = createMasks(options.mask ?? 'label');
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  function redactString(text: string): string {
    if (text.length < MIN_SCAN_LENGTH) return text;
    let out = text;
    for (const d of detectors) {
      d.pattern.lastIndex = 0;
      out = out.replace(d.pattern, (match: string) => {
        const verdict = d.validate ? d.validate(match) : true;
        if (verdict === false) return match;
        if (verdict === true || verdict >= match.length) return masks.detector(match, d);
        if (verdict <= 0) return match;
        return masks.detector(match.slice(0, verdict), d) + match.slice(verdict);
      });
    }
    return out;
  }

  function walk(value: unknown, depth: number, ancestors: WeakSet<object>): unknown {
    if (typeof value === 'string') return redactString(value);
    if (value === null || typeof value !== 'object') return value;
    if (depth > maxDepth) return '[MaxDepth]';
    if (ancestors.has(value)) return '[Circular]';

    if (value instanceof Date) return new Date(value.getTime());
    if (value instanceof RegExp || ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
      return value;
    }
    if (typeof URL !== 'undefined' && value instanceof URL) return redactUrl(value);

    ancestors.add(value);
    try {
      if (Array.isArray(value)) return value.map((item) => walk(item, depth + 1, ancestors));
      if (value instanceof Map) return walkMap(value, depth, ancestors);
      if (value instanceof Set) {
        return new Set(Array.from(value, (item) => walk(item, depth + 1, ancestors)));
      }
      if (value instanceof Error) return walkError(value, depth, ancestors);

      const toJSON = (value as { toJSON?: unknown }).toJSON;
      if (typeof toJSON === 'function') {
        return walk(
          safe(() => toJSON.call(value)),
          depth + 1,
          ancestors,
        );
      }
      return walkObject(value as Record<string, unknown>, {}, depth, ancestors);
    } finally {
      ancestors.delete(value);
    }
  }

  function walkEntry(key: string, value: unknown, depth: number, ancestors: WeakSet<object>) {
    if (value != null && isSensitiveKey(key)) return masks.key(key, value);
    return walk(value, depth + 1, ancestors);
  }

  function walkObject<T extends object>(
    source: Record<string, unknown>,
    target: T,
    depth: number,
    ancestors: WeakSet<object>,
  ): T {
    for (const key of Object.keys(source)) {
      const value = safe(() => source[key]);
      (target as Record<string, unknown>)[key] = walkEntry(key, value, depth, ancestors);
    }
    return target;
  }

  function walkMap(map: Map<unknown, unknown>, depth: number, ancestors: WeakSet<object>) {
    const out = new Map<unknown, unknown>();
    for (const [key, value] of map) {
      out.set(
        key,
        typeof key === 'string'
          ? walkEntry(key, value, depth, ancestors)
          : walk(value, depth + 1, ancestors),
      );
    }
    return out;
  }

  /** Keeps the prototype so `instanceof Error` and logger error serializers still work. */
  function walkError(error: Error, depth: number, ancestors: WeakSet<object>): Error {
    const copy = Object.create(Object.getPrototypeOf(error)) as Error;
    const hidden = (name: string, value: unknown) =>
      Object.defineProperty(copy, name, { value, writable: true, configurable: true });
    hidden('message', redactString(String(error.message)));
    if (typeof error.stack === 'string') hidden('stack', redactString(error.stack));
    if ('cause' in error) hidden('cause', walk(error.cause, depth + 1, ancestors));
    return walkObject(error as unknown as Record<string, unknown>, copy, depth, ancestors);
  }

  function redactUrl(url: URL): URL | string {
    const redacted = redactString(url.href);
    if (redacted === url.href) return new URL(url.href);
    return safe(() => new URL(redacted)) ?? redacted;
  }

  const redactor = (<T>(value: T): T => {
    try {
      return walk(value, 0, new WeakSet()) as T;
    } catch {
      // Logging must never crash the app; fail closed instead of leaking the raw value.
      return '[Unredactable]' as T;
    }
  }) as Redactor;
  redactor.string = (text) => (typeof text === 'string' ? redactString(text) : text);
  return redactor;
}

function compile(detector: Detector): Detector {
  const { pattern } = detector;
  if (pattern.global) return { ...detector, pattern: new RegExp(pattern.source, pattern.flags) };
  return { ...detector, pattern: new RegExp(pattern.source, `${pattern.flags}g`) };
}

function safe<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

let defaultRedactor: Redactor | undefined;

/** Redactor with the default options, created on first use. */
export function getDefaultRedactor(): Redactor {
  defaultRedactor ??= createRedactor();
  return defaultRedactor;
}

/**
 * Redacts `value` in one call. With `options`, a new redactor is built every time:
 * for hot paths, create one with `createRedactor()` and reuse it.
 */
export function redact<T>(value: T, options?: RedactorOptions): T {
  return (options ? createRedactor(options) : getDefaultRedactor())(value);
}
