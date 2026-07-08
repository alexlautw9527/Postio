import { useMemo, useRef, useState } from 'react'
import { convert, THEMES } from './core'
import { Editor } from './components/Editor'
import { PostCard } from './components/PostCard'
import { ThemePicker } from './components/ThemePicker'
import { SAMPLE_MARKDOWN } from './sample'
import './App.css'

const DRAFT_KEY = 'postio:draft'
const THEME_KEY = 'postio:theme'

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 私隱模式或封鎖儲存時靜默略過，僅失去持久化
  }
}

export default function App() {
  const [markdown, setMarkdown] = useState(() => safeGet(DRAFT_KEY) ?? SAMPLE_MARKDOWN)
  const [themeId, setThemeId] = useState(() => safeGet(THEME_KEY) ?? THEMES[0].id)

  const posts = useMemo(() => convert(markdown, themeId), [markdown, themeId])

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  // 捲動跟隨：記住主動捲動的一側，避免兩側互相觸發造成抖動
  const scrollSource = useRef<'editor' | 'preview' | null>(null)

  const syncScroll = (from: 'editor' | 'preview') => {
    const src = from === 'editor' ? editorRef.current : previewRef.current
    const dst = from === 'editor' ? previewRef.current : editorRef.current
    if (!src || !dst) return
    if (scrollSource.current && scrollSource.current !== from) return
    scrollSource.current = from
    const ratio = src.scrollTop / Math.max(1, src.scrollHeight - src.clientHeight)
    dst.scrollTop = ratio * (dst.scrollHeight - dst.clientHeight)
    window.requestAnimationFrame(() => {
      scrollSource.current = null
    })
  }

  const updateMarkdown = (value: string) => {
    setMarkdown(value)
    safeSet(DRAFT_KEY, value)
  }

  const updateTheme = (id: string) => {
    setThemeId(id)
    safeSet(THEME_KEY, id)
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
        <section className="pane">
          <label className="pane-label" htmlFor="markdown-input">
            Markdown 原稿
          </label>
          <Editor
            ref={editorRef}
            value={markdown}
            onChange={updateMarkdown}
            onScroll={() => syncScroll('editor')}
          />
        </section>
        <section className="pane">
          <h2 className="pane-label">Threads 預覽</h2>
          <div className="preview" ref={previewRef} onScroll={() => syncScroll('preview')}>
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
          </div>
        </section>
      </main>
    </div>
  )
}
