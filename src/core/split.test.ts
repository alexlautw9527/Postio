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
