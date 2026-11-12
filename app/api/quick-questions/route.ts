import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getInfo, setSession } from '@/app/api/utils/common'
import { API_URL } from '@/config'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function GET(request: NextRequest) {
  const appKey = process.env.NEXT_CONFIG_APP_KEY?.trim()
  const appId = process.env.NEXT_CONFIG_APP_ID?.trim()
  // 配置中心可选；未配置时由页面保留默认问题，不发起工作流请求。
  if (!appKey || !appId)
  { return NextResponse.json({ quick_questions: null }) }

  const { sessionId } = getInfo(request)
  try {
    const response = await fetch(`${API_URL.replace(/\/$/, '')}/workflows/run`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${appKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: { ver: '' }, response_mode: 'blocking', user: `user_${appId}:${sessionId}` }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok)
    { throw new Error('配置中心请求失败') }

    const result: unknown = await response.json()
    const data = isRecord(result) && isRecord(result.data) ? result.data : null
    const outputs = data && isRecord(data.outputs) ? data.outputs : null
    // 工作流将公开配置作为 JSON 字符串输出，仅向页面返回所需的问题列表。
    const config: unknown = typeof outputs?.config === 'string' ? JSON.parse(outputs.config) : outputs?.config
    const questions = isRecord(config) && isRecord(config.home) ? config.home.quick_questions : null
    if (data?.status !== 'succeeded' || !Array.isArray(questions) || !questions.every((question: unknown) => typeof question === 'string'))
    { throw new Error('配置中心问题格式无效') }

    const quickQuestions = [...new Set((questions as string[]).map(question => question.trim()).filter(Boolean))]
    if (!quickQuestions.length)
    { throw new Error('配置中心问题为空') }

    return NextResponse.json({ quick_questions: quickQuestions }, { headers: setSession(sessionId) })
  }
  catch {
    return NextResponse.json({ quick_questions: null }, { status: 502 })
  }
}
