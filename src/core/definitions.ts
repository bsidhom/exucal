// The definitions file: the text that declares which units, prefixes and
// primitives exist. `parseDefinitions` turns it into a list of `Definition`s
// and knows nothing about what they mean; `buildTable` evaluates them.
// ARCHITECTURE.md ("Definitions") gives the overview.
//
// The format is in the spirit of a GNU units file: one definition per line, the
// name, whitespace, then the body, and `#` starts a comment that runs to the
// end of the line. Blank and comment-only lines are skipped.
//
//   m         !                 # dimension primitive
//   radian    !kind             # kind primitive (dimensionless)
//   kilo-     1000              # prefix (trailing dash)
//   inch      2.54 cm           # unit, defined by an expression
//   newton    kg m / s^2
//   time      hr;min;s          # unit list (two or more expressions)
//   tempC(x) = x K + 273.15 K   # function
//   ~tempC(y) = y / K - 273.15  # its inverse
//
// The grammar:
//
//   file       := line ("\n" line)*
//   line       := ws definition? comment?
//   definition := name " "+ body
//               | name "(" param ")" (":" annotation)? "=" expr
//               | "~" name "(" name ")" "=" expr
//   body       := "!" "kind"?              only for a unit name
//               | unitList                 (expr.ts)
//   param      := name (":" annotation)?
//
// A name is a unit name as expr.ts defines it, with a trailing `-` making it
// a prefix, a `(` directly after it making it a function, and a `~` before
// it making the line the inverse of the function of that name; the head
// decides the grammar of the rest. After a unit's or a prefix's name the
// whitespace is required, so that `inch2.54` is an error rather than the
// definition of `inch2`. A prefix must have an expression body: a
// primitive prefix means nothing, and neither does a prefix that is a
// list. A body that is a unit list of two or more items defines a unit
// list, the same thing the user may type as `want` (`ft;in`), under a
// name; a list of one item is an ordinary unit definition, since a list of
// one converts as the unit does. Each item keeps the text it was written
// as, since that is what the converter shows beside its term (`1 m ≈ 3 ft +
// 3.37 in`), and the table has no other way to get at it.
//
// A function (docs/functions.md) is a signature, `=` and a body. Inside
// the head, spaces are free around every token, and `=` ends it: an
// annotation is an expression, and juxtaposition would run a result
// annotation into the body. The parameter may be annotated with the unit
// it takes (`x: kg`, a plain number without one), and the result too
// (`): K`); each annotation keeps its text, since the converter writes a
// recovered argument in the parameter's. An annotation is a unit
// expression: unit names, juxtaposition, `*`, `/`, `^` and parentheses,
// and the number `1`, written `1`; another number would read as a scale
// that conformance ignores, and a sum, a negation or a call names no
// unit, so each is rejected where it is written. A parameter named like
// a unit that the same head's annotations use is rejected too, since the
// line would read both ways (the parameter means the parameter in the
// body, and the annotation the unit). An inverse, `~name(p) = body`, has
// one parameter, unannotated, since its dimension is its function's
// result's; whether there is such a function is the builder's to say.
// Two pieces of later syntax are reserved and rejected as not supported
// yet: a `|` after the head, where conditions will go (task 7.3 of
// docs/calculator-plan.md), and a `[` directly after a function's name,
// where dimension variables would (issue #133). A function takes one
// parameter for now (task 7.2 adds several).
//
// Spans are offsets into the whole text, not the line, so an error anywhere
// in the pipeline can be shown against the file as the user sees it. Each
// definition carries the span of its whole text, from name to body, for the
// errors `buildTable` reports against a definition as a whole (a duplicate
// name, a cycle, a prefix that is not dimensionless), and its body carries
// its own spans for errors within it.

import type { Role } from "./dimension.ts";
import {
  NAME,
  expr,
  token,
  unitListOf,
  ws,
  type Expr,
  type Rejection,
} from "./expr.ts";
import {
  alt,
  check,
  flatMap,
  many,
  map,
  optional,
  parse,
  regex,
  seq,
  spanned,
  string,
  type ParseError,
  type Parser,
  type Reply,
} from "./parser.ts";
import { err, type Result } from "./result.ts";
import type { Span } from "./span.ts";

