import type { Board as BoardType, Cell } from './logic'

type SquareProps = {
  value: Cell
  onClick: () => void
  highlight?: boolean
  disabled?: boolean
}

export function Square({ value, onClick, highlight, disabled }: SquareProps) {
  const classes = [
    'ttt-square',
    highlight ? 'ttt-square--highlight' : '',
    disabled ? 'ttt-square--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={value ? `${value} cell` : 'empty cell'}
    >
      <span className="ttt-square__symbol">{value === 'O' ? '⭕' : value === 'X' ? '❌' : ''}</span>
    </button>
  )
}

type BoardProps = {
  board: BoardType
  size?: number
  onCellClick: (i: number) => void
  winningLine?: number[] | null
}

export function Board({ board, size = 3, onCellClick, winningLine }: BoardProps) {
  const style: React.CSSProperties = { gridTemplateColumns: `repeat(${size}, 1fr)` }

  return (
    <div className="ttt-board" role="grid" style={style}>
      {board.map((cell, i) => (
        <div key={i} className="ttt-board__cell" role="gridcell">
          <Square
            value={cell}
            onClick={() => onCellClick(i)}
            highlight={!!winningLine?.includes(i)}
            disabled={!!winningLine}
          />
        </div>
      ))}
    </div>
  )
}
