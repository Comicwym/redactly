# redactly

**Keep secrets and personal data out of your logs.** redactly finds tokens, card numbers, IBANs, emails, API keys and passwords by looking at the _values_ — not just at a list of known paths — and replaces them before they are written anywhere.

```ts
import { redact } from 'redactly';

redact({ user: 'a@b.com', password: 'x', note: 'card 4111 1111 1111 1111' });
// → { user: '[EMAIL]', password: '[REDACTED]', note: 'card [CARD]' }
```

- **Value detection**: finds a card number or a JWT wherever it is, even inside a free-text message.
- **Few false positives**: cards are confirmed with Luhn, IBANs with mod-97, Italian tax codes with their check character.
- **Sensitive keys**: `password`, `token`, `authorization`, `apiKey`, `dbPassword`… are redacted whatever they contain.
- **Safe by design**: never mutates the input, never throws, handles circular references, and every pattern is tested against ReDoS.
- **Zero dependencies**, ESM + CommonJS, full TypeScript types. Runs on Node 20+, Bun, Deno, browsers and edge runtimes.
- **Drop-in integrations** for pino, winston and `console`.

## Install

```bash
npm install redactly
```

## Usage

### Reusable redactor

`redact()` is a convenience wrapper. On hot paths, build a redactor once and reuse it: patterns are compiled a single time.

```ts
import { createRedactor } from 'redactly';

const redactor = createRedactor({
  presets: ['common', 'gdpr-eu'], // which detectors to run
  keys: ['x-internal-id'], // extra keys to always redact
  ignoreKeys: ['session'], // keys you do not want redacted by name
  mask: 'partial', // 'label' | 'full' | 'partial' | (value, ctx) => string
  maxDepth: 20,
});

redactor({ card: '4111 1111 1111 1111', email: 'mario@example.com' });
// → { card: '****1111', email: 'm***@example.com' }

redactor.string('login failed password=hunter2');
// → 'login failed password=[SECRET]'
```

### pino

```ts
import pino from 'pino';
import { pinoOptions } from 'redactly/pino';

const logger = pino({ ...pinoOptions() });
logger.info({ user: { email: 'a@b.com' } }, 'paid with 4111 1111 1111 1111');
// {"user":{"email":"[EMAIL]"},"msg":"paid with [CARD]",...}
```

The merging object, the message and logged `Error`s are all redacted. Pass your own redactor with `pinoOptions(redactor)`.

### winston

```ts
import winston from 'winston';
import { redactFormat } from 'redactly/winston';

const logger = winston.createLogger({
  format: winston.format.combine(redactFormat(), winston.format.json()),
  transports: [new winston.transports.Console()],
});
```

Put `redactFormat()` first in `combine()` so every later format only sees clean data.

### console

```ts
import { patchConsole } from 'redactly/console';

const restore = patchConsole(); // console.log/info/warn/error/debug/trace now redact
restore();
```

## Presets

| Preset    | Detects                                                                                                                                                              | Default           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `secrets` | JWTs, `Bearer`/`Basic` credentials, passwords in URLs and `key=value` text, PEM private keys, AWS / GitHub / Stripe / Slack / OpenAI / Anthropic / Google / npm keys | ✅ (via `common`) |
| `pci`     | Card numbers (Luhn-checked)                                                                                                                                          | ✅ (via `common`) |
| `email`   | Email addresses                                                                                                                                                      | ✅ (via `common`) |
| `gdpr-eu` | Emails, IBANs (mod-97), Italian codice fiscale                                                                                                                       | opt-in            |
| `network` | IPv4, IPv6                                                                                                                                                           | opt-in            |
| `contact` | Emails, international phone numbers (`+CC …`)                                                                                                                        | opt-in            |
| `common`  | `secrets` + `pci` + `email`                                                                                                                                          | default           |
| `all`     | Everything above                                                                                                                                                     | opt-in            |

## Masks

| Strategy          | Detector hit                               | Key hit                                     |
| ----------------- | ------------------------------------------ | ------------------------------------------- |
| `label` (default) | `[EMAIL]`, `[CARD]`, `[JWT]`…              | `[REDACTED]`                                |
| `full`            | `[REDACTED]`                               | `[REDACTED]`                                |
| `partial`         | `****1111`, `m***@example.com`, `IT**3456` | `****` + last 4 chars (values of 12+ chars) |
| function          | `(value, ctx) => string`                   | same, with `ctx.type === 'key'`             |

## Custom detectors

```ts
import { createRedactor, type Detector } from 'redactly';

const ticket: Detector = {
  name: 'ticket',
  label: 'TICKET',
  pattern: /\bTCK-\d{6}\b/g,
  validate: (match) => !match.endsWith('000000'), // optional
};

createRedactor({ detectors: [ticket] }).string('see TCK-123456'); // 'see [TICKET]'
```

Custom detectors run before the built-in ones. Keep every quantifier bounded (`{1,64}`, never `+` inside a repeated group) so the pattern stays linear on hostile input.

## What gets traversed

Plain objects, arrays, `Map`, `Set`, `Error` (message, stack, `cause` and own properties, keeping the prototype so `instanceof` works), `URL`, and anything with `toJSON()`. Dates are copied, binary data (`Buffer`, typed arrays) and `RegExp` are passed through, circular references become `[Circular]`, and values deeper than `maxDepth` become `[MaxDepth]`. If an input cannot be read at all, the result is `[Unredactable]`: redactly fails closed and never leaks the raw value.

## Performance

Measured with `npm run bench` (Node 24, Windows desktop CPU):

| Scenario                                            | Ops/sec  | Mean   |
| --------------------------------------------------- | -------- | ------ |
| Request-shaped log object (headers, body, nested)   | ~98,000  | ~10 µs |
| 2 kB free-text message                              | ~26,000  | ~38 µs |
| For reference: `structuredClone` of the same object | ~253,000 | ~4 µs  |

Path-only tools such as `fast-redact` are faster because they only look at the paths you list; redactly also scans every string for secrets you did not know were there.

## Limitations

Detection is pattern-based: it greatly reduces leaks but cannot guarantee that no sensitive value ever slips through (for example a password written as plain prose). Use it together with structured logging and least-privilege access to logs.

## License

[MIT](./LICENSE)
