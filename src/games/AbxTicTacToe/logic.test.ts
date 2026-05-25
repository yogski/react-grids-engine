import { describe, expect, it } from 'vitest'
import { AbxTicTacToeGame } from './logic'

describe('AbxTicTacToeGame', () => {
  it('starts in ongoing state with player X turn', () => {
    const game = new AbxTicTacToeGame(3)

    expect(game.state).toBe('ongoing')
    expect(game.currentPlayer.symbol).toBe('X')
    expect(game.turnCounter).toBe(0)
  })

  it('detects a row win and stores winning subgrid', () => {
    const game = new AbxTicTacToeGame(3)

    game.makeMove({ row: 0, col: 0 }) // X
    game.makeMove({ row: 1, col: 0 }) // O
    game.makeMove({ row: 0, col: 1 }) // X
    game.makeMove({ row: 1, col: 1 }) // O
    game.makeMove({ row: 0, col: 2 }) // X

    expect(game.state).toBe('won')
    expect(game.winner?.symbol).toBe('X')
    expect(game.winningSubgridId).toBe('row-0')
    expect(game.getWinningCoordinates()).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ])
  })

  it('rejects moves into occupied cells', () => {
    const game = new AbxTicTacToeGame(3)

    expect(game.makeMove({ row: 0, col: 0 })).toBe(true)
    expect(game.makeMove({ row: 0, col: 0 })).toBe(false)
    expect(game.turnCounter).toBe(1)
  })

  it('detects draw when board is full without winner', () => {
    const game = new AbxTicTacToeGame(3)

    game.makeMove({ row: 0, col: 0 }) // X
    game.makeMove({ row: 0, col: 1 }) // O
    game.makeMove({ row: 0, col: 2 }) // X
    game.makeMove({ row: 1, col: 1 }) // O
    game.makeMove({ row: 1, col: 0 }) // X
    game.makeMove({ row: 1, col: 2 }) // O
    game.makeMove({ row: 2, col: 1 }) // X
    game.makeMove({ row: 2, col: 0 }) // O
    game.makeMove({ row: 2, col: 2 }) // X

    expect(game.state).toBe('draw')
    expect(game.winner).toBeNull()
  })

  it('resets game state and board', () => {
    const game = new AbxTicTacToeGame(3)

    game.makeMove({ row: 0, col: 0 })
    game.makeMove({ row: 1, col: 0 })
    game.resetGame()

    expect(game.state).toBe('ongoing')
    expect(game.turnCounter).toBe(0)
    expect(game.currentPlayer.symbol).toBe('X')
    expect(game.getSymbolGrid().flat().every((cell) => cell === null)).toBe(true)
  })

  it('undoes and redoes moves with correct turn tracking', () => {
    const game = new AbxTicTacToeGame(3)

    game.makeMove({ row: 0, col: 0 }) // X
    game.makeMove({ row: 0, col: 1 }) // O

    expect(game.turnCounter).toBe(2)
    expect(game.currentPlayer.symbol).toBe('X')
    expect(game.canUndo()).toBe(true)
    expect(game.canRedo()).toBe(false)

    expect(game.undoMove()).toBe(true)
    expect(game.turnCounter).toBe(1)
    expect(game.currentPlayer.symbol).toBe('O')
    expect(game.getSymbolGrid()[0][1]).toBeNull()
    expect(game.canRedo()).toBe(true)

    expect(game.redoMove()).toBe(true)
    expect(game.turnCounter).toBe(2)
    expect(game.currentPlayer.symbol).toBe('X')
    expect(game.getSymbolGrid()[0][1]).toBe('O')
  })

  it('undoes winning move and returns to ongoing game', () => {
    const game = new AbxTicTacToeGame(3)

    game.makeMove({ row: 0, col: 0 }) // X
    game.makeMove({ row: 1, col: 0 }) // O
    game.makeMove({ row: 0, col: 1 }) // X
    game.makeMove({ row: 1, col: 1 }) // O
    game.makeMove({ row: 0, col: 2 }) // X wins

    expect(game.state).toBe('won')
    expect(game.winner?.symbol).toBe('X')

    expect(game.undoMove()).toBe(true)
    expect(game.state).toBe('ongoing')
    expect(game.winner).toBeNull()
    expect(game.winningSubgridId).toBeNull()
    expect(game.currentPlayer.symbol).toBe('X')
  })

  it('clears undo and redo history after reset', () => {
    const game = new AbxTicTacToeGame(3)

    game.makeMove({ row: 0, col: 0 })
    expect(game.canUndo()).toBe(true)

    game.resetGame()
    expect(game.canUndo()).toBe(false)
    expect(game.canRedo()).toBe(false)
    expect(game.undoMove()).toBe(false)
    expect(game.redoMove()).toBe(false)
  })
})
