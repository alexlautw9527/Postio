import { useEffect, useRef, useState } from 'react'
import type { Post } from '../core'

interface PostCardProps {
  post: Post
  index: number
  total: number
}

export function PostCard({ post, index, total }: PostCardProps) {
  const [copied, setCopied] = useState(false)
  const textRef = useRef<HTMLPreElement>(null)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(post.text)
      setCopied(true)
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // 非 HTTPS 或舊瀏覽器：全選該篇文字讓使用者手動 ⌘C
      const node = textRef.current
      if (node) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    }
  }

  return (
    <article className="post-card">
      <div className="post-meta">
        <span>{total > 1 ? `第 ${index + 1} 篇` : '單篇'}</span>
        <span className={post.charCount > 500 ? 'count over' : 'count'}>
          {post.charCount} / 500
        </span>
      </div>
      {post.overflow && (
        <p className="warning">⚠️ 有句子超過單篇上限被強制截斷，建議改寫原文。</p>
      )}
      <pre ref={textRef} className="post-text">{post.text}</pre>
      <button className="copy" onClick={copy}>
        {copied ? '已複製 ✓' : '複製'}
      </button>
    </article>
  )
}
