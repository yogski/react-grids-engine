export type CellBinary = 0 | 1

export type LayoutGrid = CellBinary[][]

export type SymmetryOption = 'none' | 'rotational' | 'mirror'
export type SymmetryCount = 'horizontal' | 'vertical' | 'both'

export type LayoutSpec = {
  width: number
  height: number
  symmetryOption: SymmetryOption
  symmetryCount: SymmetryCount
}

export type LayoutCoord = {
  row: number
  col: number
}

export type SavedLayoutRecord = {
  id: string
  timestamp: string
  spec: LayoutSpec
  rawGrid: LayoutGrid
  encodedGrid: string
}
