export type StyleKind = 'bold' | 'italic' | 'boldItalic' | 'mono'

// Mathematical Sans-Serif / Monospace 系列起始碼位
const OFFSETS: Record<StyleKind, { upper: number; lower: number; digit?: number }> = {
  bold: { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  italic: { upper: 0x1d608, lower: 0x1d622 }, // 無 italic 數字碼位
  boldItalic: { upper: 0x1d63c, lower: 0x1d656, digit: 0x1d7ec },
  mono: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
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
