import { AbxCell } from './Cell'
import { AbxSubgrid } from './Subgrid'
import type { AbxCoord, AbxHasCells, AbxHistorySnapshot, AbxOperations } from './types'

type RowFactory<
  Coord extends AbxCoord,
  State,
  CellOperations extends AbxOperations,
> = (row: number, col: number) => AbxCell<Coord, State, CellOperations>

export type AbxGridConfig<
  Coord extends AbxCoord,
  State,
  CellOperations extends AbxOperations,
  GridOperations extends AbxOperations,
  SubgridOperations extends AbxOperations,
> = {
  width: number
  height: number
  cellFactory: RowFactory<Coord, State, CellOperations>
  operations?: GridOperations
  subgrids?: readonly AbxSubgrid<Coord, State, SubgridOperations>[]
}

function snapshotEquals<State>(
  left: AbxHistorySnapshot<State>,
  right: AbxHistorySnapshot<State>,
): boolean {
  if (left.length !== right.length) {
    return false
  }

  for (let row = 0; row < left.length; row += 1) {
    if (left[row].length !== right[row].length) {
      return false
    }

    for (let col = 0; col < left[row].length; col += 1) {
      if (!Object.is(left[row][col], right[row][col])) {
        return false
      }
    }
  }

  return true
}

export class AbxGrid<
  Coord extends AbxCoord,
  State,
  CellOperations extends AbxOperations = {},
  GridOperations extends AbxOperations = {},
  SubgridOperations extends AbxOperations = {},
> implements AbxHasCells<Coord, State>
{
  readonly width: number
  readonly height: number
  readonly operations: GridOperations

  private readonly matrix: AbxCell<Coord, State, CellOperations>[][]
  private readonly subgridById: Map<string, AbxSubgrid<Coord, State, SubgridOperations>>
  private readonly past: AbxHistorySnapshot<State>[]
  private readonly future: AbxHistorySnapshot<State>[]

  constructor(
    config: AbxGridConfig<
      Coord,
      State,
      CellOperations,
      GridOperations,
      SubgridOperations
    >,
  ) {
    this.width = config.width
    this.height = config.height
    this.operations = (config.operations ?? {}) as GridOperations
    this.subgridById = new Map()
    this.past = []
    this.future = []

    this.matrix = []
    for (let row = 0; row < this.height; row += 1) {
      const outputRow: AbxCell<Coord, State, CellOperations>[] = []
      for (let col = 0; col < this.width; col += 1) {
        outputRow.push(config.cellFactory(row, col))
      }
      this.matrix.push(outputRow)
    }

    for (const subgrid of config.subgrids ?? []) {
      this.registerSubgrid(subgrid)
    }

    this.past.push(this.snapshot())
  }

  get cells(): readonly (readonly AbxCell<Coord, State, CellOperations>[])[] {
    return this.matrix
  }

  get history(): readonly AbxHistorySnapshot<State>[] {
    return this.past
  }

  get canUndo(): boolean {
    return this.past.length > 1
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  getCell(coord: Coord): AbxCell<Coord, State, CellOperations> | undefined {
    return this.matrix[coord.row]?.[coord.col]
  }

  getCellState(coord: Coord): State | undefined {
    return this.getCell(coord)?.state
  }

  setCellState(
    coord: Coord,
    nextState: State,
    options?: { trackHistory?: boolean; trackCellHistory?: boolean },
  ): boolean {
    const cell = this.getCell(coord)
    if (!cell) {
      return false
    }

    const changed = !Object.is(cell.state, nextState)
    if (!changed) {
      return false
    }

    cell.setState(nextState, { trackHistory: options?.trackCellHistory })

    if (options?.trackHistory !== false) {
      this.recordHistory()
    }

    return true
  }

  resetCells(
    createState: (coord: Coord) => State,
    options?: { trackHistory?: boolean; trackCellHistory?: boolean },
  ) {
    for (let row = 0; row < this.height; row += 1) {
      for (let col = 0; col < this.width; col += 1) {
        const coord = this.matrix[row][col].coordinate
        const nextState = createState(coord)
        this.matrix[row][col].setState(nextState, {
          trackHistory: options?.trackCellHistory,
        })
      }
    }

    if (options?.trackHistory !== false) {
      this.recordHistory()
    }
  }

  transact(work: () => void) {
    work()
    this.recordHistory()
  }

  undo(): boolean {
    if (this.past.length <= 1) {
      return false
    }

    const current = this.past.pop()
    if (!current) {
      return false
    }

    this.future.push(current)
    const previous = this.past[this.past.length - 1]
    this.restore(previous)
    return true
  }

  redo(): boolean {
    const next = this.future.pop()
    if (!next) {
      return false
    }

    this.past.push(next)
    this.restore(next)
    return true
  }

  resetHistory() {
    this.past.length = 0
    this.future.length = 0
    this.past.push(this.snapshot())
  }

  registerSubgrid(subgrid: AbxSubgrid<Coord, State, SubgridOperations>) {
    this.subgridById.set(subgrid.id, subgrid)
  }

  getSubgrid(id: string): AbxSubgrid<Coord, State, SubgridOperations> | undefined {
    return this.subgridById.get(id)
  }

  getSubgrids(): readonly AbxSubgrid<Coord, State, SubgridOperations>[] {
    return [...this.subgridById.values()]
  }

  snapshot(): AbxHistorySnapshot<State> {
    return this.matrix.map((row) => row.map((cell) => cell.state))
  }

  private restore(snapshot: AbxHistorySnapshot<State>) {
    for (let row = 0; row < this.height; row += 1) {
      for (let col = 0; col < this.width; col += 1) {
        const cell = this.matrix[row][col]
        cell.setState(snapshot[row][col], { trackHistory: false })
      }
    }
  }

  private recordHistory() {
    const next = this.snapshot()
    const previous = this.past[this.past.length - 1]

    if (previous && snapshotEquals(previous, next)) {
      return
    }

    this.past.push(next)
    this.future.length = 0
  }
}
