import type { AbxCoord, AbxOperations } from './types'

export type AbxCellConfig<
  Coord extends AbxCoord,
  State,
  Operations extends AbxOperations,
> = {
  coordinate: Coord
  initialState: State
  operations?: Operations
}

export class AbxCell<
  Coord extends AbxCoord,
  State,
  Operations extends AbxOperations = {},
> {
  readonly coordinate: Coord
  readonly operations: Operations

  private _state: State
  private readonly initialState: State
  private readonly _history: State[]

  constructor(config: AbxCellConfig<Coord, State, Operations>) {
    this.coordinate = config.coordinate
    this.initialState = config.initialState
    this._state = config.initialState
    this.operations = (config.operations ?? {}) as Operations
    this._history = [config.initialState]
  }

  get state(): State {
    return this._state
  }

  get history(): readonly State[] {
    return this._history
  }

  setState(nextState: State, options?: { trackHistory?: boolean }) {
    this._state = nextState

    if (options?.trackHistory === false) {
      return
    }

    this._history.push(nextState)
  }

  resetState(options?: { trackHistory?: boolean }) {
    this.setState(this.initialState, options)
  }
}
