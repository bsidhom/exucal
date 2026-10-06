// The cases of the cost search (docs/calculator-plan.md, task 8.2): what
// it draws, as a pure function of a seed. Nothing here measures or reads a
// clock, so the sequence a seed gives is the same on any machine, in any
// order, and whatever the cases cost.
//
// A seed is a key of the shared random source (src/testing/random.ts),
// two 32-bit words, written as sixteen hexadecimal digits. The `i`-th case
// is drawn from `foldIn(seed, i)` alone: its parts are drawn in a fixed
// order from keys folded in from that one, so drawing it alone or as part
// of the sequence gives the same case. The weights are fixed here.
//
// A case is a text that never certifies, so that the retry loop runs to
// the ceiling, wrapped in the settings and the want it is evaluated
// under. The patterns are:
//
// - `cancel`: a call less itself, `f(a) - f(a)`, exactly zero and never
//   certified, since the two balls are independent.
// - `identity`: an identity between different functions, from the table
//   `IDENTITIES`, `beta(a, b) - gamma(a) gamma(b) / gamma(a + b)` and the
//   like. Free composition almost never gives an exact cancellation
//   between different functions, the class #117 found, so the table is
//   where they come from; it grows with the built-ins.
// - `edge`: a value that never certifies at an edge where a built-in's
//   result jumps or does not exist: `floor(z + 3)`, `round(z + 2.5)`,
//   `sign(z)`, `1 / (z)`, for a zero `z` of one of the two kinds above,
//   which the retry loop retries to the ceiling and then refuses.
// - `condition`: a zero below a condition's bound, `tempC(z - 273.15)`,
//   which the call assumes at every pass and warns of at the end.
//
// A call's arguments are drawn from classes (`ArgClass`): exact with a
// short or a long expansion, inexact (`approx`), large, small. A pool per
// domain gives the values of each class, so that a class means the same
// thing for every function that takes the domain; an argument may instead
// be a costly call itself (`composed`), whose value lies in the domain.
//
// A case belongs to a family: its pattern, the functions it calls, its
// argument classes and its settings profile. The catalogue keeps the
// costliest case of each family (catalogue.ts).

import {
  DEFAULT_MODES,
  isIntegerIn,
  rangesOf,
  type Settings,
} from "../../src/settings.ts";
import { DEFAULT_SETTINGS } from "../../src/settings.ts";
import { DEFAULT_MAX_BITS, maxDigitsFor } from "../../src/core/context.ts";
import { LIMIT_BITS } from "../../src/core/rational.ts";
import {
  between,
  foldIn,
  split,
  uniform,
  type Key,
} from "../../src/testing/random.ts";
import type { Case } from "./harness.ts";

// ---------------------------------------------------------------------------
// Types

/** The patterns that force the ceiling, as the module header describes them. */
export type Pattern = "cancel" | "identity" | "edge" | "condition";

/** A class of arguments: what a value is, whatever the function. */
export type ArgClass = "exact" | "long" | "inexact" | "large" | "small";

/** What a function's argument may be. */
type Domain =
  "real" | "pos" | "order" | "unit" | "openunit" | "geone" | "angle";

/** What a text denotes: a plain number, an angle, or a temperature. */
type Kind = "plain" | "angle" | "temperature";

/**
 * A case's family: the pattern (with the identity's name or the edge's
 * operation), the costly functions it calls, the argument classes it
 * draws from, and the settings profile, each list sorted.
 */
export type Family = {
  readonly pattern: string;
  readonly functions: readonly string[];
  readonly classes: readonly string[];
  readonly profile: string;
};

/** A drawn case: the case itself, its family, and how many costly calls a pass makes. */
export type Drawn = {
  readonly case: Case;
  readonly family: Family;
  readonly calls: number;
};

// ---------------------------------------------------------------------------
// Seeds

/** `key` as sixteen hexadecimal digits, its two words in order. */
export function formatSeed(key: Key): string {
  return key.map((word) => (word >>> 0).toString(16).padStart(8, "0")).join("");
}

/** The key sixteen hexadecimal digits write. */
export function parseSeed(text: string): Key {
  if (!/^[0-9a-f]{16}$/i.test(text)) {
    throw new RangeError(`A seed is sixteen hexadecimal digits: ${text}`);
  }
  return [
    parseInt(text.slice(0, 8), 16) >>> 0,
    parseInt(text.slice(8), 16) >>> 0,
  ];
}

