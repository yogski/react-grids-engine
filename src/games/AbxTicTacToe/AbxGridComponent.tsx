import { Grid } from '../../components'
import type { GridCoord, RenderCellParams } from '../../components'
import { AbxCellComponent } from './AbxCellComponent'
import type { AbxTttSymbol } from './logic'

type AbxGridComponentProps = {
  size: number
  board: (AbxTttSymbol | null)[][]
  highlightedCoords: ReadonlySet<string>
  disabled: boolean
  onCellClick: (coord: GridCoord) => void
}

function toCoordKey(coord: GridCoord): string {
  return `${coord.row}:${coord.col}`
}

export function AbxGridComponent({
  size,
  board,
  highlightedCoords,
  disabled,
  onCellClick,
}: AbxGridComponentProps) {
  const renderCell = (params: RenderCellParams<AbxTttSymbol | null>) => {
    const { coord, value, eventHandlers } = params
    const isFilled = value !== null
    const isDisabled = disabled || isFilled
    const isHighlighted = highlightedCoords.has(toCoordKey(coord))

    return (
      <AbxCellComponent
        symbol={value ?? null}
        highlighted={isHighlighted}
        disabled={isDisabled}
        onClick={eventHandlers.onClick}
      />
    )
  }

  return (
    <Grid<AbxTttSymbol | null>
      rows={size}
      cols={size}
      data={board}
      renderCell={renderCell}
      onCellClick={onCellClick}
      selectable={false}
      draggable={false}
      className="abx-ttt-grid"
    />
  )
}
