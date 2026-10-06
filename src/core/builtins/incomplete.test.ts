import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { inspect } from "node:util";
import { exact, isExact, type Ball } from "../ball.ts";
import { buildTable } from "../build.ts";
import {
  DEFAULT_CEILING,
  DEFAULT_MAX_BITS,
  DEFAULT_ROUNDING,
  ceilingContext,
  type NumberContext,
} from "../context.ts";
import { parseDefinitions } from "../definitions.ts";
import { DIMENSIONLESS, primitive } from "../dimension.ts";
import { show } from "../display.ts";
import { evaluateText } from "../pipeline.ts";
import { UNBOUNDED } from "../radius.ts";
import { ROUNDING_MODES } from "../rounding.ts";
import { ZERO, equals } from "../scaled.ts";
import { error, value } from "../../testing/builtins.ts";
import { contains } from "../../testing/edges.ts";
import { ball, dec } from "../../testing/scaled.ts";
import { describeTextError } from "../../messages.ts";
import {
  incompleteGammaBall,
  lowergamma,
  lowergammareg,
  uppergamma,
  uppergammareg,
} from "./incomplete.ts";

const CONTEXT: NumberContext = {
  precision: 40,
  rounding: DEFAULT_ROUNDING,
  maxBits: DEFAULT_MAX_BITS,
  ceiling: DEFAULT_CEILING,
};

type Which = "lower" | "upper" | "lowerreg" | "upperreg";

function call(
  which: Which,
  s: Ball,
  x: Ball,
  context: NumberContext = CONTEXT,
) {
  return incompleteGammaBall(
    s,
    x,
    which.startsWith("lower") ? "lower" : "upper",
    which.endsWith("reg"),
    context,
  );
}

/** The function `which` at the context, shown. */
function shown(
  which: Which,
  s: Ball,
  x: Ball,
  context: NumberContext = CONTEXT,
): string {
  const result = show(
    value(call(which, s, x, context)),
    context.precision,
    context.rounding,
  );
  return `${result.kind === "exact" ? "=" : "≈"} ${result.text}${result.kind === "certified" || result.kind === "exact" ? "" : ` [${result.kind}]`}`;
}

const FORMS: readonly Which[] = ["lower", "upper", "lowerreg", "upperreg"];

test("the incomplete gamma functions take two plain numbers and give one", () => {
  const primitives = new Map([["m", "dimension" as const]]);
  for (const fn of [lowergamma, uppergamma, lowergammareg, uppergammareg]) {
    assert.deepEqual(fn.arity, { min: 2, max: 2 });
    assert.ok(fn.dimensions([DIMENSIONLESS, DIMENSIONLESS], primitives).ok);
    const failed = fn.dimensions([primitive("m"), DIMENSIONLESS], primitives);
    assert.ok(!failed.ok && failed.error.kind === "argumentDimension");
  }
  assert.equal(lowergamma.name, "lowergamma");
  assert.equal(uppergamma.name, "uppergamma");
  assert.equal(lowergammareg.name, "lowergammareg");
  assert.equal(uppergammareg.name, "uppergammareg");
});

