import { useId, useMemo, useState } from 'react'
import type { Option } from '../derive/options'

interface Props {
  label: string
  options: readonly Option[]
  selected: readonly string[]
  onChange: (selected: string[]) => void
}

/** Pick entries from a long list by typing; the chosen ones appear as removable chips. */
export default function ChipInput({ label, options, selected, onChange }: Props) {
  const listId = useId()
  const [draft, setDraft] = useState('')
  const byLabel = useMemo(() => new Map(options.map((option) => [option.label.toLowerCase(), option.value])), [options])
  const byValue = useMemo(() => new Map(options.map((option) => [option.value, option.label])), [options])

  function commit(text: string): void {
    const value = byLabel.get(text.trim().toLowerCase())
    if (value === undefined || selected.includes(value)) return
    onChange([...selected, value])
    setDraft('')
  }

  return (
    <div className="chip-input">
      <input
        list={listId}
        aria-label={label}
        placeholder={label}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          // Picking from the list is not typing: commit it right away.
          const type = (event.nativeEvent as InputEvent).inputType
          if (type === undefined || type === 'insertReplacementText') commit(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(draft)
          }
        }}
        onBlur={() => commit(draft)}
      />
      <datalist id={listId}>
        {options.map((option) => <option key={option.value} value={option.label} />)}
      </datalist>
      {selected.length > 0 ? (
        <ul className="chip-list">
          {selected.map((value) => (
            <li key={value}>
              <button type="button" className="chip" aria-label={`Remove ${byValue.get(value) ?? value}`}
                onClick={() => onChange(selected.filter((item) => item !== value))}>
                {byValue.get(value) ?? value} ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
