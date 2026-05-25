import { AbxAction } from './Action'
import { AbxGrid } from './Grid'
import { AbxPlayer } from './Player'
import type { AbxCoord, AbxOperations } from './types'

export type AbxGameConfig<
  Coord extends AbxCoord,
  CellState,
  PlayerType extends AbxPlayer<unknown>,
  GameState extends string,
  GameOperations extends AbxOperations,
> = {
  grid: AbxGrid<Coord, CellState>
  players: readonly PlayerType[]
  initialState: GameState
  operations?: GameOperations
}

export class AbxGame<
  Coord extends AbxCoord,
  CellState,
  PlayerType extends AbxPlayer<unknown>,
  GameState extends string,
  GameOperations extends AbxOperations = {},
> {
  readonly grid: AbxGrid<Coord, CellState>
  readonly players: readonly PlayerType[]
  readonly operations: GameOperations

  turnCounter: number
  state: GameState
  protected currentPlayerIndex: number
  protected readonly actionLog: AbxAction<this, unknown, PlayerType, unknown>[]

  constructor(
    config: AbxGameConfig<
      Coord,
      CellState,
      PlayerType,
      GameState,
      GameOperations
    >,
  ) {
    if (config.players.length === 0) {
      throw new Error('A game must contain at least one player.')
    }

    this.grid = config.grid
    this.players = config.players
    this.turnCounter = 0
    this.currentPlayerIndex = 0
    this.state = config.initialState
    this.operations = (config.operations ?? {}) as GameOperations
    this.actionLog = []
  }

  get currentPlayer(): PlayerType {
    return this.players[this.currentPlayerIndex]
  }

  get actions(): readonly AbxAction<this, unknown, PlayerType, unknown>[] {
    return this.actionLog
  }

  setState(nextState: GameState) {
    this.state = nextState
  }

  startGame(state: GameState) {
    this.state = state
    this.turnCounter = 0
    this.currentPlayerIndex = 0
    this.actionLog.length = 0
  }

  makeAction<Payload, Result>(
    action: AbxAction<this, Payload, PlayerType, Result>,
    options?: {
      enforceCurrentPlayer?: boolean
      advanceTurn?: boolean
      trackGridHistory?: boolean
    },
  ): Result {
    if (options?.enforceCurrentPlayer !== false && action.player.id !== this.currentPlayer.id) {
      throw new Error('Action player does not match current player.')
    }

    let result: Result
    const apply = () => {
      result = action.apply(this)
    }

    if (options?.trackGridHistory === false) {
      apply()
    } else {
      this.grid.transact(apply)
    }

    this.actionLog.push(action as AbxAction<this, unknown, PlayerType, unknown>)
    this.turnCounter += 1

    if (options?.advanceTurn !== false) {
      this.advanceTurn()
    }

    return result!
  }

  reset(state: GameState) {
    this.startGame(state)
  }

  protected advanceTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length
  }
}
