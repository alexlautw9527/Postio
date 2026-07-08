# Postio MVP 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Postio——把 Markdown 轉成 Threads 可貼上的 Unicode 純文字的靜態單頁網站，超過 500 字自動分段成 thread。

**Architecture:** 轉換核心（`src/core/`）為零 React 依賴的純 TypeScript：`remark-parse` + `remark-gfm` 解析出 mdast AST，`render.ts` 轉成帶樣式的純文字區塊序列，`split.ts` 以貪婪裝箱分段成 `Post[]`。UI 層只是 textarea → `convert()` → 卡片列表的單向資料流。

**Tech Stack:** Vite、React 18+、TypeScript、unified/remark-parse/remark-gfm、Vitest。

**規格文件：** `docs/superpowers/specs/2026-07-08-postio-mvp-design.md`（本計畫的唯一需求來源，衝突時以規格為準）

## Global Constraints

- 純靜態網站：無後端、無帳號、除頁面本身外零網路請求
- `src/core/` 禁止 import 任何 React 或 DOM API（`Intl.Segmenter` 可用，Node 與瀏覽器皆原生支援）
- 介面文案一律繁體中文；程式碼識別字與 commit 訊息用英文
- **commit 訊息禁止加入任何 AI 署名（不加 `Co-Authored-By: Claude` 等 trailer）**
- 字數一律以 grapheme 計（`Intl.Segmenter`，granularity `'grapheme'`）
- Threads 單篇上限 500 字；多篇時每篇上限 = 500 − 10（編號保留）
- 測試指令：`npm test`（= `vitest run`）；所有 core 任務走 TDD：先寫測試、看它失敗、再實作

---

### Task 1: 專案腳手架

**Files:**
- Create: Vite react-ts 模板（`package.json`、`vite.config.ts`、`tsconfig*.json`、`index.html`、`src/main.tsx`、`src/App.tsx` 等）

**Interfaces:**
- Produces: 可執行的 `npm run dev`、`npm test`、`npm run build`；已安裝 `unified`、`remark-parse`、`remark-gfm`、`vitest`、`@types/mdast`

- [ ] **Step 1: 用暫存目錄產生 Vite 模板（目前目錄非空，不能直接 scaffold）**

```bash
cd /Users/alex/Desktop/SIDE_PROJECT/Postio
npm create vite@latest postio-tmp -- --template react-ts
cp -R postio-tmp/. .
rm -rf postio-tmp
npm install
```

- [ ] **Step 2: 安裝依賴**

```bash
npm install unified remark-parse remark-gfm
npm install -D vitest @types/mdast
```

- [ ] **Step 3: 設定 Vitest——把 `vite.config.ts` 整檔改為**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: 在 `package.json` 的 `scripts` 加入**

```json
"test": "vitest run"
```

- [ ] **Step 5: 清除模板痕跡**

1. 刪除 `src/assets/react.svg`、`public/vite.svg`、`src/App.css` 與 `src/index.css` 的內容清空（保留空檔）
2. `src/App.tsx` 整檔改為：

```tsx
export default function App() {
  return <h1>Postio</h1>
}
```

3. `src/main.tsx` 若有 import 已刪除的資源，移除該行
4. `index.html` 的 `<title>` 改為 `Postio — Markdown 轉 Threads 純文字`，移除 vite.svg 的 `<link rel="icon">`

- [ ] **Step 6: 驗證**

```bash
npm run build
```
Expected: build 成功（`dist/` 產出）。

```bash
npm test
```
Expected: `No test files found`（exit code 可能非 0，屬正常，尚無測試）。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS with Vitest and remark deps"
```

---

### Task 2: `core/unicode.ts` 字元映射

**Files:**
- Create: `src/core/unicode.ts`
- Test: `src/core/unicode.test.ts`

**Interfaces:**
- Produces: `applyStyle(text: string, style: 'bold' | 'italic' | 'boldItalic'): string`、`type StyleKind = 'bold' | 'italic' | 'boldItalic'`

- [ ] **Step 1: 寫失敗測試 `src/core/unicode.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { applyStyle } from './unicode'

