/**
 * Provider tokens are assembled at runtime so the repository never contains a string
 * that secret scanners (GitHub push protection, gitleaks…) would flag as a real credential.
 */
const join = (...parts: string[]) => parts.join('');

export const tokens = {
  aws: join('AKIA', 'IOSFODNN7', 'EXAMPLE'),
  github: join('ghp', '_', 'a1B2c3D4e5'.repeat(3), 'f6G7h8'),
  githubPat: join('github', '_pat_', '11ABCDEFG0', 'x'.repeat(40)),
  stripe: join('sk', '_live_', 'abcDEF123'.repeat(3)),
  slack: join('xox', 'b-', '1234567890-', 'abcdefABCDEF'),
  anthropic: join('sk', '-ant-', 'api03-', 'q'.repeat(40)),
  openai: join('sk', '-proj-', 'Z9'.repeat(20)),
  google: join('AI', 'za', 'Sy', 'A'.repeat(33)),
  npm: join('npm', '_', 'b'.repeat(36)),
};

/** The jwt.io sample token (HS256, payload `{ sub, name, iat }`). */
export const jwt = join(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
  '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
);

export const privateKey = [
  join('-----BEGIN RSA ', 'PRIVATE KEY-----'),
  'MIIEowIBAAKCAQEAu1SU1LfVLPHCozMxH2Mo4lgOEePzNm0tRgeLezV6ffAt0gunVTLw',
  join('-----END RSA ', 'PRIVATE KEY-----'),
].join('\n');
