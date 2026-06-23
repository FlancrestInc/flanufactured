export function clampBlankPercent(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

export function optionsForTypeChange(options = {}) {
  const blankPercent = clampBlankPercent(options.blank_percent ?? 0)
  return blankPercent ? { blank_percent: blankPercent } : {}
}
