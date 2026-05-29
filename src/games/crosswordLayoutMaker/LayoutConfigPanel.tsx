import type { ChangeEvent } from 'react'
import { parsePositiveInteger } from './utils'
import type { LayoutSpec, SymmetryCount, SymmetryOption } from './types'

type Props = {
  spec: LayoutSpec
  onSpecChange: <K extends keyof LayoutSpec>(key: K, value: LayoutSpec[K]) => void
  onGenerate: () => void
  onSave: () => void
}

export function LayoutConfigPanel({ spec, onSpecChange, onGenerate, onSave }: Props) {
  return (
    <section className="clm-panel">
      <h3>Layout Config</h3>

      <div className="clm-config-grid">
        <label>
          Width
          <input
            type="number"
            min={1}
            value={spec.width}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              onSpecChange('width', parsePositiveInteger(event.target.value, spec.width))
            }}
          />
        </label>

        <label>
          Height
          <input
            type="number"
            min={1}
            value={spec.height}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              onSpecChange('height', parsePositiveInteger(event.target.value, spec.height))
            }}
          />
        </label>

        <label>
          Symmetry Option
          <select
            value={spec.symmetryOption}
            onChange={(event) => {
              onSpecChange('symmetryOption', event.target.value as SymmetryOption)
            }}
          >
            <option value="none">None</option>
            <option value="rotational">Rotational</option>
            <option value="mirror">Mirror</option>
          </select>
        </label>

        <label>
          Symmetry Count
          <select
            value={spec.symmetryCount}
            disabled={spec.symmetryOption === 'none'}
            onChange={(event) => {
              onSpecChange('symmetryCount', event.target.value as SymmetryCount)
            }}
          >
            <option value="horizontal">1-horizontal</option>
            <option value="vertical">1-vertical</option>
            <option value="both">2-horizontal-vertical</option>
          </select>
        </label>
      </div>

      <div className="clm-config-actions">
        <button type="button" onClick={onGenerate}>
          Generate Layout
        </button>
        <button type="button" onClick={onSave}>
          Save Layout
        </button>
      </div>
    </section>
  )
}