describe('applyStyle', () => {
  it('bold 轉換大小寫字母', () => {
    expect(applyStyle('Ab', 'bold')).toBe('𝗔𝗯')
  })

  it('bold 轉換數字', () => {
    expect(applyStyle('42', 'bold')).toBe('𝟰𝟮')
  })

  it('italic 轉換字母、數字保持原樣（無 sans-serif italic 數字碼位）', () => {
    expect(applyStyle('a1', 'italic')).toBe('𝘢1')
  })

  it('boldItalic 轉換字母，數字用 bold 數字', () => {
    expect(applyStyle('Ab1', 'boldItalic')).toBe('𝘼𝙗𝟭')
  })

  it('非拉丁字元原樣穿透', () => {
    expect(applyStyle('中文A！', 'bold')).toBe('中文𝗔！')
  })

  it('空字串回傳空字串', () => {
    expect(applyStyle('', 'bold')).toBe('')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/core/unicode.test.ts`
Expected: FAIL（`Cannot find module './unicode'`）

- [ ] **Step 3: 實作 `src/core/unicode.ts`**

```ts
export type StyleKind = 'bold' | 'italic' | 'boldItalic'

// Mathematical Sans-Serif 系列起始碼位
const OFFSETS: Record<StyleKind, { upper: number; lower: number; digit?: number }> = {
  bold: { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  italic: { upper: 0x1d608, lower: 0x1d622 }, // 無 italic 數字碼位
  boldItalic: { upper: 0x1d63c, lower: 0x1d656, digit: 0x1d7ec },
}

export function applyStyle(text: string, style: StyleKind): string {
  const { upper, lower, digit } = OFFSETS[style]
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code >= 0x41 && code <= 0x5a) {
      out += String.fromCodePoint(upper + code - 0x41)
    } else if (code >= 0x61 && code <= 0x7a) {
      out += String.fromCodePoint(lower + code - 0x61)
    } else if (digit !== undefined && code >= 0x30 && code <= 0x39) {
      out += String.fromCodePoint(digit + code - 0x30)
    } else {
      out += ch
    }
  }
  return out
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/core/unicode.test.ts`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add src/core/unicode.ts src/core/unicode.test.ts
git commit -m "feat: unicode style mapping for bold/italic/boldItalic"
```

---

### Task 3: `core/themes.ts` 主題定義

**Files:**
- Create: `src/core/themes.ts`
- Test: `src/core/themes.test.ts`

**Interfaces:**
- Produces:

```ts
interface Theme {
  id: string
  name: string
  headingPrefix: [string, string, string] // H1, H2, H3+（H4–H6 視同 H3）
  divider: string
}
const THEMES: Theme[]           // [0] 直線, [1] 菱形
function getTheme(id: string): Theme  // 找不到時回傳 THEMES[0]
```

- [ ] **Step 1: 寫失敗測試 `src/core/themes.test.ts`**

```ts
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
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/core/themes.test.ts`
Expected: FAIL（`Cannot find module './themes'`）

- [ ] **Step 3: 實作 `src/core/themes.ts`**

```ts
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
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/core/themes.test.ts`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add src/core/themes.ts src/core/themes.test.ts
git commit -m "feat: theme definitions (line, diamond)"
```

---

### Task 4: `core/render.ts` — 行內樣式

**Files:**
- Create: `src/core/render.ts`
- Test: `src/core/render.test.ts`

**Interfaces:**
- Consumes: `applyStyle`（Task 2）、`Theme` / `THEMES`（Task 3）
- Produces:

```ts
type BlockKind = 'heading' | 'paragraph' | 'listItem' | 'divider' | 'blockquote'
interface Block {
  kind: BlockKind
  text: string
  overflow?: boolean // Task 7 的句子硬切會用到
}
function renderBlocks(markdown: string, theme: Theme): Block[]
```

本任務只實作段落與行內樣式；標題／清單等區塊在 Task 5、6 於同一檔案擴充。

- [ ] **Step 1: 寫失敗測試 `src/core/render.test.ts`**

```ts
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
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/core/render.test.ts`
Expected: FAIL（`Cannot find module './render'`）

- [ ] **Step 3: 實作 `src/core/render.ts`**

```ts
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import type { PhrasingContent, Root, RootContent } from 'mdast'
import { applyStyle } from './unicode'
import type { Theme } from './themes'

export type BlockKind = 'heading' | 'paragraph' | 'listItem' | 'divider' | 'blockquote'

export interface Block {
  kind: BlockKind
  text: string
  overflow?: boolean
}

const processor = unified().use(remarkParse).use(remarkGfm)

export function renderBlocks(markdown: string, theme: Theme): Block[] {
  const tree = processor.parse(markdown) as Root
  const blocks: Block[] = []
  walk(tree.children, theme, blocks)
  return blocks
}

function walk(nodes: RootContent[], theme: Theme, blocks: Block[]): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'paragraph': {
        const text = renderInline(node.children, false, false)
        if (text.trim() !== '') blocks.push({ kind: 'paragraph', text })
        break
      }
      default:
        break // 其他區塊型別於 Task 5、6 加入
    }
  }
}

function renderInline(nodes: PhrasingContent[], bold: boolean, italic: boolean): string {
  let out = ''
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += styleText(node.value, bold, italic)
        break
      case 'strong':
        out += renderInline(node.children, true, italic)
        break
      case 'emphasis':
        out += renderInline(node.children, bold, true)
        break
      case 'inlineCode':
        out += styleText(node.value, bold, italic)
        break
      case 'link': {
        const label = renderInline(node.children, bold, italic)
        out += label === node.url ? node.url : `${label} (${node.url})`
        break
      }
      case 'image':
        out += node.alt ?? ''
        break
      case 'break':
        out += '\n'
        break
      default:
        if ('children' in node) {
          out += renderInline(node.children as PhrasingContent[], bold, italic)
        } else if ('value' in node) {
          out += node.value
        }
    }
  }
  return out
}

