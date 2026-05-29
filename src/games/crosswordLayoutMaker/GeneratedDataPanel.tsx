type Props = {
  rawGridJson: string
  encodedGrid: string
  onCopy: (text: string, message: string) => void
  onSave: () => void
}

export function GeneratedDataPanel({ rawGridJson, encodedGrid, onCopy, onSave }: Props) {
  return (
    <section className="clm-panel">
      <h3>Generated Data</h3>

      <div className="clm-data-grid">
        <div>
          <div className="clm-data-title">Raw 2D JSON</div>
          <textarea value={rawGridJson} readOnly rows={5} />
          <button
            type="button"
            onClick={() => onCopy(rawGridJson, 'Copied raw JSON to clipboard.')}
          >
            Copy Raw JSON
          </button>
        </div>

        <div>
          <div className="clm-data-title">Encoded Bitmask</div>
          <textarea value={encodedGrid} readOnly rows={5} />
          <button
            type="button"
            onClick={() => onCopy(encodedGrid, 'Copied encoded grid to clipboard.')}
          >
            Copy Encoded
          </button>
        </div>
      </div>

      <div className="clm-config-actions">
        <button type="button" onClick={onSave}>
          Add To List
        </button>
      </div>
    </section>
  )
}
