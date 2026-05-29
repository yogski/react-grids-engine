import { AbxCell, AbxGrid } from '../../abstractions'
import { encodeHexBitmask } from '../../utils/gridBitmask'
import type {
  CellBinary,
  LayoutCoord,
  LayoutGrid,
  LayoutSpec,
  SavedLayoutRecord,
  SymmetryCount,
} from './types'

const STORAGE_KEY = 'crossword-layout-maker.layouts.v1'

type LayoutCellState = {
  value: CellBinary
}

const DEFAULT_SYMMETRY_COUNT: SymmetryCount = 'horizontal'

function createEmptyAbxGrid(width: number, height: number, fill: CellBinary) {
  return new AbxGrid<LayoutCoord, LayoutCellState>({
    width,
    height,
    cellFactory: (row, col) => {
      return new AbxCell<LayoutCoord, LayoutCellState>({
        coordinate: { row, col },
        initialState: { value: fill },
      })
    },
  })
}

function matrixToAbxGrid(grid: LayoutGrid) {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const abxGrid = createEmptyAbxGrid(width, height, 0)

  abxGrid.resetCells(({ row, col }) => ({ value: grid[row][col] }), {
    trackHistory: false,
    trackCellHistory: false,
  })

  return abxGrid
}

function abxGridToMatrix(abxGrid: AbxGrid<LayoutCoord, LayoutCellState>): LayoutGrid {
  const output: LayoutGrid = []

  for (let row = 0; row < abxGrid.height; row += 1) {
    const nextRow: CellBinary[] = []
    for (let col = 0; col < abxGrid.width; col += 1) {
      const value = abxGrid.getCellState({ row, col })?.value ?? 1
      nextRow.push(value)
    }
    output.push(nextRow)
  }

  return output
}