function styleText(text: string, bold: boolean, italic: boolean): string {
  if (bold && italic) return applyStyle(text, 'boldItalic')
  if (bold) return applyStyle(text, 'bold')
  if (italic) return applyStyle(text, 'italic')
  return text
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/core/render.test.ts`
Expected: 11 passed

- [ ] **Step 5: Commit**

```bash
git add src/core/render.ts src/core/render.test.ts
git commit -m "feat: markdown inline styles to unicode text"
```

---

### Task 5: `core/render.ts` — 標題、分隔線、引用、程式碼區塊降級

**Files:**
- Modify: `src/core/render.ts`（擴充 `walk` 的 switch）
- Test: `src/core/render.test.ts`（追加）

**Interfaces:**
- Consumes: Task 4 的 `walk` / `renderInline` 結構
- Produces: `renderBlocks` 支援 heading／thematicBreak／blockquote／code

- [ ] **Step 1: 在 `src/core/render.test.ts` 追加失敗測試**

```ts
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
})
```

- [ ] **Step 2: 執行測試確認新測試失敗**

Run: `npx vitest run src/core/render.test.ts`
Expected: 既有 11 passed，新增 10 FAIL

- [ ] **Step 3: 擴充 `walk` 的 switch（在 `case 'paragraph'` 之後加入）**

```ts
      case 'heading': {
        const level = Math.min(node.depth, 3) - 1
        const prefix = theme.headingPrefix[level]
        blocks.push({
          kind: 'heading',
          text: `${prefix} ${renderInline(node.children, true, false)}`,
        })
        break
      }
      case 'thematicBreak':
        blocks.push({ kind: 'divider', text: theme.divider })
        break
      case 'blockquote': {
        const inner: Block[] = []
        walk(node.children, theme, inner)
        if (inner.length > 0) {
          const content = inner.map(b => b.text).join('\n')
          blocks.push({ kind: 'blockquote', text: `❝ ${content} ❞` })
        }
        break
      }
      case 'code':
        if (node.value.trim() !== '') {
          blocks.push({ kind: 'paragraph', text: node.value })
        }
        break
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/core/render.test.ts`
Expected: 21 passed

- [ ] **Step 5: Commit**

```bash
git add src/core/render.ts src/core/render.test.ts
git commit -m "feat: headings, divider, blockquote, code fence degradation"
```

---

### Task 6: `core/render.ts` — 巢狀清單與 checkbox

**Files:**
- Modify: `src/core/render.ts`（`walk` 加 `case 'list'`，新增 `renderList`）
- Test: `src/core/render.test.ts`（追加）

**Interfaces:**
- Consumes: Task 4、5 的結構
- Produces: `renderBlocks` 支援巢狀 ul/ol 與 GFM task list；每個清單項為一個 `kind: 'listItem'` 的 Block

規則（規格 3.3）：無序符號依層級 `•` → `◦` → `▪`（更深沿用 `▪`），每層縮排 3 個半形空格；有序保留數字；checkbox `- [ ]` → `⬜`、`- [x]` → `✅`（優先於其他符號）。

- [ ] **Step 1: 在 `src/core/render.test.ts` 追加失敗測試**

```ts
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
```

- [ ] **Step 2: 執行測試確認新測試失敗**

Run: `npx vitest run src/core/render.test.ts`
Expected: 既有 21 passed，新增 8 FAIL

- [ ] **Step 3: 實作——`walk` 加入 `case 'list'`，檔尾新增 `renderList`**

`walk` 的 switch 加入：

```ts
      case 'list':
        renderList(node, 0, theme, blocks)
        break
```

檔尾新增（import 需補 `List`）：

```ts
const UL_MARKERS = ['•', '◦', '▪']
const INDENT = '   ' // 每層 3 個半形空格

