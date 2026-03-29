# React Grids

Headless, reusable 2D grid engine for React 18+, built with Vite + TypeScript.
Ships with a game launcher hosting **Crossword**, Tic Tac Toe, Chess, and Sudoku (the latter three are placeholders ready for implementation).

## Features

- Generic `Grid` component with render props — fully headless, bring your own styles.
- Cell click, right-click, drag-and-drop with a configurable movement threshold.
- Extensibility hooks for per-cell behaviour and drop validation.
- **Crossword game** — complete implementation including puzzle parsing, keyboard navigation, answer validation (double SHA-256), and clue highlighting.
- Utilities for hex bitmask ↔ 2-D array conversion and Web Crypto SHA-256 hashing.
- Unit tests with Vitest + React Testing Library.

## Tech Stack

- React 18
- TypeScript 5
- Vite 8
- Vitest + happy-dom + React Testing Library

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Use the top navigation bar to switch between games.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check and build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI) |
| `npm run lint` | Lint the project |

## Project Structure

```
src/
├── App.tsx                    # Main entry — game selection nav + routing
├── App.css                    # App shell styles
├── components/                # Reusable headless Grid engine
│   ├── Grid.tsx
│   ├── GridCell.tsx
│   ├── Grid.test.tsx
│   ├── index.ts
│   └── types.ts
├── games/
│   ├── Crossword/
│   │   ├── index.tsx          # Game component (rendering + interaction)
│   │   ├── logic.ts           # Puzzle parsing, navigation helpers, validation
│   │   ├── testPuzzle.ts      # Hand-crafted 9×9 puzzle for development
│   │   └── styles.css
│   ├── TicTacToe/index.tsx    # Placeholder
│   ├── Chess/index.tsx        # Placeholder
│   └── Sudoku/index.tsx       # Placeholder
└── utils/
    ├── gridBitmask.ts         # decodeHexBitmask / encodeHexBitmask
    ├── gridBitmask.test.ts
    └── hash.ts                # sha256() via Web Crypto API
```

---

## Grid Engine API

Import from `src/components`:

```ts
import { Grid } from './components'
import type { GridCoord, GridData, GridProps, GridValue, RenderCellParams } from './components'
```

### `GridProps<T>`

```ts
type GridProps<T> = {
  rows: number
  cols: number
  data?: GridData<T>
  renderCell: (params: RenderCellParams<T>) => React.ReactNode

  onCellClick?: (coord: GridCoord, value: GridValue<T>) => void
  onCellRightClick?: (coord: GridCoord, value: GridValue<T>, event: React.MouseEvent<HTMLElement>) => void
  onCellDragStart?: (coord: GridCoord, value: GridValue<T>) => void
  onCellDrop?: (from: GridCoord, to: GridCoord) => void

  draggable?: boolean       // default: true
  selectable?: boolean      // default: true

  activeCell?: GridCoord | null           // controlled active cell
  onActiveCellChange?: (coord: GridCoord | null) => void

  getCellProps?: (coord: GridCoord, value: GridValue<T>) => Partial<RenderCellParams<T>>
  canDrop?: (from: GridCoord, to: GridCoord) => boolean

  className?: string
  style?: React.CSSProperties
}
```

### Minimal example

```tsx
import { Grid } from './components'
import type { GridData } from './components'

const board: GridData<string> = [
  ['A', 'B', 'C'],
  ['D', 'E', 'F'],
]

export function Example() {
  return (
    <Grid
      rows={2}
      cols={3}
      data={board}
      onCellClick={(coord, value) => console.log('click', coord, value)}
      onCellDrop={(from, to) => console.log('drop', from, to)}
      canDrop={(from, to) => !(from.row === to.row && from.col === to.col)}
      renderCell={({ coord, value, isActive, eventHandlers }) => (
        <button
          type="button"
          aria-label={`cell-${coord.row}-${coord.col}`}
          data-active={isActive || undefined}
          {...eventHandlers}
        >
          {value}
        </button>
      )}
    />
  )
}
```

### Engine behaviours

