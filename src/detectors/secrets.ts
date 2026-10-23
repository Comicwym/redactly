import type { Detector } from '../types.js';

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
}

/** JSON Web Tokens: three base64url segments whose header decodes to a JSON object. */
export const jwt: Detector = {
  name: 'jwt',
  label: 'JWT',
  pattern:
    /\beyJ[A-Za-z0-9_-]{2,8192}\.eyJ[A-Za-z0-9_-]{2,65536}\.[A-Za-z0-9_-]{0,8192}(?![A-Za-z0-9_-])/g,
  validate: (match) => {
    try {
      const header: unknown = JSON.parse(decodeBase64Url(match.slice(0, match.indexOf('.'))));
      return typeof header === 'object' && header !== null;
    } catch {
      return false;
    }
  },
};

/** Credentials after `Bearer` / `Basic`; the scheme itself stays readable. */
export const authHeader: Detector = {
  name: 'auth-header',
  label: 'TOKEN',
  pattern:
    /(?<=\b(?:Bearer|bearer|BEARER|Basic|basic|BASIC)\s{1,10})[A-Za-z0-9._~+/-]{8,8192}={0,2}/g,
  // Real credentials almost always carry a digit or base64 padding; prose ("Basic understanding") doesn't.
  validate: (match) => /[\d=]/.test(match),
};

const SENSITIVE_PARAMS =
  'access_token|refresh_token|id_token|token|api_key|apikey|api-key|key|secret|client_secret|password|passwd|pwd|auth|sig|signature|code';

/** Secrets in URLs: the password in `user:pass@host` and sensitive query parameters. */
export const urlCredentials: Detector = {
  name: 'url-credentials',
  label: 'SECRET',
  pattern: new RegExp(
    `(?<=\\b[a-z][a-z0-9+.-]{0,20}://[^\\s/:@]{1,256}:)[^\\s/@]{1,256}(?=@)|(?<=[?&](?:${SENSITIVE_PARAMS})=)[^\\s&#]{1,8192}`,
    'gi',
  ),
};

/** Narrower than the URL list: in free text, names like `key` or `code` are too common. */
const SENSITIVE_NAMES =
  'password|passwd|pwd|passphrase|secret|client_secret|token|access_token|refresh_token|auth_token|api_key|apikey|api-key|private_key';

/** `password=hunter2`, `token: abc`, `"secret":"x"` inside log messages and stringified JSON. */
export const keyValueSecret: Detector = {
  name: 'key-value-secret',
  label: 'SECRET',
  pattern: new RegExp(
    `(?<=\\b(?:${SENSITIVE_NAMES})["']?\\s{0,3}[:=]\\s{0,3}["']?)(?!\\[)[^\\s"'&,;]{1,8192}`,
    'gi',
  ),
};

export const privateKey: Detector = {
  name: 'private-key',
  label: 'PRIVATE_KEY',
  pattern:
    /-----BEGIN [A-Z ]{0,40}PRIVATE KEY(?: BLOCK)?-----[\s\S]{1,16384}?-----END [A-Z ]{0,40}PRIVATE KEY(?: BLOCK)?-----/g,
};

function apiKey(name: string, pattern: RegExp): Detector {
  return { name, label: 'API_KEY', pattern };
}

/** Well-known provider token formats, recognized by their fixed prefixes. */
export const providerKeys: Detector[] = [
  apiKey('aws-access-key', /\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/g),
  apiKey('github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{22,255})\b/g),
  apiKey('stripe-key', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,247}\b/g),
  apiKey('slack-token', /\bxox[abeprs]-[A-Za-z0-9-]{10,250}/g),
  apiKey('ai-api-key', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,512}/g),
  apiKey('google-api-key', /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/g),
  apiKey('npm-token', /\bnpm_[A-Za-z0-9]{36}\b/g),
];
