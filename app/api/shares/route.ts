import { NextResponse } from 'next/server'
import { createShare } from '@/utils/share-store'
import type { SharedMessage } from '@/utils/share-store'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // 限制公开快照大小及字段，只接收用户明确选中的消息文字。
  const raw = await request.text()
  if (Buffer.byteLength(raw, 'utf8') > 200000) { return NextResponse.json({ error: '分享内容过长，请减少选择' }, { status: 413 }) }
  let body: unknown
  try { body = JSON.parse(raw) }
  catch { return NextResponse.json({ error: '分享内容无效' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || !('messages' in body) || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 100)
  { return NextResponse.json({ error: '请选择分享内容（最多100条消息）' }, { status: 400 }) }
  const messages: SharedMessage[] = []
  for (const message of body.messages) {
    if (!message || typeof message !== 'object' || (message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string' || !message.content.trim())
    { return NextResponse.json({ error: '分享内容无效' }, { status: 400 }) }
    messages.push({ role: message.role, content: message.content })
  }
  try {
    const id = await createShare(messages)
    return NextResponse.json({ path: `/share/${id}` }, { headers: { 'Cache-Control': 'no-store' } })
  }
  catch { return NextResponse.json({ error: '创建失败，请检查分享存储是否可用' }, { status: 503 }) }
}