test("the four forms match mpmath to forty digits, by the series and by the fraction", () => {
  // mpmath's gammainc at 60 digits, rounded to 40 by nstr: (s, x, γ, Γ, P, Q).
  const rows: readonly [string, string, string, string, string, string][] = [
    [
      "0.5",
      "0.5",
      "1.210035619311108903018672526039102113771",
      "0.5624182315944071242794949573020430690268",
      "0.6826894921370858971704650912640758449558",
      "0.3173105078629141028295349087359241550442",
    ],
    [
      "2",
      "3",
      "0.8008517265285442280826303373997528934732",
      "0.1991482734714557719173696626002471065268",
      "0.8008517265285442280826303373997528934732",
      "0.1991482734714557719173696626002471065268",
    ],
    [
      "2.5",
      "0.1",
      "0.001177980081500522617591034488021378645709",
      "1.328162408097636497856034578017837508452",
      "0.0008861387888124424872563686640327908095183",
      "0.9991138612111875575127436313359672091905",
    ],
    [
      "3",
      "10",
      "1.994461208568976848112657835101612825551",
      "0.005538791431023151887342164898387174449026",
      "0.9972306042844884240563289175508064127755",
      "0.002769395715511575943671082449193587224513",
    ],
    [
      "0.5",
      "100",
      "1.772453850905516027298167483341145182798",
      "3.701747860408278920253566448133907572136e-45",
      "1",
      "2.088487583762544757000786294957788611561e-45",
    ],
    [
      "1.5",
      "1.5",
      "0.5391581495561364453314501757281816101895",
      "0.3470687758966215683176335659423909812093",
      "0.6083748237289110445226395639381190714568",
      "0.3916251762710889554773604360618809285432",
    ],
    [
      "10",
      "12",
      "274920.732373004478910312183809650297209",
      "87959.26762699552108968781619034970279098",
      "0.7576078383294876513181001537964349019208",
      "0.2423921616705123486818998462035650980792",
    ],
    [
      "100",
      "100",
      "4.790423423531745838800776802540435009447e+155",
      "4.542198120862669429369147083086235039625e+155",
      "0.5132987982791486648573142565640291634709",
      "0.4867012017208513351426857434359708365291",
    ],
    [
      "100",
      "50",
      "2.986499859169264780181557814809295600253e+146",
      "9.332621541407915409000659105445112234262e+155",
      "3.20006532458512529377866106603165082426e-10",
      "0.9999999996799934675414874706221338933968",
    ],
    [
      "100",
      "150",
      "9.332566252901639697260223634770627419879e+155",
      "5.529149277557090970025085604262919244066e+150",
      "0.9999940754596645160841705886025633179697",
      "5.924540335483915829411397436682030264368e-6",
    ],
    [
      "0.1",
      "1.5",
      "9.405586309051145218685859940261537937501",
      "0.1079213896175866176066272370038642550496",
      "0.9886559833621947301514134757909037932048",
      "0.01134401663780526984858652420909620679519",
    ],
    [
      "3.7",
      "2.2",
      "0.9582794362900308612430365200462589591247",
      "3.212372347506572304150566478571724768816",
      "0.2297673087964432190890054963983322515545",
      "0.7702326912035567809109945036016677484455",
    ],
    [
      "1e-6",
      "0.5",
      "999998.8630117591076238293774743045706008",
      "0.559773565045931159894215219293956110421",
      "0.9999994402261118443654410470186505684112",
      "5.597738881556345589529813494315888237573e-7",
    ],
    [
      "5",
      "1e-6",
      "1.999998333334047618839285760582002248679e-31",
      "23.99999999999999999999999999999980000017",
      "8.333326388891865078497024002425009369494e-33",
      "0.9999999999999999999999999999999916666736",
    ],
    [
      "0.5",
      "1000",
      "1.772453850905516027298167483341145182798",
      "1.604357763864243811377237561860174873446e-436",
      "1",
      "9.051619386561772362218561429079887210626e-437",
    ],
    [
      "1000",
      "1000",
      "2.028857667221789495907185900969606449541e+2564",
      "1.995014933549148239529838438260433407652e+2564",
      "0.5042052441802155085037778436021187991892",
      "0.4957947558197844914962221563978812008108",
    ],
    [
      "2",
      "20",
      "0.9999999567157739287902856127152520167278",
      "4.328422607120971438728474798327224050389e-8",
      "0.9999999567157739287902856127152520167278",
      "4.328422607120971438728474798327224050389e-8",
    ],
    [
      "7",
      "7.5",
      "447.728620087102093099017032824684836647",
      "272.271379912897906900982967175315163353",
      "0.621845305676530684859745878923173384232",
      "0.378154694323469315140254121076826615768",
    ],
  ];
  for (const [s, x, ...references] of rows) {
    FORMS.forEach((which, i) => {
      const text = shown(which, exact(dec(s)), exact(dec(x)));
      assert.equal(text.slice(0, 2), "≈ ", `${which}(${s}, ${x}): ${text}`);
      assert.ok(
        equals(dec(text.slice(2)), dec(references[i]!)),
        `${which}(${s}, ${x}): ${text} against ${references[i]}`,
      );
    });
  }
});

test("the exact cases: x = 0, and s = 1", () => {
  assert.equal(shown("lower", exact(dec("2.5")), exact(ZERO)), "= 0");
  assert.equal(shown("lowerreg", exact(dec("2.5")), exact(ZERO)), "= 0");
  assert.equal(shown("upper", exact(dec("4")), exact(ZERO)), "= 6");
  assert.equal(
    shown("upper", exact(dec("0.5")), exact(ZERO)),
    "≈ 1.772453850905516027298167483341145182798",
  );
  assert.equal(shown("upperreg", exact(dec("2.5")), exact(ZERO)), "= 1");
  assert.equal(
    shown("upper", exact(dec("1")), exact(dec("2")), {
      ...CONTEXT,
      precision: 8,
    }),
    "≈ 0.13533528",
  );
  assert.equal(
    shown("upperreg", exact(dec("1")), exact(dec("2")), {
      ...CONTEXT,
      precision: 8,
    }),
    "≈ 0.13533528",
  );
  assert.equal(
    shown("lower", exact(dec("1")), exact(dec("2")), {
      ...CONTEXT,
      precision: 8,
    }),
    "≈ 0.86466472",
  );
  assert.equal(
    shown("lowerreg", exact(dec("1")), exact(dec("2")), {
      ...CONTEXT,
      precision: 8,
    }),
    "≈ 0.86466472",
  );
  assert.ok(isExact(value(call("upper", exact(dec("4")), exact(ZERO)))));
});

