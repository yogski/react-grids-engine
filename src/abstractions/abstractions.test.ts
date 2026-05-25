import { describe, expect, it } from 'vitest'
import { AbxAction } from './Action'
import { AbxCell } from './Cell'
import { AbxGame } from './Game'
import { AbxGrid } from './Grid'
import { AbxPlayer } from './Player'
import { AbxSubgrid } from './Subgrid'

describe('abstractions', () => {
  it('tracks grid history and supports undo/redo', () => {
    const grid = new AbxGrid({
      width: 2,
      height: 1,
      cellFactory: (row, col) => {
        return new AbxCell({
          coordinate: { row, col },
          initialState: { value: 0 },
        })
      },
    })

    const changed = grid.setCellState({ row: 0, col: 0 }, { value: 1 })

    expect(changed).toBe(true)
    expect(grid.history).toHaveLength(2)
    expect(grid.getCellState({ row: 0, col: 0 })?.value).toBe(1)

    expect(grid.undo()).toBe(true)
    expect(grid.getCellState({ row: 0, col: 0 })?.value).toBe(0)

    expect(grid.redo()).toBe(true)
    expect(grid.getCellState({ row: 0, col: 0 })?.value).toBe(1)
  })

  it('supports subgrid overlap and connectivity operations', () => {
    const connected = new AbxSubgrid({
      id: 'connected',
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 1 },
      ],
    })

    const disconnected = new AbxSubgrid({
      id: 'disconnected',
      cells: [
        { row: 0, col: 0 },
        { row: 2, col: 2 },
      ],
    })

    const overlap = new AbxSubgrid({
      id: 'overlap',
      cells: [
        { row: 2, col: 2 },
        { row: 0, col: 0 },
      ],
    })

    expect(connected.isConnected()).toBe(true)
    expect(disconnected.isConnected()).toBe(false)
    expect(disconnected.intersects(overlap)).toBe(true)
    expect(connected.intersects(disconnected)).toBe(true)
  })

  it('applies actions through game and updates turn/action counters', () => {
    const player = new AbxPlayer({ id: 'a', name: 'Player A', symbol: 'A' })
    const game = new AbxGame({
      grid: new AbxGrid({
        width: 1,
        height: 1,
        cellFactory: () => {
          return new AbxCell({
            coordinate: { row: 0, col: 0 },
            initialState: { mark: '' },
          })
        },
      }),
      players: [player],
      initialState: 'ongoing',
    })

    const action = new AbxAction<typeof game, { row: number; col: number }, typeof player, boolean>({
      id: 'place-1',
      name: 'place',
      player,
      payload: { row: 0, col: 0 },
      execute: (targetGame, payload, actionPlayer) => {
        return targetGame.grid.setCellState(
          { row: payload.row, col: payload.col },
          { mark: actionPlayer.symbol },
          { trackHistory: false },
        )
      },
    })

    const applied = game.makeAction(action)

    expect(applied).toBe(true)
    expect(game.turnCounter).toBe(1)
    expect(game.actions).toHaveLength(1)
    expect(game.grid.getCellState({ row: 0, col: 0 })?.mark).toBe('A')
  })
})
