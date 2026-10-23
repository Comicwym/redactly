import { describe, expect, it } from 'vitest';
import {
  createRedactor,
  isValidCodiceFiscale,
  isValidIban,
  isValidIpv6,
  luhn,
} from '../src/index.js';
import { jwt, privateKey, tokens } from './fixtures.js';

const all = createRedactor({ presets: ['all'] });
const r = (text: string) => all.string(text);

describe('card', () => {
  it.each([
    ['4111 1111 1111 1111', 'visa, spaced'],
    ['4111-1111-1111-1111', 'visa, dashed'],
    ['5555555555554444', 'mastercard'],
    ['378282246310005', 'amex, 15 digits'],
  ])('redacts %s (%s)', (number) => {
    expect(r(`paid with ${number} today`)).toBe('paid with [CARD] today');
  });

  it('ignores numbers that fail Luhn', () => {
    expect(r('order 4111 1111 1111 1112')).toBe('order 4111 1111 1111 1112');
    expect(luhn('4111111111111112')).toBe(false);
  });

  it('keeps trailing digit groups that are not part of the card', () => {
    expect(r('card 4111 1111 1111 1111 12 end')).toBe('card [CARD] 12 end');
  });

  it('ignores short numbers and timestamps', () => {
    expect(r('id 123456789012 at 1716239022')).toBe('id 123456789012 at 1716239022');
  });
});

describe('iban', () => {
  it.each([
    'IT60 X054 2811 1010 0000 0123 456',
    'IT60X0542811101000000123456',
    'GB82 WEST 1234 5698 7654 32',
    'DE89 3704 0044 0532 0130 00',
  ])('redacts %s', (value) => {
    expect(r(`iban: ${value}.`)).toBe('iban: [IBAN].');
  });

  it('rejects a wrong checksum or length', () => {
    expect(isValidIban('IT60 X054 2811 1010 0000 0123 457')).toBe(false);
    expect(isValidIban('IT60 X054 2811 1010 0000 0123 45')).toBe(false);
    expect(isValidIban('ZZ60X0542811101000000123456')).toBe(false);
  });

  it('does not swallow a following uppercase word', () => {
    expect(r('send to DE89370400440532013000 EUR')).toBe('send to [IBAN] EUR');
  });
});

describe('email', () => {
  it('redacts common forms', () => {
    expect(r('contact mario.rossi+test@example.co.uk now')).toBe('contact [EMAIL] now');
    expect(r('<a@b.io>')).toBe('<[EMAIL]>');
  });

  it('ignores handles and hosts without a TLD', () => {
    expect(r('ping @mario or root@localhost')).toBe('ping @mario or root@localhost');
  });
});

describe('codice fiscale', () => {
  it('redacts valid codes, including lowercase', () => {
    expect(r('CF RSSMRA85T10A562S ok')).toBe('CF [CODICE_FISCALE] ok');
    expect(r('cf rssmra85t10a562s')).toBe('cf [CODICE_FISCALE]');
  });

  it('accepts omocodia variants with a matching check char', () => {
    // Omocodia replaces digits from the right: last digit 2 -> N, check char becomes H.
    expect(isValidCodiceFiscale('RSSMRA85T10A56NH')).toBe(true);
    expect(r('cf RSSMRA85T10A56NH')).toBe('cf [CODICE_FISCALE]');
  });

  it('rejects a wrong check character', () => {
    expect(r('RSSMRA85T10A562T')).toBe('RSSMRA85T10A562T');
  });
});

describe('secrets', () => {
  it('redacts JWTs', () => {
    expect(r(`token ${jwt} expired`)).toBe('token [JWT] expired');
  });

  it('ignores eyJ strings whose header is not JSON', () => {
    const fake = 'eyJnotreallyjson.eyJabcdefgh.signature';
    expect(r(fake)).toBe(fake);
  });

  it('redacts Bearer and Basic credentials but keeps the scheme', () => {
    expect(r('Authorization: Bearer abc123def456ghi789')).toBe('Authorization: Bearer [TOKEN]');
    expect(r('Authorization: Basic dXNlcjpwYXNzd29yZA==')).toBe('Authorization: Basic [TOKEN]');
  });

  it('leaves prose after Basic/Bearer alone', () => {
    const text = 'Basic understanding of Bearer semantics';
    expect(r(text)).toBe(text);
  });

  it('redacts passwords in connection strings', () => {
    expect(r('postgres://admin:s3cr3t@db.example.com:5432/app')).toBe(
      'postgres://admin:[SECRET]@db.example.com:5432/app',
    );
  });

  it('redacts sensitive query parameters', () => {
    expect(r('GET https://api.example.com/v1?api_key=abcd1234&user=bob')).toBe(
      'GET https://api.example.com/v1?api_key=[SECRET]&user=bob',
    );
  });

  it('redacts key=value and stringified JSON secrets', () => {
    expect(r('login failed password=hunter2 user=bob')).toBe(
      'login failed password=[SECRET] user=bob',
    );
    expect(r('{"user":"bob","secret":"hunter2"}')).toBe('{"user":"bob","secret":"[SECRET]"}');
    expect(r("api-key: 'xyz987'")).toBe("api-key: '[SECRET]'");
  });

  it('redacts PEM private keys', () => {
    expect(r(`key:\n${privateKey}\nend`)).toBe('key:\n[PRIVATE_KEY]\nend');
  });

  it.each(Object.entries(tokens))('redacts %s tokens', (_name, token) => {
    expect(r(`using ${token} now`)).toBe('using [API_KEY] now');
  });
});

describe('network and contact', () => {
  it('redacts IPv4 but not version strings', () => {
    expect(r('client 192.168.1.10 connected')).toBe('client [IP] connected');
    expect(r('version 1.2.3.4.5 and 999.1.1.1')).toBe('version 1.2.3.4.5 and 999.1.1.1');
  });

  it('redacts IPv6', () => {
    expect(r('from 2001:db8::ff00:42:8329 and fe80::1')).toBe('from [IP] and [IP]');
    expect(r('full 2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('full [IP]');
  });

  it('ignores times and hex words that look like IPv6 candidates', () => {
    expect(r('at 12:30:45 cafe deadbeef')).toBe('at 12:30:45 cafe deadbeef');
    expect(isValidIpv6('1::2::3')).toBe(false);
    expect(isValidIpv6('1:2:3:4:5:6:7:8:9')).toBe(false);
  });

  it('redacts international phone numbers', () => {
    expect(r('call +39 333 123 4567 now')).toBe('call [PHONE] now');
    expect(r('call +1 (555) 123-4567')).toBe('call [PHONE]');
  });

  it('ignores short + numbers', () => {
    expect(r('score +12 34')).toBe('score +12 34');
  });
});
