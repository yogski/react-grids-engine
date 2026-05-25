import type { AbxTttSymbol } from './logic'

type AbxCellComponentProps = {
  symbol: AbxTttSymbol | null
  highlighted?: boolean
  disabled?: boolean
  onClick: () => void
}

export function AbxCellComponent({
  symbol,
  highlighted,
  disabled,
  onClick,
}: AbxCellComponentProps) {
  return (
    <button
      type="button"
      className="abx-ttt-cell"
      data-highlighted={highlighted || undefined}
      onClick={onClick}
      disabled={disabled}
      aria-label={symbol ? `${symbol} cell` : 'empty cell'}
    >
      <span className="abx-ttt-cell__symbol">{symbol ?? ''}</span>
    </button>
  )
}