1. Headless rendering via `renderCell` — no opinion on markup or styles.
2. `role="grid"` / `role="gridcell"` ARIA semantics applied automatically.
3. Drag starts only after pointer moves > 4 px (prevents accidental drags on click).
4. Drop target updates live on hover while dragging.
5. `canDrop(from, to)` lets you block invalid drops without wiring event logic.
6. Controlled active cell via `activeCell` + `onActiveCellChange`, or let the grid manage it internally.
7. `getCellProps` per-cell override for `isActive`, `isDragging`, `isDropTarget`, and event handlers (handlers are composed — both base and override fire).
8. Cells are wrapped in `React.memo` for render performance.

---

## Utility Functions

### `decodeHexBitmask(hex, rows, cols): number[][]`

Decodes a hex bitmask string (row-major, MSB-first) into a 2-D array where `1` = blocked/black cell and `0` = open/white cell.

```ts
import { decodeHexBitmask } from './utils/gridBitmask'

const grid = decodeHexBitmask('C06EC76F8410FB71BB018', 9, 9)
// grid[0] → [1, 1, 0, 0, 0, 0, 0, 0, 0]
```

### `encodeHexBitmask(grid): string`

The inverse of `decodeHexBitmask`. Useful for serialising a modified grid back to JSON.

```ts
import { encodeHexBitmask } from './utils/gridBitmask'

encodeHexBitmask(grid) // → "C06EC76F8410FB71BB018"
```

### `sha256(input): Promise<string>`

SHA-256 via the Web Crypto API. Returns a lowercase hex digest.

```ts
import { sha256 } from './utils/hash'

const digest = await sha256('hello world')
```

---

## Crossword Game

### Puzzle JSON format

```ts
type CrosswordPuzzle = {
  v: number        // format version
  id: string       // unique puzzle ID
  w: number        // grid width (columns)
  h: number        // grid height (rows)
  grid: string     // hex bitmask — 1 = black, 0 = white, row-major MSB-first
  A: {
    s: string[]    // slot IDs  e.g. ["a1", "a2", ...]
    c: string[]    // clue texts
    h: string[]    // pre-computed answer hashes
  }
  D: {             // same structure for Down clues
    s: string[]
    c: string[]
    h: string[]
  }
  nonce: string    // random nonce used in answer hashing
}
```

### Answer validation

Answers are validated without storing plain text using a double SHA-256 scheme:

```
hash = sha256( sha256(answer + slotId) + nonce )
```

The result is compared against the corresponding `h` value in the puzzle JSON. If they match, the answer is correct and the cells are marked as solved.

### Crossword logic API (`src/games/Crossword/logic.ts`)

| Export | Description |
|--------|-------------|
| `parseCrossword(puzzle)` | Parses a `CrosswordPuzzle` → `ParsedCrossword` (black cell map, numbered grid, slot list) |
| `validateSlot(slot, userGrid, nonce)` | Async — returns `true` when the filled answer hash matches |
| `getSlotForCell(slots, row, col, direction)` | Returns the slot containing a given cell in the given direction |
| `getNextCell(slot, current, typedLetter, userGrid)` | Next cell to focus after a keypress (skips filled cells; fast-types matching letters) |
| `getPrevCell(slot, current)` | Previous cell for backspace navigation |

### Keyboard interaction

| Key | Action |
|-----|--------|
| Letter `A–Z` | Fill cell, advance to next empty cell in current clue |
| `Backspace` | Clear current cell; if already empty, retreat and clear previous |
| Arrow keys | Move cursor within the clue (switches direction to match arrow axis) |
| Click a cell | Select it; click same cell again to toggle across/down |
| Click a clue | Jump to the start of that clue |
| Toggle button | Switch between across and down directions |

### Test puzzle

`src/games/Crossword/testPuzzle.ts` exports `TEST_PUZZLE` — a hand-crafted 9×9 crossword used during development. Answer hashes are pre-computed with nonce `"xw-test-2024"`.

---

## Testing

```bash
npm run test:run
```

| File | Coverage |
|------|---------|
| `src/components/Grid.test.tsx` | Click, right-click, drag threshold, drag lifecycle, `canDrop` |
| `src/utils/gridBitmask.test.ts` | Decode, encode, hex→grid→hex and grid→hex→grid round-trips |
