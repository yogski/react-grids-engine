import { useState } from 'react'
import { Chess } from './games/Chess'
import { Crossword } from './games/Crossword'
import { Sudoku } from './games/Sudoku'
import { TicTacToe } from './games/TicTacToe'

type GameId = 'crossword' | 'tictactoe' | 'chess' | 'sudoku'

const GAMES: { id: GameId; label: string }[] = [
  { id: 'crossword', label: 'Crossword' },
  { id: 'tictactoe', label: 'Tic Tac Toe' },
  { id: 'chess', label: 'Chess' },
  { id: 'sudoku', label: 'Sudoku' },
]

function renderGame(id: GameId) {
  switch (id) {
    case 'crossword': return <Crossword />
    case 'tictactoe': return <TicTacToe />
    case 'chess':     return <Chess />
    case 'sudoku':    return <Sudoku />
  }
}

function App() {
  const [activeGame, setActiveGame] = useState<GameId>('crossword')

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">2D Grid Engine</h1>
        <nav className="app-nav" aria-label="Game selection">
          {GAMES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={[
                'app-nav__btn',
                activeGame === id ? 'app-nav__btn--active' : '',
              ].join(' ')}
              onClick={() => setActiveGame(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-content">{renderGame(activeGame)}</main>
    </div>
  )
}

export default App
