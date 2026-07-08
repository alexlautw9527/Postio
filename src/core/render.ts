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
      default:
        break // 其他區塊型別於 Task 6 加入
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
