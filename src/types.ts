/**
 * A detector finds one kind of sensitive value inside free text.
 */
export interface Detector {
  /** Unique id, e.g. `card` or `github-token`. */
  name: string;
  /** Shown by the `label` mask strategy, e.g. `CARD` becomes `[CARD]`. */
  label: string;
  /**
   * Candidate matcher. The `g` flag is added automatically if missing.
   * Keep every quantifier bounded so the pattern stays linear on hostile input.
   */
  pattern: RegExp;
  /**
   * Confirms a candidate. Return `false` to keep the text as is, `true` to redact
   * the whole match, or a number to redact only that many leading characters.
   */
  validate?: (match: string) => boolean | number;
  /** Custom output for the `partial` mask strategy, e.g. keep the last 4 card digits. */
  partial?: (match: string) => string;
}

export interface MaskContext {
  /** Whether the value was hit by a sensitive key or by a detector. */
  type: 'key' | 'detector';
  /** Detector name, or the matched key as written in the input. */
  name: string;
  /** Detector label, or `REDACTED` for key hits. */
  label: string;
  /** The original value; for key hits it may be any type. */
  original: unknown;
}

export type MaskFn = (value: string, context: MaskContext) => string;

/**
 * - `label` (default): `[EMAIL]`, `[CARD]`… for detectors, `[REDACTED]` for keys
 * - `full`: always `[REDACTED]`
 * - `partial`: keep a hint, e.g. `****1111`, `j***@example.com`
 * - a function for full control
 */
export type MaskStrategy = 'label' | 'full' | 'partial' | MaskFn;

export type PresetName =
  | 'common'
  | 'secrets'
  | 'pci'
  | 'email'
  | 'gdpr-eu'
  | 'network'
  | 'contact'
  | 'all';

export interface RedactorOptions {
  /** Built-in detector sets. Default: `['common']`. Pass `[]` to use only `detectors`. */
  presets?: PresetName[];
  /** Extra detectors; they run before the built-in ones. */
  detectors?: Detector[];
  /** Extra key names whose values are always redacted, whatever they contain. */
  keys?: string[];
  /** Key names to never redact by key (detectors still apply to their values). */
  ignoreKeys?: string[];
  /** Use the built-in sensitive key list (`password`, `token`, `authorization`…). Default: `true`. */
  defaultKeys?: boolean;
  /** How to replace sensitive values. Default: `label`. */
  mask?: MaskStrategy;
  /** Nesting depth after which values become `[MaxDepth]`. Default: `20`. */
  maxDepth?: number;
}

export interface Redactor {
  /** Returns a redacted deep copy of `value`. Never mutates the input and never throws. */
  <T>(value: T): T;
  /** Redacts a single string. */
  string(text: string): string;
}