function renderList(list: List, depth: number, theme: Theme, blocks: Block[]): void {
  const indent = INDENT.repeat(depth)
  let index = list.start ?? 1
  for (const item of list.children) {
    let marker: string
    if (item.checked === true) marker = '✅'
    else if (item.checked === false) marker = '⬜'
    else if (list.ordered) marker = `${index}.`
    else marker = UL_MARKERS[Math.min(depth, UL_MARKERS.length - 1)]

    let first = true
    for (const child of item.children) {
      if (child.type === 'paragraph') {
        const line = renderInline(child.children, false, false)
        blocks.push({
          kind: 'listItem',
          text: first ? `${indent}${marker} ${line}` : `${indent}${INDENT}${line}`,
        })
        first = false
      } else if (child.type === 'list') {
        renderList(child, depth + 1, theme, blocks)
      }
    }
    index++
  }
}
```

並把檔頭 mdast import 改為：

```ts
import type { List, PhrasingContent, Root, RootContent } from 'mdast'
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/core/render.test.ts`
Expected: 29 passed

- [ ] **Step 5: Commit**

```bash
git add src/core/render.ts src/core/render.test.ts
git commit -m "feat: nested lists and gfm task list checkboxes"
```

---

### Task 7: `core/split.ts` 分段演算法

**Files:**
- Create: `src/core/split.ts`
- Test: `src/core/split.test.ts`

**Interfaces:**
- Consumes: `Block` / `BlockKind`（Task 4）
- Produces:

```ts
interface Post {
  text: string       // 最終可複製文字（含編號）
  charCount: number  // grapheme 數
  overflow: boolean  // 有句子被硬切
}
function splitBlocks(blocks: Block[]): Post[]
function countGraphemes(text: string): number
```

演算法（規格第 4 節）：

1. 先以 500 全額裝箱，結果單篇 → 直接採用、不編號
2. 否則以 490（= 500 − 10 編號保留）重新裝箱，每篇篇尾加 `\n\n(n/m)`
3. 裝箱前先「正規化」：超過容量的單一區塊按句子邊界（`。！？．!?.` 之後）拆成多個同 kind 區塊；單句仍超長則按 grapheme 硬切並標 `overflow`
4. 區塊相接規則：兩個相鄰 `listItem` 用 `\n`，其他一律 `\n\n`
5. 標題不落單：關箱時若最後一個區塊是 heading 且後面還有內容，把 heading 移到下一篇（該箱只剩 heading 一個區塊時不移，避免死循環）

- [ ] **Step 1: 寫失敗測試 `src/core/split.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import type { Block } from './render'
import { countGraphemes, splitBlocks } from './split'

const para = (text: string): Block => ({ kind: 'paragraph', text })
const heading = (text: string): Block => ({ kind: 'heading', text })
const li = (text: string): Block => ({ kind: 'listItem', text })
const a = (n: number) => 'a'.repeat(n)

describe('countGraphemes', () => {
  it('ASCII 與中文各算一字', () => {
    expect(countGraphemes('a中')).toBe(2)
  })

  it('組合 emoji 算一字', () => {
    expect(countGraphemes('👨‍👩‍👧‍👦')).toBe(1)
  })
})

