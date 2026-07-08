import { useMemo, useState } from 'react'
import { convert, THEMES } from './core'
import { Editor } from './components/Editor'
import { PostCard } from './components/PostCard'
import { ThemePicker } from './components/ThemePicker'
import { SAMPLE_MARKDOWN } from './sample'
import './App.css'

const DRAFT_KEY = 'postio:draft'
const THEME_KEY = 'postio:theme'

export default function App() {
  const [markdown, setMarkdown] = useState(() => localStorage.getItem(DRAFT_KEY) ?? SAMPLE_MARKDOWN)
  const [themeId, setThemeId] = useState(() => localStorage.getItem(THEME_KEY) ?? THEMES[0].id)

  const posts = useMemo(() => convert(markdown, themeId), [markdown, themeId])

  const updateMarkdown = (value: string) => {
    setMarkdown(value)
    localStorage.setItem(DRAFT_KEY, value)
  }

  const updateTheme = (id: string) => {
    setThemeId(id)
    localStorage.setItem(THEME_KEY, id)
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Postio</h1>
          <p className="tagline">Write once. Publish anywhere.</p>
        </div>
        <ThemePicker value={themeId} onChange={updateTheme} />
      </header>
      <main className="main">
        <Editor value={markdown} onChange={updateMarkdown} />
        <section className="preview">
          {posts.length === 0 ? (
            <div className="empty">
              <p>貼上 Markdown，這裡立刻出現 Threads 版本。</p>
              <button className="sample" onClick={() => updateMarkdown(SAMPLE_MARKDOWN)}>
                載入範例
              </button>
            </div>
          ) : (
            posts.map((post, i) => (
              <PostCard key={i} post={post} index={i} total={posts.length} />
            ))
          )}
        </section>
      </main>
    </div>
  )
}
