import { THEMES } from '../core'

interface ThemePickerProps {
  value: string
  onChange: (id: string) => void
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="theme-picker">
      <span className="theme-label" id="theme-picker-label">
        標題符號
      </span>
      <div className="theme-options" role="radiogroup" aria-labelledby="theme-picker-label">
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
    </div>
  )
}
