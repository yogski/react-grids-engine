import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import {
  createInitialLayout,
  createSavedLayoutRecord,
  encodeLayout,
  loadLayoutRecords,
  mergeLayoutRecords,
  paintCellWithSymmetry,
  saveLayoutRecords,
} from './logic'
import type { CellBinary, LayoutGrid, LayoutSpec, SavedLayoutRecord } from './types'
import { coordKey, copyToClipboard } from './utils'
import { GeneratedDataPanel } from './GeneratedDataPanel'
import { InteractiveGridPanel } from './InteractiveGridPanel'
import { LayoutConfigPanel } from './LayoutConfigPanel'
import { SavedLayoutsPanel } from './SavedLayoutsPanel'
import './styles.css'

const DEFAULT_SPEC: LayoutSpec = {
  width: 11,
  height: 11,
  symmetryOption: 'none',
  symmetryCount: 'horizontal',
}

export function CrosswordLayoutMaker() {
  const [spec, setSpec] = useState<LayoutSpec>(DEFAULT_SPEC)
  const [grid, setGrid] = useState<LayoutGrid>(() => createInitialLayout(DEFAULT_SPEC))
  const [savedLayouts, setSavedLayouts] = useState<SavedLayoutRecord[]>(() =>
    loadLayoutRecords(),
  )
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPainting, setIsPainting] = useState(false)
  const visitedDuringDragRef = useRef<Set<string>>(new Set())
  const paintValueRef = useRef<CellBinary>(1)

  const encodedGrid = useMemo(() => encodeLayout(grid), [grid])
  const rawGridJson = useMemo(() => JSON.stringify(grid), [grid])

  useEffect(() => {
    saveLayoutRecords(savedLayouts)
  }, [savedLayouts])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(''), 4000)
  }

  useEffect(() => {
    const onMouseUp = () => {
      visitedDuringDragRef.current.clear()
      setIsPainting(false)
    }

    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const updateSpecValue = <K extends keyof LayoutSpec>(key: K, value: LayoutSpec[K]) => {
    setSpec((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  const handleCellMouseDown = (row: number, col: number, event: ReactMouseEvent) => {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    setIsPainting(true)
    visitedDuringDragRef.current = new Set([coordKey(row, col)])

    // Derive the toggle from the latest grid snapshot so quick repeated clicks
    // cannot compute against stale values.
    setGrid((previous) => {
      const current = previous[row]?.[col] ?? 1
      const nextValue: CellBinary = current === 1 ? 0 : 1
      paintValueRef.current = nextValue
      return paintCellWithSymmetry(previous, { row, col }, spec, nextValue)
    })
  }

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isPainting) {
      return
    }

    const key = coordKey(row, col)
    if (visitedDuringDragRef.current.has(key)) {
      return
    }

    visitedDuringDragRef.current.add(key)
    setGrid((previous) =>
      paintCellWithSymmetry(previous, { row, col }, spec, paintValueRef.current),
    )
  }

  const handleGenerateLayout = () => {
    setGrid(createInitialLayout(spec))
  }

  const handleSaveCurrentLayout = () => {
    const record = createSavedLayoutRecord(spec, grid)
    setSavedLayouts((previous) => mergeLayoutRecords(previous, [record]))
    showToast(`Your ${spec.width}×${spec.height} layout has been saved as ${record.id}`)
  }

  const handleDeleteLayout = (id: string) => {
    setSavedLayouts((previous) => previous.filter((layout) => layout.id !== id))
  }

  const handleLoadLayout = (layout: SavedLayoutRecord) => {
    setSpec(layout.spec)
    setGrid(layout.rawGrid.map((row) => [...row]))
    setIsPainting(false)
    visitedDuringDragRef.current.clear()
    showToast(`Loaded layout ${layout.id}.`)
  }

  const handleCopy = async (text: string, successMessage: string) => {
    const copied = await copyToClipboard(text)
    showToast(copied ? successMessage : 'Clipboard copy failed in this browser context.')
  }

  const handleExportLayouts = () => {
    if (savedLayouts.length === 0) {
      showToast('No saved layouts to export.')
      return
    }

    const blob = new Blob([JSON.stringify(savedLayouts, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')

    anchor.href = url
    anchor.download = `crossword-layouts-${stamp}.json`
    anchor.click()

    URL.revokeObjectURL(url)
    showToast(`Exported ${savedLayouts.length} layouts.`)
  }

  const handleImportRecords = (incoming: SavedLayoutRecord[]) => {
    setSavedLayouts((previous) => mergeLayoutRecords(previous, incoming))
  }

  return (
    <div className="clm">
      <header className="clm-header">
        <h2>Crossword Layout Maker</h2>
        <p>
          Build black-cell patterns manually, apply symmetry rules while editing, and export
          reusable layouts.
        </p>
      </header>

      {toast && (
        <div className="clm-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <LayoutConfigPanel
        spec={spec}
        onSpecChange={updateSpecValue}
        onGenerate={handleGenerateLayout}
        onSave={handleSaveCurrentLayout}
      />

      <InteractiveGridPanel
        spec={spec}
        grid={grid}
        onCellMouseDown={handleCellMouseDown}
        onCellMouseEnter={handleCellMouseEnter}
      />

      <GeneratedDataPanel
        rawGridJson={rawGridJson}
        encodedGrid={encodedGrid}
        onCopy={handleCopy}
        onSave={handleSaveCurrentLayout}
      />

      <SavedLayoutsPanel
        savedLayouts={savedLayouts}
        onLoad={handleLoadLayout}
        onDelete={handleDeleteLayout}
        onCopy={handleCopy}
        onExport={handleExportLayouts}
        onImportRecords={handleImportRecords}
        onNotice={showToast}
      />
    </div>
  )
}


