import { useEffect, useMemo, useState } from 'react'
import { Grid } from '../../components'
import type { GridCoord, RenderCellParams } from '../../components'
import {
  createBoard,
  makeMove,
  checkWin,
  isDraw,
  simpleAI,
  type Player,
  type Board as BoardType,
  getIndex,
} from './logic'
import './styles.css'

type CellValue = Player | null

export function TicTacToe() {
  const size = 3
  const [board, setBoard] = useState<BoardType>(() => createBoard(size))
  const [currentPlayer, setCurrentPlayer] = useState<Player>('O')
  const [winner, setWinner] = useState<Player | null>(null)
  const [winningLine, setWinningLine] = useState<number[] | null>(null)
  const [mode, setMode] = useState<'pvp' | 'pvc'>('pvc')
  const [aiThinking, setAiThinking] = useState(false)

  // Convert flat board to 2D grid for Grid component
  const gridData = useMemo(() => {
    const grid: (CellValue)[][] = []
    for (let r = 0; r < size; r++) {
      const row: CellValue[] = []
      for (let c = 0; c < size; c++) {
        row.push(board[getIndex(r, c, size)])
      }
      grid.push(row)
    }
    return grid
  }, [board])

  function reset() {
    setBoard(createBoard(size))
    setCurrentPlayer('O')
    setWinner(null)
    setWinningLine(null)
    setAiThinking(false)
  }

  const handleCellClick = (coord: GridCoord) => {
    if (winner || board[getIndex(coord.row, coord.col, size)]) return
    const next = makeMove(board, getIndex(coord.row, coord.col, size), currentPlayer)
    setBoard(next)
    const res = checkWin(next, size)
    if (res.winner) {
      setWinner(res.winner)
      setWinningLine(res.line)
      return
    }
    if (isDraw(next)) {
      setWinner(null)
      setWinningLine(null)
      return
    }
    setCurrentPlayer(currentPlayer === 'O' ? 'X' : 'O')
  }

  useEffect(() => {
    let t: number | undefined
    if (mode === 'pvc' && currentPlayer === 'X' && !winner) {
      setAiThinking(true)
      t = window.setTimeout(() => {
        const move = simpleAI(board, 'X', size)
        if (move !== null) {
          const next = makeMove(board, move, 'X')
          setBoard(next)
          const res = checkWin(next, size)
          if (res.winner) {
            setWinner(res.winner)
            setWinningLine(res.line)
            setAiThinking(false)
            return
          }
          if (isDraw(next)) {
            setWinner(null)
            setWinningLine(null)
            setAiThinking(false)
            return
          }
          setCurrentPlayer('O')
        }
        setAiThinking(false)
      }, 350)
    }
    return () => {
      if (t) clearTimeout(t)
    }
  }, [board, currentPlayer, mode, winner, size])

  const statusText = winner
    ? winner === 'O'
      ? '⭕ wins!'
      : '❌ wins!'
    : isDraw(board)
    ? 'Draw'
    : `${currentPlayer === 'O' ? '⭕' : '❌'}'s turn`

  const renderCell = (params: RenderCellParams<CellValue>) => {
    const { value, coord, eventHandlers } = params
    const index = getIndex(coord.row, coord.col, size)
    const isHighlight = winningLine?.includes(index) ? true : undefined
    const isDisabled = winner ? true : undefined

    return (
      <button
        type="button"
        className="ttt-square"
        data-highlight={isHighlight || undefined}
        data-disabled={isDisabled || undefined}
        onClick={eventHandlers.onClick}
        onContextMenu={eventHandlers.onContextMenu}
        onMouseDown={eventHandlers.onMouseDown}
        onMouseUp={eventHandlers.onMouseUp}
        disabled={!!isDisabled || !!value}
        aria-label={value ? `${value} cell` : 'empty cell'}
      >
        <span className="ttt-square__symbol">
          {value === 'O' ? '⭕' : value === 'X' ? '❌' : ''}
        </span>
      </button>
    )
  }

  return (
    <div className="ttt">
      <h2 className="ttt__title">Tic-Tac-Toe</h2>

      <div className="ttt__controls">
        <div className="ttt__status">{statusText}</div>
        <div className="ttt__buttons">
          <button type="button" onClick={() => reset()}>
            New Game
          </button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'pvc' ? 'pvp' : 'pvc'))}
            aria-pressed={mode === 'pvc'}
          >
            Mode: {mode === 'pvc' ? 'Player vs Computer' : 'Player vs Player'}
          </button>
        </div>
      </div>

      <Grid<CellValue>
        rows={size}
        cols={size}
        data={gridData}
        renderCell={renderCell}
        onCellClick={(coord) => {
          if (mode === 'pvc' && currentPlayer === 'X') return
          handleCellClick(coord)
        }}
        selectable={false}
        draggable={false}
        className="ttt-grid"
      />

      {aiThinking && <div className="ttt__ai">Computer is thinking…</div>}
    </div>
  )
}
