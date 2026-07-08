import { useMemo, useState } from 'react'
import { convert } from './core'
import { Editor } from './components/Editor'
import { PostCard } from './components/PostCard'
import { SAMPLE_MARKDOWN } from './sample'
import './App.css'

export default function App() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN)

  const posts = useMemo(() => convert(markdown, 'line'), [markdown])

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Postio</h1>
          <p className="tagline">Write once. Publish anywhere.</p>
        </div>
      </header>
      <main className="main">
        <Editor value={markdown} onChange={setMarkdown} />
        <section className="preview">
          {posts.length === 0 ? (
            <div className="empty">
              <p>貼上 Markdown，這裡立刻出現 Threads 版本。</p>
              <button className="sample" onClick={() => setMarkdown(SAMPLE_MARKDOWN)}>
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
