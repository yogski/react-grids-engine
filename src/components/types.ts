import type { CSSProperties, MouseEvent, ReactNode } from 'react'

export type GridCoord = {
  row: number
  col: number
}

export type GridData<T> = T[][]

export type DragState = {
  isDragging: boolean
  source: GridCoord | null
  target: GridCoord | null
}

export type GridValue<T> = T | undefined

export type CellEventHandlers = {
  onClick: () => void
  onContextMenu: (e: MouseEvent<HTMLElement>) => void
  onMouseDown: (e: MouseEvent<HTMLElement>) => void
  onMouseUp: (e: MouseEvent<HTMLElement>) => void
}

export type RenderCellParams<T> = {
  coord: GridCoord
  value: GridValue<T>
  isActive: boolean
  isDragging: boolean
  isDropTarget: boolean
  eventHandlers: CellEventHandlers
}

export type GridProps<T> = {
  rows: number
  cols: number
  data?: GridData<T>
  renderCell: (params: RenderCellParams<T>) => ReactNode

  onCellClick?: (coord: GridCoord, value: GridValue<T>) => void
  onCellRightClick?: (
    coord: GridCoord,
    value: GridValue<T>,
    event: MouseEvent<HTMLElement>,
  ) => void
  onCellDragStart?: (coord: GridCoord, value: GridValue<T>) => void
  onCellDrop?: (from: GridCoord, to: GridCoord) => void

  draggable?: boolean
  selectable?: boolean

  activeCell?: GridCoord | null
  onActiveCellChange?: (coord: GridCoord | null) => void

  getCellProps?: (
    coord: GridCoord,
    value: GridValue<T>,
  ) => Partial<RenderCellParams<T>>
  canDrop?: (from: GridCoord, to: GridCoord) => boolean

  className?: string
  style?: CSSProperties
}
