const PREFIX = '[[CHAT_REQUEST_V1]]\n'

export function encodeModeQuery(query: string, mode: unknown) {
  return PREFIX + JSON.stringify({ query, answer_mode: mode === '智能推理' ? '智能推理' : '快速问答' })
}

export function decodeModeQuery(query: string) {
  if (!query.startsWith(PREFIX)) { return query }
  try {
    const value: unknown = JSON.parse(query.slice(PREFIX.length))
    if (value && typeof value === 'object' && 'query' in value && typeof value.query === 'string') { return value.query }
  }
  catch { /* 旧记录或损坏的封装保留原文，不丢失用户问题。 */ }
  return query
}