/**
 * The seed of a run: `given`, parsed, or, without one, a fresh key drawn
 * from the cryptographic source, which the run prints and records.
 */
export function chooseSeed(given?: string): {
  readonly key: Key;
  readonly text: string;
  readonly fresh: boolean;
} {
  if (given !== undefined) {
    const key = parseSeed(given);
    return { key, text: formatSeed(key), fresh: false };
  }
  const words = crypto.getRandomValues(new Uint32Array(2));
  const key: Key = [words[0]!, words[1]!];
  return { key, text: formatSeed(key), fresh: true };
}

// ---------------------------------------------------------------------------
// The tables

/** Values of each class, per domain; a class a domain lacks falls back to `exact`. */
const POOLS: Readonly<
  Record<
    Domain,
    Readonly<Partial<Record<Exclude<ArgClass, "inexact">, readonly string[]>>>
  >
> = {
  real: {
    exact: ["0.3", "2.5", "-1.5", "1/3", "7"],
    long: ["0.1234567890123456789", "-2.718281828459045", "355/113"],
    large: ["40.5", "-40.5", "300.25"],
    small: ["1e-5", "-0.001"],
  },
  pos: {
    exact: ["0.3", "0.5", "2.5", "1/3", "7"],
    long: ["0.1234567890123456789", "2.718281828459045", "355/113"],
    large: ["100.5", "2500.25", "123456.5"],
    small: ["0.001", "1e-5"],
  },
  order: {
    exact: ["0.5", "2.5", "7"],
    long: ["2.718281828459045", "1/3"],
    large: ["150.5", "500"],
    small: ["0.01"],
  },
  unit: {
    exact: ["0.3", "0.5", "1/3"],
    long: ["0.1234567890123456789"],
    large: ["0.999"],
    small: ["0.001"],
  },
  openunit: {
    exact: ["0.3", "-0.5", "1/3"],
    long: ["0.1234567890123456789"],
    large: ["0.999", "-0.999"],
    small: ["1e-5"],
  },
  geone: {
    exact: ["1.5", "2", "7.5"],
    long: ["2.718281828459045"],
    large: ["12345.5"],
    small: ["1.001"],
  },
  angle: {
    exact: ["0.3", "2.5", "-1.5", "1/3", "7"],
    long: ["0.1234567890123456789", "355/113"],
    large: ["40.5", "1000.25"],
    small: ["1e-5"],
  },
};

/** The classes, with their weights. */
const CLASSES: readonly (readonly [number, ArgClass])[] = [
  [4, "exact"],
  [2, "long"],
  [4, "inexact"],
  [1, "large"],
  [1, "small"],
];

/** A built-in the search calls: its argument domains, what it gives, its weight. */
type FunctionSpec = {
  readonly name: string;
  readonly args: readonly Domain[];
  readonly result: Kind;
  readonly weight: number;
};

/**
 * The built-ins the search calls, weighted toward the families that cost
 * seconds at the ceiling. The exact functions (`floor`, `gcd` and their
 * kin) are cheap on any argument and appear only as the edges of the
 * `edge` pattern.
 */
