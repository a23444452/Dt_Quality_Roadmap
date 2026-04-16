interface StatusBadgeProps {
  code: string
  color: string
  className?: string
}

export function StatusBadge({ code, color, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold text-white ${className}`}
      style={{ backgroundColor: color }}
      title={code}
    >
      {code}
    </span>
  )
}
