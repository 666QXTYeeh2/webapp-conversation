import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params
  if (!conversationId || conversationId === '-1')
  { return NextResponse.json({ error: '无效的对话' }, { status: 400 }) }
  try {
    // 使用当前会话身份删除，交由 Dify 校验对话归属。
    const { user } = getInfo(request)
    await client.deleteConversation(conversationId, user)
    return NextResponse.json({ success: true })
  }
  catch {
    return NextResponse.json({ error: '删除失败，请稍后重试' }, { status: 502 })
  }
}
