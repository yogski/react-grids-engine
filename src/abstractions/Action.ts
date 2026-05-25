import { AbxPlayer } from './Player'

export type AbxActionConfig<
  GameType,
  Payload,
  PlayerType extends AbxPlayer<unknown>,
  Result,
> = {
  id: string
  name: string
  player: PlayerType
  payload: Payload
  timestamp?: Date
  execute: (game: GameType, payload: Payload, player: PlayerType) => Result
}

export class AbxAction<
  GameType,
  Payload,
  PlayerType extends AbxPlayer<unknown>,
  Result = void,
> {
  readonly id: string
  readonly name: string
  readonly player: PlayerType
  readonly payload: Payload
  readonly timestamp: Date

  private readonly executeAction: (
    game: GameType,
    payload: Payload,
    player: PlayerType,
  ) => Result

  constructor(config: AbxActionConfig<GameType, Payload, PlayerType, Result>) {
    this.id = config.id
    this.name = config.name
    this.player = config.player
    this.payload = config.payload
    this.timestamp = config.timestamp ?? new Date()
    this.executeAction = config.execute
  }

  apply(game: GameType): Result {
    return this.executeAction(game, this.payload, this.player)
  }
}

export function createActionId(prefix = 'action'): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}-${Date.now()}-${random}`
}
