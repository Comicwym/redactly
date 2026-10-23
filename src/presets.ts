import { card } from './detectors/card.js';
import { codiceFiscale } from './detectors/codice-fiscale.js';
import { email } from './detectors/email.js';
import { iban } from './detectors/iban.js';
import { ipv4, ipv6, phone } from './detectors/network.js';
import {
  authHeader,
  jwt,
  keyValueSecret,
  privateKey,
  providerKeys,
  urlCredentials,
} from './detectors/secrets.js';
import type { Detector, PresetName } from './types.js';

const secrets: Detector[] = [
  privateKey,
  jwt,
  urlCredentials,
  keyValueSecret,
  authHeader,
  ...providerKeys,
];

export const presets: Readonly<Record<PresetName, readonly Detector[]>> = {
  secrets,
  pci: [card],
  email: [email],
  'gdpr-eu': [email, iban, codiceFiscale],
  network: [ipv4, ipv6],
  contact: [email, phone],
  common: [...secrets, card, email],
  all: [...secrets, iban, card, codiceFiscale, email, phone, ipv4, ipv6],
};

/**
 * Run order matters: multi-line and structured secrets first, so a JWT is not
 * half-eaten by a looser pattern, and URL passwords go before the email matcher.
 */
const ORDER: readonly Detector[] = presets.all;

export function resolveDetectors(names: readonly PresetName[], custom: readonly Detector[]) {
  const selected = new Set<Detector>();
  for (const name of names) {
    const preset = presets[name];
    if (!preset) throw new TypeError(`redactly: unknown preset "${name}"`);
    for (const d of preset) selected.add(d);
  }
  return [...custom, ...ORDER.filter((d) => selected.has(d))];
}
