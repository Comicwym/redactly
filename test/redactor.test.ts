import { describe, expect, it } from 'vitest';
import { createRedactor, type Detector, redact } from '../src/index.js';

describe('redact()', () => {
  it('handles the README example', () => {
    expect(redact({ user: 'a@b.com', password: 'x', note: 'card 4111 1111 1111 1111' })).toEqual({
      user: '[EMAIL]',
      password: '[REDACTED]',
      note: 'card [CARD]',
    });
  });

  it('does not mutate the input', () => {
    const input = { a: { b: ['mail me at a@b.com'] }, token: 'abc' };
    const snapshot = structuredClone(input);
    const output = redact(input);
    expect(input).toEqual(snapshot);
    expect(output).not.toBe(input);
    expect(output.a.b).toEqual(['mail me at [EMAIL]']);
  });

  it('passes primitives through and redacts strings', () => {
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
    expect(redact(undefined)).toBe(undefined);
    expect(redact(true)).toBe(true);
    expect(redact('a@b.com')).toBe('[EMAIL]');
    expect(redact('short')).toBe('short');
  });

  it('accepts options for one-off calls', () => {
    expect(redact('a@b.com', { mask: 'full' })).toBe('[REDACTED]');
  });
});

describe('traversal', () => {
  const r = createRedactor();

  it('replaces circular references', () => {
    const node: Record<string, unknown> = { name: 'root' };
    node.self = node;
    node.list = [node];
    expect(r(node)).toEqual({ name: 'root', self: '[Circular]', list: ['[Circular]'] });
  });

  it('copies shared, non-circular references twice', () => {
    const shared = { email: 'a@b.com' };
    expect(r({ x: shared, y: shared })).toEqual({
      x: { email: '[EMAIL]' },
      y: { email: '[EMAIL]' },
    });
  });

  it('stops at maxDepth', () => {
    const deep = { a: { b: { c: { d: 'x' } } } };
    expect(createRedactor({ maxDepth: 2 })(deep)).toEqual({ a: { b: { c: '[MaxDepth]' } } });
  });

  it('handles Map, Set and Date', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    const out = r({
      map: new Map<unknown, unknown>([
        ['password', 'x'],
        ['note', 'a@b.com'],
        [1, 'c@d.com'],
      ]),
      set: new Set(['e@f.com']),
      date,
    });
    expect(out.map).toEqual(
      new Map<unknown, unknown>([
        ['password', '[REDACTED]'],
        ['note', '[EMAIL]'],
        [1, '[EMAIL]'],
      ]),
    );
    expect(out.set).toEqual(new Set(['[EMAIL]']));
    expect(out.date).toEqual(date);
    expect(out.date).not.toBe(date);
  });

  it('keeps Errors as Errors with redacted message, stack, cause and props', () => {
    class HttpError extends Error {
      status = 401;
      token = 'abc';
    }
    const cause = new Error('upstream said a@b.com');
    const error = new HttpError('login failed for c@d.com', { cause });
    const out = r(error);
    expect(out).toBeInstanceOf(HttpError);
    expect(out).toBeInstanceOf(Error);
    expect(out.message).toBe('login failed for [EMAIL]');
    expect(out.stack).toContain('login failed for [EMAIL]');
    expect(out.stack).not.toContain('c@d.com');
    expect((out.cause as Error).message).toBe('upstream said [EMAIL]');
    expect(out.status).toBe(401);
    expect(out.token).toBe('[REDACTED]');
    expect(Object.keys(out)).toEqual(['status', 'token']);
  });

  it('redacts URL instances', () => {
    const out = r({ url: new URL('https://x.com/cb?access_token=abc123&ok=1') });
    expect(String(out.url)).toBe('https://x.com/cb?access_token=[SECRET]&ok=1');
    const clean = new URL('https://example.com/');
    expect(r(clean)).toEqual(clean);
  });

  it('passes binary data and RegExp through', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const regex = /a@b\.com/;
    const out = r({ bytes, regex, buf: new ArrayBuffer(2) });
    expect(out.bytes).toBe(bytes);
    expect(out.regex).toBe(regex);
  });

  it('uses toJSON when present', () => {
    const value = { toJSON: () => ({ email: 'a@b.com' }) };
    expect(r(value)).toEqual({ email: '[EMAIL]' });
  });

  it('turns class instances into plain objects with own enumerable props', () => {
    class User {
      constructor(public email: string) {}
      get upper() {
        return this.email.toUpperCase();
      }
    }
    expect(r(new User('a@b.com'))).toEqual({ email: '[EMAIL]' });
  });

  it('survives throwing getters', () => {
    const value = {
      ok: 'a@b.com',
      get boom(): string {
        throw new Error('nope');
      },
    };
    expect(r(value)).toEqual({ ok: '[EMAIL]', boom: undefined });
  });

  it('fails closed when the input cannot be read at all', () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('no keys for you');
        },
      },
    );
    expect(r(hostile)).toBe('[Unredactable]');
  });

  it('string() ignores non-strings', () => {
    expect(r.string(5 as unknown as string)).toBe(5);
  });
});

