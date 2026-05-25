import type { AbxCoord, AbxHasCells, AbxOperations } from './types'

export type AbxSubgridConfig<
  Coord extends AbxCoord,
  Operations extends AbxOperations,
> = {
  id: string
  cells: readonly Coord[]
  operations?: Operations
  label?: string
}

type CoordKey = string

function coordKey(coord: AbxCoord): CoordKey {
  return `${coord.row}:${coord.col}`
}

function areNeighbors(a: AbxCoord, b: AbxCoord): boolean {
  const dr = Math.abs(a.row - b.row)
  const dc = Math.abs(a.col - b.col)
  return dr + dc === 1
}

export class AbxSubgrid<
  Coord extends AbxCoord,
  State,
  Operations extends AbxOperations = {},
> {
  readonly id: string
  readonly label: string
  readonly operations: Operations

  private readonly coords: readonly Coord[]

  constructor(config: AbxSubgridConfig<Coord, Operations>) {
    this.id = config.id
    this.label = config.label ?? config.id
    this.coords = config.cells
    this.operations = (config.operations ?? {}) as Operations
  }

  get cells(): readonly Coord[] {
    return this.coords
  }

  hasCell(coord: Coord): boolean {
    return this.coords.some((candidate) => {
      return candidate.row === coord.row && candidate.col === coord.col
    })
  }

  intersects(other: AbxSubgrid<Coord, State, AbxOperations>): boolean {
    const own = new Set(this.coords.map((coord) => coordKey(coord)))
    return other.cells.some((coord) => own.has(coordKey(coord)))
  }

  isConnected(): boolean {
    if (this.coords.length <= 1) {
      return true
    }

    const byKey = new Map<CoordKey, Coord>()
    for (const coord of this.coords) {
      byKey.set(coordKey(coord), coord)
    }

    const start = this.coords[0]
    const queue: Coord[] = [start]
    const seen = new Set<CoordKey>([coordKey(start)])

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) {
        break
      }

      for (const candidate of this.coords) {
        const key = coordKey(candidate)
        if (seen.has(key)) {
          continue
        }

        if (areNeighbors(current, candidate)) {
          seen.add(key)
          queue.push(candidate)
        }
      }
    }

    return seen.size === this.coords.length
  }

  getStates(grid: AbxHasCells<Coord, State>): State[] {
    const values: State[] = []

    for (const coord of this.coords) {
      const state = grid.getCellState(coord)
      if (state !== undefined) {
        values.push(state)
      }
    }

    return values
  }

  allCellsShareValue<Value>(
    grid: AbxHasCells<Coord, State>,
    selector: (state: State) => Value,
    options?: { ignore?: (value: Value) => boolean },
  ): { matches: boolean; value: Value | null } {
    const states = this.getStates(grid)
    if (states.length !== this.coords.length || states.length === 0) {
      return { matches: false, value: null }
    }

    const firstValue = selector(states[0])
    if (options?.ignore?.(firstValue)) {
      return { matches: false, value: null }
    }

    const matches = states.every((state) => Object.is(selector(state), firstValue))
    return {
      matches,
      value: matches ? firstValue : null,
    }
  }
}
