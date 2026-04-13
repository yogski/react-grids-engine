import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type CellCoord,
  type ClueDirection,
  type CrosswordPuzzle,
  type ParsedCrossword,
  type Slot,
  getNextCell,
  getPrevCell,
  getSlotForCell,
  parseCrossword,
  validateSlot,
} from './logic'
import { TEST_PUZZLE } from './testPuzzle'
import { TEST_PUZZLE_2 } from './testPuzzle2'
import { GENERATED_1 } from './generated1'
import { GENERATED_2 } from './generated2'
import './styles.css'

// ─── GridCell ────────────────────────────────────────────────────────────────

type GridCellProps = {
  row: number
  col: number
  letter: string
  displayNumber: number | null
  isBlack: boolean
  isActive: boolean
  isInClue: boolean
  isSolved: boolean
  onClick: (row: number, col: number) => void
}

function GridCell({
  row,
  col,
  letter,
  displayNumber,
  isBlack,
  isActive,
  isInClue,
  isSolved,
  onClick,
}: GridCellProps) {
  if (isBlack) {
    return <div className="cw-cell cw-cell--black" aria-hidden="true" />
  }

  const classes = [
    'cw-cell',
    'cw-cell--white',
    isActive ? 'cw-cell--active' : '',
    !isActive && isInClue ? 'cw-cell--in-clue' : '',
    isSolved ? 'cw-cell--solved' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      role="gridcell"
      aria-label={`Row ${row + 1} column ${col + 1}${letter ? ` letter ${letter}` : ''}`}
      onClick={() => onClick(row, col)}
    >
      {displayNumber !== null && (
        <span className="cw-cell__num">{displayNumber}</span>
      )}
      {letter && <span className="cw-cell__letter">{letter}</span>}
    </div>
  )
}

// ─── ClueList ────────────────────────────────────────────────────────────────

type ClueListProps = {
  title: string
  slots: Slot[]
  activeSlotId: string | null
  solvedSlots: Set<string>
  onClueClick: (slot: Slot) => void
}

