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
