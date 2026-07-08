export interface Theme {
  id: string
  name: string
  headingPrefix: [string, string, string] // H1, H2, H3+（H4–H6 視同 H3）
  divider: string
}

export const THEMES: Theme[] = [
  { id: 'line', name: '直線', headingPrefix: ['▍', '▎', '▏'], divider: '───────' },
  { id: 'diamond', name: '菱形', headingPrefix: ['◆', '◇', '▸'], divider: '───────' },
]

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}
