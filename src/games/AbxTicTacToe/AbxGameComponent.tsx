import { useMemo, useState } from 'react'
import type { GridCoord } from '../../components'
import { AbxGridComponent } from './AbxGridComponent'
import { AbxTicTacToeGame } from './logic'
import './styles.css'

function toCoordKey(coord: GridCoord): string {
  return `${coord.row}:${coord.col}`
}

function statusText(game: AbxTicTacToeGame): string {
  if (game.state === 'won' && game.winner) {
    return `${game.winner.name} wins`
  }

  if (game.state === 'draw') {
    return 'Draw'
  }

  return `Turn ${game.turnCounter + 1}: ${game.currentPlayer.name}`
}

export function AbxGameComponent() {
  const [game] = useState(() => new AbxTicTacToeGame(3))
  const [revision, setRevision] = useState(0)

  const board = useMemo(() => game.getSymbolGrid(), [game, revision])

  const highlightedCoords = useMemo(() => {
    return new Set(game.getWinningCoordinates().map((coord) => toCoordKey(coord)))
  }, [game, revision])

  const onCellClick = (coord: GridCoord) => {
    const moved = game.makeMove(coord)
    if (moved) {
      setRevision((value) => value + 1)
    }
  }

  const onReset = () => {
    game.resetGame()
    setRevision((value) => value + 1)
  }

  const onUndo = () => {
    const undone = game.undoMove()
    if (undone) {
      setRevision((value) => value + 1)
    }
  }

  const onRedo = () => {
    const redone = game.redoMove()
    if (redone) {
      setRevision((value) => value + 1)
    }
  }

  return (
    <section className="abx-ttt" aria-label="Abstraction tic-tac-toe demo">
      <h2 className="abx-ttt__title">Abx Tic-Tac-Toe</h2>

      <p className="abx-ttt__status" aria-live="polite">
        {statusText(game)}
      </p>

      <AbxGridComponent
        size={game.size}
        board={board}
        highlightedCoords={highlightedCoords}
        disabled={game.state !== 'ongoing'}
        onCellClick={onCellClick}
      />

      <div className="abx-ttt__controls">
        <button
          type="button"
          className="abx-ttt__btn"
          onClick={onUndo}
          disabled={!game.canUndo()}
        >
          Undo
        </button>

        <button
          type="button"
          className="abx-ttt__btn"
          onClick={onRedo}
          disabled={!game.canRedo()}
        >
          Redo
        </button>

        <button type="button" className="abx-ttt__btn" onClick={onReset}>
          Reset Game
        </button>
      </div>
    </section>
  )
}
