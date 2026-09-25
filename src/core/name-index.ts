// An index over a set of names for finding every name that starts with a
// given text. The names are kept sorted, so that those starting with any
// text are contiguous: a binary search finds the first of them and a scan
// runs to the last, at a cost proportional to the number found. The
// ambiguity check in `names.ts` uses it to try, for each extension of one
// prefix into another, only the units that could complete it rather than
// every unit. A trie would serve as well; sorting is simpler, and an index
// is built once per check.
//
// The order is that of the UTF-16 code units, which is what `sort` with no
// comparator and `<` on strings compare by and what `startsWith` matches
// by, so the three agree on every string, in any script.

/** Names in code-unit order; build one with `indexNames`. */
export type NameIndex = { readonly sorted: readonly string[] };

export function indexNames(names: Iterable<string>): NameIndex {
  return { sorted: [...names].sort() };
}

/**
 * Every name in `index` that starts with `start`, in order; for an empty
 * `start`, every name.
 */
export function namesStartingWith(
  index: NameIndex,
  start: string,
): readonly string[] {
  const { sorted } = index;
  // The first name that is not less than `start`: where a match would begin.
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (sorted[middle] < start) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  let end = low;
  while (end < sorted.length && sorted[end].startsWith(start)) end++;
  return sorted.slice(low, end);
}
