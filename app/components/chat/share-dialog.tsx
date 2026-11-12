'use client'
import { useEffect, useRef, useState } from 'react'
import copy from 'copy-to-clipboard'
import type { ChatItem } from '@/types/app'
import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import Toast from '@/app/components/base/toast'
import { formatAnswerSummary } from '@/utils/answer-summary'

export default function ShareDialog({ messages, initialId, onClose }: { messages: ChatItem[], initialId: string, onClose: () => void }) {
  const initialIndex = messages.findIndex(message => message.id === initialId)
  const question = messages.slice(0, initialIndex).findLast(message => !message.isAnswer)
  const [selected, setSelected] = useState([initialId, ...(question ? [question.id] : [])])
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState('')
  const controller = useRef<AbortController | null>(null)
  const busyRef = useRef(false)
  useEffect(() => () => controller.current?.abort(), [])

  const create = async () => {
    if (busyRef.current || !selected.length) { return }
    busyRef.current = true
    setBusy(true)
    const request = new AbortController()
    controller.current = request
    try {
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: request.signal,
        body: JSON.stringify({ messages: messages.filter(message => selected.includes(message.id)).map(message => ({ role: message.isAnswer ? 'assistant' : 'user', content: message.isAnswer ? formatAnswerSummary(message.content) : message.content })) }),
      })
      const result: unknown = await response.json()
      if (!response.ok || !result || typeof result !== 'object' || !('path' in result) || typeof result.path !== 'string' || !/^\/share\/[a-f0-9]{48}$/.test(result.path)) { throw new Error('创建分享失败') }
      if (!request.signal.aborted) { setUrl(new URL(result.path, window.location.origin).href) }
    }
    catch { if (!request.signal.aborted) { Toast.notify({ type: 'error', message: '创建分享失败，请稍后重试；内容可能过长或分享存储不可用' }) } }
    finally { busyRef.current = false; if (!request.signal.aborted) { setBusy(false) } }
  }

  return (
    // 使用普通区域而非模态弹窗，保留侧栏交互，切换对话时由父组件卸载并取消请求。
    <section className='knowledge-share-dialog' aria-label='分享对话'>
      <div className='knowledge-share-panel'>
        <header><h2>分享对话</h2><p>任何获得链接的人都能查看选中的文字。附件及后续对话不会公开。</p></header>
        {url
          ? <div className='knowledge-share-result'><p>分享链接已创建</p><input aria-label='分享链接' value={url} readOnly onFocus={e => e.target.select()} /><a href={url} target='_blank' rel='noreferrer'>打开只读页面</a></div>
          : <div className='knowledge-share-selection'>
            {messages.map(message => (
              <label key={message.id} className='knowledge-share-row'>
                <input type='checkbox' disabled={busy} checked={selected.includes(message.id)} onChange={e => setSelected(previous => e.target.checked ? [...previous, message.id] : previous.filter(id => id !== message.id))} />
                <div className={`knowledge-share-message knowledge-share-message-${message.isAnswer ? 'assistant' : 'user'}`}><strong>{message.isAnswer ? '回答' : '提问'}</strong><StreamdownMarkdown content={message.isAnswer ? formatAnswerSummary(message.content) : message.content} /></div>
              </label>
            ))}
          </div>}
        <footer>
          {!url && <label><input type='checkbox' disabled={busy} checked={selected.length === messages.length} onChange={e => setSelected(e.target.checked ? messages.map(message => message.id) : [])} />全选 · 已选择 {selected.length} 条消息</label>}
          <div><button disabled={busy} onClick={onClose}>{url ? '完成' : '取消'}</button>
            {url
              ? <button className='knowledge-share-primary' onClick={() => {
                const success = copy(url)
                Toast.notify({ type: success ? 'success' : 'error', message: success ? '链接已复制' : '复制失败，请手动复制' })
              }}>复制链接</button>
              : <button className='knowledge-share-primary' disabled={busy || !selected.length} onClick={() => { void create() }}>{busy ? '创建中…' : '创建公开分享链接'}</button>}
          </div>
        </footer>
      </div>
    </section>
  )
}