function uniqueCoords(coords: LayoutCoord[]): LayoutCoord[] {
  const seen = new Set<string>()
  return coords.filter((coord) => {
    const key = `${coord.row},${coord.col}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function isInBounds(coord: LayoutCoord, spec: LayoutSpec): boolean {
  return (
    coord.row >= 0 && coord.row < spec.height && coord.col >= 0 && coord.col < spec.width
  )
}

function rotate180(coord: LayoutCoord, spec: LayoutSpec): LayoutCoord {
  return {
    row: spec.height - 1 - coord.row,
    col: spec.width - 1 - coord.col,
  }
}

function rotate90(coord: LayoutCoord, size: number): LayoutCoord {
  return {
    row: coord.col,
    col: size - 1 - coord.row,
  }
}

function rotate270(coord: LayoutCoord, size: number): LayoutCoord {
  return {
    row: size - 1 - coord.col,
    col: coord.row,
  }
}

function mirrorHorizontal(coord: LayoutCoord, spec: LayoutSpec): LayoutCoord {
  return {
    row: spec.height - 1 - coord.row,
    col: coord.col,
  }
}

function mirrorVertical(coord: LayoutCoord, spec: LayoutSpec): LayoutCoord {
  return {
    row: coord.row,
    col: spec.width - 1 - coord.col,
  }
}

export function normalizeSpec(spec: LayoutSpec): LayoutSpec {
  const width = Number.isFinite(spec.width) ? Math.max(1, Math.floor(spec.width)) : 1
  const height = Number.isFinite(spec.height) ? Math.max(1, Math.floor(spec.height)) : 1

  return {
    width,
    height,
    symmetryOption: spec.symmetryOption,
    symmetryCount: spec.symmetryCount ?? DEFAULT_SYMMETRY_COUNT,
  }
}

export function createInitialLayout(spec: LayoutSpec): LayoutGrid {
  const normalized = normalizeSpec(spec)
  const abxGrid = createEmptyAbxGrid(normalized.width, normalized.height, 1)
  return abxGridToMatrix(abxGrid)
}

export function getSymmetricCoords(coord: LayoutCoord, spec: LayoutSpec): LayoutCoord[] {
  const normalized = normalizeSpec(spec)
  const coords: LayoutCoord[] = [coord]

  if (normalized.symmetryOption === 'none') {
    return uniqueCoords(coords)
  }

  if (normalized.symmetryOption === 'rotational') {
    coords.push(rotate180(coord, normalized))

    if (normalized.symmetryCount === 'both' && normalized.width === normalized.height) {
      coords.push(rotate90(coord, normalized.width))
      coords.push(rotate270(coord, normalized.width))
    }

    return uniqueCoords(coords).filter((point) => isInBounds(point, normalized))
  }

  if (normalized.symmetryCount === 'horizontal' || normalized.symmetryCount === 'both') {
    coords.push(mirrorHorizontal(coord, normalized))
  }

  if (normalized.symmetryCount === 'vertical' || normalized.symmetryCount === 'both') {
    coords.push(mirrorVertical(coord, normalized))
  }

  if (normalized.symmetryCount === 'both') {
    coords.push(mirrorHorizontal(mirrorVertical(coord, normalized), normalized))
  }

  return uniqueCoords(coords).filter((point) => isInBounds(point, normalized))
}

function applyValueAtCoords(
  grid: LayoutGrid,
  coords: LayoutCoord[],
  nextValue: CellBinary,
): LayoutGrid {
  const abxGrid = matrixToAbxGrid(grid)

  abxGrid.transact(() => {
    for (const coord of coords) {
      abxGrid.setCellState(coord, { value: nextValue }, { trackHistory: false })
    }
  })

  return abxGridToMatrix(abxGrid)
}

export function toggleCellWithSymmetry(
  grid: LayoutGrid,
  coord: LayoutCoord,
  spec: LayoutSpec,
): LayoutGrid {
  const current = grid[coord.row]?.[coord.col] ?? 1
  const nextValue: CellBinary = current === 1 ? 0 : 1
  const affected = getSymmetricCoords(coord, spec)
  return applyValueAtCoords(grid, affected, nextValue)
}

export function paintCellWithSymmetry(
  grid: LayoutGrid,
  coord: LayoutCoord,
  spec: LayoutSpec,
  nextValue: CellBinary,
): LayoutGrid {
  const affected = getSymmetricCoords(coord, spec)
  return applyValueAtCoords(grid, affected, nextValue)
}

export function encodeLayout(grid: LayoutGrid): string {
  return encodeHexBitmask(grid)
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `layout-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
}

export function createSavedLayoutRecord(
  spec: LayoutSpec,
  grid: LayoutGrid,
): SavedLayoutRecord {
  return {
    id: uuid(),
    timestamp: new Date().toISOString(),
    spec: normalizeSpec(spec),
    rawGrid: grid,
    encodedGrid: encodeLayout(grid),
  }
}

function isBinaryCell(value: unknown): value is CellBinary {
  return value === 0 || value === 1
}

function isLayoutGrid(value: unknown): value is LayoutGrid {
  if (!Array.isArray(value)) {
    return false
  }

  if (value.length === 0) {
    return false
  }

  return value.every((row) => {
    return (
      Array.isArray(row) &&
      row.length > 0 &&
      row.every((cell) => isBinaryCell(cell))
    )
  })
}

function isSymmetryOption(value: unknown): value is LayoutSpec['symmetryOption'] {
  return value === 'none' || value === 'rotational' || value === 'mirror'
}

function isSymmetryCount(value: unknown): value is SymmetryCount {
  return value === 'horizontal' || value === 'vertical' || value === 'both'
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseLayoutSpec(value: unknown): LayoutSpec | null {
  if (!isRecordLike(value)) {
    return null
  }

  const width = value.width
  const height = value.height
  const symmetryOption = value.symmetryOption
  const symmetryCount = value.symmetryCount

  if (typeof width !== 'number' || typeof height !== 'number') {
    return null
  }

  if (!isSymmetryOption(symmetryOption)) {
    return null
  }

  if (!isSymmetryCount(symmetryCount)) {
    return null
  }

  return normalizeSpec({ width, height, symmetryOption, symmetryCount })
}

function parseSavedRecord(value: unknown): SavedLayoutRecord | null {
  if (!isRecordLike(value)) {
    return null
  }

  const id = value.id
  const timestamp = value.timestamp
  const spec = parseLayoutSpec(value.spec)
  const rawGrid = value.rawGrid
  const encodedGrid = value.encodedGrid

  if (typeof id !== 'string' || typeof timestamp !== 'string') {
    return null
  }

  if (!spec || !isLayoutGrid(rawGrid) || typeof encodedGrid !== 'string') {
    return null
  }

  return {
    id,
    timestamp,
    spec,
    rawGrid,
    encodedGrid,
  }
}

export function mergeLayoutRecords(
  existing: SavedLayoutRecord[],
  incoming: SavedLayoutRecord[],
): SavedLayoutRecord[] {
  const byId = new Set(existing.map((item) => item.id))
  const byTimestamp = new Set(existing.map((item) => item.timestamp))
  const output = [...existing]

  for (const record of incoming) {
    if (byId.has(record.id) || byTimestamp.has(record.timestamp)) {
      continue
    }

    output.push(record)
    byId.add(record.id)
    byTimestamp.add(record.timestamp)
  }

  return output.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export function saveLayoutRecords(records: SavedLayoutRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function loadLayoutRecords(): SavedLayoutRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    const records = parsed
      .map((entry) => parseSavedRecord(entry))
      .filter((entry): entry is SavedLayoutRecord => entry !== null)

    return records.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  } catch {
    return []
  }
}

export function parseImportedLayouts(payload: string): SavedLayoutRecord[] {
  let parsed: unknown

  try {
    parsed = JSON.parse(payload)
  } catch {
    return []
  }

  const arraySource = Array.isArray(parsed)
    ? parsed
    : isRecordLike(parsed) && Array.isArray(parsed.layouts)
      ? parsed.layouts
      : []

  return arraySource
    .map((entry) => parseSavedRecord(entry))
    .filter((entry): entry is SavedLayoutRecord => entry !== null)
}
