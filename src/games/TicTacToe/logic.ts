export type Player = 'O' | 'X'
export type Cell = Player | null
export type Board = Cell[]

export function createBoard(size = 3): Board {
  return Array(size * size).fill(null) as Board
}

export function getIndex(row: number, col: number, size = 3) {
  return row * size + col
}

export function getRowCol(index: number, size = 3): [number, number] {
  return [Math.floor(index / size), index % size]
}

export function availableMoves(board: Board): number[] {
  return board.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0)
}

export function makeMove(board: Board, index: number, player: Player): Board {
  if (board[index] !== null) return board.slice()
  const next = board.slice()
  next[index] = player
  return next
}

export function checkWin(board: Board, size = 3): { winner: Player | null; line: number[] | null } {
  const lines: number[][] = []

  // rows
  for (let r = 0; r < size; r++) {
    const row: number[] = []
    for (let c = 0; c < size; c++) row.push(r * size + c)
    lines.push(row)
  }

  // cols
  for (let c = 0; c < size; c++) {
    const col: number[] = []
    for (let r = 0; r < size; r++) col.push(r * size + c)
    lines.push(col)
  }

  // diagonals
  const d1: number[] = []
  const d2: number[] = []
  for (let i = 0; i < size; i++) {
    d1.push(i * size + i)
    d2.push(i * size + (size - 1 - i))
  }
  lines.push(d1, d2)

  for (const line of lines) {
    const first = board[line[0]]
    if (first !== null && line.every((i) => board[i] === first)) {
      return { winner: first, line }
    }
  }

  return { winner: null, line: null }
}

export function isDraw(board: Board): boolean {
  return board.every((c) => c !== null) && checkWin(board).winner === null
}

export function simpleAI(board: Board, aiPlayer: Player, size = 3): number | null {
  const opponent: Player = aiPlayer === 'O' ? 'X' : 'O'
  const moves = availableMoves(board)
  if (moves.length === 0) return null

  // Winning move
  for (const m of moves) {
    const copy = board.slice()
    copy[m] = aiPlayer
    if (checkWin(copy, size).winner === aiPlayer) return m
  }

  // Block opponent
  for (const m of moves) {
    const copy = board.slice()
    copy[m] = opponent
    if (checkWin(copy, size).winner === opponent) return m
  }

  // Center
  const center = Math.floor((size * size) / 2)
  if (moves.includes(center)) return center

  // Corners
  const corners = [0, size - 1, size * (size - 1), size * size - 1]
  for (const c of corners) if (moves.includes(c)) return c

  // Fallback random
  return moves[Math.floor(Math.random() * moves.length)]
}