describe('splitBlocks', () => {
  it('空輸入回傳空陣列', () => {
    expect(splitBlocks([])).toEqual([])
  })

  it('短文單篇、不編號', () => {
    const posts = splitBlocks([para('hello')])
    expect(posts).toHaveLength(1)
    expect(posts[0]).toEqual({ text: 'hello', charCount: 5, overflow: false })
  })

  it('相鄰 listItem 用單換行、其他用雙換行', () => {
    const posts = splitBlocks([para('p'), li('• a'), li('• b'), para('q')])
    expect(posts[0].text).toBe('p\n\n• a\n• b\n\nq')
  })

  it('介於 490 與 500 之間仍為單篇（單篇用全額 500、不保留編號字數）', () => {
    const posts = splitBlocks([para(a(498))])
    expect(posts).toHaveLength(1)
    expect(posts[0].text).toBe(a(498))
  })

  it('超過 500 分成多篇、篇尾編號、每篇 ≤ 500', () => {
    const posts = splitBlocks([para(a(400) + '。' + a(400) + '。')])
    expect(posts.length).toBeGreaterThan(1)
    for (const [i, post] of posts.entries()) {
      expect(post.charCount).toBeLessThanOrEqual(500)
      expect(post.text.endsWith(`(${i + 1}/${posts.length})`)).toBe(true)
    }
  })

  it('在句子邊界切分、不切斷句子', () => {
    const s1 = a(300) + '。'
    const s2 = a(300) + '。'
    const posts = splitBlocks([para(s1 + s2)])
    expect(posts).toHaveLength(2)
    expect(posts[0].text.startsWith(s1)).toBe(true)
    expect(posts[1].text.startsWith(s2)).toBe(true)
    expect(posts.every(p => !p.overflow)).toBe(true)
  })

  it('單句超長才硬切並標 overflow', () => {
    const posts = splitBlocks([para(a(600))])
    expect(posts).toHaveLength(2)
    expect(posts.some(p => p.overflow)).toBe(true)
  })

  it('標題不落單：標題移到下一篇', () => {
    const posts = splitBlocks([para(a(480)), heading('▍ 𝗧'), para(a(100))])
    expect(posts).toHaveLength(2)
    expect(posts[0].text.includes('𝗧')).toBe(false)
    expect(posts[1].text.startsWith('▍ 𝗧')).toBe(true)
  })

  it('標題是最後一個區塊時不強制移動（無後續內容）', () => {
    const posts = splitBlocks([para('p'), heading('▍ 𝗧')])
    expect(posts).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/core/split.test.ts`
Expected: FAIL（`Cannot find module './split'`）

- [ ] **Step 3: 實作 `src/core/split.ts`**

```ts
import type { Block } from './render'

export interface Post {
  text: string
  charCount: number
  overflow: boolean
}

const LIMIT = 500
const NUMBER_RESERVE = 10 // "\n\n(10/12)" 最長 9 字，保留 10

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function countGraphemes(text: string): number {
  let n = 0
  for (const _ of segmenter.segment(text)) n++
  return n
}

export function splitBlocks(blocks: Block[]): Post[] {
  if (blocks.length === 0) return []

  const fullPack = pack(normalize(blocks, LIMIT), LIMIT)
  if (fullPack.length === 1) return [finalize(fullPack[0], null)]

  const capacity = LIMIT - NUMBER_RESERVE
  const packed = pack(normalize(blocks, capacity), capacity)
  return packed.map((draft, i) => finalize(draft, `(${i + 1}/${packed.length})`))
}

interface Draft {
  parts: Block[]
}

function joiner(prev: Block, next: Block): string {
  return prev.kind === 'listItem' && next.kind === 'listItem' ? '\n' : '\n\n'
}

function joinParts(parts: Block[]): string {
  let text = ''
  for (const [i, part] of parts.entries()) {
    text += i === 0 ? part.text : joiner(parts[i - 1], part) + part.text
  }
  return text
}

// 把超過容量的單一區塊拆成句子區塊；單句仍超長則硬切
function normalize(blocks: Block[], capacity: number): Block[] {
  return blocks.flatMap(block =>
    countGraphemes(block.text) <= capacity ? [block] : explode(block, capacity),
  )
}

function explode(block: Block, capacity: number): Block[] {
  const sentences = block.text.split(/(?<=[。！？．!?.])/)
  const out: Block[] = []
  let buf = ''
  const flush = () => {
    if (buf !== '') {
      out.push({ ...block, text: buf })
      buf = ''
    }
  }
  for (const sentence of sentences) {
    if (countGraphemes(sentence) > capacity) {
      flush()
      for (const chunk of hardCut(sentence, capacity)) {
        out.push({ ...block, text: chunk, overflow: true })
      }
    } else if (countGraphemes(buf + sentence) > capacity) {
      flush()
      buf = sentence
    } else {
      buf += sentence
    }
  }
  flush()
  return out
}

function hardCut(text: string, size: number): string[] {
  const graphemes = [...segmenter.segment(text)].map(s => s.segment)
  const chunks: string[] = []
  for (let i = 0; i < graphemes.length; i += size) {
    chunks.push(graphemes.slice(i, i + size).join(''))
  }
  return chunks
}

function pack(blocks: Block[], capacity: number): Draft[] {
  const drafts: Draft[] = []
  let current: Block[] = []

  const close = (moreComing: boolean) => {
    if (current.length === 0) return
    // 標題不落單：後面還有內容且箱內不只標題時，把箱尾標題移到下一箱
    if (moreComing && current.length > 1 && current[current.length - 1].kind === 'heading') {
      const headingBlock = current.pop()!
      drafts.push({ parts: current })
      current = [headingBlock]
    } else {
      drafts.push({ parts: current })
      current = []
    }
  }

  for (const block of blocks) {
    const candidate = joinParts([...current, block])
    if (countGraphemes(candidate) <= capacity) {
      current.push(block)
      continue
    }
    close(true)
    // normalize 保證單一區塊 ≤ capacity；但 close 後箱內可能殘留被移下來的標題
    const retry = joinParts([...current, block])
    if (countGraphemes(retry) <= capacity) {
      current.push(block)
    } else {
      close(true)
      current = [block]
    }
  }
  close(false)
  return drafts
}

function finalize(draft: Draft, suffix: string | null): Post {
  const body = joinParts(draft.parts)
  const text = suffix === null ? body : `${body}\n\n${suffix}`
  return {
    text,
    charCount: countGraphemes(text),
    overflow: draft.parts.some(p => p.overflow === true),
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `npx vitest run src/core/split.test.ts`
Expected: 11 passed

- [ ] **Step 5: Commit**

```bash
git add src/core/split.ts src/core/split.test.ts
git commit -m "feat: greedy post splitting with sentence fallback and numbering"
```

---

### Task 8: `core/index.ts` — `convert()` 整合

**Files:**
- Create: `src/core/index.ts`
- Test: `src/core/index.test.ts`

**Interfaces:**
- Consumes: `renderBlocks`（Task 4–6）、`splitBlocks` / `Post`（Task 7）、`getTheme`（Task 3）
- Produces: `convert(markdown: string, themeId: string): Post[]`；re-export `Post`、`THEMES`、`Theme`

- [ ] **Step 1: 寫失敗測試 `src/core/index.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { convert } from './index'

describe('convert', () => {
  it('端到端黃金案例（直線主題）', () => {
    const md = [
      '# Title',
      '',
      'Hello **world**!',
      '',
      '- [x] done',
      '- [ ] todo',
      '',
      '> quoted',
      '',
      '---',
    ].join('\n')

    const posts = convert(md, 'line')
    expect(posts).toHaveLength(1)
    expect(posts[0].text).toBe(
      '▍ 𝗧𝗶𝘁𝗹𝗲\n\nHello 𝘄𝗼𝗿𝗹𝗱!\n\n✅ done\n⬜ todo\n\n❝ quoted ❞\n\n───────',
    )
  })

  it('菱形主題改變前綴', () => {
    expect(convert('# T', 'diamond')[0].text).toBe('◆ 𝗧')
  })

  it('未知主題 fallback 直線', () => {
    expect(convert('# T', 'nope')[0].text).toBe('▍ 𝗧')
  })

  it('空輸入回傳空陣列', () => {
    expect(convert('', 'line')).toEqual([])
    expect(convert('   \n  ', 'line')).toEqual([])
  })

  it('長文自動分段', () => {
    const md = `# 標題\n\n${'字'.repeat(600)}`
    const posts = convert(md, 'line')
    expect(posts.length).toBeGreaterThan(1)
    expect(posts.every(p => p.charCount <= 500)).toBe(true)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npx vitest run src/core/index.test.ts`
Expected: FAIL（`Cannot find module './index'` 或 export 不存在）

- [ ] **Step 3: 實作 `src/core/index.ts`**

```ts
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
```

- [ ] **Step 4: 執行全部測試確認通過**

Run: `npm test`
Expected: unicode 6 + themes 2 + render 29 + split 11 + index 5 = 53 passed

- [ ] **Step 5: Commit**

```bash
git add src/core/index.ts src/core/index.test.ts
git commit -m "feat: convert() public api wiring parse, render, split"
```

---

### Task 9: UI 骨架 — App、Editor、預覽列表

**Files:**
- Create: `src/components/Editor.tsx`、`src/components/PostCard.tsx`、`src/sample.ts`
- Modify: `src/App.tsx`、`src/App.css`、`src/index.css`

**Interfaces:**
- Consumes: `convert` / `Post` / `THEMES`（Task 8）
- Produces: 可用的雙欄頁面；`PostCard` 此階段只顯示內文與字數（複製功能 Task 10、主題切換與 localStorage Task 11）

- [ ] **Step 1: 建立 `src/sample.ts`**

```ts
export const SAMPLE_MARKDOWN = `# Postio 是什麼

**Postio** 把 Markdown 轉成適合貼上 Threads 的純文字。*Write once. Publish anywhere.*

## 你可以這樣用

1. 在左邊貼上 Markdown
2. 右邊立刻看到 Threads 版本
3. 逐篇複製、貼上

## 支援的格式

- 粗體與斜體
- 巢狀清單
  - 像這樣
- 待辦清單
  - [x] 已完成的事
  - [ ] 還沒做的事

> 引用文字會用引號包起來，look at me.

---

超過 500 字會自動分段成 thread，每篇結尾加上編號，直接照順序貼成串文就好。連結也會轉換：[Postio](https://example.com)。
`

- [ ] **Step 2: 建立 `src/components/Editor.tsx`**

```tsx
interface EditorProps {
  value: string
  onChange: (value: string) => void
}

export function Editor({ value, onChange }: EditorProps) {
  return (
    <textarea
      className="editor"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="在這裡貼上你的 Markdown…"
      autoFocus
    />
  )
}
```

- [ ] **Step 3: 建立 `src/components/PostCard.tsx`（複製按鈕 Task 10 再加）**

```tsx
import type { Post } from '../core'

interface PostCardProps {
  post: Post
  index: number
  total: number
}

export function PostCard({ post, index, total }: PostCardProps) {
  return (
    <article className="post-card">
      <div className="post-meta">
        <span>{total > 1 ? `第 ${index + 1} 篇` : '單篇'}</span>
        <span className={post.charCount > 500 ? 'count over' : 'count'}>
          {post.charCount} / 500
        </span>
      </div>
      <pre className="post-text">{post.text}</pre>
    </article>
  )
}
```

- [ ] **Step 4: 改寫 `src/App.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { convert } from './core'
import { Editor } from './components/Editor'
import { PostCard } from './components/PostCard'
import { SAMPLE_MARKDOWN } from './sample'
import './App.css'

export default function App() {
  const [markdown, setMarkdown] = useState('')

  const posts = useMemo(() => convert(markdown, 'line'), [markdown])

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Postio</h1>
          <p className="tagline">Write once. Publish anywhere.</p>
        </div>
      </header>
      <main className="main">
        <Editor value={markdown} onChange={setMarkdown} />
        <section className="preview">
          {posts.length === 0 ? (
            <div className="empty">
              <p>貼上 Markdown，這裡立刻出現 Threads 版本。</p>
              <button className="sample" onClick={() => setMarkdown(SAMPLE_MARKDOWN)}>
                載入範例
              </button>
            </div>
          ) : (
            posts.map((post, i) => (
              <PostCard key={i} post={post} index={i} total={posts.length} />
            ))
          )}
        </section>
      </main>
    </div>
  )
}
```

- [ ] **Step 5: `src/index.css` 整檔改為**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  color-scheme: light dark;
  --bg: #f6f7f9;
  --surface: #ffffff;
  --border: #e2e5ea;
  --text: #1c1e21;
  --muted: #65676b;
  --accent: #0a7cff;
  --danger: #e0245e;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #101114;
    --surface: #1c1e22;
    --border: #2e3238;
    --text: #e7e9ec;
    --muted: #9aa0a6;
  }
}

body {
  font-family: -apple-system, 'PingFang TC', 'Noto Sans TC', sans-serif;
  background: var(--bg);
  color: var(--text);
}
```

- [ ] **Step 6: `src/App.css` 整檔改為**

```css
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.header h1 {
  font-size: 24px;
}

.tagline {
  color: var(--muted);
  font-size: 14px;
}

.main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  align-items: start;
}

@media (max-width: 800px) {
  .main {
    grid-template-columns: 1fr;
  }
}

.editor {
  width: 100%;
  min-height: 70vh;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  font: 14px/1.6 ui-monospace, 'SF Mono', Menlo, monospace;
  resize: vertical;
}

.editor:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}

.preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty {
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

.sample {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.post-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--muted);
}

.count.over {
  color: var(--danger);
  font-weight: 600;
}

.post-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.6;
}

.warning {
  font-size: 13px;
  color: var(--danger);
}

.copy {
  align-self: flex-end;
  padding: 6px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
}

.copy:hover {
  background: var(--accent);
  color: #fff;
}

.theme-picker {
  display: flex;
  gap: 8px;
}

.theme {
  padding: 6px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
}

.theme.active {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
```

- [ ] **Step 7: 手動驗證**

Run: `npm run dev`，瀏覽器開啟顯示的網址。
Expected:
1. 空狀態顯示引導文案與「載入範例」按鈕
2. 點「載入範例」→ 右欄出現轉換後卡片（標題有 ▍ 前綴、粗體為 Unicode、checkbox 為 ⬜/✅）
3. 左欄輸入時右欄即時更新；清空輸入回到空狀態

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: two-pane ui with editor, preview cards, sample loader"
```

---

### Task 10: PostCard 複製功能

**Files:**
- Modify: `src/components/PostCard.tsx`

**Interfaces:**
- Consumes: Task 9 的 `PostCard`
- Produces: 每張卡片有複製按鈕、「已複製 ✓」回饋、clipboard API 失敗時 fallback 全選、overflow 警告列

- [ ] **Step 1: `src/components/PostCard.tsx` 整檔改為**

```tsx
import { useEffect, useRef, useState } from 'react'
import type { Post } from '../core'

interface PostCardProps {
  post: Post
  index: number
  total: number
}

export function PostCard({ post, index, total }: PostCardProps) {
  const [copied, setCopied] = useState(false)
  const textRef = useRef<HTMLPreElement>(null)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(post.text)
      setCopied(true)
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // 非 HTTPS 或舊瀏覽器：全選該篇文字讓使用者手動 ⌘C
      const node = textRef.current
      if (node) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  }

  return (
    <article className="post-card">
      <div className="post-meta">
        <span>{total > 1 ? `第 ${index + 1} 篇` : '單篇'}</span>
        <span className={post.charCount > 500 ? 'count over' : 'count'}>
          {post.charCount} / 500
        </span>
      </div>
      {post.overflow && (
        <p className="warning">⚠️ 有句子超過單篇上限被強制截斷，建議改寫原文。</p>
      )}
      <pre ref={textRef} className="post-text">{post.text}</pre>
      <button className="copy" onClick={copy}>
        {copied ? '已複製 ✓' : '複製'}
      </button>
    </article>
  )
}
```

- [ ] **Step 2: 手動驗證**

Run: `npm run dev`（localhost 視同安全環境，clipboard API 可用）
Expected:
1. 載入範例後每張卡片有「複製」按鈕
2. 點擊 → 按鈕變「已複製 ✓」，1.5 秒後復原
3. 貼到任意文字欄位，內容與卡片一致（含 Unicode 粗體與縮排）
4. 貼上超長文章（範例重複多次）→ 多張卡片各自可複製、編號正確

- [ ] **Step 3: Commit**

```bash
git add src/components/PostCard.tsx
git commit -m "feat: per-post copy with clipboard fallback and feedback"
```

---

### Task 11: 主題切換、localStorage、收尾整合

**Files:**
- Create: `src/components/ThemePicker.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `THEMES`（Task 8 re-export）、Task 9 的 App 結構
- Produces: 主題切換 UI；草稿與主題持久化（key：`postio:draft`、`postio:theme`）

- [ ] **Step 1: 建立 `src/components/ThemePicker.tsx`**

```tsx
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
```

- [ ] **Step 2: `src/App.tsx` 整檔改為**

```tsx
import { useMemo, useState } from 'react'
import { convert, THEMES } from './core'
import { Editor } from './components/Editor'
import { PostCard } from './components/PostCard'
import { ThemePicker } from './components/ThemePicker'
import { SAMPLE_MARKDOWN } from './sample'
import './App.css'

const DRAFT_KEY = 'postio:draft'
const THEME_KEY = 'postio:theme'

export default function App() {
  const [markdown, setMarkdown] = useState(() => localStorage.getItem(DRAFT_KEY) ?? '')
  const [themeId, setThemeId] = useState(() => localStorage.getItem(THEME_KEY) ?? THEMES[0].id)

  const posts = useMemo(() => convert(markdown, themeId), [markdown, themeId])

  const updateMarkdown = (value: string) => {
    setMarkdown(value)
    localStorage.setItem(DRAFT_KEY, value)
  }

  const updateTheme = (id: string) => {
    setThemeId(id)
    localStorage.setItem(THEME_KEY, id)
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Postio</h1>
          <p className="tagline">Write once. Publish anywhere.</p>
        </div>
        <ThemePicker value={themeId} onChange={updateTheme} />
      </header>
      <main className="main">
        <Editor value={markdown} onChange={updateMarkdown} />
        <section className="preview">
          {posts.length === 0 ? (
            <div className="empty">
              <p>貼上 Markdown，這裡立刻出現 Threads 版本。</p>
              <button className="sample" onClick={() => updateMarkdown(SAMPLE_MARKDOWN)}>
                載入範例
              </button>
            </div>
          ) : (
            posts.map((post, i) => (
              <PostCard key={i} post={post} index={i} total={posts.length} />
            ))
          )}
        </section>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: 手動驗證**

Run: `npm run dev`
Expected:
1. 右上主題切換（▍ 直線／◆ 菱形），點擊後標題前綴即時改變
2. 輸入文字後重新整理頁面 → 草稿仍在；切換主題後重新整理 → 主題仍在
3. 清空 localStorage（DevTools → Application）→ 回到預設直線主題、空草稿

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat: theme picker and localStorage persistence"
```

---

### Task 12: 驗收與建置

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: 全部前置任務
- Produces: 通過規格第 8 節驗收標準、可部署的 `dist/`

- [ ] **Step 1: 全部測試與建置**

```bash
npm test && npm run build
```
Expected: 53 passed；build 成功無 TypeScript 錯誤。

- [ ] **Step 2: 對照規格第 8 節逐項手動驗收（`npm run preview` 開啟 build 後版本）**

1. 貼上含標題、粗體、巢狀清單、checkbox 的 Markdown，1 秒內看到分段後的預覽
2. 每篇卡片字數 ≤ 500，複製後貼到 Threads（或任意文字欄位）格式正確
3. 超過 500 字的文章正確分段、編號正確、標題不落單
4. 重新整理頁面，草稿與主題選擇仍在
5. 首次使用者透過「載入範例」能在 30 秒內完成一次完整流程

同時實測規格 3.3 的待驗證假設：把含巢狀清單的輸出貼進 Threads 草稿，確認行首空格是否保留；若被剝除，把 `render.ts` 的 `INDENT` 改為 `'  '`（EN SPACE）並更新對應測試與規格。

- [ ] **Step 3: 建立 `README.md`**

```markdown
# Postio

> Write once. Publish anywhere.

把 Markdown 轉成適合貼上 Threads 的 Unicode 純文字。超過 500 字自動分段成 thread。

## 開發

npm install
npm run dev

## 測試

npm test

## 建置

npm run build
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add readme"
```

---

## 驗收後已知取捨（不需處理，記錄供未來參考)

- Unicode 假字型只涵蓋拉丁字母與數字；中文靠符號前綴分層（規格 3.1）
- 假字型對螢幕閱讀器不友善（規格接受的取捨）
- 被硬切的超長句子分屬不同篇時，篇內以雙換行相接；因有 overflow 警告提示改寫，屬可接受行為
