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
//
// The grammar:
//
//   file       := line ("\n" line)*
//   line       := ws definition? comment?
//   definition := name " "+ body
//   body       := "!" "kind"?              only for a unit name
//               | unitList                 (expr.ts)
//
// A name is a unit name as expr.ts defines it, with a trailing `-` making it
// a prefix. The whitespace after the name is required, so that `inch2.54`
// is an error rather than the definition of `inch2`. A prefix must have an
// expression body: a primitive prefix means nothing, and neither does a
// prefix that is a list. A body that is a unit list of two or more items
// defines a unit list, the same thing the user may type as `want`
// (`ft;in`), under a name; a list of one item is an ordinary unit
// definition, since a list of one converts as the unit does. Each item
// keeps the text it was written as, since that is what the converter shows
// beside its term (`1 m ≈ 3 ft + 3.37 in`), and the table has no other
// way to get at it.
//
// Spans are offsets into the whole text, not the line, so an error anywhere
// in the pipeline can be shown against the file as the user sees it. Each
// definition carries the span of its whole text, from name to body, for the
// errors `buildTable` reports against a definition as a whole (a duplicate
// name, a cycle, a prefix that is not dimensionless), and its body carries
// its own spans for errors within it.

import { type Role } from "./dimension.ts";
import { NAME, expr, token, unitListOf, ws, type Expr } from "./expr.ts";
import {
  alt,
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
import { type Result } from "./result.ts";
import { type Span } from "./span.ts";

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
    };

/** One item of a unit list definition, with its `text` as written. */
export type UnitListItem = {
  readonly expr: Expr;
  readonly text: string;
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
): Result<readonly Definition[], ParseError> {
  return parse(file, text);
}

// ---------------------------------------------------------------------------
// Grammar

/** A definition name, with the dash that marks a prefix. */
const name: Parser<string> = regex(
  new RegExp(`${NAME.source}-?`, "u"),
  "a name",
);

/** The whitespace between a name and its body, which must be there. */
const gap: Parser<string> = regex(/[ \t]+/, "a space");

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
const item: Parser<UnitListItem> = (text, pos): Reply<UnitListItem> => {
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

const unitBody: Parser<UnitBody> = alt(
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

const definition: Parser<Definition> = flatMap(
  spanned(name),
  ({ value: written, span: { start } }) =>
    written.endsWith("-")
      ? map(seq(gap, expr), ([, body]): Definition => ({
          kind: "prefix",
          name: written.slice(0, -1),
          body,
          span: { start, end: body.span.end },
        }))
      : map(seq(gap, unitBody), ([, parsed]): Definition => {
          const span = { start, end: parsed.end };
          switch (parsed.kind) {
            case "primitive":
              return {
                kind: "primitive",
                name: written,
                role: parsed.role,
                span,
              };
            case "unit":
              return { kind: "unit", name: written, body: parsed.body, span };
            case "unitList":
              return {
                kind: "unitList",
                name: written,
                items: parsed.items,
                span,
              };
          }
        }),
);

const comment: Parser<string> = regex(/#[^\n]*/, "a comment");
const newline: Parser<string> = regex(/\r?\n/, "a newline");

const line: Parser<Definition | undefined> = map(
  seq(ws, optional(definition), optional(comment)),
  ([, def]) => def,
);

const file: Parser<readonly Definition[]> = map(
  seq(line, many(seq(newline, line))),
  ([first, rest]) =>
    [first, ...rest.map(([, def]) => def)].filter(
      (def): def is Definition => def !== undefined,
    ),
);
