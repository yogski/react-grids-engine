import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GridCell } from './GridCell'
import type {
  CellEventHandlers,
  DragState,
  GridCoord,
  GridProps,
  GridValue,
} from './types'

type PendingDrag = {
  coord: GridCoord
  startX: number
  startY: number
}

const DRAG_THRESHOLD_PX = 4

const EMPTY_DRAG_STATE: DragState = {
  isDragging: false,
  source: null,
  target: null,
}

function sameCoord(a: GridCoord | null, b: GridCoord | null) {
  return a?.row === b?.row && a?.col === b?.col
}

/**
 * Compose two handlers of the same function type into a single handler.
 *
 * Returns a function that forwards all arguments to `base` and then to
 * `override` (if provided). If `override` is not supplied this returns the
 * original `base` handler directly to avoid creating an unnecessary wrapper.
 *
 * Generic type `T` represents the handler function signature (for example,
 * an event callback). The returned value is typed as `T`.
 *
 * @param base - The primary handler that will always be invoked.
 * @param override - Optional handler that will be invoked after `base`.
 * @returns A handler of type `T` that calls both handlers in order.
 */
function composeHandlers<T extends (...args: never[]) => void>(
  base: T,
  override?: T,
): T {
  if (!override) {
    return base
  }

  return ((...args: Parameters<T>) => {
    base(...args)
    override(...args)
  }) as T
}

export function Grid<T>({
  rows,
  cols,
  data,
  renderCell,
  onCellClick,
  onCellRightClick,
  onCellDragStart,
  onCellDrop,
  draggable = true,
  selectable = true,
  activeCell: controlledActiveCell,
  onActiveCellChange,
  getCellProps,
  canDrop,
  className,
  style,
}: GridProps<T>) {
  const [internalActiveCell, setInternalActiveCell] = useState<GridCoord | null>(
    null,
  )
  const [dragState, setDragState] = useState<DragState>(EMPTY_DRAG_STATE)

  const activeCell = controlledActiveCell ?? internalActiveCell
  const pendingDragRef = useRef<PendingDrag | null>(null)
  const skipNextClickRef = useRef(false)

  const getCellValue = useCallback(
    (coord: GridCoord): GridValue<T> => data?.[coord.row]?.[coord.col],
    [data],
  )

  const setActiveCell = useCallback(
    (coord: GridCoord | null) => {
      if (!selectable) {
        return
      }

      if (controlledActiveCell === undefined) {
        setInternalActiveCell(coord)
      }

      onActiveCellChange?.(coord)
    },
    [controlledActiveCell, onActiveCellChange, selectable],
  )

  const resetDragState = useCallback(() => {
    pendingDragRef.current = null
    setDragState(EMPTY_DRAG_STATE)
  }, [])

  const endDrag = useCallback(
    (dropTarget: GridCoord | null) => {
      const source = dragState.source

      if (!dragState.isDragging || !source || !dropTarget) {
        resetDragState()
        return
      }

      const dropAllowed = canDrop?.(source, dropTarget) ?? true
      if (dropAllowed) {
        onCellDrop?.(source, dropTarget)
      }

      resetDragState()
    },
    [canDrop, dragState.isDragging, dragState.source, onCellDrop, resetDragState],
  )

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const pendingDrag = pendingDragRef.current
      if (!draggable || !pendingDrag || dragState.isDragging) {
        return
      }

      const dx = event.clientX - pendingDrag.startX
      const dy = event.clientY - pendingDrag.startY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < DRAG_THRESHOLD_PX) {
        return
      }

      const sourceCoord = pendingDrag.coord
      const sourceValue = getCellValue(sourceCoord)

      skipNextClickRef.current = true
      setDragState({
        isDragging: true,
        source: sourceCoord,
        target: sourceCoord,
      })
      onCellDragStart?.(sourceCoord, sourceValue)
    },
    [dragState.isDragging, draggable, getCellValue, onCellDragStart],
  )

  const handleGlobalMouseUp = useCallback(() => {
    endDrag(dragState.target)
  }, [dragState.target, endDrag])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [handleGlobalMouseUp, handleMouseMove])

  const onPointerEnter = useCallback((coord: GridCoord) => {
    setDragState((prev) => {
      if (!prev.isDragging || sameCoord(prev.target, coord)) {
        return prev
      }

      return {
        ...prev,
        target: coord,
      }
    })
  }, [])

  const createHandlers = useCallback(
    (coord: GridCoord): CellEventHandlers => ({
      onClick: () => {
        if (skipNextClickRef.current) {
          skipNextClickRef.current = false
          return
        }

        const value = getCellValue(coord)
        setActiveCell(coord)
        onCellClick?.(coord, value)
      },
      onContextMenu: (event) => {
        event.preventDefault()
        const value = getCellValue(coord)
        onCellRightClick?.(coord, value, event)
      },
      onMouseDown: (event) => {
        if (!draggable || event.button !== 0) {
          return
        }

        pendingDragRef.current = {
          coord,
          startX: event.clientX,
          startY: event.clientY,
        }
      },
      onMouseUp: () => {
        if (!dragState.isDragging) {
          pendingDragRef.current = null
          return
        }

        endDrag(coord)
      },
    }),
    [dragState.isDragging, draggable, endDrag, getCellValue, onCellClick, onCellRightClick, setActiveCell],
  )

  const cells = useMemo(() => {
    const output: React.ReactNode[] = []

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const coord = { row, col }
        const value = getCellValue(coord)

        const baseHandlers = createHandlers(coord)
        const isActive = sameCoord(activeCell, coord)
        const isDragging =
          dragState.isDragging && sameCoord(dragState.source, coord)
        const isDropTarget =
          dragState.isDragging && sameCoord(dragState.target, coord)

        const override = getCellProps?.(coord, value)
        const overrideHandlers = override?.eventHandlers

        const eventHandlers: CellEventHandlers = {
          onClick: composeHandlers(baseHandlers.onClick, overrideHandlers?.onClick),
          onContextMenu: composeHandlers(
            baseHandlers.onContextMenu,
            overrideHandlers?.onContextMenu,
          ),
          onMouseDown: composeHandlers(
            baseHandlers.onMouseDown,
            overrideHandlers?.onMouseDown,
          ),
          onMouseUp: composeHandlers(baseHandlers.onMouseUp, overrideHandlers?.onMouseUp),
        }

        output.push(
          <GridCell
            key={`${row}-${col}`}
            coord={coord}
            value={value}
            isActive={override?.isActive ?? isActive}
            isDragging={override?.isDragging ?? isDragging}
            isDropTarget={override?.isDropTarget ?? isDropTarget}
            eventHandlers={eventHandlers}
            renderCell={renderCell}
            onPointerEnter={onPointerEnter}
          />, 
        )
      }
    }

    return output
  }, [
    rows,
    cols,
    getCellValue,
    createHandlers,
    activeCell,
    dragState.isDragging,
    dragState.source,
    dragState.target,
    getCellProps,
    renderCell,
    onPointerEnter,
  ])

  return (
    <div
      role="grid"
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        ...style,
      }}
    >
      {cells}
    </div>
  )
}
