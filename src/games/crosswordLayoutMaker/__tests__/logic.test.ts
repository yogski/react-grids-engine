import { describe, expect, it } from 'vitest'
import {
  createInitialLayout,
  encodeLayout,
  getSymmetricCoords,
  paintCellWithSymmetry,
  toggleCellWithSymmetry,
} from '../logic'
import type { LayoutSpec } from '../types'

function spec(overrides: Partial<LayoutSpec>): LayoutSpec {
  return {
    width: 5,
    height: 5,
    symmetryOption: 'none',
    symmetryCount: 'horizontal',
    ...overrides,
  }
}

describe('crossword layout maker logic', () => {
  it('creates initial black/inactive layout using width and height', () => {
    const grid = createInitialLayout(spec({ width: 4, height: 3 }))

    expect(grid).toEqual([
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ])
  })

  it('encodes generated grid into uppercase hex', () => {
    const grid = [
      [1, 1],
      [1, 1],
    ] as const

    expect(encodeLayout(grid.map((row) => [...row]))).toBe('F')
  })

  it('rotational + 1-horizontal toggles opposite cell across center', () => {
    const base = createInitialLayout(spec({ symmetryOption: 'rotational', symmetryCount: 'horizontal' }))
    const result = toggleCellWithSymmetry(base, { row: 1, col: 4 }, spec({ symmetryOption: 'rotational', symmetryCount: 'horizontal' }))

    expect(result[1][4]).toBe(0)
    expect(result[3][0]).toBe(0)
  })

  it('mirror + 1-horizontal toggles cell across horizontal axis', () => {
    const base = createInitialLayout(spec({ symmetryOption: 'mirror', symmetryCount: 'horizontal' }))
    const result = toggleCellWithSymmetry(base, { row: 1, col: 4 }, spec({ symmetryOption: 'mirror', symmetryCount: 'horizontal' }))

    expect(result[1][4]).toBe(0)
    expect(result[3][4]).toBe(0)
  })

  it('mirror + 1-vertical toggles cell across vertical axis', () => {
    const base = createInitialLayout(spec({ symmetryOption: 'mirror', symmetryCount: 'vertical' }))
    const result = toggleCellWithSymmetry(base, { row: 1, col: 4 }, spec({ symmetryOption: 'mirror', symmetryCount: 'vertical' }))

    expect(result[1][4]).toBe(0)
    expect(result[1][0]).toBe(0)
  })

  it('rotational + 2-horizontal-vertical toggles 90/180/270 rotational counterparts', () => {
    const base = createInitialLayout(spec({ symmetryOption: 'rotational', symmetryCount: 'both' }))
    const result = toggleCellWithSymmetry(base, { row: 1, col: 4 }, spec({ symmetryOption: 'rotational', symmetryCount: 'both' }))

    expect(result[1][4]).toBe(0)
    expect(result[3][0]).toBe(0)
    expect(result[0][1]).toBe(0)
    expect(result[4][3]).toBe(0)
  })

  it('mirror + 2-horizontal-vertical toggles horizontal, vertical and combined mirrors', () => {
    const base = createInitialLayout(spec({ symmetryOption: 'mirror', symmetryCount: 'both' }))
    const result = toggleCellWithSymmetry(base, { row: 1, col: 4 }, spec({ symmetryOption: 'mirror', symmetryCount: 'both' }))

    expect(result[1][4]).toBe(0)
    expect(result[3][4]).toBe(0)
    expect(result[1][0]).toBe(0)
    expect(result[3][0]).toBe(0)
  })

  it('returns symmetric coordinates for quick preview logic', () => {
    const coords = getSymmetricCoords(
      { row: 1, col: 4 },
      spec({ symmetryOption: 'rotational', symmetryCount: 'both' }),
    )

    expect(coords).toEqual([
      { row: 1, col: 4 },
      { row: 3, col: 0 },
      { row: 4, col: 3 },
      { row: 0, col: 1 },
    ])
  })

  it('paint operation sets all affected cells to chosen value during drag operations', () => {
    const base = createInitialLayout(spec({ symmetryOption: 'mirror', symmetryCount: 'vertical' }))
    const painted = paintCellWithSymmetry(
      base,
      { row: 2, col: 1 },
      spec({ symmetryOption: 'mirror', symmetryCount: 'vertical' }),
      0,
    )

    expect(painted[2][1]).toBe(0)
    expect(painted[2][3]).toBe(0)
  })
})
