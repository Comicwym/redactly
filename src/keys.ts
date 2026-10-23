/** `API-Key`, `api_key` and `apiKey` all normalize to `apikey`. */
export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Keys redacted on exact (normalized) match. */
export const DEFAULT_KEYS: readonly string[] = [
  'password',
  'passwd',
  'pwd',
  'pass',
  'passphrase',
  'secret',
  'clientsecret',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'authtoken',
  'apikey',
  'apisecret',
  'auth',
  'authorization',
  'proxyauthorization',
  'cookie',
  'setcookie',
  'session',
  'sessionid',
  'credentials',
  'privatekey',
  'secretkey',
  'accesskey',
  'secretaccesskey',
  'xapikey',
  'xauthtoken',
  'csrftoken',
  'xcsrftoken',
  'xsrftoken',
  'xxsrftoken',
  'otp',
  'pin',
  'cvv',
  'cvc',
  'ssn',
  'creditcard',
  'cardnumber',
];

/** Keys redacted when the normalized key ends with one of these, e.g. `dbPassword`, `githubToken`. */
const SUFFIXES: readonly string[] = [
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'privatekey',
  'secretkey',
  'accesskey',
];

export type KeyMatcher = (key: string) => boolean;

export function createKeyMatcher(
  extra: readonly string[] = [],
  ignore: readonly string[] = [],
  useDefaults = true,
): KeyMatcher {
  const exact = new Set(extra.map(normalizeKey));
  if (useDefaults) for (const key of DEFAULT_KEYS) exact.add(key);
  const ignored = new Set(ignore.map(normalizeKey));
  const suffixes = useDefaults ? SUFFIXES : [];
  const cache = new Map<string, boolean>();

  return (key) => {
    let hit = cache.get(key);
    if (hit === undefined) {
      const k = normalizeKey(key);
      hit = !ignored.has(k) && (exact.has(k) || suffixes.some((s) => k.endsWith(s)));
      // Log keys repeat a lot; cap the cache so hostile input can't grow it forever.
      if (cache.size < 1000) cache.set(key, hit);
    }
    return hit;
  };
}
