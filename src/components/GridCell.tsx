import { memo } from 'react'
import type { GridCoord, GridValue, RenderCellParams } from './types'

type GridCellProps<T> = {
  coord: GridCoord
  value: GridValue<T>
  isActive: boolean
  isDragging: boolean
  isDropTarget: boolean
  renderCell: (params: RenderCellParams<T>) => React.ReactNode
  eventHandlers: RenderCellParams<T>['eventHandlers']
  onPointerEnter: (coord: GridCoord) => void
}

function GridCellInner<T>({
  coord,
  value,
  isActive,
  isDragging,
  isDropTarget,
  renderCell,
  eventHandlers,
  onPointerEnter,
}: GridCellProps<T>) {
  return (
    <div
      role="gridcell"
      data-row={coord.row}
      data-col={coord.col}
      data-testid={`grid-cell-${coord.row}-${coord.col}`}
      data-active={isActive || undefined}
      data-dragging={isDragging || undefined}
      data-drop-target={isDropTarget || undefined}
      onMouseEnter={() => onPointerEnter(coord)}
    >
      {renderCell({
        coord,
        value,
        isActive,
        isDragging,
        isDropTarget,
        eventHandlers,
      })}
    </div>
  )
}

export const GridCell = memo(GridCellInner) as typeof GridCellInner
