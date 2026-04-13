#!/usr/bin/env node
"use strict";

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { log } = require('console');

// Global debug flag controlled by CLI `--debug`. Set in `main()`.
let DEBUG = false;

/**
 * Conditional debug logger. Prints to stderr when `DEBUG` is true.
 * @param {...any} args
 */
function logDebug(...args) { if (DEBUG) console.error('[debug]', ...args); }

/**
 * Print the grid as rows of binary values (1 = black/non-playable, 0 = white/playable),
 * with cells separated by spaces for visual consistency.
 * @param {number[][]} grid
 */
function printGrid(grid) {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y].map(v => (v ? '1' : '0')).join(' ');
    console.log(row);
  }
}

/**
 * Return a random integer between min and max (inclusive).
 * @param {number} min - Minimum integer (inclusive).
 * @param {number} max - Maximum integer (inclusive).
 * @returns {number} Random integer between min and max.
 */
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/**
 * Pick a random element from an array.
 * @template T
 * @param {T[]} arr - Array to pick from.
 * @returns {T|undefined} Random element or undefined if array empty.
 */
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * Print an error object as JSON to stderr and exit with code 1.
 * @param {string|Error|any} msg - Error message or object to print.
 * @returns {never}
 */
function exitWithError(msg) {
  const out = { error: String(msg) };
  console.error(JSON.stringify(out));
  process.exit(1);
}

/**
 * Parse CLI arguments into a simple options object.
 * Supports `--key value`, `--key=value`, `--flag` and `-k value`.
 * @returns {Object<string, any>} Parsed options.
 */
function parseArgs() {
  const argv = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--selftest') { opts.selftest = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (key.includes('=')) {
        const [k, v] = key.split('='); opts[k] = v; continue;
      }
      const nxt = argv[i + 1];
      if (nxt && !nxt.startsWith('-')) { opts[key] = nxt; i++; } else { opts[key] = true; }
    } else if (a.startsWith('-')) {
      const k = a.slice(1);
      const nxt = argv[i + 1];
      if (nxt && !nxt.startsWith('-')) { opts[k] = nxt; i++; } else { opts[k] = true; }
    }
  }
  return opts;
}

/**
 * Parse a size string like "15x15" into width/height.
 * @param {string} sz - Size string in the form WxH.
 * @returns {{w:number,h:number}|null} Parsed dimensions or null if invalid.
 */
function parseSize(sz) {
  const m = String(sz).match(/^(\d+)x(\d+)$/i);
  if (!m) return null;
  return { w: parseInt(m[1], 10), h: parseInt(m[2], 10) };
}

/**
 * Create a 2D grid (array of rows) initialized with `initial` value.
 * @param {number} w - Grid width (columns).
 * @param {number} h - Grid height (rows).
 * @param {number} [initial=1] - Initial value for each cell.
 * @returns {number[][]} Grid as `rows x columns` array.
 */
function createGrid(w, h, initial = 1) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => initial));
}

/**
 * Check whether the coordinates (x,y) are within grid bounds.
 * @param {number} x - X coordinate (column).
 * @param {number} y - Y coordinate (row).
 * @param {number} w - Grid width.
 * @param {number} h - Grid height.
 * @returns {boolean} True if in bounds.
 */
function inBounds(x, y, w, h) { return x >= 0 && y >= 0 && x < w && y < h; }

/**
 * Compute the working area for layout generation based on symmetry option.
 * @param {string} sym - Symmetry code (A,B,C,D,E).
 * @param {number} w - Grid width.
 * @param {number} h - Grid height.
 * @returns {{x:number,y:number,w:number,h:number}} Rectangle for work area.
 */
function workAreaFor(sym, w, h) {
  let workArea = { x: 0, y: 0, w, h };
  switch (sym) {
    case 'A': break;
    case 'B': {
      workArea = { x: 0, y: 0, w: Math.ceil(w / 2), h: Math.ceil(h / 2) }; break;
    };
    case 'C': {
      workArea = { x: 0, y: 0, w: Math.floor(w / 2), h }; break;
    }
    case 'D': {
      workArea = { x: 0, y: 0, w: Math.floor(w / 2), h }; break;
    }
    case 'E': {
      workArea = { x: 0, y: 0, w: Math.floor(w / 2), h: Math.floor(h / 2) }; break;
    }
    default: // no changes;
  }
  logDebug('workAreaFor', { sym, workArea });
  return workArea;
}

/**
 * Set the cell at (x,y) and the symmetric counterparts depending on `sym`.
 * Modifies `grid` in-place.
 * @param {number[][]} grid - Grid array (rows x cols).
 * @param {number} x - X coordinate (column) to set.
 * @param {number} y - Y coordinate (row) to set.
 * @param {number} val - Value to set (0 = white/playable, 1 = black/non-playable).
 * @param {string} sym - Symmetry code ('A','B','C','D','E').
 * @returns {void}
 */
