import { notFound } from 'next/navigation'
import { readShare } from '@/utils/share-store'
import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'

export const dynamic = 'force-dynamic'
export const metadata = { title: '知识问答 · 对话分享', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function SharedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const share = await readShare(id)
  if (!share) { notFound() }
  return (
    <main className='knowledge-public-share'>
      <header><h1>知识问答 · 对话分享</h1><p>由用户公开分享的对话快照，内容由 AI 生成，仅供参考。</p></header>
      {share.messages.map((message, index) => (
        <section key={`${id}-${index}`} className={`knowledge-share-message knowledge-share-message-${message.role}`}>
          <strong>{message.role === 'user' ? '提问' : '回答'}</strong>
          <StreamdownMarkdown content={message.content} />
        </section>
      ))}
    </main>
  )
}