describe('sensitive keys', () => {
  const r = createRedactor();

  it('matches keys regardless of case and separators', () => {
    expect(r({ apiKey: 'a', api_key: 'b', 'API-KEY': 'c', Authorization: 'd' })).toEqual({
      apiKey: '[REDACTED]',
      api_key: '[REDACTED]',
      'API-KEY': '[REDACTED]',
      Authorization: '[REDACTED]',
    });
  });

  it('matches suffixes but not substrings', () => {
    expect(
      r({ dbPassword: 'a', githubToken: 'b', bypass: 'c', maxTokens: 10, tokenCount: 3 }),
    ).toEqual({
      dbPassword: '[REDACTED]',
      githubToken: '[REDACTED]',
      bypass: 'c',
      maxTokens: 10,
      tokenCount: 3,
    });
  });

  it('redacts any value type under a sensitive key but keeps null and undefined', () => {
    expect(r({ password: 1234, secret: { nested: true }, token: null, auth: undefined })).toEqual({
      password: '[REDACTED]',
      secret: '[REDACTED]',
      token: null,
      auth: undefined,
    });
  });

  it('supports extra keys, ignored keys and disabling defaults', () => {
    const custom = createRedactor({ keys: ['X-Internal-Id'], ignoreKeys: ['session'] });
    expect(custom({ xInternalId: '1', session: 'visible' })).toEqual({
      xInternalId: '[REDACTED]',
      session: 'visible',
    });
    const none = createRedactor({ defaultKeys: false, keys: ['only'] });
    expect(none({ password: 'x', only: 'y', dbPassword: 'z' })).toEqual({
      password: 'x',
      only: '[REDACTED]',
      dbPassword: 'z',
    });
  });

  it('still runs detectors on values under ignored keys', () => {
    expect(createRedactor({ ignoreKeys: ['token'] })({ token: 'a@b.com' })).toEqual({
      token: '[EMAIL]',
    });
  });
});

describe('masks', () => {
  it('full', () => {
    const r = createRedactor({ mask: 'full' });
    expect(r({ note: 'a@b.com', password: 'x' })).toEqual({
      note: '[REDACTED]',
      password: '[REDACTED]',
    });
  });

  it('partial', () => {
    const r = createRedactor({ mask: 'partial', presets: ['all'] });
    expect(
      r({
        card: 'card 4111 1111 1111 1111',
        email: 'mario@example.com',
        iban: 'IT60 X054 2811 1010 0000 0123 456',
        jwtish: 'Bearer abcdefgh12345678',
        shortKey: 'Bearer abc12345',
        apiKey: 'sk-0123456789abcdef',
        password: 'short',
        secret: { obj: true },
      }),
    ).toEqual({
      card: 'card ****1111',
      email: 'm***@example.com',
      iban: 'IT**3456',
      jwtish: 'Bearer ****5678',
      shortKey: 'Bearer [TOKEN]',
      apiKey: '****cdef',
      password: '[REDACTED]',
      secret: '[REDACTED]',
    });
  });

  it('custom function receives the context', () => {
    const seen: string[] = [];
    const r = createRedactor({
      mask: (value, ctx) => {
        seen.push(`${ctx.type}:${ctx.name}:${ctx.label}`);
        return `<${ctx.label}:${value.length}>`;
      },
    });
    expect(r({ note: 'a@b.com', password: 'hunter2', pin: 1234, token: { a: 1 } })).toEqual({
      note: '<EMAIL:7>',
      password: '<REDACTED:7>',
      pin: '<REDACTED:4>',
      token: '<REDACTED:0>',
    });
    expect(seen).toEqual([
      'detector:email:EMAIL',
      'key:password:REDACTED',
      'key:pin:REDACTED',
      'key:token:REDACTED',
    ]);
  });
});

describe('presets and custom detectors', () => {
  const ticket: Detector = { name: 'ticket', label: 'TICKET', pattern: /\bTCK-\d{6}\b/ };

  it('runs custom detectors, with or without the g flag', () => {
    const r = createRedactor({ presets: [], detectors: [ticket] });
    expect(r.string('see TCK-123456 and TCK-654321, mail a@b.com')).toBe(
      'see [TICKET] and [TICKET], mail a@b.com',
    );
  });

  it('runs custom detectors before built-ins', () => {
    const everything: Detector = { name: 'all', label: 'X', pattern: /\S+@\S+/g };
    expect(createRedactor({ detectors: [everything] }).string('a@b.com')).toBe('[X]');
  });

  it('opt-in presets are off by default', () => {
    expect(redact('ip 10.0.0.1 phone +39 333 123 4567')).toBe('ip 10.0.0.1 phone +39 333 123 4567');
    expect(
      createRedactor({ presets: ['network', 'contact'] }).string(
        'ip 10.0.0.1 phone +39 333 123 4567',
      ),
    ).toBe('ip [IP] phone [PHONE]');
  });

  it('a validator can redact only a prefix or reject', () => {
    const prefix: Detector = {
      name: 'p',
      label: 'P',
      pattern: /ID\d{6}/g,
      validate: (m) => (m.endsWith('0') ? false : m.endsWith('9') ? 0 : 4),
    };
    expect(
      createRedactor({ presets: [], detectors: [prefix] }).string('ID123456 ID123450 ID123459'),
    ).toBe('[P]3456 ID123450 ID123459');
  });

  it('throws on unknown presets', () => {
    // @ts-expect-error invalid preset name
    expect(() => createRedactor({ presets: ['nope'] })).toThrow(/unknown preset "nope"/);
  });
});
