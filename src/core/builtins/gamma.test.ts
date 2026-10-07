import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_SIGNIFICAND_LIMIT_BITS,
  DEFAULT_ROUNDING,
  ceilingContext,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { DIMENSIONLESS, primitive } from "../dimension.ts";
import { show } from "../display.ts";
import { evaluateText } from "../pipeline.ts";
import { UNBOUNDED } from "../radius.ts";
import { rational } from "../rational.ts";
import { ROUNDING_MODES } from "../rounding.ts";
import { equals, fromRational } from "../scaled.ts";
import { error, value } from "../../testing/builtins.ts";
import type { BuiltinError } from "../builtin.ts";
import type { Result } from "../result.ts";
import { contains } from "../../testing/edges.ts";
import { ball, dec } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import {
  digamma,
  digammaBall,
  gamma,
  gammaBall,
  lgamma,
  lgammaBall,
} from "./gamma.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  significandLimitBits: DEFAULT_SIGNIFICAND_LIMIT_BITS,
  ceiling: DEFAULT_CEILING,
};

type BallFunction = (
  x: Ball,
  context: NumberContext,
) => Result<Ball, BuiltinError>;

/** `fn(x)` at forty digits, shown. */
function shownOf(
  fn: BallFunction,
  x: Ball,
  context: NumberContext = CONTEXT,
): string {
  const shown = show(value(fn(x, context)), {
    digits: context.precision,
    rounding: context.rounding,
  });
  return `${shown.kind === "exact" ? "=" : "≈"} ${shown.text}${shown.kind === "certified" || shown.kind === "exact" ? "" : ` [${shown.kind}]`}`;
}

/** `digamma(x)` at forty digits, shown. */
function psi(x: Ball, context: NumberContext = CONTEXT): string {
  return shownOf(digammaBall, x, context);
}

/** `lgamma(x)` at forty digits, shown. */
function lg(x: Ball, context: NumberContext = CONTEXT): string {
  return shownOf(lgammaBall, x, context);
}

/** `gamma(x)` at forty digits, shown. */
function g(x: Ball, context: NumberContext = CONTEXT): string {
  return shownOf(gammaBall, x, context);
}

test("digamma takes a plain number and gives one", () => {
  assert.equal(digamma.name, "digamma");
  assert.deepEqual(digamma.arity, { min: 1, max: 1 });
  const primitives = new Map([["m", "dimension" as const]]);
  assert.ok(digamma.dimensions([DIMENSIONLESS], primitives).ok);
  const failed = digamma.dimensions([primitive("m")], primitives);
  assert.ok(!failed.ok && failed.error.kind === "argumentDimension");
});

test("digamma matches mpmath to forty digits on positive and negative arguments", () => {
  // From mpmath, `psi(0, x)` at 50 digits rounded to 40 by `nstr`; the
  // negative arguments take the reflection, the small ones the kernel at
  // extra bits, 1e19 and 1e30 the kernel with no shift.
  const rows: readonly [string, string][] = [
    ["1", "-0.5772156649015328606065120900824024310422"],
    ["0.5", "-1.963510026021423479440976332998755567193"],
    ["2", "0.4227843350984671393934879099175975689578"],
    ["7", "1.872784335098467139393487909917597568958"],
    ["10", "2.251752589066721107647456163885851537212"],
    ["100.5", "4.605174352581845211868678785604714548573"],
    ["3.7", "1.167153539361511385873863966145046881174"],
    ["0.25", "-4.227453533376265408089530146096683577367"],
    ["0.9999", "-0.5773801703298691417827632771944969155335"],
    ["1e-6", "-1000000.577214019968668068200913015168235"],
    ["1e-20", "-100000000000000000000.5772156649015328606"],
    ["-0.5", "0.03648997397857652055902366700124443280684"],
    ["-0.75", "-2.894120200042932074756196812763350244034"],
    ["-1.5", "0.7031566406452431872256903336679110994735"],
    ["-2.75", "-1.959055264977997009821131877698415179099"],
    ["-100.5", "4.615124601338064117341315601525112558523"],
    ["-0.000001", "999999.4227826901631982331815675725771205"],
    ["1e19", "43.74911676688686799629183763900291994442"],
    ["1e30", "69.07755278982137052053974364053042622803"],
    ["123456789", "18.63140176211801799087143291307419983533"],
  ];
  for (const [x, reference] of rows) {
    assert.equal(psi(exact(dec(x))), `≈ ${reference}`, `ψ(${x})`);
  }
  // A negative argument of a huge magnitude: the reflection's cotangent is
  // taken at the fractional part, 2/3 here, and ψ(1 - x) is ln(1 - x)
  // within 1 / (1 - x), beyond 2^bits (mpmath at 460 digits).
  const huge = fromRational(rational(-(10n ** 400n), 3n));
  assert.equal(psi(exact(huge)), "≈ 921.7492242731843817663954148944653130681");
  // Beyond the exponent's reach of any kernel value: ln x within 1 / x.
  assert.equal(
    psi(exact(dec("1e999999999")), { ...CONTEXT, precision: 8 }),
    "≈ 2.3025851e+9",
  );
  // Below 2^-significandLimitBits throughout: ψ(1) - 1 / x within 2x.
  assert.equal(
    psi(exact(dec("1e-999999999")), { ...CONTEXT, precision: 8 }),
    "≈ -1e+999999999",
  );
  assert.equal(psi(exact(dec("4e-400"))), "≈ -2.5e+399");
  // A tiny negative argument takes the same expansion at zero.
  assert.equal(
    psi(exact(dec("-1e-999999999")), { ...CONTEXT, precision: 8 }),
    "≈ 1e+999999999",
  );
});

