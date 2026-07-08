import type { Block } from './render'

export interface Post {
  text: string
  charCount: number
  overflow: boolean
}

const LIMIT = 500
const NUMBER_RESERVE = 12 // "\n\n(999/999)" 最長 11 字，保留 12（涵蓋至 999 篇）

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
    // 標題不落單：後面還有內容且箱內不只標題時，把箱尾所有連續標題移到下一箱
    if (moreComing && current.length > 1 && current[current.length - 1].kind === 'heading') {
      const headingBlocks: Block[] = []
      while (current.length > 1 && current[current.length - 1].kind === 'heading') {
        headingBlocks.unshift(current.pop()!)
      }
      drafts.push({ parts: current })
      current = headingBlocks
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
