/**
 * Decodes a hex bitmask string into a 2D grid of 0s and 1s.
 *
 * The bitmask encodes cells in row-major order, MSB first.
 * `1` = black/blocked cell, `0` = white/open cell.
 *
 * @param hex  - Hex string (e.g. "C06EC76F8410FB71BB018")
 * @param rows - Number of rows in the grid
 * @param cols - Number of columns in the grid
 * @returns 2D array [row][col] with values 0 or 1
 */
export function decodeHexBitmask(hex: string, rows: number, cols: number): number[][] {
  const binaryStr = hex
    .toUpperCase()
    .split('')
    .map((c) => parseInt(c, 16).toString(2).padStart(4, '0'))
    .join('')

  const grid: number[][] = []
  for (let row = 0; row < rows; row++) {
    const gridRow: number[] = []
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col
      gridRow.push(idx < binaryStr.length ? parseInt(binaryStr[idx], 10) : 0)
    }
    grid.push(gridRow)
  }
  return grid
}

/**
 * Encodes a 2D grid of 0s and 1s back into a hex bitmask string.
 *
 * Reverses `decodeHexBitmask`. The flat bit sequence is zero-padded to
 * the next multiple of 4 before converting to hex uppercase.
 *
 * @param grid - 2D array [row][col] with values 0 or 1
 * @returns Uppercase hex string
 */
export function encodeHexBitmask(grid: number[][]): string {
  const bits = grid.flat()

  // Pad to next multiple of 4
  while (bits.length % 4 !== 0) {
    bits.push(0)
  }

  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    const nibble =
      (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3]
    hex += nibble.toString(16).toUpperCase()
  }
  return hex
}
