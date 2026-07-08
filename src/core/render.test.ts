import { describe, expect, it } from 'vitest'
import { renderBlocks } from './render'
import { THEMES } from './themes'

const theme = THEMES[0]
const texts = (md: string) => renderBlocks(md, theme).map(b => b.text)

describe('行內樣式', () => {
  it('粗體', () => {
    expect(texts('**bold**')).toEqual(['𝗯𝗼𝗹𝗱'])
  })

  it('斜體', () => {
    expect(texts('*italic*')).toEqual(['𝘪𝘵𝘢𝘭𝘪𝘤'])
  })

  it('粗斜體', () => {
    expect(texts('***bi***')).toEqual(['𝙗𝙞'])
  })

  it('粗體中巢狀斜體 → 粗斜體', () => {
    expect(texts('**a *b***')).toEqual(['𝗮 𝙗'])
  })

  it('有文字的連結 → 文字 (url)', () => {
    expect(texts('[Postio](https://postio.app)')).toEqual(['Postio (https://postio.app)'])
  })

  it('裸網址保持原樣（GFM autolink）', () => {
    expect(texts('https://postio.app')).toEqual(['https://postio.app'])
  })

  it('inline code 去掉反引號保留文字', () => {
    expect(texts('`npm i` 指令')).toEqual(['npm i 指令'])
  })

  it('圖片輸出 alt 文字', () => {
    expect(texts('看 ![示意圖](x.png)')).toEqual(['看 示意圖'])
  })

  it('中文不受粗體影響、原樣輸出', () => {
    expect(texts('**中文 en**')).toEqual(['中文 𝗲𝗻'])
  })

  it('空輸入回傳空陣列', () => {
    expect(renderBlocks('', theme)).toEqual([])
  })

  it('多段落 → 多個 block', () => {
    expect(texts('第一段\n\n第二段')).toEqual(['第一段', '第二段'])
  })
})