const FUNCTIONS: readonly FunctionSpec[] = [
  { name: "digamma", args: ["real"], result: "plain", weight: 3 },
  { name: "lgamma", args: ["real"], result: "plain", weight: 3 },
  { name: "gamma", args: ["real"], result: "plain", weight: 3 },
  { name: "beta", args: ["pos", "pos"], result: "plain", weight: 3 },
  { name: "lowergamma", args: ["order", "pos"], result: "plain", weight: 3 },
  { name: "uppergamma", args: ["order", "pos"], result: "plain", weight: 3 },
  { name: "lowergammareg", args: ["order", "pos"], result: "plain", weight: 3 },
  { name: "uppergammareg", args: ["order", "pos"], result: "plain", weight: 3 },
  { name: "erf", args: ["real"], result: "plain", weight: 3 },
  { name: "erfc", args: ["real"], result: "plain", weight: 3 },
  { name: "incbeta", args: ["pos", "pos", "unit"], result: "plain", weight: 3 },
  {
    name: "incbetareg",
    args: ["pos", "pos", "unit"],
    result: "plain",
    weight: 3,
  },
  { name: "exp", args: ["real"], result: "plain", weight: 1 },
  { name: "ln", args: ["pos"], result: "plain", weight: 1 },
  { name: "log10", args: ["pos"], result: "plain", weight: 1 },
  { name: "log2", args: ["pos"], result: "plain", weight: 1 },
  { name: "log", args: ["pos", "pos"], result: "plain", weight: 1 },
  { name: "sqrt", args: ["pos"], result: "plain", weight: 1 },
  { name: "cbrt", args: ["real"], result: "plain", weight: 1 },
  { name: "pow", args: ["pos", "real"], result: "plain", weight: 1 },
  { name: "sin", args: ["angle"], result: "plain", weight: 1 },
  { name: "cos", args: ["angle"], result: "plain", weight: 1 },
  { name: "tan", args: ["angle"], result: "plain", weight: 1 },
  { name: "asin", args: ["openunit"], result: "angle", weight: 1 },
  { name: "acos", args: ["openunit"], result: "angle", weight: 1 },
  { name: "atan", args: ["real"], result: "angle", weight: 1 },
  { name: "atan2", args: ["real", "real"], result: "angle", weight: 1 },
  { name: "sinh", args: ["real"], result: "plain", weight: 1 },
  { name: "cosh", args: ["real"], result: "plain", weight: 1 },
  { name: "tanh", args: ["real"], result: "plain", weight: 1 },
  { name: "asinh", args: ["real"], result: "plain", weight: 1 },
  { name: "acosh", args: ["geone"], result: "plain", weight: 1 },
  { name: "atanh", args: ["openunit"], result: "plain", weight: 1 },
];

/**
 * The calls whose value lies in a domain, for an argument composed of a
 * costly call: positive for `pos`, `order` and `real`, within (0, 1) for
 * the unit domains, at least one for `geone`; an angle takes a positive
 * one in radians.
 */
const PRODUCERS: Readonly<Record<Domain, readonly FunctionSpec[]>> = (() => {
  const named = (...names: string[]) =>
    names.map((name) => FUNCTIONS.find((f) => f.name === name)!);
  const positive = named("gamma", "beta", "exp", "erfc", "cosh", "lowergamma");
  const fraction = named("lowergammareg", "incbetareg");
  return {
    real: positive,
    pos: positive,
    order: positive,
    angle: positive,
    unit: fraction,
    openunit: fraction,
    geone: named("cosh"),
  };
})();

/**
 * An identity: a text over the variables in `vars`, each with its domain,
 * that is exactly zero for every value of them in their domains, and what
 * it denotes.
 */
type Identity = {
  readonly name: string;
  readonly vars: Readonly<Record<string, Domain>>;
  readonly text: string;
  readonly result: Kind;
};

