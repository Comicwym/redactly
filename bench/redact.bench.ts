import fastRedact from 'fast-redact';
import { test } from 'vitest';
import { createRedactor } from '../src/index.js';

const requestLog = {
  level: 'info',
  msg: 'request completed',
  req: {
    method: 'POST',
    url: '/api/v1/orders?page=2',
    headers: {
      host: 'api.example.com',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
      authorization: 'Bearer abc123def456ghi789',
      'content-type': 'application/json',
    },
    body: {
      customer: 'mario.rossi@example.com',
      items: [{ sku: 'A-1', qty: 2 }],
      note: 'leave at door',
    },
  },
  res: { statusCode: 201, responseTime: 42 },
};

const longMessage = `${'user action recorded without sensitive data. '.repeat(40)}card 4111 1111 1111 1111`;

const redactor = createRedactor();
const pathOnly = fastRedact({
  paths: ['req.headers.authorization', 'req.body.customer'],
  serialize: false,
}) as (value: object) => object;

test('request-shaped log object', async ({ bench }) => {
  await bench.compare(
    bench('redactly (keys + value detection)', () => {
      redactor(requestLog);
    }),
    bench('fast-redact (known paths only) + structuredClone', () => {
      pathOnly(structuredClone(requestLog));
    }),
    bench('baseline: structuredClone', () => {
      structuredClone(requestLog);
    }),
  );
});

test('free text', async ({ bench }) => {
  await bench('redactly.string, 2 kB message', () => {
    redactor.string(longMessage);
  }).run();
});
