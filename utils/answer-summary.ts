const SUMMARY_START = '[[ANALYSIS_SUMMARY]]'
const ANSWER_START = '[[FINAL_ANSWER]]'

export function formatAnswerSummary(content: string) {
  const result = splitAnswerSummary(content)
  return result.hasSummary ? `### 分析摘要\n${result.summary}\n\n### 回答\n${result.answer}` : result.answer
}

export function splitAnswerSummary(content: string) {
  if (!content.startsWith(SUMMARY_START)) {
    // 流式输出标记尚不完整时不显示协议字符，普通回答保持原样。
    return { summary: '', answer: content && SUMMARY_START.startsWith(content) ? '' : content, hasSummary: false, complete: false }
  }
  const boundary = content.indexOf(ANSWER_START, SUMMARY_START.length)
  if (boundary < 0) {
    let summary = content.slice(SUMMARY_START.length)
    for (let length = ANSWER_START.length - 1; length > 0; length--) {
      if (summary.endsWith(ANSWER_START.slice(0, length))) { summary = summary.slice(0, -length); break }
    }
    return { summary: summary.trim(), answer: '', hasSummary: true, complete: false }
  }
  return { summary: content.slice(SUMMARY_START.length, boundary).trim(), answer: content.slice(boundary + ANSWER_START.length).trim(), hasSummary: true, complete: true }
}