/** The identities between different functions, each exactly zero. */
export const IDENTITIES: readonly Identity[] = [
  {
    name: "beta-gamma",
    vars: { a: "pos", b: "pos" },
    text: "beta(a, b) - gamma(a) gamma(b) / gamma(a + b)",
    result: "plain",
  },
  {
    name: "beta-lgamma",
    vars: { a: "pos", b: "pos" },
    text: "beta(a, b) - exp(lgamma(a) + lgamma(b) - lgamma(a + b))",
    result: "plain",
  },
  {
    name: "gamma-recurrence",
    vars: { x: "pos" },
    text: "gamma(x + 1) - x gamma(x)",
    result: "plain",
  },
  {
    name: "digamma-recurrence",
    vars: { x: "pos" },
    text: "digamma(x + 1) - digamma(x) - 1 / x",
    result: "plain",
  },
  {
    name: "lgamma-gamma",
    vars: { x: "pos" },
    text: "lgamma(x) - ln(gamma(x))",
    result: "plain",
  },
  {
    name: "gamma-half-pi",
    vars: {},
    text: "gamma(1/2)^2 - pi()",
    result: "plain",
  },
  {
    name: "beta-half-pi",
    vars: {},
    text: "beta(0.5, 0.5) - pi()",
    result: "plain",
  },
  {
    name: "erf-erfc",
    vars: { x: "real" },
    text: "erf(x) + erfc(x) - 1",
    result: "plain",
  },
  {
    name: "erfc-uppergammareg",
    vars: { x: "pos" },
    text: "erfc(x) - uppergammareg(1/2, x^2)",
    result: "plain",
  },
  {
    name: "gammareg-sum",
    vars: { a: "order", x: "pos" },
    text: "lowergammareg(a, x) + uppergammareg(a, x) - 1",
    result: "plain",
  },
  {
    name: "gamma-split",
    vars: { a: "order", x: "pos" },
    text: "lowergamma(a, x) + uppergamma(a, x) - gamma(a)",
    result: "plain",
  },
  {
    name: "incbetareg-reflection",
    vars: { a: "pos", b: "pos", x: "unit" },
    text: "incbetareg(a, b, x) + incbetareg(b, a, 1 - x) - 1",
    result: "plain",
  },
  {
    name: "incbeta-incbetareg",
    vars: { a: "pos", b: "pos", x: "unit" },
    text: "incbeta(a, b, x) - incbetareg(a, b, x) beta(a, b)",
    result: "plain",
  },
  {
    name: "exp-ln",
    vars: { x: "pos" },
    text: "exp(ln(x)) - x",
    result: "plain",
  },
  {
    name: "log-quotient",
    vars: { b: "pos", x: "pos" },
    text: "log(b, x) - ln(x) / ln(b)",
    result: "plain",
  },
  {
    name: "pythagoras",
    vars: { x: "angle" },
    text: "sin(x)^2 + cos(x)^2 - 1",
    result: "plain",
  },
  {
    name: "hyperbolic",
    vars: { x: "real" },
    text: "cosh(x)^2 - sinh(x)^2 - 1",
    result: "plain",
  },
  {
    name: "asinh-ln",
    vars: { x: "real" },
    text: "asinh(x) - ln(x + sqrt(x^2 + 1))",
    result: "plain",
  },
  {
    name: "atan-reciprocal",
    vars: { x: "pos" },
    text: "atan(x) + atan(1 / x) - pi() radian / 2",
    result: "angle",
  },
];

/** The edges of the `edge` pattern, each a text around a zero `z`. */
const EDGES: readonly (readonly [string, (z: string) => string])[] = [
  ["floor", (z) => `floor(${z} + 3)`],
  ["round", (z) => `round(${z} + 2.5)`],
  ["sign", (z) => `sign(${z})`],
  ["divide", (z) => `1 / (${z})`],
];

/** The patterns, with their weights. */
const PATTERNS: readonly (readonly [number, Pattern])[] = [
  [4, "cancel"],
  [4, "identity"],
  [1, "edge"],
  [1, "condition"],
];

/** A named setting profile, with its weight. */
type Profile = { readonly name: string; readonly settings: Settings };

/**
 * The settings profiles, with their weights: the defaults most of all,
 * then the highest cap the default range limit allows, more digits, the
 * decimal mode, the fractions display, and the extreme settings, the range
 * limit's hard bound with the cap it allows, where cases are expected to
 * pass their deadline.
 */
const PROFILES: readonly (readonly [number, Profile])[] = [
  [12, { name: "default", settings: DEFAULT_SETTINGS }],
  [2, { name: "digits32", settings: { ...DEFAULT_SETTINGS, digits: 32 } }],
  [
    4,
    {
      name: "maxcap",
      settings: {
        ...DEFAULT_SETTINGS,
        maxDigits: maxDigitsFor(DEFAULT_MAX_BITS),
      },
    },
  ],
  [
    1,
    {
      name: "decimal",
      settings: { ...DEFAULT_SETTINGS, mode: DEFAULT_MODES.decimal },
    },
  ],
  [
    1,
    {
      name: "fractions",
      settings: {
        ...DEFAULT_SETTINGS,
        mode: { kind: "exact", notation: "ratio" },
      },
    },
  ],
  [
    1,
    {
      name: "extreme",
      settings: {
        ...DEFAULT_SETTINGS,
        maxBits: LIMIT_BITS,
        maxDigits: maxDigitsFor(LIMIT_BITS),
      },
    },
  ],
];

/** The wants for each kind of value, with their weights. */
const WANTS: Readonly<Record<Kind, readonly (readonly [number, string])[]>> = {
  plain: [
    [9, ""],
    [1, "1"],
  ],
  angle: [
    [8, ""],
    [2, "deg"],
  ],
  temperature: [
    [6, ""],
    [2, "K"],
    [1, "tempF"],
  ],
};

