import { describe, expect, test } from 'vitest'
import { applyTheme, loadTheme, nextTheme, saveTheme, THEME_KEY } from './theme'

describe('theme preference', () => {
  test('cycles system, light, dark and back', () => {
    expect(nextTheme('system')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('system')
  })

  test('loads a stored choice and falls back to the system for anything else', () => {
    const store = (value: string | null) => ({ getItem: () => value, setItem: () => undefined })
    expect(loadTheme(store('dark'))).toBe('dark')
    expect(loadTheme(store('purple'))).toBe('system')
    expect(loadTheme(store(null))).toBe('system')
    expect(loadTheme(null)).toBe('system')
  })

  test('survives a storage that throws', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadTheme(broken)).toBe('system')
    expect(() => saveTheme(broken, 'dark')).not.toThrow()
  })

  test('saves the choice under its key', () => {
    const saved: Record<string, string> = {}
    saveTheme({ getItem: () => null, setItem: (key, value) => { saved[key] = value } }, 'light')
    expect(saved[THEME_KEY]).toBe('light')
  })

  test('applies a choice to the root element and removes the override for the system', () => {
    const attributes = new Map<string, string>()
    const root = { setAttribute: (name: string, value: string) => attributes.set(name, value), removeAttribute: (name: string) => attributes.delete(name) }
    applyTheme('dark', root)
    expect(attributes.get('data-theme')).toBe('dark')
    applyTheme('system', root)
    expect(attributes.has('data-theme')).toBe(false)
  })
})