// ---------------------------------------------------------------------------
// Types

export type Definition =
  /** A base unit. Dimension primitives are physical; kind primitives are dimensionless markers. */
  | {
      readonly kind: "primitive";
      readonly name: string;
      readonly role: Role;
      readonly span: Span;
    }
  /** A prefix, written with a trailing dash; `name` is without it. */
  | {
      readonly kind: "prefix";
      readonly name: string;
      readonly body: Expr;
      readonly span: Span;
    }
  /** A unit defined by an expression. */
  | {
      readonly kind: "unit";
      readonly name: string;
      readonly body: Expr;
      readonly span: Span;
    }
  /** A unit list: its `items`, two or more, largest unit first. */
  | {
      readonly kind: "unitList";
      readonly name: string;
      readonly items: readonly UnitListItem[];
      readonly span: Span;
    }
  /**
   * A function: `body` is its value, in which `parameter` stands for the
   * argument; `result` is the result's annotation, when it has one.
   */
  | {
      readonly kind: "function";
      readonly name: string;
      readonly parameter: Parameter;
      readonly result: WrittenExpr | undefined;
      readonly body: Expr;
      readonly span: Span;
    }
  /**
   * The inverse of the function `name` (written `~name`): `body` is the
   * argument that gives the value `parameter` stands for.
   */
  | {
      readonly kind: "inverse";
      readonly name: string;
      readonly parameter: string;
      readonly body: Expr;
      readonly span: Span;
    };

/** A function's parameter: its `name`, and its annotation when it has one. */
export type Parameter = {
  readonly name: string;
  readonly annotation: WrittenExpr | undefined;
};

/** An expression with the `text` it was written as. */
export type WrittenExpr = {
  readonly expr: Expr;
  readonly text: string;
};

/** One item of a unit list definition, with its `text` as written. */
export type UnitListItem = WrittenExpr;

/** Why the definitions grammar rejects text it recognized: an expression's reasons, and a function head's. */
export type DefinitionRejection =
  | Rejection
  /** A number other than `1` in an annotation, which would read as a scale that conformance ignores. */
  | { readonly kind: "annotationScale" }
  /** A sum, difference, negation or call in an annotation, which names no unit. */
  | { readonly kind: "annotationNotUnits" }
  /** An annotation on an inverse's parameter, whose dimension is its function's result's. */
  | { readonly kind: "inverseAnnotation" }
  /** The `parameter` is named like a unit that its own head's annotations use, at the span. */
  | { readonly kind: "parameterNamesUnit"; readonly parameter: string }
  /** Syntax reserved for later: conditions after `|`, or dimension variables after `name[`. */
  | {
      readonly kind: "unsupported";
      readonly feature: "conditions" | "dimensionVariables";
    };

// ---------------------------------------------------------------------------
// Parsing

/**
 * Parses the whole of `text` as a definitions file, in the order written.
 * Names are not checked for duplicates: that is a property of the table,
 * and `buildTable` reports it.
 */
export function parseDefinitions(
  text: string,
): Result<readonly Definition[], ParseError<DefinitionRejection>> {
  return parse(file, text);
}

// ---------------------------------------------------------------------------
// Grammar

/**
 * A definition's name, with the dash that marks a prefix or the tilde that
 * marks an inverse, read as one token so that the error for a name
 * followed by the wrong thing is the same whichever it is. A function's
 * name is a plain name followed directly by `(`, which the definition
 * looks at after it.
 */
const headName: Parser<string> = regex(
  new RegExp(`~${NAME.source}|${NAME.source}-?`, "u"),
  "a name",
);

/** The whitespace between a name and its body, which must be there. */
const gap: Parser<string> = regex(/[ \t]+/, "a space");

function symbol(literal: string): Parser<string> {
  return token(string(literal));
}