/** The defined functions and wrappers that cost nothing worth counting as a call. */
const NOT_COUNTED = new Set([
  "approx",
  "pi",
  "tempC",
  "tempF",
  "floor",
  "round",
  "sign",
]);

// ---------------------------------------------------------------------------
// Drawing

/** One of `items`, by weight, drawn from `key`. */
function pick<T>(key: Key, items: readonly (readonly [number, T])[]): T {
  const total = items.reduce((sum, [weight]) => sum + weight, 0);
  let r = uniform(key) * total;
  for (const [weight, item] of items) {
    if (r < weight) return item;
    r -= weight;
  }
  return items[items.length - 1]![1];
}

/** One of `items`, uniformly, drawn from `key`. */
function choose<T>(key: Key, items: readonly T[]): T {
  return items[between(key, 0, items.length - 1)]!;
}

/** A stream of keys from one: the `n`-th is `foldIn(key, n)`, taken in order. */
function stream(key: Key): () => Key {
  let n = 0;
  return () => foldIn(key, n++);
}

/** What a part of a case is: its text, its kind, and the argument classes it drew. */
type Part = {
  readonly text: string;
  readonly kind: Kind;
  readonly classes: string[];
};

/** A value of `domain` in `cls`, as text an argument can hold. */
function valueOf(next: () => Key, domain: Domain, cls: ArgClass): string {
  const pools = POOLS[domain];
  const base = cls === "inexact" ? undefined : pools[cls];
  const values = base ?? pools.exact!;
  const value = choose(next(), values);
  const drawn = cls === "inexact" ? `approx(${value})` : value;
  if (domain !== "angle") return drawn;
  return /[ /]/.test(drawn) ? `(${drawn}) radian` : `${drawn} radian`;
}

/**
 * An argument of `domain`: a value of a drawn class, or, when `compose`
 * allows and the draw says so, a costly call whose value lies in the
 * domain, its own arguments exact.
 */
function argumentOf(next: () => Key, domain: Domain, compose: boolean): Part {
  if (compose && uniform(next()) < 0.2) {
    const producer = choose(next(), PRODUCERS[domain]);
    const inner = callOf(next, producer, false, "exact");
    const text = domain === "angle" ? `${inner.text} radian` : inner.text;
    return { text, kind: "plain", classes: ["composed", ...inner.classes] };
  }
  const cls = pick(next(), CLASSES);
  return { text: valueOf(next, domain, cls), kind: "plain", classes: [cls] };
}

/**
 * A call of `fn`, its arguments drawn, or all of class `only` when given;
 * `compose` lets an argument be a costly call.
 */
function callOf(
  next: () => Key,
  fn: FunctionSpec,
  compose: boolean,
  only?: ArgClass,
): Part {
  const parts = fn.args.map((domain) =>
    only === undefined
      ? argumentOf(next, domain, compose)
      : {
          text: valueOf(next, domain, only),
          kind: "plain" as const,
          classes: [only],
        },
  );
  return {
    text: `${fn.name}(${parts.map((p) => p.text).join(", ")})`,
    kind: fn.result,
    classes: parts.flatMap((p) => p.classes),
  };
}