test("the domain: the order positive, the argument at or above zero, and balls at the edges", () => {
  for (const which of FORMS) {
    for (const s of ["0", "-1", "-2.5"]) {
      assert.deepEqual(error(call(which, exact(dec(s)), exact(dec("1")))), {
        kind: "domain",
        argument: 0,
        reason: "notPositive",
      });
    }
    assert.deepEqual(error(call(which, exact(dec("2")), exact(dec("-1")))), {
      kind: "domain",
      argument: 1,
      reason: "negative",
    });
    assert.deepEqual(
      error(call(which, ball(dec("0"), dec("1e-30")), exact(dec("1")))),
      {
        kind: "unresolved",
        argument: 0,
        edge: ZERO,
      },
    );
    assert.deepEqual(
      error(call(which, exact(dec("2")), ball(dec("1e-31"), dec("1e-30")))),
      {
        kind: "unresolved",
        argument: 1,
        edge: ZERO,
      },
    );
    assert.deepEqual(
      error(call(which, exact(dec("2")), ball(dec("-1"), dec("0.5")))),
      {
        kind: "unresolved",
        argument: 1,
        edge: ZERO,
      },
    );
  }
});

test("the ends of the exponent: huge and tiny arguments and orders", () => {
  const eight = { ...CONTEXT, precision: 8 };
  // γ(1e400, 2) is beyond the top, and the regularized form beyond the bottom.
  assert.deepEqual(error(call("lower", exact(dec("1e400")), exact(dec("2")))), {
    kind: "overflow",
  });
  assert.deepEqual(
    error(call("lowerreg", exact(dec("1e400")), exact(dec("2")))),
    { kind: "underflow" },
  );
  // Γ(2, 1e400) is beyond the bottom, so γ(2, 1e400) is Γ(2) within 10^-(10^18).
  assert.deepEqual(error(call("upper", exact(dec("2")), exact(dec("1e400")))), {
    kind: "underflow",
  });
  assert.equal(
    shown("lower", exact(dec("2")), exact(dec("1e400")), eight),
    "≈ 1",
  );
  assert.equal(
    shown("lowerreg", exact(dec("2")), exact(dec("1e400")), eight),
    "≈ 1",
  );
  const whole = value(call("lower", exact(dec("2")), exact(dec("1e400"))));
  assert.ok(
    whole.rad.kind === "bounded" && whole.rad.exp < -(10n ** 17n),
    inspect(whole.rad),
  );
  // A tiny argument: γ(s, x) ≈ x^s / s, at any exponent.
  assert.equal(
    shown("lower", exact(dec("2")), exact(dec("1e-999999999")), eight),
    "≈ 5e-1999999999",
  );
  assert.equal(
    shown("lowerreg", exact(dec("0.5")), exact(dec("1e-999999999")), eight),
    "≈ 3.5682482e-500000000",
  );
  assert.equal(
    shown("upperreg", exact(dec("0.5")), exact(dec("1e-999999999")), eight),
    "≈ 1",
  );
  assert.equal(
    shown("lower", exact(dec("3")), exact(dec("1e-20"))),
    "≈ 3.333333333333333333308333333333333333333e-61",
  );
  assert.equal(shown("upperreg", exact(dec("3")), exact(dec("1e-20"))), "≈ 1");
  // A tiny order: P is near one, Q near zero.
  assert.equal(
    shown("lowerreg", exact(dec("1e-999999999")), exact(dec("0.5")), eight),
    "≈ 1",
  );
  // Past Most bits in the bits the logarithm would need.
  assert.deepEqual(
    error(call("lower", exact(dec("5e1000000000000000000")), exact(dec("2")))),
    { kind: "tooLarge" },
  );
  assert.deepEqual(
    error(call("upperreg", exact(dec("2")), exact(dec("1e20000")))),
    { kind: "tooLarge" },
  );
});

test("a large order near a large argument: the series where it is affordable, and tooLarge past it", () => {
  const eight = { ...CONTEXT, precision: 8 };
  assert.equal(
    shown("upperreg", exact(dec("20000")), exact(dec("20000")), eight),
    "≈ 0.49905968",
  );
  assert.equal(
    shown("lowerreg", exact(dec("1e6")), exact(dec("1e6")), eight),
    "≈ 0.50013298",
  );
  assert.deepEqual(
    error(call("lowerreg", exact(dec("1e8")), exact(dec("1e8")), eight)),
    { kind: "tooLarge" },
  );
  // Past the order, where only the series is affordable, the complement
  // keeps the digits below one: Q(1e6, 1.01e6) from P at the working bits.
  assert.equal(
    shown("upperreg", exact(dec("1e6")), exact(dec("1.01e6")), eight),
    "≈ 1.0606997e-23",
  );
  assert.deepEqual(
    error(call("upperreg", exact(dec("1e6")), exact(dec("1.5e6")), eight)),
    { kind: "tooLarge" },
  );
});

