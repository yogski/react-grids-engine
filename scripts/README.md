Crossword generator scripts

- `generate_sample_corpus.cjs` — generates a sample corpus file `sample_corpus.jsonl` (~1000 entries).
- `generate_crossword.cjs` — main crossword generator. Usage:

```
node scripts/generate_crossword.cjs --size 15x15 --corpus scripts/sample_corpus.jsonl --symmetry A --density 3 --output out.json
```

The generator uses only Node.js built-in modules and writes a JSON crossword structure compatible with the spec.

## Pattern replacement helper

The generator exposes a helper `replaceSubgridMatches(grid, pattern, replacements, options)` that scans a grid
for a small `pattern` and substitutes matches with one of the provided `replacements`. Example pattern and
replacements (2x2) shown here:

Pattern (match this 2x2 block):

0 0
0 0

Possible replacements (one chosen at random):

0 1   or   1 1
0 1        0 0

Usage example (Node):

```
const g = require('./generate_crossword.cjs');
const count = g.replaceSubgridMatches(grid, [[0,0],[0,0]], [ [[0,1],[0,1]], [[1,1],[0,0]] ], { allowOverlap: false, maxPasses: 1 });
```

This is useful to replace locally-unnatural 2x2 white blocks or other undesirable subpatterns with
alternative arrangements during layout grooming.
