Crossword generator scripts

- `generate_sample_corpus.cjs` — generates a sample corpus file `sample_corpus.jsonl` (~1000 entries).
- `generate_crossword.cjs` — main crossword generator. Usage:

```
node scripts/generate_crossword.cjs --size 15x15 --corpus scripts/sample_corpus.jsonl --symmetry A --density 3 --output out.json
```

The generator uses only Node.js built-in modules and writes a JSON crossword structure compatible with the spec.
