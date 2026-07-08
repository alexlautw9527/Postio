import { THEMES } from '../core'

interface ThemePickerProps {
  value: string
  onChange: (id: string) => void
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="theme-picker" role="radiogroup" aria-label="標題符號主題">
      {THEMES.map(theme => (
        <button
          key={theme.id}
          role="radio"
          aria-checked={theme.id === value}
          className={theme.id === value ? 'theme active' : 'theme'}
          onClick={() => onChange(theme.id)}
        >
          {theme.headingPrefix[0]} {theme.name}
        </button>
      ))}
    </div>
  )
}
