'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowPathIcon, CheckIcon, DocumentDuplicateIcon, HandThumbDownIcon, HandThumbUpIcon, ShareIcon, SpeakerWaveIcon, StopIcon } from '@heroicons/react/24/outline'
import copy from 'copy-to-clipboard'
import type { FeedbackFunc } from '../type'
import type { ChatItem } from '@/types/app'
import Toast from '@/app/components/base/toast'
import { formatAnswerSummary } from '@/utils/answer-summary'

interface Props {
  item: ChatItem
  onShare?: () => void
  onFeedback?: FeedbackFunc
  onRegenerate?: () => void
  disabled?: boolean
}

export default function AnswerActions({ item, onShare, onFeedback, onRegenerate, disabled }: Props) {
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const speech = useRef<SpeechSynthesisUtterance | null>(null)
  const mounted = useRef(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const text = formatAnswerSummary(item.content || (item.agent_thoughts || []).map(thought => thought.thought).filter(Boolean).join('\n\n'))

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (copyTimer.current) { clearTimeout(copyTimer.current) }
      // 仅清理本条回复启动的朗读，避免切换对话后继续播放。
      if (speech.current) {
        speech.current.onend = null
        speech.current.onerror = null
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const copyText = (value: string) => {
    if (!copy(value)) {
      Toast.notify({ type: 'error', message: '复制失败，请手动选择文字复制' })
      return false
    }
    setCopied(true)
    if (copyTimer.current) { clearTimeout(copyTimer.current) }
    copyTimer.current = setTimeout(() => { if (mounted.current) { setCopied(false) } }, 1800)
    return true
  }

  const rate = async (rating: 'like' | 'dislike') => {
    if (!onFeedback || busyRef.current) { return }
    busyRef.current = true
    setBusy(true)
    try { await onFeedback(item.id, { rating: item.feedback?.rating === rating ? null : rating }) }
    catch { Toast.notify({ type: 'error', message: '评价提交失败，请重试' }) }
    finally { busyRef.current = false; if (mounted.current) { setBusy(false) } }
  }

  const readAloud = () => {
    if (!('speechSynthesis' in window)) {
      Toast.notify({ type: 'info', message: '当前浏览器不支持朗读' })
      return
    }
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`>]/g, ''))
    utterance.lang = 'zh-CN'
    utterance.onend = () => { if (mounted.current) { setSpeaking(false) }; speech.current = null }
    utterance.onerror = (event) => {
      if (!mounted.current) { return }
      setSpeaking(false)
      speech.current = null
      if (event.error !== 'canceled' && event.error !== 'interrupted') { Toast.notify({ type: 'error', message: '朗读失败，请检查浏览器语音设置' }) }
    }
    speech.current = utterance
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className='knowledge-answer-actions' role='group' aria-label='回复操作'>
      <button title={copied ? '已复制' : '复制'} aria-label='复制回复' disabled={disabled || !text} onClick={() => copyText(text)}>{copied ? <CheckIcon /> : <DocumentDuplicateIcon />}</button>
      {onRegenerate && <button title='重新回答（保留原回复）' aria-label='重新回答' disabled={disabled || busy} onClick={onRegenerate}><ArrowPathIcon /></button>}
      <button title='赞' aria-label='赞' aria-pressed={item.feedback?.rating === 'like'} disabled={disabled || busy || !onFeedback} onClick={() => { void rate('like') }}><HandThumbUpIcon /></button>
      <button title='踩' aria-label='踩' aria-pressed={item.feedback?.rating === 'dislike'} disabled={disabled || busy || !onFeedback} onClick={() => { void rate('dislike') }}><HandThumbDownIcon /></button>
      <button title={speaking ? '停止朗读' : '朗读'} aria-label={speaking ? '停止朗读' : '朗读'} aria-pressed={speaking} disabled={disabled || !text} onClick={readAloud}>{speaking ? <StopIcon /> : <SpeakerWaveIcon />}</button>
      <button title='分享问答文字' aria-label='分享问答' disabled={disabled || busy || !text} onClick={onShare}><ShareIcon /></button>
    </div>
  )
}