function applySymmetrySet(grid, x, y, val, sym) {
  const h = grid.length; const w = grid[0].length;
  /**
   * Set a cell if coordinates are in bounds.
   * @param {number} nx - X coordinate.
   * @param {number} ny - Y coordinate.
   * @returns {void}
   */
  function setIf(nx, ny) {
    if (!inBounds(nx, ny, w, h)) return;
    grid[ny][nx] = val;
    // logDebug('applySymmetrySet -> set', { nx, ny, val, sym });
  }
  switch (sym) {
    case 'A': setIf(x, y); break;
    case 'D': // mirror vertical
      setIf(x, y); setIf(w - 1 - x, y); break;
    case 'E': // mirror vertical+horizontal
      setIf(x, y); setIf(w - 1 - x, y); setIf(x, h - 1 - y); setIf(w - 1 - x, h - 1 - y); break;
    case 'C': // rotation 180
      setIf(x, y); setIf(w - 1 - x, h - 1 - y); break;
    case 'B': // rotation 90 requires square
      setIf(x, y);
      setIf(h - 1 - y, x);
      setIf(w - 1 - x, h - 1 - y);
      setIf(y, w - 1 - x);
      break;
    default: setIf(x, y); break;
  }
}

/**
 * Convert the grid to a hex string where each bit represents a cell (1 = black, 0 = white).
 * Bits are concatenated in row-major order and padded to a full byte before hex encoding.
 * @param {number[][]} grid - Grid array (rows x cols).
 * @returns {string} Uppercase hex string representing the grid bitmap.
 */
function gridToHex(grid) {
  const w = grid[0].length, h = grid.length;
  const bits = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) bits.push(grid[y][x] ? '1' : '0');
  // pad to full byte
  while (bits.length % 8 !== 0) bits.push('0');
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8).join(''), 2);
    bytes.push(byte);
  }
  return Buffer.from(bytes).toString('hex').toUpperCase();
}

/**
 * Print CLI help for the crossword generator and exit.
 * @returns {void}
 */
function printHelp() {
  console.log('Usage: node scripts/generate_crossword.cjs --size <WxH> --corpus <path> [options]');
  console.log('Options:');
  console.log('  --size <WxH>            Grid dimensions, e.g., 15x15 (required)');
  console.log('  --corpus <path>         Path to corpus file (JSONL or plaintext) (required)');
  console.log('  --symmetry <A|B|C|D|E>  Symmetry code (choose one):');
  console.log('    A — none: no symmetry, the whole grid is generated independently (default)');
  console.log('    B — rotation-90: 4-way rotational symmetry (requires square grid)');
  console.log('    C — rotation-180: 180° rotational symmetry (cells paired across center)');
  console.log('    D — mirror-vertical: reflect left↔right across the vertical axis');
  console.log('    E — mirror-both: reflect across vertical and horizontal axes (4-way mirror)');
  console.log('  --density <1-5>         Slot density (1 sparsest..5 densest). Default: 3');
  console.log('  --difficulty <1-5>      Difficulty level (1 easiest..5 hardest). Default: 3');
  console.log('  --obscurity <1-5>       Obscurity level (1 least..5 most). Default: 2');
  console.log('  --min <n>               Minimum word length. Default: 3');
  console.log('  --max <n>               Maximum word length. Default: min(width,height,12)');
  console.log('  --lang <code>           Language for clues (default: English)');
  console.log('  --theme <name>          Theme/category for clues (default: mixed)');
  console.log('  --output <path>         Output file path (if omitted prints to stdout)');
  console.log('  --attempts <n>          Number of layout+fill attempts. Default: 60');
  console.log('  --debug                 Enable debug logging (verbose)');
  console.log('  --selftest              Run internal self-test (generates sample corpus if needed)');
  console.log('  --help, -h              Show this help text');
  console.log('Examples:');
  console.log('  node scripts/generate_crossword.cjs --size 15x15 --corpus scripts/sample_corpus.jsonl --output out.json');
  console.log('  node scripts/generate_crossword.cjs --size 9x9 --corpus scripts/sample_corpus.jsonl --debug');
}

/**
 * Compute the average pairwise Manhattan distance for an array of points.
 * @param {{x:number,y:number}[]} points - Array of points with x/y coordinates.
 * @returns {number} Average Manhattan distance between all distinct point pairs.
 */
function computeAveragePairwiseManhattan(points) {
  const n = points.length; if (n < 2) return Infinity;
  let sum = 0, pairs = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { sum += computeManhattanDistance(points[i], points[j]); pairs++; }
  return sum / Math.max(1, pairs);
}

/**
 * Compute the Manhattan distance between two points.
 * @param {{x:number,y:number} p1 - First point.
 * @param {{x:number,y:number} p2 - Second point.
 * @return {number} Manhattan distance |p1.x - p2.x| + |p1.y - p2.y|.
 * 
 */
function computeManhattanDistance(p1, p2) { 
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y); 
}

/**
 * List coordinates at a specific Manhattan distance from a given point.
 * @param {{x:number,y:number}} point - The reference point.
 * @param {number} distance - The Manhattan distance.
 * @returns {{x:number,y:number}[]} Array of coordinates at the specified distance.
 */
