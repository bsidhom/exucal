// A location in the input text. The parsers attach one to every node they
// build, and every later stage (evaluation, table building, conversion) puts
// one on each error it reports, so that the UI can point at the text that
// caused it. That is why this is its own module: it is not a parsing concept
// but a shared vocabulary between the parsers and everything after them.

/**
 * A range of the input as character offsets: `start` inclusive, `end`
 * exclusive.
 */
export type Span = { readonly start: number; readonly end: number };
