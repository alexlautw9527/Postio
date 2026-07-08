import { renderBlocks } from './render'
import { getTheme } from './themes'
import { splitBlocks } from './split'
import type { Post } from './split'

export type { Post } from './split'
export type { Theme } from './themes'
export { THEMES } from './themes'

export function convert(markdown: string, themeId: string): Post[] {
  const theme = getTheme(themeId)
  const blocks = renderBlocks(markdown, theme)
  return splitBlocks(blocks)
}
