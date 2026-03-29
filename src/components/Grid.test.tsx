import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Grid } from './Grid'
import type { GridData } from './types'

function renderTestGrid(props?: {
  data?: GridData<string>
  onCellClick?: (coord: { row: number; col: number }, value: string | undefined) => void
  onCellRightClick?: (
    coord: { row: number; col: number },
    value: string | undefined,
    event: unknown,
  ) => void
  onCellDragStart?: (coord: { row: number; col: number }, value: string | undefined) => void
  onCellDrop?: (
    from: { row: number; col: number },
    to: { row: number; col: number },
  ) => void
  canDrop?: (
    from: { row: number; col: number },
    to: { row: number; col: number },
  ) => boolean
}) {
  const data = props?.data ?? [
    ['A', 'B'],
    ['C', 'D'],
  ]

  render(
    <Grid
      rows={2}
      cols={2}
      data={data}
      onCellClick={props?.onCellClick}
      onCellRightClick={props?.onCellRightClick}
      onCellDragStart={props?.onCellDragStart}
      onCellDrop={props?.onCellDrop}
      canDrop={props?.canDrop}
      renderCell={({ coord, value, eventHandlers }) => (
        <button type="button" aria-label={`cell-${coord.row}-${coord.col}`} {...eventHandlers}>
          {value}
        </button>
      )}
    />,
  )
}

describe('Grid', () => {
  it('calls onCellClick on left click when not dragging', () => {
    const onCellClick = vi.fn()
    renderTestGrid({ onCellClick })

    fireEvent.click(screen.getByRole('button', { name: 'cell-0-1' }))

    expect(onCellClick).toHaveBeenCalledTimes(1)
    expect(onCellClick).toHaveBeenCalledWith({ row: 0, col: 1 }, 'B')
  })

  it('calls onCellRightClick and prevents native menu', () => {
    let wasDefaultPrevented = false
    const onCellRightClick = vi.fn()
    onCellRightClick.mockImplementation((_, __, event) => {
      wasDefaultPrevented =
        (event as { defaultPrevented?: boolean }).defaultPrevented === true
    })

    renderTestGrid({ onCellRightClick })

    const cell = screen.getByRole('button', { name: 'cell-1-0' })

    fireEvent.contextMenu(cell)

    expect(onCellRightClick).toHaveBeenCalledTimes(1)
    expect(onCellRightClick.mock.calls[0][0]).toEqual({ row: 1, col: 0 })
    expect(onCellRightClick.mock.calls[0][1]).toBe('C')
    expect(wasDefaultPrevented).toBe(true)
  })

  it('does not trigger drag when movement is below threshold', () => {
    const onCellClick = vi.fn()
    const onCellDragStart = vi.fn()
    const onCellDrop = vi.fn()
    renderTestGrid({ onCellClick, onCellDragStart, onCellDrop })

    const source = screen.getByRole('button', { name: 'cell-0-0' })
    fireEvent.mouseDown(source, { button: 0, clientX: 20, clientY: 20 })
    fireEvent.mouseMove(window, { clientX: 22, clientY: 22 })
    fireEvent.mouseUp(source)
    fireEvent.click(source)

    expect(onCellDragStart).not.toHaveBeenCalled()
    expect(onCellDrop).not.toHaveBeenCalled()
    expect(onCellClick).toHaveBeenCalledTimes(1)
  })

  it('triggers drag lifecycle and drop on valid target', () => {
    const onCellDragStart = vi.fn()
    const onCellDrop = vi.fn()
    renderTestGrid({ onCellDragStart, onCellDrop })

    const source = screen.getByRole('button', { name: 'cell-0-0' })
    const targetContainer = screen.getByTestId('grid-cell-1-1')
    const targetButton = screen.getByRole('button', { name: 'cell-1-1' })

    fireEvent.mouseDown(source, { button: 0, clientX: 10, clientY: 10 })
    fireEvent.mouseMove(window, { clientX: 20, clientY: 20 })
    fireEvent.mouseEnter(targetContainer)
    fireEvent.mouseUp(targetButton)

    expect(onCellDragStart).toHaveBeenCalledWith({ row: 0, col: 0 }, 'A')
    expect(onCellDrop).toHaveBeenCalledWith({ row: 0, col: 0 }, { row: 1, col: 1 })
  })

  it('respects canDrop validation', () => {
    const onCellDrop = vi.fn()
    renderTestGrid({
      onCellDrop,
      canDrop: (from, to) => !(from.row === 0 && to.row === 1),
    })

    const source = screen.getByRole('button', { name: 'cell-0-0' })
    const targetContainer = screen.getByTestId('grid-cell-1-0')
    const targetButton = screen.getByRole('button', { name: 'cell-1-0' })

    fireEvent.mouseDown(source, { button: 0, clientX: 10, clientY: 10 })
    fireEvent.mouseMove(window, { clientX: 20, clientY: 20 })
    fireEvent.mouseEnter(targetContainer)
    fireEvent.mouseUp(targetButton)

    expect(onCellDrop).not.toHaveBeenCalled()
  })
})
