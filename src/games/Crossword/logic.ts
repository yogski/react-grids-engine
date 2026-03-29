import { decodeHexBitmask } from '../../utils/gridBitmask'
import { sha256 } from '../../utils/hash'

// ─── Public types ────────────────────────────────────────────────────────────

export type CrosswordPuzzle = {
  /** Format version */
  v: number
  /** Unique puzzle identifier */
  id: string
  /** Grid width (columns) */
  w: number
  /** Grid height (rows) */
  h: number
  /** Hex bitmask – 1 = black/blocked cell, 0 = white/open cell, row-major MSB-first */
  grid: string
  /** Across clues */
  A: { s: string[]; c: string[]; h: string[] }
  /** Down clues */
  D: { s: string[]; c: string[]; h: string[] }
  /** Nonce used in answer hashing */
  nonce: string
  params?: string
  sig?: string
}

export type ClueDirection = 'across' | 'down'

export type CellCoord = { row: number; col: number }

export type Slot = {
  /** Internal identifier used in hashing, e.g. "a1", "d2" */
  id: string
  direction: ClueDirection
  /** Number displayed in the cell (traditional crossword numbering) */
  displayNumber: number
  clueText: string
  /** Expected double-SHA-256 hash of the answer */
  expectedHash: string
  /** Cells belonging to this word, in order */
  cells: CellCoord[]
  startCell: CellCoord
}

export type ParsedCrossword = {
  rows: number
  cols: number
  /** true = black/blocked */
  blackCells: boolean[][]
  /** Display number at a cell, or null */
  cellNumbers: (number | null)[][]
  slots: Slot[]
  nonce: string
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Parses a CrosswordPuzzle JSON into a structured ParsedCrossword ready for
 * rendering and game logic.
 *
 * Algorithm:
 * 1. Decode hex bitmask → 2-D black/white grid
 * 2. Scan cells in reading order; detect across/down word starts
 * 3. Assign traditional display numbers (sequential across all directions)
 * 4. Match numbered word slots to the clue arrays in the puzzle JSON
 */
export function parseCrossword(puzzle: CrosswordPuzzle): ParsedCrossword {
  const { w, h } = puzzle

  const rawGrid = decodeHexBitmask(puzzle.grid, h, w)
  const blackCells: boolean[][] = rawGrid.map((row) => row.map((v) => v === 1))

  const isBlack = (r: number, c: number): boolean =>
    r < 0 || r >= h || c < 0 || c >= w || blackCells[r][c]
  const isWhite = (r: number, c: number): boolean => !isBlack(r, c)

  const cellNumbers: (number | null)[][] = Array.from({ length: h }, () =>
    Array<null>(w).fill(null),
  )

  let displayNum = 0
  const acrossWordCells: { startCell: CellCoord; cells: CellCoord[] }[] = []
  const downWordCells: { startCell: CellCoord; cells: CellCoord[] }[] = []

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (blackCells[r][c]) continue

      // "starts across" = left neighbour is black AND right neighbour is white
      const startsAcross = isBlack(r, c - 1) && isWhite(r, c + 1)
      // "starts down"   = top  neighbour is black AND bottom neighbour is white
      const startsDown = isBlack(r - 1, c) && isWhite(r + 1, c)

      if (startsAcross || startsDown) {
        displayNum++
        cellNumbers[r][c] = displayNum

        if (startsAcross) {
          const cells: CellCoord[] = []
          for (let cc = c; cc < w && isWhite(r, cc); cc++) {
            cells.push({ row: r, col: cc })
          }
          acrossWordCells.push({ startCell: { row: r, col: c }, cells })
        }

        if (startsDown) {
          const cells: CellCoord[] = []
          for (let rr = r; rr < h && isWhite(rr, c); rr++) {
            cells.push({ row: rr, col: c })
          }
          downWordCells.push({ startCell: { row: r, col: c }, cells })
        }
      }
    }
  }

  const slots: Slot[] = []

  puzzle.A.s.forEach((id, i) => {
    const word = acrossWordCells[i]
    if (!word) return
    slots.push({
      id,
      direction: 'across',
      displayNumber: cellNumbers[word.startCell.row][word.startCell.col]!,
      clueText: puzzle.A.c[i] ?? '',
      expectedHash: puzzle.A.h[i] ?? '',
      cells: word.cells,
      startCell: word.startCell,
    })
  })

  puzzle.D.s.forEach((id, i) => {
    const word = downWordCells[i]
    if (!word) return
    slots.push({
      id,
      direction: 'down',
      displayNumber: cellNumbers[word.startCell.row][word.startCell.col]!,
      clueText: puzzle.D.c[i] ?? '',
      expectedHash: puzzle.D.h[i] ?? '',
      cells: word.cells,
      startCell: word.startCell,
    })
  })

  return { rows: h, cols: w, blackCells, cellNumbers, slots, nonce: puzzle.nonce }
}

