import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import type { List, PhrasingContent, Root, RootContent, TableRow } from 'mdast'
import { applyStyle } from './unicode'
import type { Theme } from './themes'

export type BlockKind = 'heading' | 'paragraph' | 'listItem' | 'divider' | 'blockquote' | 'pageBreak'

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
        // 獨立一行 ===（前後空行）是使用者的強制分頁標記
        const only = node.children[0]
        if (node.children.length === 1 && only.type === 'text' && /^={3,}$/.test(only.value.trim())) {
          blocks.push({ kind: 'pageBreak', text: '' })
          break
        }
        const text = renderInline(node.children, false, false)
        if (text.trim() !== '') blocks.push({ kind: 'paragraph', text })
        break
      }
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
      case 'list':
        renderList(node, 0, theme, blocks)
        break
      case 'table':
        renderTable(node.children, blocks)
        break
      default:
        break
    }
  }
}

function renderTable(rows: TableRow[], blocks: Block[]): void {
  for (const row of rows) {
    const text = row.children.map(cell => renderInline(cell.children, false, false)).join(' · ')
    if (text.trim() !== '') blocks.push({ kind: 'paragraph', text })
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
        // 行內程式碼一律等寬，不受外層粗斜體影響
        out += applyStyle(node.value, 'mono')
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