/** `identity` with each variable a drawn value in parentheses, or all of class `only`. */
function identityOf(
  next: () => Key,
  identity: Identity,
  only?: ArgClass,
): Part {
  const classes: string[] = [];
  const values = new Map<string, string>();
  for (const [name, domain] of Object.entries(identity.vars)) {
    const cls = only ?? pick(next(), CLASSES);
    classes.push(cls);
    values.set(name, valueOf(next, domain, cls));
  }
  const text = identity.text.replace(
    /\b([a-z])\b(?!\()/g,
    (m, _name: string, offset: number, whole: string) => {
      const value = values.get(m);
      if (value === undefined) return m;
      // A whole argument of a call needs no parentheses; elsewhere a value
      // with a sign, a quotient or a space in it does, since `x gamma(x)`
      // with `1/3` would read as `1/(3 gamma(1/3))`, and `x^2` with `-1.5`
      // as `-(1.5^2)`.
      const before = whole.slice(0, offset);
      const after = whole.slice(offset + m.length);
      const argument = /(\(|, )$/.test(before) && /^(\)|,)/.test(after);
      return argument || !/^-|[/ ]/.test(value) ? value : `(${value})`;
    },
  );
  return { text, kind: identity.result, classes };
}

/** `part` as a plain number: an angle divided by the radian. */
function plain(part: Part): Part {
  return part.kind === "angle"
    ? { ...part, text: `(${part.text}) / radian`, kind: "plain" }
    : part;
}

/** A zero that never certifies: a call less itself, or an identity. */
function zeroOf(next: () => Key): { part: Part; pattern: string } {
  if (uniform(next()) < 0.5) {
    const call = callOf(next, pickFunction(next()), true);
    return {
      part: { ...call, text: `${call.text} - ${call.text}` },
      pattern: "cancel",
    };
  }
  const identity = choose(next(), IDENTITIES);
  return {
    part: identityOf(next, identity),
    pattern: `identity:${identity.name}`,
  };
}

function pickFunction(key: Key): FunctionSpec {
  return pick(
    key,
    FUNCTIONS.map((f) => [f.weight, f] as const),
  );
}

/** The functions a text calls that cost something, each once, sorted. */
export function costlyCalls(text: string): { names: string[]; count: number } {
  const names: string[] = [];
  for (const match of text.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\(/g)) {
    const name = match[1]!;
    if (!NOT_COUNTED.has(name)) names.push(name);
  }
  return {
    names: [...new Set(names)].sort(),
    count: Math.max(1, names.length),
  };
}

/** A drawn case from its parts. */
function drawnOf(
  part: Part,
  pattern: string,
  profile: Profile,
  want: string,
): Drawn {
  const calls = costlyCalls(part.text);
  return {
    case: { have: part.text, want, settings: profile.settings },
    family: {
      pattern,
      functions: calls.names,
      classes: [...new Set(part.classes)].sort(),
      profile: profile.name,
    },
    calls: calls.count,
  };
}

/** The `index`-th case of `seed`'s sequence, drawn from `foldIn(seed, index)` alone. */
export function drawCase(seed: Key, index: number): Drawn {
  const [patternKey, bodyKey, profileKey, wantKey] = split(
    foldIn(seed, index),
    4,
  );
  const pattern = pick(patternKey!, PATTERNS);
  const next = stream(bodyKey!);
  let part: Part;
  let name: string;
  switch (pattern) {
    case "cancel": {
      const call = callOf(next, pickFunction(next()), true);
      part = { ...call, text: `${call.text} - ${call.text}` };
      name = "cancel";
      break;
    }
    case "identity": {
      const identity = choose(next(), IDENTITIES);
      part = identityOf(next, identity);
      name = `identity:${identity.name}`;
      break;
    }
    case "edge": {
      const zero = zeroOf(next);
      const [edge, wrap] = choose(next(), EDGES);
      const z = plain(zero.part);
      part = { ...z, text: wrap(z.text) };
      name = `edge:${edge}/${zero.pattern}`;
      break;
    }
    case "condition": {
      const zero = zeroOf(next);
      const z = plain(zero.part);
      part = { ...z, text: `tempC(${z.text} - 273.15)`, kind: "temperature" };
      name = `condition/${zero.pattern}`;
      break;
    }
  }
  const profile = pick(profileKey!, PROFILES);
  const want = pick(wantKey!, WANTS[part.kind]);
  return drawnOf(part, name, profile, want);
}

/** The first `count` cases of `seed`'s sequence. */
export function listCases(seed: Key, count: number): Drawn[] {
  return Array.from({ length: count }, (_, i) => drawCase(seed, i));
}

/** A case as one line of `--list`: its index, profile, texts and family's pattern. */
export function describeCase(index: number, drawn: Drawn): string {
  const want = drawn.case.want === "" ? "" : `  into  ${drawn.case.want}`;
  return `${index}\t${drawn.family.profile}\t${drawn.family.pattern}\t${drawn.case.have}${want}`;
}

/** Whether the settings of every profile are ones the panel could hold. */
export function profilesValid(): boolean {
  return PROFILES.every(([, { settings }]) => {
    const ranges = rangesOf(settings);
    return (
      isIntegerIn(settings.maxDigits, ranges.maxDigits) &&
      isIntegerIn(settings.digits, ranges.digits)
    );
  });
}