const primitive: Parser<{ role: Role; end: number }> = token(
  map(
    spanned(seq(string("!"), optional(string("kind")))),
    ({ value: [, kind], span }) => ({
      role: kind === undefined ? "dimension" : "kind",
      end: span.end,
    }),
  ),
);

/** An expression with the text it was parsed from; a parser needs the text. */
const item: Parser<WrittenExpr, Rejection> = (
  text,
  pos,
): Reply<WrittenExpr, Rejection> => {
  const reply = expr(text, pos);
  if (!reply.ok) return reply;
  const { span } = reply.value;
  return {
    ...reply,
    value: { expr: reply.value, text: text.slice(span.start, span.end) },
  };
};

/** The body of a unit definition, with where it ends. */
type UnitBody =
  | {
      readonly kind: "primitive";
      readonly role: Role;
      readonly end: number;
    }
  | { readonly kind: "unit"; readonly body: Expr; readonly end: number }
  | {
      readonly kind: "unitList";
      readonly items: readonly UnitListItem[];
      readonly end: number;
    };

const unitBody: Parser<UnitBody, Rejection> = alt(
  map(primitive, ({ role, end }): UnitBody => ({
    kind: "primitive",
    role,
    end,
  })),
  map(unitListOf(item), (items): UnitBody => {
    const [first, ...rest] = items;
    const last = rest[rest.length - 1];
    return last === undefined
      ? { kind: "unit", body: first.expr, end: first.expr.span.end }
      : { kind: "unitList", items, end: last.expr.span.end };
  }),
);

/** A rejection of the text at `span`, for `reason`. */
function rejected<A>(
  span: Span,
  reason: DefinitionRejection,
): Reply<A, DefinitionRejection> {
  return { ok: false, error: { kind: "rejected", span, reason } };
}

/**
 * Where `annotation`, whose text is `text`, is more than a unit
 * expression, and why, or `undefined` when it is one: unit names,
 * products, quotients and powers of them, and the number `1`.
 */
function notUnits(
  annotation: Expr,
  text: string,
): { readonly span: Span; readonly reason: DefinitionRejection } | undefined {
  const { node, span } = annotation;
  switch (node.kind) {
    case "unit":
      return undefined;
    case "number":
      return text.slice(span.start, span.end).trim() === "1"
        ? undefined
        : { span, reason: { kind: "annotationScale" } };
    case "binary":
      if (node.op === "add" || node.op === "sub") {
        return { span, reason: { kind: "annotationNotUnits" } };
      }
      return notUnits(node.left, text) ?? notUnits(node.right, text);
    case "pow":
      return notUnits(node.base, text);
    case "neg":
    case "call":
      return { span, reason: { kind: "annotationNotUnits" } };
  }
}

/** An annotation: a unit expression, with its text, rejected where it is more. */
const annotation: Parser<WrittenExpr, DefinitionRejection> = (text, pos) => {
  const reply = item(text, pos);
  if (!reply.ok) return reply;
  const fault = notUnits(reply.value.expr, text);
  return fault === undefined ? reply : rejected(fault.span, fault.reason);
};

/** The unit names an annotation uses, each at its span. */
function unitNames(e: Expr): readonly { name: string; span: Span }[] {
  const { node, span } = e;
  switch (node.kind) {
    case "unit":
      return [{ name: node.name, span }];
    case "binary":
      return [...unitNames(node.left), ...unitNames(node.right)];
    case "pow":
      return unitNames(node.base);
    case "neg":
      return unitNames(node.operand);
    case "number":
    case "call":
      return [];
  }
}

/** A `:` and an annotation. */
const annotated: Parser<WrittenExpr, DefinitionRejection> = map(
  seq(symbol(":"), annotation),
  ([, written]) => written,
);

/** The place of conditions after a head, rejected until they are supported. */
const conditionsReserved: Parser<undefined, DefinitionRejection> = map(
  optional(
    check(symbol("|"), () =>
      err<DefinitionRejection>({ kind: "unsupported", feature: "conditions" }),
    ),
  ),
  () => undefined,
);

