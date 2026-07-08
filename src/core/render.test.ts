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

  it('inline code 轉為等寬字型（中文原樣）', () => {
    expect(texts('`npm i 中` 指令')).toEqual(['𝚗𝚙𝚖 𝚒 中 指令'])
  })

  it('獨立一行 === 是強制分頁標記', () => {
    const kinds = renderBlocks('甲\n\n===\n\n乙', theme).map(b => b.kind)
    expect(kinds).toEqual(['paragraph', 'pageBreak', 'paragraph'])
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

describe('區塊元素', () => {
  it('H1 用主題前綴 + 粗體', () => {
    expect(texts('# Hello 世界')).toEqual(['▍ 𝗛𝗲𝗹𝗹𝗼 世界'])
  })

  it('H2 / H3 前綴', () => {
    expect(texts('## Sub')).toEqual(['▎ 𝗦𝘂𝗯'])
    expect(texts('### Deep')).toEqual(['▏ 𝗗𝗲𝗲𝗽'])
  })

  it('H4–H6 視同 H3', () => {
    expect(texts('##### Tiny')).toEqual(['▏ 𝗧𝗶𝗻𝘆'])
  })

  it('標題內已有粗體 → 維持粗體（巢狀斜體變粗斜體）', () => {
    expect(texts('# A *b*')).toEqual(['▍ 𝗔 𝙗'])
  })

  it('分隔線用主題樣式', () => {
    expect(texts('---')).toEqual(['───────'])
  })

  it('單行引用以 ❝ ❞ 包裹', () => {
    expect(texts('> 一句話')).toEqual(['❝ 一句話 ❞'])
  })

  it('多行引用整段包裹、內部換行保留', () => {
    expect(texts('> 第一行，\n> 第二行。')).toEqual(['❝ 第一行，\n第二行。 ❞'])
  })

  it('多段落引用以換行相接', () => {
    expect(texts('> 甲\n>\n> 乙')).toEqual(['❝ 甲\n乙 ❞'])
  })

  it('fenced code block 降級為原樣文字', () => {
    expect(texts('```\nconst x = 1\n```')).toEqual(['const x = 1'])
  })

  it('block kind 標記正確', () => {
    const kinds = renderBlocks('# t\n\np\n\n---', theme).map(b => b.kind)
    expect(kinds).toEqual(['heading', 'paragraph', 'divider'])
  })

  it('表格降級為逐列文字', () => {
    expect(texts('| A | B |\n| --- | --- |\n| 甲 | 乙 |')).toEqual(['A · B', '甲 · 乙'])
  })
})

describe('清單', () => {
  it('無序清單', () => {
    expect(texts('- a\n- b')).toEqual(['• a', '• b'])
  })

  it('巢狀無序清單縮排與符號分層', () => {
    expect(texts('- a\n  - b\n    - c\n      - d')).toEqual([
      '• a',
      '   ◦ b',
      '      ▪ c',
      '         ▪ d',
    ])
  })

  it('有序清單保留數字、支援起始值', () => {
    expect(texts('3. c\n4. d')).toEqual(['3. c', '4. d'])
  })

  it('巢狀有序清單', () => {
    expect(texts('1. a\n   1. b')).toEqual(['1. a', '   1. b'])
  })

  it('checkbox', () => {
    expect(texts('- [ ] todo\n- [x] done')).toEqual(['⬜ todo', '✅ done'])
  })

  it('巢狀 checkbox', () => {
    expect(texts('- a\n  - [x] done')).toEqual(['• a', '   ✅ done'])
  })

  it('清單項內的行內樣式', () => {
    expect(texts('- **b**')).toEqual(['• 𝗯'])
  })

  it('清單項 kind 為 listItem', () => {
    expect(renderBlocks('- a', theme).map(b => b.kind)).toEqual(['listItem'])
  })
})
