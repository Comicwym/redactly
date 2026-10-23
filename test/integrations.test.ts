import { Writable } from 'node:stream';
import pino from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';
import winston from 'winston';
import { createRedactor } from '../src/index.js';
import { patchConsole, unpatchConsole } from '../src/integrations/console.js';
import { pinoOptions } from '../src/integrations/pino.js';
import { redactFormat } from '../src/integrations/winston.js';

function memoryStream() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(JSON.parse(String(chunk)));
      done();
    },
  });
  return { lines, stream };
}

describe('pino', () => {
  it('redacts the merging object and the message', () => {
    const { lines, stream } = memoryStream();
    const logger = pino({ ...pinoOptions(), base: null, timestamp: false }, stream);
    logger.info(
      { user: { email: 'a@b.com' }, password: 'x' },
      'token=abc123 for card 4111111111111111',
    );
    expect(lines[0]).toEqual({
      level: 30,
      user: { email: '[EMAIL]' },
      password: '[REDACTED]',
      msg: 'token=[SECRET] for card [CARD]',
    });
  });

  it('keeps errors serializable by pino', () => {
    const { lines, stream } = memoryStream();
    const logger = pino({ ...pinoOptions(), base: null, timestamp: false }, stream);
    logger.error(new Error('failed for a@b.com'));
    const err = lines[0]?.err as Record<string, string>;
    expect(err.type).toBe('Error');
    expect(err.message).toBe('failed for [EMAIL]');
    expect(err.stack).not.toContain('a@b.com');
    expect(lines[0]?.msg).toBe('failed for [EMAIL]');
  });

  it('accepts a custom redactor', () => {
    const { lines, stream } = memoryStream();
    const logger = pino(
      { ...pinoOptions(createRedactor({ mask: 'full' })), base: null, timestamp: false },
      stream,
    );
    logger.info('mail a@b.com');
    expect(lines[0]?.msg).toBe('mail [REDACTED]');
  });
});

describe('winston', () => {
  const MESSAGE = Symbol.for('message');
  const SPLAT = Symbol.for('splat');
  const LEVEL = Symbol.for('level');

  it('works inside format.combine and keeps symbol keys', () => {
    const format = winston.format.combine(redactFormat(), winston.format.json());
    const info = format.transform({
      level: 'info',
      message: 'login a@b.com',
      password: 'x',
      [LEVEL]: 'info',
    }) as Record<string | symbol, unknown>;
    expect(info[LEVEL]).toBe('info');
    expect(JSON.parse(info[MESSAGE] as string)).toEqual({
      level: 'info',
      message: 'login [EMAIL]',
      password: '[REDACTED]',
    });
  });

  it('redacts splat args and an already formatted line', () => {
    const info = redactFormat().transform({
      level: 'info',
      message: 'ok',
      [SPLAT]: [{ token: 'abc' }, 'c@d.com'],
      [MESSAGE]: 'raw line with a@b.com',
    });
    expect(info[SPLAT]).toEqual([{ token: '[REDACTED]' }, '[EMAIL]']);
    expect(info[MESSAGE]).toBe('raw line with [EMAIL]');
  });

  it('writes clean lines through a real logger', async () => {
    const { lines, stream } = memoryStream();
    const logger = winston.createLogger({
      format: winston.format.combine(redactFormat(), winston.format.json()),
      transports: [new winston.transports.Stream({ stream })],
    });
    logger.info('card 4111 1111 1111 1111', { apiKey: 'k' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(lines[0]).toEqual({ level: 'info', message: 'card [CARD]', apiKey: '[REDACTED]' });
  });
});

describe('console', () => {
  afterEach(() => unpatchConsole());

  it('redacts every argument and restores the original', () => {
    const spy = vi.fn();
    const original = console.log;
    console.log = spy;
    try {
      const restore = patchConsole();
      console.log('mail a@b.com', { password: 'x' }, 42);
      expect(spy).toHaveBeenCalledWith('mail [EMAIL]', { password: '[REDACTED]' }, 42);
      restore();
      expect(console.log).toBe(spy);
    } finally {
      console.log = original;
    }
  });

  it('does not double-wrap when patched twice and honors the method list', () => {
    const spy = vi.fn();
    const originalWarn = console.warn;
    const originalLog = console.log;
    console.warn = spy;
    try {
      patchConsole(undefined, ['warn']);
      patchConsole(createRedactor({ mask: 'full' }), ['warn']);
      console.warn('a@b.com');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('[REDACTED]');
      expect(console.log).toBe(originalLog);
      unpatchConsole();
      expect(console.warn).toBe(spy);
    } finally {
      console.warn = originalWarn;
    }
  });
});
