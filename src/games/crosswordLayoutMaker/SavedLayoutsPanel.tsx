import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { parseImportedLayouts } from './logic'
import { LayoutPreview } from './LayoutPreview'
import type { SavedLayoutRecord, SymmetryOption } from './types'

const PAGE_SIZE = 10

type Props = {
  savedLayouts: SavedLayoutRecord[]
  onLoad: (layout: SavedLayoutRecord) => void
  onDelete: (id: string) => void
  onCopy: (text: string, message: string) => void
  onExport: () => void
  onImportRecords: (records: SavedLayoutRecord[]) => void
  onNotice: (message: string) => void
}

export function SavedLayoutsPanel({
  savedLayouts,
  onLoad,
  onDelete,
  onCopy,
  onExport,
  onImportRecords,
  onNotice,
}: Props) {
  const [searchText, setSearchText] = useState('')
  const [widthFilter, setWidthFilter] = useState('')
  const [heightFilter, setHeightFilter] = useState('')
  const [timestampFilter, setTimestampFilter] = useState('')
  const [symmetryFilter, setSymmetryFilter] = useState<'all' | SymmetryOption>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this layout? This cannot be undone.')) {
      onDelete(id)
    }
  }

  const filteredLayouts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()
    const normalizedTimestamp = timestampFilter.trim().toLowerCase()
    const widthNumber = widthFilter.trim() ? Number(widthFilter) : null
    const heightNumber = heightFilter.trim() ? Number(heightFilter) : null

    return savedLayouts.filter((layout) => {
      if (symmetryFilter !== 'all' && layout.spec.symmetryOption !== symmetryFilter) {
        return false
      }

      if (widthNumber !== null && Number.isFinite(widthNumber)) {
        if (layout.spec.width !== Math.floor(widthNumber)) {
          return false
        }
      }

      if (heightNumber !== null && Number.isFinite(heightNumber)) {
        if (layout.spec.height !== Math.floor(heightNumber)) {
          return false
        }
      }

      if (normalizedTimestamp && !layout.timestamp.toLowerCase().includes(normalizedTimestamp)) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return (
        layout.id.toLowerCase().includes(normalizedSearch) ||
        layout.encodedGrid.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [savedLayouts, searchText, timestampFilter, widthFilter, heightFilter, symmetryFilter])

  const totalPages = Math.max(1, Math.ceil(filteredLayouts.length / PAGE_SIZE))
  const activePage = Math.min(currentPage, totalPages)

  const visibleLayouts = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE
    return filteredLayouts.slice(start, start + PAGE_SIZE)
  }, [activePage, filteredLayouts])

  const handleImportLayouts = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const text = await file.text()
    const incoming = parseImportedLayouts(text)

    if (incoming.length === 0) {
      onNotice('Imported file has no valid layout records.')
      event.target.value = ''
      return
    }

    onImportRecords(incoming)
    onNotice(`Imported ${incoming.length} layouts (duplicates are ignored).`)
    event.target.value = ''
  }

  return (
    <section className="clm-panel">
      <div className="clm-saved-header">
        <h3>Saved Layouts</h3>
        <div className="clm-saved-actions">
          <button type="button" onClick={onExport}>
            Export JSON
          </button>
          <button type="button" onClick={() => importInputRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportLayouts}
            className="clm-hidden-file"
          />
        </div>
      </div>

      <div className="clm-filter-grid">
        <label>
          Search (ID or encoded)
          <input
            type="text"
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value)
              setCurrentPage(1)
            }}
          />
        </label>

        <label>
          Width
          <input
            type="number"
            min={1}
            value={widthFilter}
            onChange={(event) => {
              setWidthFilter(event.target.value)
              setCurrentPage(1)
            }}
          />
        </label>

        <label>
          Height
          <input
            type="number"
            min={1}
            value={heightFilter}
            onChange={(event) => {
              setHeightFilter(event.target.value)
              setCurrentPage(1)
            }}
          />
        </label>

        <label>
          Symmetry Option
          <select
            value={symmetryFilter}
            onChange={(event) => {
              setSymmetryFilter(event.target.value as 'all' | SymmetryOption)
              setCurrentPage(1)
            }}
          >
            <option value="all">All</option>
            <option value="none">None</option>
            <option value="rotational">Rotational</option>
            <option value="mirror">Mirror</option>
          </select>
        </label>

        <label>
          Timestamp Contains
          <input
            type="text"
            value={timestampFilter}
            onChange={(event) => {
              setTimestampFilter(event.target.value)
              setCurrentPage(1)
            }}
            placeholder="2026-05"
          />
        </label>
      </div>

      <div className="clm-saved-list" role="list">
        {visibleLayouts.length === 0 && (
          <div className="clm-empty">No layouts match this filter.</div>
        )}

        {visibleLayouts.map((layout) => (
          <article key={layout.id} className="clm-layout-card" role="listitem">
            <LayoutPreview grid={layout.rawGrid} className="clm-layout-card__preview" fillHeight />

            <div className="clm-layout-card__meta">
              <div>
                <strong>ID:</strong> {layout.id}
              </div>
              <div>
                <strong>Timestamp:</strong> {layout.timestamp}
              </div>
              <div>
                <strong>Spec:</strong> {layout.spec.width}x{layout.spec.height},{' '}
                {layout.spec.symmetryOption}, {layout.spec.symmetryCount}
              </div>
              <div>
                <strong>Encoded:</strong> {layout.encodedGrid}
              </div>
            </div>

            <div className="clm-layout-card__actions">
              <button type="button" onClick={() => onLoad(layout)}>
                Load
              </button>
              <button
                type="button"
                onClick={() => onCopy(layout.encodedGrid, 'Copied saved encoded layout.')}
              >
                Copy
              </button>
              <button type="button" onClick={() => handleDelete(layout.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="clm-pagination">
        <button
          type="button"
          disabled={activePage <= 1}
          onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
        >
          Previous
        </button>
        <span>
          Page {activePage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={activePage >= totalPages}
          onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
        >
          Next
        </button>
      </div>
    </section>
  )
}