test("the poles: a domain error for an exact non-positive integer, unresolved for a ball reaching one", () => {
  for (const x of ["0", "-1", "-3", "-1e400", "-1e999999999"]) {
    assert.deepEqual(error(digammaBall(exact(dec(x)), CONTEXT)), {
      kind: "domain",
      argument: 0,
      reason: "pole",
    });
  }
  for (const b of [
    ball(dec("-2"), dec("0.1")),
    ball(dec("0"), dec("1e-30")),
    ball(dec("1e-31"), dec("1e-30")),
    ball(dec("-0.95"), dec("0.1")),
    ball(dec("5"), dec("2e948")),
    ball(dec("-1e400"), dec("1")),
  ]) {
    assert.deepEqual(error(digammaBall(b, CONTEXT)), {
      kind: "unresolved",
      argument: 0,
      edge: "pole",
    });
  }
  // Inside a negative cell, a ball is a value.
  const inside = value(digammaBall(ball(dec("-2.5"), dec("0.1")), CONTEXT));
  assert.ok(!isExact(inside));
  const shown = show(inside, { digits: 40, rounding: DEFAULT_ROUNDING });
  assert.ok(
    shown.kind === "partial" && shown.text.startsWith("1.103"),
    inspect(shown),
  );
});

test("an unbounded radius, and the rounding modes", () => {
  const unbounded: Ball = { mid: dec("2"), rad: UNBOUNDED };
  const result = value(digammaBall(unbounded, CONTEXT));
  assert.equal(result.rad.kind, "unbounded");
  assert.equal(
    show(result, { digits: 8, rounding: DEFAULT_ROUNDING }).text,
    "0.42278434",
  );
  for (const rounding of ROUNDING_MODES) {
    const shown = show(value(digammaBall(exact(dec("2")), CONTEXT)), {
      digits: 8,
      rounding,
    });
    assert.equal(shown.kind, "certified", rounding);
    assert.ok(
      /^0\.4227843[34]$/.test(shown.text),
      `${rounding}: ${shown.text}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Through the pipeline

const text = readFileSync(new URL("../../units.txt", import.meta.url), "utf8");

const table = (() => {
  const parsed = parseDefinitions(text);
  assert.ok(parsed.ok, inspect(parsed));
  const built = buildTable(parsed.value, ceilingContext(CONTEXT));
  assert.ok(built.ok, inspect(built));
  return built.value;
})();

/** `source` through the pipeline at eight digits: the shown text, or the message. */
function run(
  source: string,
  context: NumberContext = { ...CONTEXT, precision: 8 },
): string {
  const result = evaluateText(table, source, context);
  if (!result.ok)
    return describeTextError(result.error, source, table.primitives);
  const shown = show(result.value.magnitude, {
    digits: context.precision,
    rounding: context.rounding,
  });
  return `${shown.kind === "exact" ? "=" : "≈"} ${shown.text}`;
}

test("digamma through the pipeline, with its messages", () => {
  assert.equal(run("digamma(1)"), "≈ -0.57721566");
  assert.equal(run("digamma(approx(3))"), "≈ 0.92278434");
  assert.equal(run("digamma(sqrt(2))"), "≈ -0.046909626");
  assert.equal(run("digamma(-1e400/3)"), "≈ 921.74922");
  assert.equal(run("digamma(1e-999999999)"), "≈ -1e+999999999");
  assert.equal(
    run("digamma(1)", { ...CONTEXT, precision: 8, mode: "decimal" }),
    "= -0.57721566",
  );
  assert.equal(
    run("digamma(0)"),
    'Cannot compute "digamma(0)": "0" is a pole of "digamma", which has one at zero and at every negative whole number.',
  );
  assert.equal(
    run("digamma(-3)"),
    'Cannot compute "digamma(-3)": "-3" is a pole of "digamma", which has one at zero and at every negative whole number.',
  );
  assert.equal(
    run("digamma(approx(-2))"),
    '"approx(-2)" cannot be told from a pole of the function at this precision, and the result depends on which side of it it lies.',
  );
  assert.equal(
    run("digamma(2 m)"),
    'Cannot apply "digamma" to "2 m": "2 m" has dimension m, but the argument of "digamma" must be a plain number.',
  );
  // A ball straddling a pole at the first pass and not at a later one:
  // retried, and resolved.
  assert.equal(run("digamma(-2.5 + 1e-30 * approx(1))"), "≈ 1.1031566");
});

// ---------------------------------------------------------------------------
// lgamma and gamma

test("lgamma and gamma take a plain number and give one", () => {
  const primitives = new Map([["m", "dimension" as const]]);
  for (const fn of [lgamma, gamma]) {
    assert.deepEqual(fn.arity, { min: 1, max: 1 });
    assert.ok(fn.dimensions([DIMENSIONLESS], primitives).ok);
    const failed = fn.dimensions([primitive("m")], primitives);
    assert.ok(!failed.ok && failed.error.kind === "argumentDimension");
  }
  assert.equal(lgamma.name, "lgamma");
  assert.equal(gamma.name, "gamma");
});

test("lgamma and gamma match mpmath to forty digits on positive and negative arguments", () => {
  // From mpmath at 60 digits (`loggamma`, `log(abs(gamma))` for a negative
  // argument, and `gamma`), rounded to 40 by `nstr`.
  const rows: readonly [string, string, string][] = [
    [
      "0.5",
      "0.5723649429247000870717136756765293558236",
      "1.772453850905516027298167483341145182798",
    ],
    [
      "1.5",
      "-0.1207822376352452223455184457816472122519",
      "0.8862269254527580136490837416705725913988",
    ],
    [
      "2.5",
      "0.2846828704729191596324946696827019243201",
      "1.329340388179137020473625612505858887098",
    ],
    [
      "3.7",
      "1.428072326665387921872381125047550334507",
      "4.17065178379660316539360299861798372794",
    ],
    [
      "100.5",
      "361.4355404677776215552519127025207628588",
      "9.320963104082716608349109809141910437906e+156",
    ],
    [
      "170.5",
      "704.0044277342046707917900288362859176897",
      "5.562092414559999610705809659357742867669e+305",
    ],
    [
      "171.5",
      "709.1431630309282422723639046173352276318",
      "9.483367566824799336253405469204951589376e+307",
    ],
    [
      "0.25",
      "1.288022524698077457370610440219717295925",
      "3.625609908221908311930685155867672002995",
    ],
    [
      "0.3",
      "1.095797994818075521677168142370107278445",
      "2.991568987687590628312516515904917791113",
    ],
    [
      "0.9999",
      "0.00005772979156120022173423285987542290626988",
      "1.000057731457957683824496718829756280452",
    ],
    [
      "1.0000001",
      "-0.00000005772155826548335250512635509882395333942",
      "0.9999999422784434004057597400964368582907",
    ],
    [
      "2.0000001",
      "0.00000004227843673451698082818197823650937982725",
      "1.000000042278437628250099780672410867934",
    ],
    [
      "1e-6",
      "13.81550998074943166920782687100640098472",
      "999999.4227853241535549892716895238645569",
    ],
    [
      "1e-20",
      "46.05170185988091368035405693703826882342",
      "99999999999999999999.4227843350984671394",
    ],
    [
      "1e-40",
      "92.10340371976182736071965818737456830404",
      "9999999999999999999999999999999999999999",
    ],
    [
      "-0.3",
      "1.464840050857602507008478634778598081096",
      "-4.326851108825192618937237263842705392614",
    ],
    [
      "-0.5",
      "1.265512123484645396488945797134705923899",
      "-3.544907701811032054596334966682290365595",
    ],
    [
      "-0.75",
      "1.575704597149858384809829446213544727429",
      "-4.834146544295877749240913541156896003994",
    ],
    [
      "-1.5",
      "0.8600470153764810145109326816703567873272",
      "2.363271801207354703064223311121526910397",
    ],
    [
      "-2.5",
      "-0.05624371649767405067259453009765428412294",
      "-0.9453087204829418812256893244486107641587",
    ],
    [
      "-2.75",
      "0.004487897535955773311461610637941970272096",
      "-1.004497983230312259582527489071562806025",
    ],
    [
      "-100.5",
      "-364.9009683094273518227565704629957760343",
      "-3.353690819807678642208099692714592406182e-159",
    ],
    [
      "-0.000001",
      "13.81551113518076147307491935280405877756",
      "-1000000.577216653958435668636877440597533",
    ],
    ["-1e-40", "92.10340371976182736071965818737456830404", "-1e+40"],
    [
      "1e15",
      "33538776394910668.90982020756959565809274",
      "1.178796411940899478606712292739860695939e+14565705518096741",
    ],
    [
      "1e16",
      "358413614879047291.9411364220018055511859",
      "1.326107236509938792102884228479019312686e+155657055180967474",
    ],
    [
      "6e16",
      "2257987257427967138.308398492638111546279",
      "2.002039223062192283495590779385533233407e+980631406108823500",
    ],
    [
      "20001",
      "178075.6217371987003128679281773116317209",
      "1.819206320230345134827641756866458766072e+77337",
    ],
    [
      "1000001",
      "12815518.38465816962425107589296584125987",
      "8.263931688331240062376646103172666291135e+5565708",
    ],
    [
      "123456789",
      "2176716239.223269991667882156745419998727",
      "2.311345163782597635148205279308394292153e+945335851",
    ],
  ];
  for (const [x, lgammaRef, gammaRef] of rows) {
    const shownLgamma = lg(exact(dec(x)));
    assert.equal(shownLgamma.slice(0, 2), "≈ ", `ln Γ(${x})`);
    assert.ok(
      equals(dec(shownLgamma.slice(2)), dec(lgammaRef)),
      `ln Γ(${x}): ${shownLgamma}`,
    );
    assert.equal(g(exact(dec(x))), `≈ ${gammaRef}`, `Γ(${x})`);
  }
  // Huge arguments: lgamma on balls from ln x, and gamma past the bound.
  assert.equal(
    lg(exact(dec("1e19"))),
    "≈ 427491167668868679942.4627565397904381878",
  );
  assert.equal(
    lg(exact(dec("1e30"))),
    "≈ 68077552789821370520539743640497.30639017",
  );
  assert.equal(
    lg(exact(dec("1e18"))),
    "≈ 40446531673892822292.51951888057681732252",
  );
  const huge = fromRational(rational(-(10n ** 400n), 3n));
  assert.equal(
    lg(exact(huge)),
    "≈ -3.063118083029833879719337788789410524453e+402",
  );
  assert.equal(
    lg(exact(dec("1e999999999")), { ...CONTEXT, precision: 8 }),
    "≈ 2.3025851e+1000000008",
  );
  assert.equal(
    lg(exact(dec("1e-999999999")), { ...CONTEXT, precision: 8 }),
    "≈ 2.3025851e+9",
  );
  assert.equal(
    lg(exact(dec("-1e-999999999")), { ...CONTEXT, precision: 8 }),
    "≈ 2.3025851e+9",
  );
  assert.equal(
    g(exact(dec("1e-999999999")), { ...CONTEXT, precision: 8 }),
    "≈ 1e+999999999",
  );
  assert.equal(
    g(exact(dec("-1e-999999999")), { ...CONTEXT, precision: 8 }),
    "≈ -1e+999999999",
  );
  assert.equal(g(exact(dec("4e-400"))), "≈ 2.5e+399");
});

test("gamma of an exact integer is the exact factorial where it fits, and the kernel's value where it does not", () => {
  assert.equal(g(exact(dec("1"))), "= 1");
  assert.equal(g(exact(dec("2"))), "= 1");
  assert.equal(g(exact(dec("7"))), "= 720");
  assert.equal(
    g(exact(dec("1e4")), { ...CONTEXT, precision: 8 }),
    "≈ 2.8462597e+35655",
  );
  assert.ok(isExact(value(gammaBall(exact(dec("5001")), CONTEXT))));
  // 20000! has 77,338 digits, past the significand limit, so the factorial is
  // refused and gamma gives the value in log space (the remedy).
  assert.equal(
    g(exact(dec("20001")), { ...CONTEXT, precision: 8 }),
    "≈ 1.8192063e+77337",
  );
  assert.equal(lg(exact(dec("1"))), "= 0");
  assert.equal(lg(exact(dec("2"))), "= 0");
  assert.equal(
    lg(exact(dec("3"))),
    "≈ 0.6931471805599453094172321214581765680755",
  );
});

test("the Gamma family's poles: a domain error for an exact non-positive integer, unresolved for a ball reaching one", () => {
  for (const fn of [lgammaBall, gammaBall]) {
    for (const x of ["0", "-1", "-3", "-1e400", "-1e999999999"]) {
      assert.deepEqual(error(fn(exact(dec(x)), CONTEXT)), {
        kind: "domain",
        argument: 0,
        reason: "pole",
      });
    }
    for (const b of [
      ball(dec("-2"), dec("0.1")),
      ball(dec("0"), dec("1e-30")),
      ball(dec("1e-31"), dec("1e-30")),
      ball(dec("-0.95"), dec("0.1")),
      ball(dec("5"), dec("2e948")),
      ball(dec("-1e400"), dec("1")),
    ]) {
      assert.deepEqual(error(fn(b, CONTEXT)), {
        kind: "unresolved",
        argument: 0,
        edge: "pole",
      });
    }
  }
  // Inside a negative cell, a ball is a value with the cell's sign. A
  // wide one is sound but loose: the shift's product and Stirling's part
  // carry the radius at their own slopes, which cancel in the truth and
  // not in the interval, and the exponential widens the rest, so the
  // ball of radius 0.1 reaches zero where a narrower one shows digits.
  const truth = dec("-0.9453087204829418812256893244486107641587");
  const wide = value(gammaBall(ball(dec("-2.5"), dec("0.1")), CONTEXT));
  assert.ok(contains(wide, truth), inspect(wide));
  const inside = value(gammaBall(ball(dec("-2.5"), dec("0.001")), CONTEXT));
  const shown = show(inside, { digits: 40, rounding: DEFAULT_ROUNDING });
  assert.ok(
    shown.kind === "partial" && shown.text.startsWith("-0.9"),
    inspect(shown),
  );
  assert.ok(contains(inside, truth), inspect(inside));
  const insideLog = value(lgammaBall(ball(dec("-2.5"), dec("0.1")), CONTEXT));
  assert.ok(!isExact(insideLog));
  assert.ok(
    contains(insideLog, dec("-0.05624371649767405067259453009765428412294")),
    inspect(insideLog),
  );
});

test("gamma is held to the exponent bound by the classifier on its logarithm", () => {
  assert.deepEqual(error(gammaBall(exact(dec("1e17")), CONTEXT)), {
    kind: "overflow",
  });
  assert.deepEqual(error(gammaBall(exact(dec("1e19")), CONTEXT)), {
    kind: "overflow",
  });
  assert.deepEqual(error(gammaBall(exact(dec("1e999999999")), CONTEXT)), {
    kind: "overflow",
  });
  const huge = fromRational(rational(-(10n ** 400n), 3n));
  assert.deepEqual(error(gammaBall(exact(huge), CONTEXT)), {
    kind: "underflow",
  });
  // The logarithm crosses the top near 6.1e16: a ball across it is
  // unresolved at the bound, for the retry loop.
  assert.deepEqual(error(gammaBall(ball(dec("6e16"), dec("1e16")), CONTEXT)), {
    kind: "unresolved",
    argument: 0,
    edge: "bound",
  });
  // And a ball of a huge value whose logarithm is far past it overflows.
  assert.deepEqual(error(gammaBall(ball(dec("3e18"), dec("2e18")), CONTEXT)), {
    kind: "overflow",
  });
});

test("an unbounded radius, and the rounding modes, for lgamma and gamma", () => {
  const unbounded: Ball = { mid: dec("2.5"), rad: UNBOUNDED };
  assert.equal(value(gammaBall(unbounded, CONTEXT)).rad.kind, "unbounded");
  assert.equal(value(lgammaBall(unbounded, CONTEXT)).rad.kind, "unbounded");
  assert.equal(
    show(value(gammaBall(unbounded, CONTEXT)), {
      digits: 8,
      rounding: DEFAULT_ROUNDING,
    }).text,
    "1.3293404",
  );
  for (const rounding of ROUNDING_MODES) {
    const shownGamma = show(value(gammaBall(exact(dec("2.5")), CONTEXT)), {
      digits: 8,
      rounding,
    });
    assert.equal(shownGamma.kind, "certified", rounding);
    assert.ok(
      /^1\.329340[34]$/.test(shownGamma.text),
      `${rounding}: ${shownGamma.text}`,
    );
    const shownLgamma = show(value(lgammaBall(exact(dec("2.5")), CONTEXT)), {
      digits: 8,
      rounding,
    });
    assert.equal(shownLgamma.kind, "certified", rounding);
    assert.ok(
      /^0\.2846828[78]$/.test(shownLgamma.text),
      `${rounding}: ${shownLgamma.text}`,
    );
  }
});

test("lgamma and gamma through the pipeline, with their messages", () => {
  assert.equal(run("gamma(5)"), "= 24");
  assert.equal(run("gamma(0.5)^2"), "≈ 3.1415927");
  assert.equal(run("gamma(-1.5)"), "≈ 2.3632718");
  assert.equal(run("lgamma(1)"), "= 0");
  assert.equal(run("lgamma(3.7)"), "≈ 1.4280723");
  assert.equal(run("lgamma(-1e400/3)"), "≈ -3.0631181e+402");
  assert.equal(run("gamma(20001)"), "≈ 1.8192063e+77337");
  assert.equal(run("gamma(approx(3))"), "≈ 2");
  assert.equal(run("exp(lgamma(10))"), "≈ 362880");
  assert.equal(
    run("gamma(3)", { ...CONTEXT, precision: 8, mode: "decimal" }),
    "= 2",
  );
  assert.equal(
    run("gamma(0)"),
    'Cannot compute "gamma(0)": "0" is a pole of "gamma", which has one at zero and at every negative whole number.',
  );
  assert.equal(
    run("lgamma(-3)"),
    'Cannot compute "lgamma(-3)": "-3" is a pole of "lgamma", which has one at zero and at every negative whole number.',
  );
  assert.equal(
    run("gamma(approx(-2))"),
    '"approx(-2)" cannot be told from a pole of the function at this precision, and the result depends on which side of it it lies.',
  );
  assert.equal(
    run("gamma(1e19)"),
    '"gamma(1e19)" is too large to compute: its exponent would pass 10^18.',
  );
  assert.equal(
    run("gamma(-1e400/3)"),
    '"gamma(-1e400/3)" is too small to compute: its exponent would fall below -10^18.',
  );
  assert.equal(
    run("lgamma(2 m)"),
    'Cannot apply "lgamma" to "2 m": "2 m" has dimension m, but the argument of "lgamma" must be a plain number.',
  );
  // The factorial's refusals of a value it does not take point here.
  assert.equal(
    run("factorial(2.5)"),
    'Cannot compute "factorial(2.5)": "2.5" is not a whole number, and "factorial" is defined only for whole numbers; "gamma" takes any value, with gamma(x + 1) for factorial(x).',
  );
  assert.equal(run("gamma(2.5 + 1)"), "≈ 3.323351");
  // A ball straddling a pole at the first pass and not at a later one:
  // retried, and resolved.
  assert.equal(run("gamma(-2.5 + 1e-30 * approx(1))"), "≈ -0.94530872");
});
