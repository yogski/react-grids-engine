import {
  AbxAction,
  AbxCell,
  AbxGame,
  AbxGrid,
  AbxPlayer,
  AbxSubgrid,
  createActionId,
} from '../../abstractions'
import type { AbxCoord } from '../../abstractions'

export type AbxTttSymbol = 'X' | 'O'
export type AbxTttState = 'ongoing' | 'draw' | 'won'

export type AbxTttCellState = {
  symbol: AbxTttSymbol | null
}

export type AbxTttPlayer = AbxPlayer<AbxTttSymbol>

type MovePayload = {
  coord: AbxCoord
}

function createPlayers(): readonly AbxTttPlayer[] {
  return [
    new AbxPlayer({ id: 'p1', name: 'Player X', symbol: 'X' }),
    new AbxPlayer({ id: 'p2', name: 'Player O', symbol: 'O' }),
  ]
}

function createLineSubgrids(size: number): AbxSubgrid<AbxCoord, AbxTttCellState>[] {
  const subgrids: AbxSubgrid<AbxCoord, AbxTttCellState>[] = []

  for (let row = 0; row < size; row += 1) {
    const cells: AbxCoord[] = []
    for (let col = 0; col < size; col += 1) {
      cells.push({ row, col })
    }
    subgrids.push(new AbxSubgrid({ id: `row-${row}`, cells }))
  }

  for (let col = 0; col < size; col += 1) {
    const cells: AbxCoord[] = []
    for (let row = 0; row < size; row += 1) {
      cells.push({ row, col })
    }
    subgrids.push(new AbxSubgrid({ id: `col-${col}`, cells }))
  }

  const diagA: AbxCoord[] = []
  const diagB: AbxCoord[] = []
  for (let i = 0; i < size; i += 1) {
    diagA.push({ row: i, col: i })
    diagB.push({ row: i, col: size - 1 - i })
  }

  subgrids.push(new AbxSubgrid({ id: 'diag-main', cells: diagA }))
  subgrids.push(new AbxSubgrid({ id: 'diag-anti', cells: diagB }))

  return subgrids
}

function createGrid(size: number): AbxGrid<AbxCoord, AbxTttCellState> {
  return new AbxGrid({
    width: size,
    height: size,
    cellFactory: (row, col) => {
      return new AbxCell({
        coordinate: { row, col },
        initialState: { symbol: null },
      })
    },
    subgrids: createLineSubgrids(size),
  })
}

export class AbxTicTacToeGame extends AbxGame<
  AbxCoord,
  AbxTttCellState,
  AbxTttPlayer,
  AbxTttState
