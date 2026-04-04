#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');

/**
 * Return a random integer between min and max (inclusive).
 * @param {number} min - Minimum integer (inclusive).
 * @param {number} max - Maximum integer (inclusive).
 * @returns {number}
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array.
 * @template T
 * @param {T[]} arr - Array to pick from.
 * @returns {T|undefined}
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Sanitize a word by removing non-letter characters and lowercasing.
 * @param {string} w - Raw input word.
 * @returns {string} Sanitized word.
 */
function sanitizeWord(w) {
  return w.replace(/[^a-zA-Z]/g, '').toLowerCase();
}

/**
 * Generate a sample corpus JSONL file. Tries system dictionary first, falls back to
 * pseudo-word generation when needed.
 * @returns {Promise<void>}
 */
async function main() {
  const argv = process.argv.slice(2);
  const out = argv[0] || path.join(__dirname, 'sample_corpus.jsonl');
  const targetCount = 7000;

  // Try to read system dictionary first
  let words = [];
  try {
    const dictPath = '/usr/share/dict/words';
    if (fs.existsSync(dictPath)) {
      const data = fs.readFileSync(dictPath, 'utf8');
      words = data.split(/\r?\n/).map(sanitizeWord).filter(Boolean);
    }
  } catch (e) {
    words = [];
  }

  // If not enough words, generate pseudo-words from syllables
  if (!words || words.length < 200) {
    const syllables = ['a','i','u','e','o','ba','be','bi','bo','bu','ca','co','da','de','di','do','fa','fi','fo','ga','ge','gi','ha','he','hi','ja','ka','la','le','li','lo','ma','me','mi','na','ne','no','pa','pe','pi','po','ra','re','ri','ro','sa','se','si','so','ta','te','ti','to','va','ve','vi','vo','ya','ye','yo','ir','mif','pel','tri','ap','as','ul','vep','lew','is','on','un','ex','qu','sto','gri','fla','pro','con','ver','sio','na','lo','mi','ra','ta','ze','em','ew','ix','or','um','al','en','in','op','ur','av','el','at','gol','kor','luk','mol','por','tuy','mle','gro', 'kro', 'slo', 'dru', 'flim', 'blor', 'zog', 'wem', 'yul', 'two', 'emp','ogh', 'lang', 'ling', 'song', 'pind', 'tang', 'blit', 'crim', 'ell'];
    const gen = new Set();
    while (gen.size < 7000) {
      const parts = randInt(2, 4);
      let w = '';
      for (let i = 0; i < parts; i++) w += pick(syllables);
      gen.add(w);
    }
    words = Array.from(gen);
  }

  // prepare JSONL entries with simple clues and metadata
  const themes = ['general', 'science', 'literature', 'sports', 'tech', 'food', 'geography'];
  const outStream = fs.createWriteStream(out, { flags: 'w' });
  const used = new Set();
  let written = 0;
  for (let i = 0; written < targetCount && i < words.length * 3; i++) {
    const w = words[i % words.length];
    const word = sanitizeWord(w);
    if (!word || word.length < 3 || used.has(word)) continue;
    used.add(word);
    const entry = {
      word,
      clue: `Clue for ${word}`,
      difficulty: randInt(1, 5),
      obscurity: randInt(1, 5),
      language: 'English',
      theme: pick(themes)
    };
    outStream.write(JSON.stringify(entry) + '\n');
    written++;
  }
  outStream.end();
  console.log(`Wrote ${written} entries to ${out}`);
}

if (require.main === module) main().catch(err => {
  console.error({ error: String(err) });
  process.exit(1);
});
