import { describe, expect, it } from 'vitest'
import { THEMES, getTheme } from './themes'

describe('themes', () => {
  it('內建直線與菱形兩種主題', () => {
    expect(THEMES.map(t => t.id)).toEqual(['line', 'diamond'])
    expect(getTheme('diamond').headingPrefix).toEqual(['◆', '◇', '▸'])
  })

  it('未知 id fallback 到第一個主題', () => {
    expect(getTheme('nope')).toBe(THEMES[0])
  })
})
