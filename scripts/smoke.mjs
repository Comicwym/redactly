// Runs the built ESM bundle on Node, Bun and Deno: `node|bun|deno run scripts/smoke.mjs`.
import { createRedactor, redact } from '../dist/index.js';
import { pinoOptions } from '../dist/pino.js';

const out = redact({ user: 'a@b.com', password: 'x', note: 'card 4111 1111 1111 1111' });
const expected = { user: '[EMAIL]', password: '[REDACTED]', note: 'card [CARD]' };
if (JSON.stringify(out) !== JSON.stringify(expected)) {
  throw new Error(`unexpected output: ${JSON.stringify(out)}`);
}
if (createRedactor({ mask: 'partial' }).string('4111 1111 1111 1111') !== '****1111') {
  throw new Error('partial mask failed');
}
if (typeof pinoOptions().formatters.log !== 'function') throw new Error('pino entry broken');
console.log('smoke ok (esm)');
