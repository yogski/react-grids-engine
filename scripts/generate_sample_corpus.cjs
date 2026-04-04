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
/**
 * Generate a sample corpus JSONL file. Tries system dictionary first, falls back to
 * pseudo-word generation when needed.
 * @returns {Promise<void>}
 */
async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node scripts/generate_sample_corpus.cjs [out.jsonl] [--debug]');
    console.log('Generates a sample corpus JSONL file for crossword filling (default: scripts/sample_corpus.jsonl)');
    console.log('Options: --debug|-d  Enable debug output');
    process.exit(0);
  }
  const debug = argv.includes('--debug') || argv.includes('-d');
  function logDebug(...args) { if (debug) console.error('[sample-corpus-debug]', ...args); }
  const out = argv[0] || path.join(__dirname, 'sample_corpus.jsonl');
  const targetCount = 7000;

  // Try to read system dictionary first
  let words = [];
  try {
    const dictPath = '/usr/share/dict/words';
    if (fs.existsSync(dictPath)) {
      const data = fs.readFileSync(dictPath, 'utf8');
      words = data.split(/\r?\n/).map(sanitizeWord).filter(Boolean);
      // keep only words between 2 and 15 characters
      words = words.filter(w => w.length >= 2 && w.length <= 15);
      logDebug('Filtered system dictionary to length 2-15', words.length);
    }
  } catch (e) {
    words = [];
  }

  // If not enough words, generate pseudo-words from syllables
  if (!words || words.length < 200) {
    const syllables = ['a','i','u','e','o','ba','be','bi','bo','bu','ca','co','da','de','di','do','fa','fi','fo','ga','ge','gi','ha','he','hi','ja','ka','la','le','li','lo','ma','me','mi','na','ne','no','pa','pe','pi','po','ra','re','ri','ro','sa','se','si','so','ta','te','ti','to','va','ve','vi','vo','ya','ye','yo','ir','mif','pel','tri','ap','as','ul','vep','lew','is','on','un','ex','qu','sto','gri','fla','pro','con','ver','sio','na','lo','mi','ra','ta','ze','em','ew','ix','or','um','al','en','in','op','ur','av','el','at','gol','kor','luk','mol','por','tuy','mle','gro', 'kro', 'slo', 'dru', 'flim', 'blor', 'zog', 'wem', 'yul', 'two', 'emp','ogh', 'lang', 'ling', 'song', 'pind', 'tang', 'blit', 'crim', 'ell'];
    const gen = new Set();
    // generate pseudo-words but ensure length between 2 and 15
    while (gen.size < 7000) {
      const parts = randInt(1, 6); // 1 to 6 syllables
      let w = '';
      for (let i = 0; i < parts; i++) w += pick(syllables);
      const sw = sanitizeWord(w);
      if (sw.length >= 2 && sw.length <= 15) gen.add(sw);
    }
    words = Array.from(gen);
    logDebug('Generated pseudo-words', words.length);
  }

  // prepare JSONL entries with simple clues and metadata
  const themes = ['general', 'science', 'literature', 'sports', 'tech', 'food', 'geography'];
  const outStream = fs.createWriteStream(out, { flags: 'w' });
  const used = new Set();
  let written = 0;
  for (let i = 0; written < targetCount && i < words.length * 3; i++) {
    const w = words[i % words.length];
    const word = sanitizeWord(w);
    // only accept words length 2..15
    if (!word || word.length < 2 || word.length > 15 || used.has(word)) continue;
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
    if (debug && written % 1000 === 0) logDebug('written entries', written);
  }
  outStream.end();
  console.log(`Wrote ${written} entries to ${out}`);
  logDebug('Finished write', { written });
}

if (require.main === module) main().catch(err => {
  console.error({ error: String(err) });
  process.exit(1);
});
