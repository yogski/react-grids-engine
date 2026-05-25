# Game Making Guide

This guide explains how to build clean, reusable grid-based games in this repository using the abstraction layer in `src/abstractions`.

## Why Use the Abstraction Layer

The abstraction model helps you separate concerns:

- UI components only render and forward user interactions.
- Game logic owns rules, turn flow, and state transitions.
- Actions are explicit and testable.
- Grid/subgrid utilities provide reusable mechanics like history, intersections, and win-line checks.

This keeps games consistent and easier to evolve.

## Core Models

### 1) Cell (`AbxCell`)

A cell has:

- coordinate (`row`, `col`)
- typed state (your game-specific payload)
- optional operations object
- per-cell history

Use it for local state at each grid location.

### 2) Subgrid (`AbxSubgrid`)

A subgrid is any collection of coordinates (contiguous or non-contiguous).

Use it for:

- rows/columns/diagonals
- sudoku boxes
- crossword slots
- region rules

Built-in helpers include:

- overlap/intersection checks
- connectivity checks
- shared-value checks (all cells same value)

### 3) Grid (`AbxGrid`)

The grid owns:

- dimensions
- 2-D cells
- subgrid registry
- snapshot history

History API:

- `undo()`
- `redo()`
- `canUndo`
- `canRedo`
- `resetHistory()`

### 4) Player (`AbxPlayer`)

A typed player model with:

- id
- name
- symbol
- optional operations

### 5) Action (`AbxAction`)

An action is the explicit state-changing unit.

Includes:

- id/name
- player
- payload
- timestamp
- execute callback

Actions are ideal for testing, logging, replay, and auditability.

### 6) Game (`AbxGame`)

The game orchestrates everything:

- grid
- players/current player
- turn counter
- action log
- game state

Subclass it to implement your game rules.

## Relationship Model

- One game has one grid and at least one player.
- One grid has many cells and optional subgrids.
- Subgrids reference cells by coordinate.
- Actions apply changes through game/grid APIs.

## Implementation Pattern (Recommended)

Use this sequence when creating a new game.

### Step 1: Define Domain Types

Create typed primitives in `logic.ts`:

- symbol type
- game state type
- cell state type
- action payload types

Example:

```ts
type Symbol = 'A' | 'B'
type GameState = 'ongoing' | 'won' | 'draw'
type CellState = { symbol: Symbol | null }
```

### Step 2: Create Players

Build players once in a helper:

```ts
function createPlayers() {
	return [
		new AbxPlayer({ id: 'p1', name: 'Player A', symbol: 'A' }),
		new AbxPlayer({ id: 'p2', name: 'Player B', symbol: 'B' }),
	]
}
```

### Step 3: Build Subgrids for Rule Checks

Create subgrids that map to your win/validity units.

Examples:

- TicTacToe: rows, columns, diagonals
- Sudoku: rows, columns, 3x3 boxes
- Crossword: each slot coordinate list

### Step 4: Build the Grid

Create an `AbxGrid` with:

- width/height
- `cellFactory`
- optional subgrids

```ts
const grid = new AbxGrid({
	width,
	height,
	cellFactory: (row, col) => new AbxCell({
		coordinate: { row, col },
		initialState: { symbol: null },
	}),
	subgrids,
})
```

### Step 5: Extend `AbxGame`

Create a game class that extends `AbxGame` and adds domain methods:

- `makeMove(...)`
- `resetGame()`
- `undoMove()` / `redoMove()` (optional but recommended)
- rule evaluators (`findWinningSubgrid`, `isBoardFull`, etc.)

Inside `makeMove`:

1. Validate state and target cell.
2. Build an `AbxAction`.
3. Call `super.makeAction(...)`.
4. Recompute game state.
5. Advance turn if still ongoing.

### Step 6: Build UI Components

Prefer this split:

- `AbxCellComponent`: presentation for one cell
- `AbxGridComponent`: maps game board to shared `Grid`
- `AbxGameComponent`: controller with buttons/status

Your UI should be thin: game class methods should decide rules.

### Step 7: Wire in App Launcher

In `src/App.tsx`:

- add game id to union
- add nav item
- add switch case to render new component

### Step 8: Add Tests

At minimum test:

- initial state
- valid and invalid moves
- win and draw detection
- reset behavior
- undo/redo transitions

## Undo/Redo Wiring Pattern

For robust undo/redo:

1. Call `grid.undo()` / `grid.redo()`.
2. Sync game metadata from grid snapshot:
	 - turn counter
	 - current player index
	 - winner/win line
	 - game state (`ongoing`/`won`/`draw`)
3. Update action stacks if your game keeps extra action history.

Important: reset should clear history branch so users cannot redo into a previous round.

## Practical Do/Don’t

Do:

- keep state typed and explicit
- centralize rules in game class methods
- use subgrids for rule units instead of ad-hoc coordinate scanning everywhere
- keep UI free from rule logic
- write tests for every rule branch

Don’t:

- mutate UI state directly to represent game rules
- duplicate turn/win logic in components
- skip metadata sync after undo/redo
- mix unrelated concerns in one mega-component

## Suggested File Layout for New Games

```text
src/games/MyGame/
├── AbxCellComponent.tsx
├── AbxGridComponent.tsx
├── AbxGameComponent.tsx
├── index.tsx
├── logic.ts
├── logic.test.ts
└── styles.css
```

## Reference Implementation in This Repo

Use `src/games/AbxTicTacToe` as the reference implementation for:

- abstraction model usage
- action-driven move flow
- subgrid win detection
- reset + undo/redo synchronization
- clean UI/game separation