> {
  readonly size: number

  winner: AbxTttPlayer | null
  winningSubgridId: string | null

  private readonly undoneActions: AbxAction<this, unknown, AbxTttPlayer, unknown>[]

  constructor(size = 3) {
    super({
      grid: createGrid(size),
      players: createPlayers(),
      initialState: 'ongoing',
    })

    this.size = size
    this.winner = null
    this.winningSubgridId = null
    this.undoneActions = []
  }

  canUndo(): boolean {
    return this.grid.canUndo
  }

  canRedo(): boolean {
    return this.grid.canRedo
  }

  getSymbolGrid(): (AbxTttSymbol | null)[][] {
    return this.grid.snapshot().map((row) => row.map((cell) => cell.symbol))
  }

  getWinningCoordinates(): readonly AbxCoord[] {
    if (!this.winningSubgridId) {
      return []
    }

    return this.grid.getSubgrid(this.winningSubgridId)?.cells ?? []
  }

  makeMove(coord: AbxCoord): boolean {
    if (this.state !== 'ongoing') {
      return false
    }

    const cell = this.grid.getCell(coord)
    if (!cell || cell.state.symbol !== null) {
      return false
    }

    const player = this.currentPlayer
    const action = new AbxAction<this, MovePayload, AbxTttPlayer, boolean>({
      id: createActionId('ttt-move'),
      name: 'place-symbol',
      player,
      payload: { coord },
      execute: (game, payload, movePlayer) => {
        return game.grid.setCellState(
          payload.coord,
          { symbol: movePlayer.symbol },
          {
            trackHistory: false,
            trackCellHistory: true,
          },
        )
      },
    })

    const applied = super.makeAction(action, {
      enforceCurrentPlayer: true,
      advanceTurn: false,
      trackGridHistory: true,
    })

    if (!applied) {
      return false
    }

    this.undoneActions.length = 0
    this.evaluateStateAfterMove(player)
    if (this.state === 'ongoing') {
      this.advanceTurn()
    }

    return true
  }

  resetGame() {
    this.grid.resetCells(
      () => ({ symbol: null }),
      {
        trackHistory: false,
        trackCellHistory: true,
      },
    )

    this.grid.resetHistory()

    this.winner = null
    this.winningSubgridId = null
    this.undoneActions.length = 0
    this.startGame('ongoing')
  }

  undoMove(): boolean {
    const undone = this.grid.undo()
    if (!undone) {
      return false
    }

    const action = this.actionLog.pop()
    if (action) {
      this.undoneActions.push(action)
    }

    this.syncMetaWithGrid()
    return true
  }

  redoMove(): boolean {
    const redone = this.grid.redo()
    if (!redone) {
      return false
    }

    const action = this.undoneActions.pop()
    if (action) {
      this.actionLog.push(action)
    }

    this.syncMetaWithGrid()
    return true
  }

  private evaluateStateAfterMove(lastPlayer: AbxTttPlayer) {
    const winningSubgridId = this.findWinningSubgrid(lastPlayer.symbol)
    if (winningSubgridId) {
      this.winner = lastPlayer
      this.winningSubgridId = winningSubgridId
      this.setState('won')
      return
    }

    if (this.isBoardFull()) {
      this.winner = null
      this.winningSubgridId = null
      this.setState('draw')
      return
    }

    this.setState('ongoing')
  }

  private findWinningSubgrid(symbol: AbxTttSymbol): string | null {
    for (const subgrid of this.grid.getSubgrids()) {
      const result = subgrid.allCellsShareValue(
        this.grid,
        (state) => state.symbol,
        {
          ignore: (value) => value === null,
        },
      )

      if (result.matches && result.value === symbol) {
        return subgrid.id
      }
    }

    return null
  }

  private isBoardFull(): boolean {
    for (const row of this.grid.cells) {
      for (const cell of row) {
        if (cell.state.symbol === null) {
          return false
        }
      }
    }

    return true
  }

  private syncMetaWithGrid() {
    this.turnCounter = this.countFilledCells()
    this.currentPlayerIndex = this.turnCounter % this.players.length

    const winning = this.findAnyWinningSubgrid()
    if (winning) {
      this.winningSubgridId = winning.id
      this.winner = this.players.find((player) => player.symbol === winning.symbol) ?? null
      this.setState('won')
      return
    }

    this.winningSubgridId = null
    this.winner = null

    if (this.isBoardFull()) {
      this.setState('draw')
      return
    }

    this.setState('ongoing')
  }

  private findAnyWinningSubgrid(): { id: string; symbol: AbxTttSymbol } | null {
    for (const subgrid of this.grid.getSubgrids()) {
      const result = subgrid.allCellsShareValue(
        this.grid,
        (state) => state.symbol,
        {
          ignore: (value) => value === null,
        },
      )

      if (result.matches && result.value !== null) {
        return {
          id: subgrid.id,
          symbol: result.value,
        }
      }
    }

    return null
  }

  private countFilledCells(): number {
    let filled = 0

    for (const row of this.grid.cells) {
      for (const cell of row) {
        if (cell.state.symbol !== null) {
          filled += 1
        }
      }
    }

    return filled
  }
}