// ─── Answer validation ───────────────────────────────────────────────────────

/**
 * Validates a fully-filled slot against the stored hash using the double-SHA-256
 * scheme: `hash(hash(userInput + slotId) + nonce)`.
 *
 * Returns `false` immediately (without hashing) if any cell is still empty.
 *
 * @param slot     - The slot to validate
 * @param userGrid - Current user answer grid [row][col] = letter or ""
 * @param nonce    - Puzzle nonce from CrosswordPuzzle.nonce
 */
export async function validateSlot(
  slot: Slot,
  userGrid: string[][],
  nonce: string,
): Promise<boolean> {
  const values = slot.cells.map(({ row, col }) => userGrid[row][col])
  if (values.some((v) => v === '')) {
    return false
  }
  const userInput = values.join('')


  const innerHash = await sha256(userInput + slot.id)

  const outerHash = await sha256(innerHash + nonce)

  const isCorrect = outerHash === slot.expectedHash

  return isCorrect
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

/**
 * Returns the slot for a given cell and direction, or `undefined` if none.
 */
export function getSlotForCell(
  slots: Slot[],
  row: number,
  col: number,
  direction: ClueDirection,
): Slot | undefined {
  return slots.find(
    (s) =>
      s.direction === direction && s.cells.some((c) => c.row === row && c.col === col),
  )
}

/**
 * After typing `typedLetter` at `currentCell`, returns the next cell to focus
 * within the same slot.
 *
 * Rules:
 * - If the next cell is empty → move there
 * - If the next cell holds `typedLetter` → move there (letter-by-letter mode)
 * - If the next cell holds a different letter → skip to the first empty cell
 *   after it; if none exists → return null (stay at current)
 * - If already at the last cell → return null
 */
export function getNextCell(
  slot: Slot,
  currentCell: CellCoord,
  typedLetter: string,
  userGrid: string[][],
): CellCoord | null {
  const idx = slot.cells.findIndex(
    (c) => c.row === currentCell.row && c.col === currentCell.col,
  )
  if (idx === -1 || idx === slot.cells.length - 1) return null

  const nextCell = slot.cells[idx + 1]
  const nextValue = userGrid[nextCell.row][nextCell.col]

  if (nextValue === '' || nextValue === typedLetter) return nextCell

  // Skip forward to next empty cell
  for (let i = idx + 2; i < slot.cells.length; i++) {
    const cell = slot.cells[i]
    if (userGrid[cell.row][cell.col] === '') return cell
  }
  return null
}

/**
 * Returns the previous cell in the slot, or `null` if already at the start.
 */
export function getPrevCell(slot: Slot, currentCell: CellCoord): CellCoord | null {
  const idx = slot.cells.findIndex(
    (c) => c.row === currentCell.row && c.col === currentCell.col,
  )
  if (idx <= 0) return null
  return slot.cells[idx - 1]
}
