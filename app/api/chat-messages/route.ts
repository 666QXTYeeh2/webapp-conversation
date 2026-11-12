import type { NextRequest } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'
import { encodeModeQuery } from '@/utils/request-mode'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    inputs,
    query,
    files,
    conversation_id: conversationId,
    response_mode: responseMode,
  } = body
  const { user } = getInfo(request)
  // 每轮模式随问题传入，避免 Dify 沿用创建对话时的 inputs。
  const res = await client.createChatMessage(inputs, encodeModeQuery(query, body.answer_mode), user, responseMode, conversationId, files)
  return new Response(res.data as any)
}
