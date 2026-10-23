import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    pino: 'src/integrations/pino.ts',
    winston: 'src/integrations/winston.ts',
    console: 'src/integrations/console.ts',
  },
  format: ['esm', 'cjs'],
  target: 'es2022',
  dts: true,
  clean: true,
  // Share the core between entries in CJS too, instead of inlining it into each one.
  splitting: true,
  treeshake: true,
});
