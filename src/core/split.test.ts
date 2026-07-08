import { describe, expect, it } from 'vitest'
import type { Block } from './render'
import { countGraphemes, splitBlocks } from './split'

const para = (text: string): Block => ({ kind: 'paragraph', text })
const heading = (text: string): Block => ({ kind: 'heading', text })
const li = (text: string): Block => ({ kind: 'listItem', text })
const pageBreak = (): Block => ({ kind: 'pageBreak', text: '' })
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

  it('連續兩個標題都不落單', () => {
    const posts = splitBlocks([para(a(470)), heading('▍ 𝗔'), heading('▎ 𝗕'), para(a(400))])
    expect(posts[0].text.includes('𝗔')).toBe(false)
    expect(posts[0].text.includes('𝗕')).toBe(false)
  })

  it('清單不從中間切開：整組放得進新篇時整組移過去', () => {
    const posts = splitBlocks([para(a(450)), li('• ' + a(28)), li('• ' + a(28)), li('• ' + a(28))])
    expect(posts).toHaveLength(2)
    expect(posts[0].text.includes('•')).toBe(false)
    expect((posts[1].text.match(/•/g) ?? []).length).toBe(3)
  })

  it('強制分頁：即使總長很短也切成兩篇並編號', () => {
    const posts = splitBlocks([para('甲'), pageBreak(), para('乙')])
    expect(posts).toHaveLength(2)
    expect(posts[0].text).toBe('甲\n\n(1/2)')
    expect(posts[1].text).toBe('乙\n\n(2/2)')
  })

  it('強制分頁不套用標題不落單規則（尊重使用者的明確分割）', () => {
    const posts = splitBlocks([para('p'), heading('▍ 𝗧'), pageBreak(), para('q')])
    expect(posts).toHaveLength(2)
    expect(posts[0].text.includes('𝗧')).toBe(true)
  })

  it('連續或首尾的分頁標記不產生空貼文', () => {
    const posts = splitBlocks([pageBreak(), para('甲'), pageBreak(), pageBreak(), para('乙'), pageBreak()])
    expect(posts).toHaveLength(2)
  })

  it('清單整組超過單篇容量時才允許在項目邊界切開', () => {
    const items = Array.from({ length: 6 }, () => li('• ' + a(95)))
    const posts = splitBlocks([...items])
    expect(posts.length).toBeGreaterThan(1)
    // 每個項目都完整（沒有項目被從中間切斷）
    const allItems = posts.flatMap(p =>
      p.text.split('\n').filter(l => l.startsWith('• ')),
    )
    expect(allItems).toHaveLength(6)
    expect(allItems.every(l => l === '• ' + a(95))).toBe(true)
  })
})
