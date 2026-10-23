// Checks that the CommonJS build loads through `require` and works.
const { redact } = require('../dist/index.cjs');
const { redactFormat } = require('../dist/winston.cjs');

if (redact('mail a@b.com') !== 'mail [EMAIL]') throw new Error('cjs redact failed');
if (typeof redactFormat().transform !== 'function') throw new Error('winston entry broken');
console.log('smoke ok (cjs)');
