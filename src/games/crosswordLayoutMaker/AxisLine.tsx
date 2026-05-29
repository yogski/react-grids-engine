export function AxisLine({ orientation }: { orientation: 'horizontal' | 'vertical' }) {
  return <div className={`clm-axis clm-axis--${orientation}`} aria-hidden="true" />
}
