export const THEME_CHOICES = ['system', 'light', 'dark'] as const
export type ThemeChoice = (typeof THEME_CHOICES)[number]
export const THEME_KEY = 'music-atlas.theme'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function nextTheme(current: ThemeChoice): ThemeChoice {
  return THEME_CHOICES[(THEME_CHOICES.indexOf(current) + 1) % THEME_CHOICES.length]
}

/** An unknown or unreadable stored value falls back to following the system. */
export function loadTheme(storage: StorageLike | null): ThemeChoice {
  try {
    const value = storage?.getItem(THEME_KEY)
    return THEME_CHOICES.find((choice) => choice === value) ?? 'system'
  } catch {
    return 'system'
  }
}

export function saveTheme(storage: StorageLike | null, choice: ThemeChoice): void {
  try {
    storage?.setItem(THEME_KEY, choice)
  } catch {
    // A visual preference must never get in the way of using the app.
  }
}

/** "system" removes the override so that the media query decides. */
export function applyTheme(choice: ThemeChoice, root: { setAttribute(name: string, value: string): void; removeAttribute(name: string): void }): void {
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
}
