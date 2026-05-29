import type { MouseEvent as ReactMouseEvent } from 'react'
import { AxisLine } from './AxisLine'
import { LayoutPreview } from './LayoutPreview'
import type { CellBinary, LayoutGrid, LayoutSpec } from './types'

type Props = {
  spec: LayoutSpec
  grid: LayoutGrid
  onCellMouseDown: (row: number, col: number, event: ReactMouseEvent) => void
  onCellMouseEnter: (row: number, col: number) => void
}

const CELL_BG: Record<CellBinary, string> = {
  1: '#111827',
  0: '#f8fafc',
}

export function InteractiveGridPanel({ spec, grid, onCellMouseDown, onCellMouseEnter }: Props) {
  const showSymmetryAxis = spec.symmetryOption !== 'none'
  const showHorizontalAxis =
    showSymmetryAxis && (spec.symmetryCount === 'horizontal' || spec.symmetryCount === 'both')
  const showVerticalAxis =
    showSymmetryAxis && (spec.symmetryCount === 'vertical' || spec.symmetryCount === 'both')

  return (
    <section className="clm-panel">
      <h3>Interactive Grid</h3>
      <p className="clm-help">
        Click cells to toggle black/open. Click and drag to paint multiple cells at once.
      </p>

      <div className="clm-grid-and-preview">
        <div className="clm-grid-shell" role="presentation">
          {showHorizontalAxis && <AxisLine orientation="horizontal" />}
          {showVerticalAxis && <AxisLine orientation="vertical" />}

          <div
            className="clm-editor-grid"
            role="grid"
            aria-label="Crossword layout editor"
            style={{
              gridTemplateColumns: `repeat(${grid[0]?.length ?? 1}, minmax(0, 1fr))`,
            }}
          >
            {grid.flatMap((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  role="gridcell"
                  className="clm-cell"
                  style={{ background: CELL_BG[cell] }}
                  aria-label={`row ${rowIndex + 1} column ${colIndex + 1}`}
                  onMouseDown={(event) => onCellMouseDown(rowIndex, colIndex, event)}
                  onMouseEnter={() => onCellMouseEnter(rowIndex, colIndex)}
                />
              )),
            )}
          </div>
        </div>

        <div className="clm-live-preview">
          <h4>Preview</h4>
          <LayoutPreview grid={grid} bordered />
        </div>
      </div>
    </section>
  )
}
