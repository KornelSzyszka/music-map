import { useState } from 'react'

interface Props {
  label: string
  value: number
  onCommit: (raw: string) => void
}

/** Shows the applied value; edits stay a draft until Enter or blur, so the field never disagrees with the filter. */
export default function NumberField({ label, value, onCommit }: Props) {
  const [draft, setDraft] = useState<string | null>(null)

  function commit(): void {
    if (draft === null) return
    setDraft(null)
    onCommit(draft)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={draft ?? String(value)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        }
      }}
    />
  )
}
