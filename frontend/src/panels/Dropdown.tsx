import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { edgeIndex, stepIndex, type PickerOption } from '../derive/pickers'

const LIST_HEIGHT = 280

interface Props {
  /** Accessible name; the visible text is the chosen option. */
  label: string
  value: string
  options: readonly PickerOption[]
  onChange: (value: string) => void
}

/** A select in our own style: a glass popover list, keyboard and screen reader friendly. */
export default function Dropdown({ label, value, options, onChange }: Props) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState<'down' | 'up'>('down')
  const selected = options.find((option) => option.value === value)

  function openList(): void {
    const rect = trigger.current?.getBoundingClientRect()
    if (rect) {
      const below = window.innerHeight - rect.bottom
      setPlacement(below < LIST_HEIGHT && rect.top > below ? 'up' : 'down')
    }
    setActive(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  function choose(index: number): void {
    const option = options[index]
    if (!option || option.disabled) return
    onChange(option.value)
    setOpen(false)
    trigger.current?.focus()
  }

  useEffect(() => {
    if (!open) return undefined
    const onDown = (event: MouseEvent): void => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, id])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const { key } = event
    if (key === 'Tab') {
      setOpen(false)
      return
    }
    if (key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
      }
      return
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openList()
      else setActive((current) => stepIndex(current, key === 'ArrowDown' ? 1 : -1, options))
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault()
      if (open) setActive(edgeIndex(key === 'Home' ? 'first' : 'last', options))
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      if (open) choose(active)
      else openList()
    }
  }

  return (
    <div className="dropdown" ref={root}>
      <div
        ref={trigger}
        className="select-button"
        role="combobox"
        tabIndex={0}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span>{selected?.label ?? ''}</span>
      </div>
      {open ? (
        <ul id={`${id}-list`} role="listbox" aria-label={label} className={`popover popover-${placement}`}>
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              className="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
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
  )
}
