# Contributing to redactly

Thanks for helping keep logs clean!

## Setup

```bash
npm install
npm test          # unit, integration and ReDoS tests
npm run coverage  # must stay ≥ 95% lines
npm run lint      # Biome
npm run typecheck
npm run build && npm run smoke
npm run bench
```

## Adding a detector

1. Add it under `src/detectors/` and export it from `src/index.ts`.
2. Add it to the right preset(s) in `src/presets.ts`. Order matters: structured secrets run before looser patterns.
3. **Bound every quantifier** (`{1,64}`, not `+`), avoid nested quantifiers, and prefer a `validate` function (checksum, length, decoding) over a cleverer regex. `test/redos.test.ts` runs every built-in detector on hostile 100k-character inputs automatically.
4. Add true positive and false positive tests in `test/detectors.test.ts`.
5. If it should be on by default, explain the false positive rate in the PR.

## Test data

Never commit anything that looks like a real credential. Build provider tokens at runtime by joining fragments (see `test/fixtures.ts`), so secret scanners such as GitHub push protection do not flag the repository.

## Releases

Every user-facing change needs a changeset:

```bash
npx changeset
```

Merging to `main` opens a "Version Packages" PR; merging that PR publishes to npm with provenance.

## Code of conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).
