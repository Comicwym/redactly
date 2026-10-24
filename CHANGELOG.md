# redactly

## 0.1.1

### Patch Changes

- 6c000fb: Card detection is about 4x faster on long runs of digits: digits are extracted once and only 13–19 digit candidates are checked with Luhn.

## 0.1.0

- First release: `redact()`, `createRedactor()`, sensitive keys, presets `common`, `secrets`, `pci`, `email`, `gdpr-eu`, `network`, `contact`, `all`, mask strategies, and pino, winston and console integrations.
