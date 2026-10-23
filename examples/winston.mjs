// npm run build && node examples/winston.mjs
import { createRedactor } from 'redactly';
import { redactFormat } from 'redactly/winston';
import winston from 'winston';

// IBANs are in the opt-in `gdpr-eu` preset, on top of the default `common` one.
const redactor = createRedactor({ presets: ['common', 'gdpr-eu'] });

const logger = winston.createLogger({
  format: winston.format.combine(redactFormat(redactor), winston.format.json()),
  transports: [new winston.transports.Console()],
});

logger.info('connecting to postgres://admin:s3cr3t@db.example.com/app', {
  apiKey: 'live-key-123',
  iban: 'IT60 X054 2811 1010 0000 0123 456',
});