function ClueList({ title, slots, activeSlotId, solvedSlots, onClueClick }: ClueListProps) {
  return (
    <div className="crossword__clue-section">
      <h3>{title}</h3>
      <ul className="crossword__clue-list">
        {slots.map((slot) => {
          const isSolved = solvedSlots.has(slot.id)
          const isActive = slot.id === activeSlotId
          const classes = [
            'crossword__clue-item',
            isActive ? 'crossword__clue-item--active' : '',
            isSolved ? 'crossword__clue-item--solved' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <li
              key={slot.id}
              className={classes}
              onClick={() => onClueClick(slot)}
            >
              <strong>{slot.displayNumber}.</strong> {slot.clueText}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Crossword (selector shell) ─────────────────────────────────────────────

const PUZZLES: Record<string, { label: string; puzzle: CrosswordPuzzle }> = {
  p1: { label: 'Puzzle 1', puzzle: TEST_PUZZLE },
  p2: { label: 'Puzzle 2', puzzle: TEST_PUZZLE_2 },
  g1: { label: 'Generated 1', puzzle: GENERATED_1 },
  g2: { label: 'Generated 2', puzzle: GENERATED_2 },
}

export function Crossword() {
  const [puzzleId, setPuzzleId] = useState('p1')

  return (
    <div className="crossword">
      <div className="crossword__header">
        <h2 className="crossword__title">Crossword</h2>
        <div className="crossword__selector">
          {Object.entries(PUZZLES).map(([id, { label }]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPuzzleId(id)}
              aria-pressed={puzzleId === id}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <CrosswordGame key={puzzleId} puzzle={PUZZLES[puzzleId].puzzle} />
    </div>
  )
}

// ─── CrosswordGame ────────────────────────────────────────────────────────────

function CrosswordGame({ puzzle }: { puzzle: CrosswordPuzzle }) {
  const parsed: ParsedCrossword = useMemo(() => parseCrossword(puzzle), [puzzle])

  const [userGrid, setUserGrid] = useState<string[][]>(() =>
    Array.from({ length: parsed.rows }, () => Array<string>(parsed.cols).fill('')),
  )
  const [activeCoord, setActiveCoord] = useState<CellCoord | null>(null)
  const [direction, setDirection] = useState<ClueDirection>('across')
  const [solvedSlots, setSolvedSlots] = useState<Set<string>>(new Set())

  const gridRef = useRef<HTMLDivElement>(null)

  // ── Derived state ────────────────────────────────────────────────────────

  const activeSlot = useMemo<Slot | null>(() => {
    if (!activeCoord) return null
    const slot =
      getSlotForCell(parsed.slots, activeCoord.row, activeCoord.col, direction) ??
      null
    return slot
  }, [activeCoord, direction, parsed.slots])

  const acrossSlots = useMemo(
    () => parsed.slots.filter((s) => s.direction === 'across'),
    [parsed.slots],
  )
  const downSlots = useMemo(
    () => parsed.slots.filter((s) => s.direction === 'down'),
    [parsed.slots],
  )

  const isGameComplete =
    solvedSlots.size > 0 && solvedSlots.size === parsed.slots.length

  // ── Cell state helpers ───────────────────────────────────────────────────

  const isCellInActiveClue = useCallback(
    (row: number, col: number): boolean =>
      activeSlot?.cells.some((c) => c.row === row && c.col === col) ?? false,
    [activeSlot],
  )

  /** Returns true if every slot containing this cell is solved */
  const isCellSolved = useCallback(
    (row: number, col: number): boolean => {
      const containingSlots = parsed.slots.filter((s) =>
        s.cells.some((c) => c.row === row && c.col === col),
      )
      return containingSlots.some((s) => solvedSlots.has(s.id))
    },
    [parsed.slots, solvedSlots],
  )

  // ── Validation effect ────────────────────────────────────────────────────

  // Keep refs so the effect closure always sees the latest values without
  // including them in the dependency array (which would cause infinite loops)
  const parsedRef = useRef(parsed)
  const solvedSlotsRef = useRef(solvedSlots)
  parsedRef.current = parsed
  solvedSlotsRef.current = solvedSlots

  useEffect(() => {
    const { slots, nonce } = parsedRef.current
    const filledSlots = slots.filter(
      (s) =>
        !solvedSlotsRef.current.has(s.id) &&
        s.cells.every(({ row, col }) => userGrid[row][col] !== ''),
    )
    for (const slot of filledSlots) {
      validateSlot(slot, userGrid, nonce).then((isCorrect) => {
        if (isCorrect) {
          setSolvedSlots((prev) => new Set([...prev, slot.id]))
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userGrid])

  // ── Cell click ───────────────────────────────────────────────────────────

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (parsed.blackCells[row][col]) return

      if (activeCoord?.row === row && activeCoord?.col === col) {
        // Same cell clicked: toggle direction (if the other direction has a slot here)
        const other: ClueDirection = direction === 'across' ? 'down' : 'across'
        const hasOther = !!getSlotForCell(parsed.slots, row, col, other)
        if (hasOther) setDirection(other)
      } else {
        setActiveCoord({ row, col })
        // If current direction has no slot here, switch to the other
        const hasCurrent = !!getSlotForCell(parsed.slots, row, col, direction)
        if (!hasCurrent) {
          const other: ClueDirection = direction === 'across' ? 'down' : 'across'
          if (getSlotForCell(parsed.slots, row, col, other)) {
            setDirection(other)
          }
        }
      }

      gridRef.current?.focus()
    },
    [activeCoord, direction, parsed.blackCells, parsed.slots],
  )

  // ── Clue click ───────────────────────────────────────────────────────────

  const handleClueClick = useCallback((slot: Slot) => {
    setActiveCoord(slot.startCell)
    setDirection(slot.direction)
    gridRef.current?.focus()
  }, [])

  // ── Keyboard handling ────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!activeCoord || !activeSlot) return

      const { key } = e

      if (key === 'Backspace') {
        e.preventDefault()
        const current = userGrid[activeCoord.row][activeCoord.col]
        if (current !== '') {
          setUserGrid((prev) => {
            const next = prev.map((r) => [...r])
            next[activeCoord.row][activeCoord.col] = ''
            return next
          })
        } else {
          const prev = getPrevCell(activeSlot, activeCoord)
          if (prev) {
            setActiveCoord(prev)
            setUserGrid((g) => {
              const next = g.map((r) => [...r])
              next[prev.row][prev.col] = ''
              return next
            })
          }
        }
        return
      }

      // Arrow key navigation
      if (key === 'ArrowRight' || key === 'ArrowLeft') {
        e.preventDefault()
        const acrossSlot = getSlotForCell(
          parsed.slots,
          activeCoord.row,
          activeCoord.col,
          'across',
        )
        if (acrossSlot) {
          setDirection('across')
          const idx = acrossSlot.cells.findIndex(
            (c) => c.row === activeCoord.row && c.col === activeCoord.col,
          )
          const target =
            key === 'ArrowRight'
              ? acrossSlot.cells[idx + 1]
              : acrossSlot.cells[idx - 1]
          if (target) setActiveCoord(target)
        }
        return
      }

      if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault()
        const downSlot = getSlotForCell(
          parsed.slots,
          activeCoord.row,
          activeCoord.col,
          'down',
        )
        if (downSlot) {
          setDirection('down')
          const idx = downSlot.cells.findIndex(
            (c) => c.row === activeCoord.row && c.col === activeCoord.col,
          )
          const target =
            key === 'ArrowDown'
              ? downSlot.cells[idx + 1]
              : downSlot.cells[idx - 1]
          if (target) setActiveCoord(target)
        }
        return
      }

      // Letter input
      if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
        e.preventDefault()

        // Solved cells are read-only
        if (isCellSolved(activeCoord.row, activeCoord.col)) return

        const letter = key.toUpperCase()

        setUserGrid((prev) => {
          const next = prev.map((r) => [...r])
          next[activeCoord.row][activeCoord.col] = letter
          return next
        })

        const nextCell = getNextCell(activeSlot, activeCoord, letter, userGrid)
        if (nextCell) setActiveCoord(nextCell)
      }
    },
    [activeCoord, activeSlot, isCellSolved, parsed.slots, userGrid],
  )

  // ── Render ───────────────────────────────────────────────────────────────

  const cells = useMemo(() => {
    const output: React.ReactNode[] = []
    for (let r = 0; r < parsed.rows; r++) {
      for (let c = 0; c < parsed.cols; c++) {
        output.push(
          <GridCell
            key={`${r}-${c}`}
            row={r}
            col={c}
            letter={userGrid[r][c]}
            displayNumber={parsed.cellNumbers[r][c]}
            isBlack={parsed.blackCells[r][c]}
            isActive={!!(activeCoord?.row === r && activeCoord?.col === c)}
            isInClue={isCellInActiveClue(r, c)}
            isSolved={isCellSolved(r, c)}
            onClick={handleCellClick}
          />,
        )
      }
    }
    return output
  }, [
    parsed,
    userGrid,
    activeCoord,
    isCellInActiveClue,
    isCellSolved,
    handleCellClick,
  ])

  return (
    <>
      <button
        type="button"
        className="crossword__toggle"
        onClick={() => setDirection((d) => (d === 'across' ? 'down' : 'across'))}
        title="Toggle direction"
      >
        {direction === 'across' ? '→ Across' : '↓ Down'}
      </button>

      {isGameComplete && (
        <div className="crossword__congrats" role="status">
          🎉 Congratulations! You solved the crossword!
        </div>
      )}

      <div className="crossword__body">
        <div className="crossword__grid-wrap">
          <div
            ref={gridRef}
            role="grid"
            aria-label="Crossword grid"
            tabIndex={0}
            className="crossword__grid"
            style={{
              gridTemplateColumns: `repeat(${parsed.cols}, var(--cw-cell-size, 44px))`,
              gridTemplateRows: `repeat(${parsed.rows}, var(--cw-cell-size, 44px))`,
            }}
            onKeyDown={handleKeyDown}
          >
            {cells}
          </div>
        </div>

        <div className="crossword__clues">
          <ClueList
            title="Across"
            slots={acrossSlots}
            activeSlotId={activeSlot?.direction === 'across' ? activeSlot.id : null}
            solvedSlots={solvedSlots}
            onClueClick={handleClueClick}
          />
          <ClueList
            title="Down"
            slots={downSlots}
            activeSlotId={activeSlot?.direction === 'down' ? activeSlot.id : null}
            solvedSlots={solvedSlots}
            onClueClick={handleClueClick}
          />
        </div>
      </div>
    </>
  )
}
