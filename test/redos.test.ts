import { describe, expect, it } from 'vitest';
import { createRedactor, presets } from '../src/index.js';

/** Inputs shaped to trigger catastrophic or quadratic backtracking in naive patterns. */
const N = 100_000;
const hostile: Record<string, string> = {
  letters: 'a'.repeat(N),
  digits: '1'.repeat(N),
  spacedDigits: '1 '.repeat(N / 2),
  dashedDigits: '1-'.repeat(N / 2),
  emailLocal: `${'a'.repeat(N)}@`,
  emailDomain: `a@${'a.'.repeat(N / 2)}`,
  atSigns: 'a@'.repeat(N / 2),
  colons: ':'.repeat(N),
  hexColons: 'a:'.repeat(N / 2),
  jwtLike: `eyJ${'a'.repeat(N)}`,
  jwtDots: 'eyJa.'.repeat(N / 5),
  bearer: 'Bearer '.repeat(N / 7),
  pemNoEnd: `-----BEGIN PRIVATE KEY-----${'a'.repeat(N)}`,
  kv: 'token='.repeat(N / 6),
  url: `https://${'a'.repeat(N)}:`,
  ibanLike: `IT60${' A'.repeat(N / 2)}`,
  plus: '+1 '.repeat(N / 3),
  dots: '1.'.repeat(N / 2),
  upper: 'AKIA'.repeat(N / 4),
};

/** Generous for slow CI runners; a backtracking blow-up takes seconds or minutes, not milliseconds. */
const BUDGET_MS = 50;

/**
 * Best of 3 runs: a GC pause or a busy shared runner can stall one run, while catastrophic
 * backtracking is slow every time.
 */
function fastestRunMs(run: () => void): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    run();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

describe('ReDoS safety', () => {
  for (const detector of presets.all) {
    it(`${detector.name} stays linear on hostile input`, () => {
      const r = createRedactor({ presets: [], detectors: [detector] });
      for (const [shape, input] of Object.entries(hostile)) {
        const elapsed = fastestRunMs(() => r.string(input));
        expect(elapsed, `${detector.name} on ${shape} took ${elapsed.toFixed(1)} ms`).toBeLessThan(
          BUDGET_MS,
        );
      }
    });
  }
});
