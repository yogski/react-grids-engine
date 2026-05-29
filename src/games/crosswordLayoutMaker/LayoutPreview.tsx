import { borderedPreviewPadding } from './utils'
import type { LayoutGrid } from './types'

type Props = {
  grid: LayoutGrid
  className?: string
  /** Wrap the preview in a one-cell-thick dark border frame. */
  bordered?: boolean
  /**
   * Size the preview from the container's height instead of its width.
   * Use this when the element is a grid item that stretches to the row height,
   * so the preview fills the full card height and the width is derived from
   * the aspect ratio.
   */
  fillHeight?: boolean
}

export function LayoutPreview({ grid, className, bordered = false, fillHeight = false }: Props) {
  const rows = grid.length
  const cols = grid[0]?.length ?? 1

  const cells = grid.flatMap((row, rowIndex) =>
    row.map((cell, colIndex) => (
      <span
        key={`${rowIndex}-${colIndex}`}
        className={
          cell === 1
            ? 'clm-preview-cell clm-preview-cell--black'
            : 'clm-preview-cell clm-preview-cell--open'
        }
      />
    )),
  )

  const gridEl = (
    <div
      className="clm-preview-grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        aspectRatio: `${cols} / ${rows}`,
        width: '100%',
      }}
      aria-hidden="true"
    >
      {cells}
    </div>
  )

  if (bordered) {
    // padding as a % of the containing block width ≈ one cell width on every side
    return (
      <div
        className={className}
        style={{
          background: '#111827',
          padding: borderedPreviewPadding(cols),
          borderRadius: '10px',
        }}
      >
        {gridEl}
      </div>
    )
  }

  // Non-bordered: className merged onto the grid element itself (backwards-compatible)
  return (
    <div
      className={['clm-preview-grid', className ?? ''].filter(Boolean).join(' ')}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        aspectRatio: `${cols} / ${rows}`,
        // fillHeight: size from the container's definite height (grid row stretch);
        //             width is then derived from aspect-ratio, capped to avoid overflow.
        ...(fillHeight
          ? { height: '100%', width: 'auto', maxWidth: '100%' }
          : { width: '100%' }),
      }}
      aria-hidden="true"
    >
      {cells}
    </div>
  )
}

