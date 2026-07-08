interface EditorProps {
  value: string
  onChange: (value: string) => void
}

export function Editor({ value, onChange }: EditorProps) {
  return (
    <textarea
      id="markdown-input"
      name="markdown"
      className="editor"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="在這裡貼上你的 Markdown…"
      autoFocus
    />
  )
}
