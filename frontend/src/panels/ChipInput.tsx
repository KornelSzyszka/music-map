import { useId, useMemo, useRef, useState } from 'react'
import type { Option } from '../derive/options'
import { filterOptions, stepIndex } from '../derive/pickers'

interface Props {
  label: string
  options: readonly Option[]
  selected: readonly string[]
  onChange: (selected: string[]) => void
}

/** Type to find an entry in a long list, pick it from a glass list; chosen entries are removable chips. */
export default function ChipInput({ label, options, selected, onChange }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const byValue = useMemo(() => new Map(options.map((option) => [option.value, option.label])), [options])
  const suggestions = useMemo(
    () => filterOptions(options.filter((option) => !selected.includes(option.value)), draft),
    [options, selected, draft],
  )

  function choose(index: number): void {
    const option = suggestions[index]
    if (!option) return
    onChange([...selected, option.value])
    setDraft('')
    setActive(0)
    input.current?.focus()
  }

  return (
    <div className="chip-input">
      <div className="combo">
        <input
          ref={input}
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && suggestions.length > 0 ? `${id}-${active}` : undefined}
          placeholder={label}
          value={draft}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setDraft(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setOpen(true)
              setActive((current) => Math.max(0, stepIndex(current, event.key === 'ArrowDown' ? 1 : -1, suggestions)))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              if (open) choose(active)
            } else if (event.key === 'Escape' && open) {
              event.preventDefault()
              setOpen(false)
            } else if (event.key === 'Backspace' && draft === '' && selected.length > 0) {
              onChange(selected.slice(0, -1))
            }
          }}
        />
        {open && suggestions.length > 0 ? (
          <ul id={`${id}-list`} role="listbox" aria-label={label} className="popover popover-down">
            {suggestions.map((option, index) => (
              <li
                key={option.value}
                id={`${id}-${index}`}
                role="option"
                className="option"
                aria-selected={false}
                data-active={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {selected.map((value) => (
        <button key={value} type="button" className="chip" aria-label={`Remove ${byValue.get(value) ?? value}`}
          onClick={() => onChange(selected.filter((item) => item !== value))}>
          {byValue.get(value) ?? value} ×
        </button>
      ))}
    </div>
  )
}
