import type { Post } from '../core'

interface PostCardProps {
  post: Post
  index: number
  total: number
}

export function PostCard({ post, index, total }: PostCardProps) {
  return (
    <article className="post-card">
      <div className="post-meta">
        <span>{total > 1 ? `第 ${index + 1} 篇` : '單篇'}</span>
        <span className={post.charCount > 500 ? 'count over' : 'count'}>
          {post.charCount} / 500
        </span>
      </div>
      <pre className="post-text">{post.text}</pre>
    </article>
  )
}