test("balls inside the domain contain the truth, an unbounded radius passes, and the rounding modes", () => {
  const inside = value(
    call(
      "lowerreg",
      ball(dec("2.5"), dec("0.001")),
      ball(dec("1.5"), dec("0.001")),
    ),
  );
  assert.ok(
    contains(inside, dec("0.300014164121372490900198448375")),
    inspect(inside),
  );
  const upperInside = value(
    call("upperreg", ball(dec("0.5"), dec("0.001")), exact(dec("3"))),
  );
  assert.ok(
    contains(upperInside, dec("0.0143058784354296395258478064223")),
    inspect(upperInside),
  );
  // A wide argument, from its ends: γ(2, [1e18, 5e18]) is one within the
  // bound's edge, and P(2, [1, 3]) covers P at both ends.
  const edge = value(
    call("lower", exact(dec("2")), ball(dec("3e18"), dec("2e18"))),
  );
  assert.ok(contains(edge, dec("1")), inspect(edge));
  assert.ok(
    edge.rad.kind === "bounded" && edge.rad.exp < -(10n ** 17n),
    inspect(edge.rad),
  );
  const span = value(
    call("lowerreg", exact(dec("2")), ball(dec("2"), dec("1"))),
  );
  assert.ok(
    contains(span, dec("0.26424111765711535680895245967707826510837773793646")),
    inspect(span),
  );
  assert.ok(
    contains(span, dec("0.80085172652854422808263033739975289347320163124631")),
    inspect(span),
  );
  const unbounded: Ball = { mid: dec("0.5"), rad: UNBOUNDED };
  assert.equal(
    value(call("lowerreg", unbounded, exact(dec("0.5")))).rad.kind,
    "unbounded",
  );
  assert.equal(
    value(call("lowerreg", exact(dec("0.5")), unbounded)).rad.kind,
    "unbounded",
  );
  for (const rounding of ROUNDING_MODES) {
    const result = show(
      value(call("lowerreg", exact(dec("0.5")), exact(dec("0.5")))),
      8,
      rounding,
    );
    assert.equal(result.kind, "certified", rounding);
    assert.ok(
      /^0\.682689(49|5)$/.test(result.text),
      `${rounding}: ${result.text}`,
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
  const result2 = show(
    result.value.magnitude,
    context.precision,
    context.rounding,
  );
  return `${result2.kind === "exact" ? "=" : "≈"} ${result2.text}`;
}

test("the incomplete gamma functions through the pipeline, with their messages", () => {
  assert.equal(run("lowergammareg(0.5, 0.5)"), "≈ 0.68268949");
  assert.equal(run("uppergammareg(0.5, 0.5)"), "≈ 0.31731051");
  assert.equal(run("lowergamma(2, 3)"), "≈ 0.80085173");
  assert.equal(run("uppergamma(3, 0)"), "= 2");
  assert.equal(run("lowergamma(3, 0)"), "= 0");
  assert.equal(run("uppergammareg(1, 2)"), "≈ 0.13533528");
  assert.equal(run("lowergammareg(approx(2), 3)"), "≈ 0.80085173");
  assert.equal(
    run("uppergamma(2, 1e400)"),
    '"uppergamma(2, 1e400)" is too small to compute: its exponent would fall below -10^18.',
  );
  assert.equal(
    run("lowergammareg(0.5, 0.5)", {
      ...CONTEXT,
      precision: 8,
      mode: "decimal",
    }),
    "= 0.68268949",
  );
  assert.equal(
    run("lowergamma(0, 1)"),
    'Cannot compute "lowergamma(0, 1)": "0" is not positive, and the incomplete gamma functions take a positive order.',
  );
  assert.equal(
    run("uppergammareg(2, -1)"),
    'Cannot compute "uppergammareg(2, -1)": "-1" is negative, and "uppergammareg" is defined only from 0 up.',
  );
  assert.equal(
    run("uppergamma(approx(1) - 1, 1)"),
    '"approx(1) - 1" cannot be told from zero at this precision, and the result depends on which side of zero it lies.',
  );
  assert.equal(
    run("lowergamma(2 m, 3)"),
    'Cannot apply "lowergamma" to "2 m": "2 m" has dimension m, but the first argument of "lowergamma" must be a plain number.',
  );
  // The normal distribution's tail, as the study promised: Q(1/2, x^2 / 2) / 2.
  assert.equal(run("uppergammareg(1/2, 1.96^2 / 2) / 2"), "≈ 0.024997895");
});
