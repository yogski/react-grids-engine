// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { decodeHexBitmask, encodeHexBitmask } from './gridBitmask'

const TEST_HEX = 'C06EC76F8410FB71BB018'
const TEST_ROWS = 9
const TEST_COLS = 9

/** Expected 9×9 bitmask from the test crossword puzzle */
const EXPECTED_GRID = [
  [1, 1, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 0, 1, 1, 1, 0, 1, 1],
  [0, 0, 0, 1, 1, 1, 0, 1, 1],
  [0, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 1, 1, 1, 0, 0, 0],
  [1, 1, 0, 1, 1, 1, 0, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 1, 1],
]

describe('decodeHexBitmask', () => {
  it('decodes the test crossword hex into the correct 9×9 grid', () => {
    expect(decodeHexBitmask(TEST_HEX, TEST_ROWS, TEST_COLS)).toEqual(EXPECTED_GRID)
  })

  it('handles lowercase hex input', () => {
    expect(decodeHexBitmask(TEST_HEX.toLowerCase(), TEST_ROWS, TEST_COLS)).toEqual(
      EXPECTED_GRID,
    )
  })

  it('produces a grid of exactly rows×cols values', () => {
    const grid = decodeHexBitmask(TEST_HEX, TEST_ROWS, TEST_COLS)
    expect(grid).toHaveLength(TEST_ROWS)
    for (const row of grid) {
      expect(row).toHaveLength(TEST_COLS)
    }
  })

  it('only contains 0s and 1s', () => {
    const grid = decodeHexBitmask(TEST_HEX, TEST_ROWS, TEST_COLS)
    for (const row of grid) {
      for (const cell of row) {
        expect([0, 1]).toContain(cell)
      }
    }
  })
})

describe('encodeHexBitmask', () => {
  it('encodes the test grid back to the original hex (round-trip)', () => {
    expect(encodeHexBitmask(EXPECTED_GRID)).toBe(TEST_HEX)
  })

  it('round-trips arbitrary grids: encode(decode(hex)) === hex', () => {
    const decoded = decodeHexBitmask(TEST_HEX, TEST_ROWS, TEST_COLS)
    expect(encodeHexBitmask(decoded)).toBe(TEST_HEX)
  })

  it('round-trips the other way: decode(encode(grid)) deep-equals grid', () => {
    expect(
      decodeHexBitmask(encodeHexBitmask(EXPECTED_GRID), TEST_ROWS, TEST_COLS),
    ).toEqual(EXPECTED_GRID)
  })
})
