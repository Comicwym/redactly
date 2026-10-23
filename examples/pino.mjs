// npm run build && node examples/pino.mjs
import pino from 'pino';
import { pinoOptions } from 'redactly/pino';

const logger = pino({ ...pinoOptions() });

logger.info(
  {
    user: { email: 'mario.rossi@example.com', password: 'hunter2' },
    headers: { authorization: 'Bearer abc123def456ghi789' },
  },
  'checkout with card 4111 1111 1111 1111',
);
logger.error(new Error('payment failed for mario.rossi@example.com'));