function listCoordinatesWithManhattanDistance(point, distance) {
  const coords = [];
  const d = Number(distance);
  if (!Number.isFinite(d) || d < 0) return coords;
  for (let dx = -d; dx <= d; dx++) {
    const dyAbs = d - Math.abs(dx);
    if (dyAbs < 0) continue;
    // two possible signs for dy (unless zero)
    const x1 = point.x + dx;
    const y1 = point.y + dyAbs;
    coords.push({ x: x1, y: y1 });
    if (dyAbs !== 0) {
      const x2 = point.x + dx;
      const y2 = point.y - dyAbs;
      coords.push({ x: x2, y: y2 });
    }
  }
  // unique
  const seen = new Set();
  return coords.filter(c => {
    const k = `${c.x},${c.y}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

/**
 * Filter coordinates that fall within a specified area.
 * @param {{x:number,y:number}[]} coords - Array of coordinates to filter.
 * @param {{x:number,y:number,w:number,h:number}} area - Area rectangle.
 * @returns {{x:number,y:number}[]} Filtered coordinates within the area.
 */
function filterCoordinatesInArea(coords, area) {
  return coords.filter(c => c.x >= area.x && c.x < area.x + area.w && c.y >= area.y && c.y < area.y + area.h);
}

/**
 * Check that all white cells (value 0) form a single orthogonally-connected region
 * and that no white cell is isolated (each white cell has at least one orthogonal white neighbor).
 * @param {number[][]} grid - Grid array (rows x cols) with 0 = white, 1 = black.
 * @returns {boolean} True when white cells are connected and none are isolated.
 */
function areWhiteCellsConnected(grid) {
  if (!grid || !grid.length) return false;
  const h = grid.length, w = grid[0].length;
  const whites = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (grid[y][x] === 0) whites.push({ x, y });
  if (whites.length === 0) return false;

  // ensure no isolated white cell (must have at least one orthogonal white neighbor)
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const c of whites) {
    let hasNeighbor = false;
    for (const [dx, dy] of dirs) {
      const nx = c.x + dx, ny = c.y + dy;
      if (inBounds(nx, ny, w, h) && grid[ny][nx] === 0) { hasNeighbor = true; break; }
    }
    if (!hasNeighbor) {
      if (DEBUG) logDebug('areWhiteCellsConnected -> isolated cell', c);
      return false;
    }
  }

  // BFS/ flood-fill from first white cell
  const start = whites[0];
  const q = [start];
  const seen = new Set([`${start.x},${start.y}`]);
  while (q.length) {
    const cur = q.shift();
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (!inBounds(nx, ny, w, h)) continue;
      if (grid[ny][nx] !== 0) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      q.push({ x: nx, y: ny });
    }
  }
  if (DEBUG) logDebug('areWhiteCellsConnected', { whiteCount: whites.length, reached: seen.size });
  return seen.size === whites.length;
}

/**
 * Replace occurrences of a subgrid `pattern` inside `grid` with one of the
 * provided `replacements`. Matching is exact unless a pattern cell is `null`
 * (treated as a wildcard that matches any value).
 * The function modifies `grid` in-place.
 *
 * Options:
 * - `allowOverlap` (default: true) — whether replacements can overlap in the same pass.
 * - `maxReplacements` (default: Infinity) — stop after this many replacements.
 * - `maxPasses` (default: 1) — number of full scans to perform (use >1 to cascade changes).
 *
 * @param {number[][]} grid - Main grid (modified in-place).
 * @param {number[][]} pattern - Pattern to match (rows x cols). Use `null` for wildcard.
 * @param {Array<number[][]>} replacements - Array of replacement patterns (same dims as `pattern`).
 * @param {{allowOverlap?:boolean,maxReplacements?:number,maxPasses?:number}} [options]
 * @returns {number} Number of replacements applied.
 */
function replaceSubgridMatches(grid, pattern, replacements, options = {}) {
  if (!grid || !grid.length) return 0;
  const h = grid.length, w = grid[0].length;
  if (!pattern || !pattern.length || !pattern[0].length) return 0;
  const pH = pattern.length, pW = pattern[0].length;
  if (!Array.isArray(replacements) || replacements.length === 0) return 0;
  for (const r of replacements) {
    if (!r || r.length !== pH) throw new Error('replacement height mismatch');
    for (let ry = 0; ry < pH; ry++) if (!Array.isArray(r[ry]) || r[ry].length !== pW) throw new Error('replacement width mismatch');
  }

  const { allowOverlap = true, maxReplacements = Infinity, maxPasses = 1 } = options;
  let total = 0;

  for (let pass = 0; pass < Math.max(1, Number(maxPasses)); pass++) {
    if (total >= maxReplacements) break;
    const replacedMask = Array.from({ length: h }, () => Array.from({ length: w }, () => false));
    let changedThisPass = false;

    for (let y = 0; y <= h - pH; y++) {
      for (let x = 0; x <= w - pW; x++) {
        if (!allowOverlap) {
          let overlap = false;
          for (let dy = 0; dy < pH && !overlap; dy++) {
            for (let dx = 0; dx < pW; dx++) {
              if (replacedMask[y + dy][x + dx]) { overlap = true; break; }
            }
          }
          if (overlap) continue;
        }

        // check pattern match (null in pattern = wildcard)
        let match = true;
        for (let dy = 0; dy < pH && match; dy++) {
          for (let dx = 0; dx < pW; dx++) {
            const pat = pattern[dy][dx];
            if (pat === null || pat === undefined) continue; // wildcard
            if (grid[y + dy][x + dx] !== pat) { match = false; break; }
          }
        }
        if (!match) continue;

        // choose a replacement
        const repl = replacements.length === 1 ? replacements[0] : pick(replacements);

        // apply replacement (null/undefined in replacement = keep existing cell)
        for (let dy = 0; dy < pH; dy++) {
          for (let dx = 0; dx < pW; dx++) {
            const val = repl[dy][dx];
            if (val === null || val === undefined) continue;
            grid[y + dy][x + dx] = val;
            replacedMask[y + dy][x + dx] = true;
          }
        }
        total++; changedThisPass = true;
        if (DEBUG) logDebug('replaceSubgridMatches applied', { x, y, total });
        if (total >= maxReplacements) break;
      }
      if (total >= maxReplacements) break;
    }
    if (!changedThisPass) break;
  }

  return total;
}

// Export helper functions for testing and external use
module.exports = Object.assign(module.exports || {}, { replaceSubgridMatches, areWhiteCellsConnected });

/**
 * Return scattering thresholds (average distance and target count) based on density.
 * @param {number} density - Density level (1-5).
 * @param {number} areaW - Work area width.
 * @param {number} areaH - Work area height.
 * @returns {{avg:number,count:number}} Thresholds used by the scattering algorithm.
 */
function scatteringThresholds(density, areaW, areaH) {
  switch (Number(density)) {
    case 1: return { avg: 4.5, count: Math.floor((areaW * areaH) * 0.20) };
    case 2: return { avg: 3.8, count: Math.floor((areaW * areaH) * 0.30) };
    case 3: return { avg: 3.0, count: Math.floor((areaW * areaH) * 0.40) };
    case 4: return { avg: 2.4, count: Math.floor((areaW * areaH) * 0.50) };
    case 5: return { avg: 1.8, count: Math.floor((areaW * areaH) * 0.60) };
    default: return { avg: 3.0, count: Math.floor((areaW * areaH) * 0.40) };
  }
}

/**
 * Scatter seed white cells within the specified work area and apply symmetry.
 * Seeds are placed with simple adjacency and repeat-position constraints.
 * @param {number[][]} grid - Grid to write into (modified in-place).
 * @param {{x:number,y:number,w:number,h:number}} area - Work area rectangle.
 * @param {number} density - Density level (1-5).
 * @param {string} sym - Symmetry code.
 * @returns {{x:number,y:number}[]} Array of placed seed coordinates.
 */
function scatterSeeds(grid, area, density, sym) {
  // Create a local work-grid for the area so we can build white regions
  const { x: ax, y: ay, w: aw, h: ah } = area;
  const workGrid = createGrid(aw, ah, 1);
  const seeds = [];
  const maxAttempts = 50000;
  let attempts = 0;
  const thresh = scatteringThresholds(density, aw, ah);
  const targetCount = Math.max(2, Math.min(Math.floor(thresh.count), aw * ah));
  logDebug('scatterSeeds start', { area, density, sym, thresh, targetCount });

  while (attempts++ < maxAttempts) {
    // initial seed: pick any free cell in the local work area
    if (seeds.length === 0) {
      const lx = randInt(0, Math.max(0, aw - 1));
      const ly = randInt(0, Math.max(0, ah - 1));
      if (workGrid[ly][lx] === 0) continue;
      workGrid[ly][lx] = 0;
      seeds.push({ x: ax + lx, y: ay + ly });
    } else {
      // self-correcting distance selection towards threshold.avg
      let upperBoundDistance = Math.max(aw, ah) - 2;
      const currAvg = computeAveragePairwiseManhattan(seeds);
      const target = Math.max(2, Math.min(upperBoundDistance, Math.round(thresh.avg) || 3));
      let distance = target + randInt(-1, 1);
      if (currAvg < thresh.avg) distance = Math.min(upperBoundDistance, distance + 1);
      else if (currAvg > thresh.avg) distance = Math.max(2, distance - 1);
      distance = Math.max(2, Math.min(upperBoundDistance, distance));

      // pick a base seed and generate candidates at the chosen distance
      const base = pick(seeds);
      let candidates = listCoordinatesWithManhattanDistance(base, distance);
      candidates = filterCoordinatesInArea(candidates, area);
      // filter out already used or adjacent cells
      candidates = candidates.filter(c => {
        const lx = c.x - ax, ly = c.y - ay;
        if (!inBounds(lx, ly, aw, ah)) return false;
        if (workGrid[ly][lx] === 0) return false;
        for (const s of seeds) if (Math.abs(s.x - c.x) + Math.abs(s.y - c.y) <= 1) return false;
        return true;
      });

      // if none found at that distance, try nearby distances before giving up
      if (!candidates.length) {
        const tried = new Set();
        for (let d = 2; d <= upperBoundDistance && candidates.length === 0; d++) {
          if (d === distance) continue;
          tried.add(d);
          let candD = listCoordinatesWithManhattanDistance(base, d);
          candD = filterCoordinatesInArea(candD, area);
          candD = candD.filter(c => {
            const lx = c.x - ax, ly = c.y - ay;
            if (!inBounds(lx, ly, aw, ah)) return false;
            if (workGrid[ly][lx] === 0) return false;
            for (const s of seeds) if (Math.abs(s.x - c.x) + Math.abs(s.y - c.y) <= 1) return false;
            return true;
          });
          if (candD.length) candidates = candD;
        }
      }

      if (!candidates.length) {
        // fallback: pick any random free cell
        let found = null;
        for (let t = 0; t < 200; t++) {
          const lx = randInt(0, Math.max(0, aw - 1));
          const ly = randInt(0, Math.max(0, ah - 1));
          if (workGrid[ly][lx] === 0) continue;
          const absX = ax + lx, absY = ay + ly;
          let adj = false;
          for (const s of seeds) if (Math.abs(s.x - absX) + Math.abs(s.y - absY) <= 1) { adj = true; break; }
          if (!adj) { found = { x: absX, y: absY }; break; }
        }
        if (found) {
          const lx = found.x - ax, ly = found.y - ay;
          workGrid[ly][lx] = 0; seeds.push(found);
        }
      } else {
        const pickC = pick(candidates);
        const lx = pickC.x - ax, ly = pickC.y - ay;
        workGrid[ly][lx] = 0;
        seeds.push({ x: pickC.x, y: pickC.y });
      }
    }

    // stop condition: enough seeds and pairwise average meets or exceeds threshold
    if (seeds.length >= targetCount) {
      const avg = computeAveragePairwiseManhattan(seeds);
      if (avg >= thresh.avg) break;
    }
  }

  logDebug('scatterSeeds finished', { totalSeeds: seeds.length, attempts });
  logDebug('scatterSeeds coordinates', seeds);
  logDebug('grid after scatterSeeds (workGrid)');
  if (DEBUG) {
    printGrid(workGrid);
  }
  return { seeds, workGrid };
}

/**
 * Expand each seed into a short random walk ('worm') to create contiguous white regions.
 * @param {number[][]} grid - Grid to modify in-place.
 * @param {{x:number,y:number}[]} seeds - Initial seed coordinates.
 * @param {string} sym - Symmetry code to apply when expanding.
 * @returns {void}
 */
function expandWorms(workGrid, seeds, area) {
  logDebug('expandWorms seedsCount', seeds.length);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  const w = workGrid[0].length, h = workGrid.length;
  for (const s of seeds) {
    // map absolute seed coords into local workGrid coords
    let cx = s.x - area.x, cy = s.y - area.y;
    if (!inBounds(cx, cy, w, h)) continue;
    // logDebug('expandWorms seedStart', s);
    for (let steps = 0; steps < 50; steps++) {
      const dir = pick(dirs);
      const length = randInt(1, 4);
      // logDebug('worm step', { seed: s, step: steps, dir, length });
      let blocked = false;
      for (let i = 1; i <= length; i++) {
        const nx = cx + dir[0] * i, ny = cy + dir[1] * i;
        if (!inBounds(nx, ny, w, h) || workGrid[ny][nx] === 0) { blocked = true; break; }
      }
      if (blocked) break;
      for (let i = 1; i <= length; i++) {
        const nx = cx + dir[0] * i, ny = cy + dir[1] * i;
        workGrid[ny][nx] = 0;
      }
      cx += dir[0] * length; cy += dir[1] * length;
    }
    // logDebug('expandWorms seedEnd', { seed: s, end: { x: cx + area.x, y: cy + area.y } });
  }
  if (DEBUG) {
    logDebug('grid after expandWorms (workGrid)');
    printGrid(workGrid);
  }
}

/**
 * Transform the local work area (workGrid) into the main crossword grid applying symmetry.
 * @param {number[][]} workGrid - Local area grid (rows x cols) where 0 = white.
 * @param {number[][]} grid - Main crossword grid to modify.
 * @param {{x:number,y:number,w:number,h:number}} area - Work area rectangle in global coords.
 * @param {string} sym - Symmetry code to apply when mapping cells.
 */
function transformWorkAreaToGrid(workGrid, grid, area, sym) {
  const h = workGrid.length;
  const w = workGrid[0].length;
  for (let ly = 0; ly < h; ly++) {
    for (let lx = 0; lx < w; lx++) {
      if (workGrid[ly][lx] === 0) {
        const gx = area.x + lx, gy = area.y + ly;
        applySymmetrySet(grid, gx, gy, 0, sym);
      }
    }
  }
  logDebug('transformWorkAreaToGrid applied', { area, sym });
}

/**
 * Groom the grid by removing isolated white cells and breaking very long runs.
 * @param {number[][]} grid - Grid modified in-place.
 * @param {string} sym - Symmetry code used when changing cells.
 * @returns {void}
 */
function groomGrid(grid, sym) {
  const w = grid[0].length, h = grid.length;
  // remove isolated white cells
  logDebug('groomGrid start');
  let changed = true;
  let removedIsolated = 0;
  while (changed) {
    changed = false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (grid[y][x] === 0) {
        const neighbors = [[1,0],[-1,0],[0,1],[0,-1]];
        const count = neighbors.reduce((s, [dx,dy]) => s + ((inBounds(x+dx, y+dy, w, h) && grid[y+dy][x+dx] === 0) ? 1 : 0), 0);
        if (count === 0) { applySymmetrySet(grid, x, y, 1, sym); changed = true; removedIsolated++; logDebug('groomGrid removed isolated', { x, y }); }
      }
    }
  }
  logDebug('groomGrid removedIsolated', removedIsolated);
  // break very long runs
  const longLimit = Math.min(Math.max(w, h), 14);
  for (let y = 0; y < h; y++) {
    let run = 0, start = 0;
    for (let x = 0; x <= w; x++) {
      if (x < w && grid[y][x] === 0) { if (run === 0) start = x; run++; } else {
        if (run > longLimit) {
          const bx = Math.floor((start + start + run) / 2);
          applySymmetrySet(grid, bx, y, 1, sym);
          // logDebug('groomGrid broke long horizontal run', { y, start, run, bx });
        }
        run = 0;
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let run = 0, start = 0;
    for (let y = 0; y <= h; y++) {
      if (y < h && grid[y][x] === 0) { if (run === 0) start = y; run++; } else {
        if (run > longLimit) {
          const by = Math.floor((start + start + run) / 2);
          applySymmetrySet(grid, x, by, 1, sym);
          // logDebug('groomGrid broke long vertical run', { x, start, run, by });
        }
        run = 0;
      }
    }
  }
  if (DEBUG) {
    logDebug('grid after groomGrid');
    printGrid(grid);
  }
}

/**
 * Identify across and down slots (contiguous white cell sequences) in the grid.
 * @param {number[][]} grid - Grid array (rows x cols).
 * @param {number} minLen - Minimum slot length to include.
 * @returns {{across: Array, down: Array}} Objects containing arrays of slot descriptors.
 * Each slot descriptor contains { id, x, y, len, cells, clue, answer } where cells is
 * an array of { x, y, idx }.
 */
function listSlots(grid, minLen) {
  const w = grid[0].length, h = grid.length;
  const across = [], down = [];
  let aCounter = 1, dCounter = 1;
  // across
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (grid[y][x] === 0) {
        const startX = x; let len = 0;
        while (x < w && grid[y][x] === 0) { len++; x++; }
        if (len >= minLen) {
          const id = `a${aCounter++}`;
          const cells = [];
          for (let i = 0; i < len; i++) cells.push({ x: startX + i, y, idx: i });
          across.push({ id, x: startX, y, len, cells, clue: '', answer: null });
        }
      } else x++;
    }
  }
  // down
  for (let x = 0; x < w; x++) {
    let y = 0;
    while (y < h) {
      if (grid[y][x] === 0) {
        const startY = y; let len = 0;
        while (y < h && grid[y][x] === 0) { len++; y++; }
        if (len >= minLen) {
          const id = `d${dCounter++}`;
          const cells = [];
          for (let i = 0; i < len; i++) cells.push({ x, y: startY + i, idx: i });
          down.push({ id, x, y: startY, len, cells, clue: '', answer: null });
        }
      } else y++;
    }
  }
  return { across, down };
}

// Debug: print a short summary of discovered slots
function debugListSlotsInfo(slotsObj) {
  if (!DEBUG) return;
  logDebug('listSlots summary', { across: slotsObj.across.length, down: slotsObj.down.length });
  const show = (arr) => arr.slice(0, 10).map(s => ({ id: s.id, x: s.x, y: s.y, len: s.len }));
  // logDebug('listSlots samples', { across: show(slotsObj.across), down: show(slotsObj.down) });
}

/**
 * Load a corpus file (JSONL/JSON or plaintext) and index words by length.
 * @param {string} corpusPath - Path to corpus file.
 * @returns {Map<number, Array<{word:string,clue:string,difficulty:number,obscurity:number,language:string,theme:string}>>|null}
 */
function loadCorpus(corpusPath) {
  if (!fs.existsSync(corpusPath)) return null;
  const ext = path.extname(corpusPath).toLowerCase();
  const data = fs.readFileSync(corpusPath, 'utf8');
  const items = [];
  if (ext === '.jsonl' || ext === '.json') {
    for (const line of data.split(/\r?\n/)) if (line.trim()) try { items.push(JSON.parse(line)); } catch (e) {}
  } else {
    for (const line of data.split(/\r?\n/)) {
      const w = (line || '').trim(); if (!w) continue; items.push({ word: w, clue: `Clue for ${w}`, difficulty: 3, obscurity: 2, language: 'English', theme: 'mixed' });
    }
  }
  const byLength = new Map();
  for (const it of items) {
    if (!it.word) continue; const word = String(it.word).toUpperCase(); const len = word.length; if (len < 1) continue;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len).push({ word, clue: it.clue || `Clue for ${word}`, difficulty: Number(it.difficulty) || 3, obscurity: Number(it.obscurity) || 2, language: it.language || 'English', theme: it.theme || 'mixed' });
  }
  logDebug('loadCorpus loaded', { totalItems: items.length, lengths: Array.from(byLength.keys()).sort((a,b)=>a-b) });
  return byLength;
}

/**
 * Return candidate words from the corpus that fit a given slot and the current assignment constraints.
 * @param {{id:string,x:number,y:number,len:number,cells:Array}} slot - Slot descriptor.
 * @param {Map<number,Array>} byLength - Map of word-length -> word objects.
 * @param {{language?:string,theme?:string,difficultyRange:number[],obscurityRange:number[]}} constraints
 * @param {{__cells?:Object}} assignment - Current assignment with a __cells map of placed letters.
 * @param {Map<string,object>|Object} slotIndexMap - Additional slot index (unused but kept for signature).
 * @returns {Array<{word:string,clue:string,difficulty:number,obscurity:number,language:string,theme:string}>}
 */
function candidatesForSlot(slot, byLength, constraints, assignment, slotIndexMap) {
  const pool = byLength.get(slot.len) || [];
  const cand = [];
  for (const p of pool) {
    if (constraints.language && p.language && p.language !== constraints.language) continue;
    if (constraints.theme && p.theme && constraints.theme !== 'mixed' && p.theme !== constraints.theme) continue;
    if (p.difficulty < constraints.difficultyRange[0] || p.difficulty > constraints.difficultyRange[1]) continue;
    if (p.obscurity < constraints.obscurityRange[0] || p.obscurity > constraints.obscurityRange[1]) continue;
    // check intersections
    let ok = true;
    for (const cell of slot.cells) {
      const key = `${cell.x},${cell.y}`;
      if (assignment.__cells && assignment.__cells[key]) {
        const ch = assignment.__cells[key];
        const expected = p.word[cell.idx];
        if (ch !== expected) { ok = false; break; }
      }
    }
    if (ok) cand.push(p);
  }
  return cand;
}

/**
 * Place a chosen word into the assignment and mark its letters in the assignment cell map.
 * @param {{id:string,cells:Array}} slot - Slot descriptor.
 * @param {{word:string}} wordObj - Word object with `word` property.
 * @param {Object} assignment - Assignment object to modify (will gain __cells map).
 * @returns {void}
 */
function placeWordInAssignment(slot, wordObj, assignment) {
  assignment[slot.id] = wordObj.word;
  if (!assignment.__cells) assignment.__cells = {};
  for (const c of slot.cells) {
    assignment.__cells[`${c.x},${c.y}`] = wordObj.word[c.idx];
  }
  // logDebug('placeWordInAssignment', { slot: slot.id, word: wordObj.word });
}

/**
 * Remove a previously placed word from the assignment. This function clears the
 * slot entry and the __cells map; callers may need to rebuild __cells if desired.
 * @param {{id:string}} slot - Slot descriptor.
 * @param {Object} assignment - Assignment object to modify.
 * @returns {void}
 */
function removeWordFromAssignment(slot, assignment) {
  delete assignment[slot.id];
  // rebuild __cells from other assignments
  const cells = {};
  for (const k of Object.keys(assignment)) {
    if (k === '__cells') continue;
    const w = assignment[k];
    // find slot by id not available here; caller should keep slots order
  }
  delete assignment.__cells;
  // logDebug('removeWordFromAssignment', { slot: slot.id });
}

/**
 * Backtracking solver that fills crossword slots using the provided corpus index.
 * The solver dynamically selects the remaining slot with the fewest candidates
 * and attempts to assign words. It will relax difficulty/obscurity constraints
 * for a slot if no candidates are found under the stricter constraints.
 * @param {Array<Object>} allSlots - Array of slot descriptors (across + down).
 * @param {Map<number,Array>} byLength - Map from word length to arrays of word objects.
 * @param {Object} constraints - Constraints object (difficultyRange, obscurityRange, language, theme).
 * @returns {{success:boolean,assignment:Object}} Result with success flag and assignment map `slotId -> word`.
 */
function solveSlots(allSlots, byLength, constraints) {
  // Dynamic backtracking: always pick the remaining slot with fewest candidates
  const slotMap = new Map(allSlots.map(s => [s.id, s]));
  const assignment = {};

  /**
   * Rebuild the assignment.__cells map from current slot assignments.
   * @returns {Object} Map of "x,y" -> letter
   */
  function rebuildCells() {
    const cells = {};
    for (const key of Object.keys(assignment)) {
      if (key === '__cells') continue;
      const slot = slotMap.get(key);
      const word = assignment[key];
      for (let i = 0; i < slot.cells.length; i++) {
        const c = slot.cells[i];
        cells[`${c.x},${c.y}`] = word[i];
      }
    }
    return cells;
  }

  const maxSteps = 200000;
  let steps = 0;

  /**
   * Recursive backtracking function.
   * @param {string[]} remainingIds - Remaining slot ids to fill.
   * @returns {boolean} True when a complete assignment is found.
   */
  function backtrack(remainingIds) {
    if (remainingIds.length === 0) return true;
    if (++steps > maxSteps) return false;
    if (DEBUG && steps % 1000 === 0) logDebug('solveSlots progress', { steps, remaining: remainingIds.length });

    // pick the slot with fewest candidates now
    let bestId = null;
    let bestCand = null;
    for (const id of remainingIds) {
      const slot = slotMap.get(id);
      let cand = candidatesForSlot(slot, byLength, constraints, { __cells: assignment.__cells || {} }, slotMap);
      if (!cand || cand.length === 0) {
        // relax constraints for this slot if none found
        const relaxed = Object.assign({}, constraints, { difficultyRange: [1, 5], obscurityRange: [1, 5] });
        cand = candidatesForSlot(slot, byLength, relaxed, { __cells: assignment.__cells || {} }, slotMap);
      }
      if (!cand || cand.length === 0) return false; // dead end even after relax
      if (!bestCand || cand.length < bestCand.length) { bestCand = cand; bestId = id; }
    }
    const slot = slotMap.get(bestId);
    for (const cand of bestCand) {
      // logDebug('solveSlots try', { slot: slot.id, word: cand.word });
      assignment[slot.id] = cand.word;
      assignment.__cells = rebuildCells();
      const nextRemaining = remainingIds.filter(x => x !== slot.id);
      if (backtrack(nextRemaining)) { return true; }
      delete assignment[slot.id];
      assignment.__cells = rebuildCells();
      // logDebug('solveSlots backtrack', { slot: slot.id, word: cand.word, steps });
    }
    return false;
  }

  const allIds = allSlots.map(s => s.id);
  const success = backtrack(allIds);
  return { success, assignment };
}

/**
 * Main entry point: parse CLI args, load corpus, attempt layout generation and slot-filling,
 * and write the resulting crossword JSON to stdout or a file.
 * @returns {Promise<void>}
 */
async function main() {
  const args = parseArgs();
  // enable debug if CLI provided `--debug true|1` or flag `--debug`
  DEBUG = args.debug === true || String(args.debug) === 'true' || String(args.debug) === '1';
  if (DEBUG) logDebug('Debug enabled');
  // show help and exit
  if (args.help || args.h) { printHelp(); process.exit(0); }
  if (args.selftest) {
    // generate a sample corpus first
    const samplePath = path.join(__dirname, 'sample_corpus.jsonl');
    if (!fs.existsSync(samplePath)) {
      console.log('Generating sample corpus...');
      spawnSync(process.execPath, [path.join(__dirname, 'generate_sample_corpus.cjs'), samplePath], { stdio: 'inherit' });
    }
    // run a small test 9x9
    args.size = '9x9'; args.corpus = samplePath; args.symmetry = 'A'; args.density = 3; args.min = 3; args.max = 9; args.output = path.join(__dirname, 'sample_crossword.json');
  }

  const size = parseSize(args.size);
  if (!size) exitWithError('Missing or invalid --size value (e.g., 15x15)');
  const w = size.w, h = size.h;
  if (w < 4 || h < 4) exitWithError('Grid width and height must be >= 4');
  if (w / h > 3 || h / w > 3) exitWithError('Grid ratio too extreme');
  const sym = (args.symmetry || 'A').toUpperCase();
  if (['B'].includes(sym) && w !== h) exitWithError('rotation-90 symmetry requires square grid');
  if (['B','C','D','E'].includes(sym) && (w % 2 !== 0 || h % 2 !== 0)) exitWithError('Selected symmetry requires even grid dimensions');

  const density = Number(args.density || 3);
  const difficulty = Number(args.difficulty || 3);
  const obscurity = Number(args.obscurity || 2);
  const minLen = Number(args.min || 3);
  const maxLen = Number(args.max || Math.min(w, h, 12));
  const language = args.lang || 'English';
  const theme = args.theme || 'mixed';

  if (!args.corpus) exitWithError('Missing --corpus path');
  const corpusPath = args.corpus;
  const byLength = loadCorpus(corpusPath);
  if (!byLength) exitWithError('Unable to read corpus at ' + corpusPath);

  // Try multiple attempts at layout + filling
  const attemptsLimit = Number(args.attempts || 60);
  let finalOut = null;
  for (let attempt = 1; attempt <= attemptsLimit; attempt++) {
    console.log(`Attempt ${attempt}/${attemptsLimit} — creating layout...`);
    const grid = createGrid(w, h, 1);
    const area = workAreaFor(sym, w, h);
    const { seeds, workGrid } = scatterSeeds(grid, area, density, sym);
    expandWorms(workGrid, seeds, area);
    groomGrid(workGrid, sym);
    transformWorkAreaToGrid(workGrid, grid, area, sym);
    groomGrid(grid, sym);
    if (DEBUG) {
      console.log('Generated layout:');
      printGrid(grid);
      logDebug('grid hex', gridToHex(grid));
    }

    const slotsObj = listSlots(grid, minLen);
    const across = slotsObj.across; const down = slotsObj.down;
    console.log(`Across slots: ${across.length}, Down slots: ${down.length}`);

    const allSlots = [...across, ...down];
    if (allSlots.length === 0) { console.log('No slots found, retrying...'); continue; }

    const constraints = { difficultyRange: [Math.max(1, difficulty - 2), difficulty], obscurityRange: [Math.max(1, obscurity - 1), Math.min(5, obscurity + 1)], language, theme };
    console.log('Filling slots (backtracking)...');
    const result = solveSlots(allSlots, byLength, constraints);
    if (result && result.success) {
      const assignment = result.assignment;
      const nonce = crypto.randomUUID();
      const out = { v: 1, id: crypto.randomUUID(), w, h, grid: gridToHex(grid), A: { s: [], c: [], h: [] }, D: { s: [], c: [], h: [] }, nonce };
      for (const s of across) {
        const ans = assignment[s.id] || null;
        out.A.s.push(s.id);
        const clue = ans && byLength.get(ans.length) && byLength.get(ans.length).find(it => it.word === ans) ? byLength.get(ans.length).find(it => it.word === ans).clue : '';
        out.A.c.push(clue);
        out.A.h.push(ans ? crypto.createHash('sha256').update(nonce + ans).digest('hex') : '');
      }
      for (const s of down) {
        const ans = assignment[s.id] || null;
        out.D.s.push(s.id);
        const clue = ans && byLength.get(ans.length) && byLength.get(ans.length).find(it => it.word === ans) ? byLength.get(ans.length).find(it => it.word === ans).clue : '';
        out.D.c.push(clue);
        out.D.h.push(ans ? crypto.createHash('sha256').update(nonce + ans).digest('hex') : '');
      }
      if (args.output) { fs.writeFileSync(args.output, JSON.stringify(out, null, 2), 'utf8'); console.log('Wrote crossword to', args.output); } else { console.log(JSON.stringify(out, null, 2)); }
      finalOut = out;
      break;
    }
    if (attempt % 5 === 0) console.log(`Attempt ${attempt} failed, retrying...`);
  }
  if (!finalOut) exitWithError(`Failed to generate crossword after ${attemptsLimit} attempts`);
}

if (require.main === module) main().catch(err => { exitWithError(err); });
