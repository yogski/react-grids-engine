# React Grids

Headless, reusable 2D grid engine for React 18+, built with Vite + TypeScript.
Includes a game launcher with:

- Crossword
- Tic Tac Toe (classic implementation)
- Abx Tic Tac Toe (abstraction-driven demo)
- Chess placeholder
- Sudoku placeholder

## Features

- Generic `Grid` component with render props and no visual coupling.
- Cell click, right-click, drag-and-drop, active-cell control, and per-cell override hooks.
- New reusable abstraction layer for grid-based games:
  - `AbxGame`
  - `AbxPlayer`
  - `AbxGrid`
  - `AbxCell`
  - `AbxSubgrid`
  - `AbxAction`
- Built-in grid history with undo/redo support (`AbxGrid`).
- `AbxTicTacToe` demo showing:
  - typed actions
  - subgrid-based win detection
  - synchronized undo/redo/reset flow
- Crossword implementation with puzzle parsing, clue navigation, and double-hash validation.
- Utility functions for hex bitmask <-> 2-D matrix and SHA-256 hashing.
- Unit tests using Vitest + React Testing Library.

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

Open [http://localhost:5173](http://localhost:5173), then switch games from the top navigation.

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

```text
src/
├── abstractions/ // reusable game-domain models for grid-based games
│   └── ...
├── components/ // headless UI primitives
│   └── ...
├── games/ // concrete game implementations
│   └── ...
├── utils/ // shared helpers
│   └── ...
├── test/ // shared test setup utilities for Vitest
│   └── ...
├── App.tsx
├── App.css
├── index.css
└── main.tsx
```

Important files:

- `src/App.tsx`: game launcher shell and top-level game selection routing.
- `src/main.tsx`: React app bootstrap and root render.
- `src/App.css` and `src/index.css`: global shell and base styling.
- `vite.config.ts`: Vite + Vitest configuration.
- `package.json`: scripts and dependencies.
- `GAME_MAKING_GUIDE.md`: abstraction-first guide for building new games in this repo.


## Grid Engine API

Import from `src/components`:

```ts
import { Grid } from './components'
import type { GridCoord, GridData, GridProps, GridValue, RenderCellParams } from './components'
```

### GridProps<T>

```ts
type GridProps<T> = {
  rows: number
  cols: number
  data?: GridData<T>
  renderCell: (params: RenderCellParams<T>) => React.ReactNode

  onCellClick?: (coord: GridCoord, value: GridValue<T>) => void
  onCellRightClick?: (
    coord: GridCoord,
    value: GridValue<T>,
    event: React.MouseEvent<HTMLElement>
  ) => void
  onCellDragStart?: (coord: GridCoord, value: GridValue<T>) => void
  onCellDrop?: (from: GridCoord, to: GridCoord) => void

  draggable?: boolean
  selectable?: boolean

  activeCell?: GridCoord | null
  onActiveCellChange?: (coord: GridCoord | null) => void

  getCellProps?: (coord: GridCoord, value: GridValue<T>) => Partial<RenderCellParams<T>>
  canDrop?: (from: GridCoord, to: GridCoord) => boolean

  className?: string
  style?: React.CSSProperties
}
```

### Engine Behaviors

1. Headless rendering via `renderCell`.
2. Automatic `role="grid"` and `role="gridcell"` semantics.
3. Drag starts only when movement exceeds 4px.
4. `canDrop` can block invalid drop targets.
5. Supports controlled or unmanaged active-cell state.
6. `getCellProps` composes custom handlers with base handlers.

## Abstraction Layer API

Import from `src/abstractions`:

```ts
import {
  AbxAction,
  AbxCell,
  AbxGame,
  AbxGrid,
  AbxPlayer,
  AbxSubgrid,
} from './abstractions'
```

### Core Concepts

- `AbxCell`: coordinate + typed state + state history.
- `AbxSubgrid`: arbitrary cell groups (rows, columns, diagonals, boxes, or sparse groups) plus intersection/connectivity/shared-value checks.
- `AbxGrid`: typed 2-D matrix of cells with subgrid registry and grid-level history (`undo`, `redo`, `canUndo`, `canRedo`, `resetHistory`).
- `AbxPlayer`: typed symbol/identity model.
- `AbxAction`: explicit state-changing unit with metadata (`id`, `name`, `player`, `payload`, `timestamp`) and execute handler.
- `AbxGame`: orchestrates grid, players, turn order, action log, and game lifecycle.

## Utility Functions

### decodeHexBitmask(hex, rows, cols): number[][]

Decodes a hex bitmask string (row-major, MSB-first) into a 2-D array where `1` = blocked and `0` = open.

### encodeHexBitmask(grid): string

Inverse of `decodeHexBitmask`.

### sha256(input): Promise<string>

SHA-256 via the Web Crypto API (lowercase hex digest).

## Crossword Game Notes

Puzzle format and answer validation are implemented in `src/games/Crossword/logic.ts`.
Validation uses:

```text
hash = sha256( sha256(answer + slotId) + nonce )
```

`src/games/Crossword/testPuzzle.ts` exports `TEST_PUZZLE` for development.

## New Game Guide

See `GAME_MAKING_GUIDE.md` for a step-by-step abstraction-first workflow to add clean, reusable games.

## Testing

```bash
npm run test:run
```

| File | Coverage |
|------|---------|
| `src/components/Grid.test.tsx` | Grid interactions: click, right-click, drag threshold, drag/drop lifecycle |
| `src/utils/gridBitmask.test.ts` | Bitmask encode/decode and round-trip integrity |
| `src/abstractions/abstractions.test.ts` | Core abstraction behavior: history, subgrids, actions, and game updates |
| `src/games/AbxTicTacToe/logic.test.ts` | Abx game rules, reset flow, and undo/redo behavior |
