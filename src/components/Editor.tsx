import type { Ref } from 'react'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onScroll?: () => void
  ref?: Ref<HTMLTextAreaElement>
}

export function Editor({ value, onChange, onScroll, ref }: EditorProps) {
  return (
    <textarea
      id="markdown-input"
      name="markdown"
      className="editor"
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onScroll={onScroll}
      placeholder="在這裡貼上你的 Markdown…"
      autoFocus
    />
  )
}
