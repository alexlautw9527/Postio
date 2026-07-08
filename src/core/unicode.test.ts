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