/** What follows a function's name: the parameter, the result's annotation, `=` and the body. */
type FunctionRest = {
  readonly parameter: Parameter;
  readonly result: WrittenExpr | undefined;
  readonly body: Expr;
};

const functionRest: Parser<FunctionRest, DefinitionRejection> = map(
  seq(
    symbol("("),
    token(regex(NAME, "a parameter name")),
    optional(annotated),
    symbol(")"),
    optional(annotated),
    conditionsReserved,
    symbol("="),
    expr,
  ),
  ([, name, parameterAnnotation, , result, , , body]) => ({
    parameter: { name, annotation: parameterAnnotation },
    result,
    body,
  }),
);

/**
 * `functionRest`, with the head's annotations checked against the
 * parameter's name: a unit of that name in them is rejected at its span.
 */
const checkedFunctionRest: Parser<FunctionRest, DefinitionRejection> = (
  text,
  pos,
) => {
  const reply = functionRest(text, pos);
  if (!reply.ok) return reply;
  const { parameter, result } = reply.value;
  for (const written of [parameter.annotation, result]) {
    if (written === undefined) continue;
    const shadowed = unitNames(written.expr).find(
      (unit) => unit.name === parameter.name,
    );
    if (shadowed !== undefined) {
      return rejected(shadowed.span, {
        kind: "parameterNamesUnit",
        parameter: parameter.name,
      });
    }
  }
  return reply;
};

/** What follows an inverse's name: its parameter, `=` and the body. */
const inverseRest: Parser<
  { readonly parameter: string; readonly body: Expr },
  DefinitionRejection
> = map(
  seq(
    symbol("("),
    token(regex(NAME, "a parameter name")),
    optional(
      check(annotated, () =>
        err<DefinitionRejection>({ kind: "inverseAnnotation" }),
      ),
    ),
    symbol(")"),
    conditionsReserved,
    symbol("="),
    expr,
  ),
  ([, parameter, , , , , body]) => ({ parameter, body }),
);

const definition: Parser<Definition, DefinitionRejection> = flatMap(
  spanned(headName),
  ({
    value: written,
    span: { start },
  }): Parser<Definition, DefinitionRejection> => {
    if (written.startsWith("~")) {
      return map(inverseRest, ({ parameter, body }): Definition => ({
        kind: "inverse",
        name: written.slice(1),
        parameter,
        body,
        span: { start, end: body.span.end },
      }));
    }
    if (written.endsWith("-")) {
      return map(seq(gap, expr), ([, body]): Definition => ({
        kind: "prefix",
        name: written.slice(0, -1),
        body,
        span: { start, end: body.span.end },
      }));
    }
    const fn = map(checkedFunctionRest, (parsed): Definition => ({
      kind: "function",
      name: written,
      ...parsed,
      span: { start, end: parsed.body.span.end },
    }));
    const unit = map(seq(gap, unitBody), ([, parsed]): Definition => {
      const span = { start, end: parsed.end };
      switch (parsed.kind) {
        case "primitive":
          return { kind: "primitive", name: written, role: parsed.role, span };
        case "unit":
          return { kind: "unit", name: written, body: parsed.body, span };
        case "unitList":
          return { kind: "unitList", name: written, items: parsed.items, span };
      }
    });
    return (text, pos) => {
      if (text[pos] === "(") return fn(text, pos);
      if (text[pos] === "[") {
        return rejected(
          { start, end: pos + 1 },
          {
            kind: "unsupported",
            feature: "dimensionVariables",
          },
        );
      }
      return unit(text, pos);
    };
  },
);

const comment: Parser<string> = regex(/#[^\n]*/, "a comment");
const newline: Parser<string> = regex(/\r?\n/, "a newline");

const line: Parser<Definition | undefined, DefinitionRejection> = map(
  seq(ws, optional(definition), optional(comment)),
  ([, def]) => def,
);

const file: Parser<readonly Definition[], DefinitionRejection> = map(
  seq(line, many(seq(newline, line))),
  ([first, rest]) =>
    [first, ...rest.map(([, def]) => def)].filter(
      (def): def is Definition => def !== undefined,
    ),
);
