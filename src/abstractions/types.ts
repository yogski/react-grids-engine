export type AbxCoord = Readonly<{
  row: number
  col: number
}>

export type AbxOperation = (...args: never[]) => unknown
export type AbxOperations = Record<string, AbxOperation>

export type AbxHistorySnapshot<State> = State[][]

export interface AbxHasCells<Coord extends AbxCoord, State> {
  getCellState(coord: Coord): State | undefined
}
