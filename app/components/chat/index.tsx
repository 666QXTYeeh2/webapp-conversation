'use client'
import type { FC } from 'react'
import React, { useEffect, useId, useRef } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import Textarea from 'rc-textarea'
import { ArrowUpIcon, BoltIcon, ChatBubbleLeftIcon, CircleStackIcon, CpuChipIcon, PaperClipIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Answer from './answer'
import ShareDialog from './share-dialog'
import Question from './question'
import type { FeedbackFunc } from './type'
import type { ChatItem, VisionFile, VisionSettings } from '@/types/app'
import { TransferMethod } from '@/types/app'
import Toast from '@/app/components/base/toast'
import ChatImageUploader from '@/app/components/base/image-uploader/chat-image-uploader'
import ImageList from '@/app/components/base/image-uploader/image-list'
import { useImageFiles } from '@/app/components/base/image-uploader/hooks'
import FileUploaderInAttachmentWrapper from '@/app/components/base/file-uploader-in-attachment'
import type { FileEntity, FileUpload } from '@/app/components/base/file-uploader-in-attachment/types'
import { fileIsUploaded, getProcessedFiles } from '@/app/components/base/file-uploader-in-attachment/utils'

const DEFAULT_QUICK_QUESTIONS = ['这个知识库主要包含哪些方面的内容？', '帮我梳理一下相关的流程和注意事项', '有哪些容易踩坑的细节？']

export interface IChatProps {
  answerModes?: string[]
  answerMode?: string
  canChangeAnswerMode?: boolean
  onAnswerModeChange?: (mode: string) => void
  chatList: ChatItem[]
  /**
   * Whether to display the editing area and rating status
   */
  feedbackDisabled?: boolean
  /**
   * Whether to display the input area
   */
  isHideSendInput?: boolean
  onFeedback?: FeedbackFunc
  checkCanSend?: () => boolean
  onSend?: (message: string, files: VisionFile[]) => void
  useCurrentUserAvatar?: boolean
  isResponding?: boolean
  controlClearQuery?: number
  visionConfig?: VisionSettings
  fileConfig?: FileUpload
}

const Chat: FC<IChatProps> = ({
  chatList,
  answerModes,
  answerMode,
  canChangeAnswerMode,
  onAnswerModeChange,
  feedbackDisabled = false,
  isHideSendInput = false,
  onFeedback,
  checkCanSend,
  onSend = () => { },
  useCurrentUserAvatar,
  isResponding,
  controlClearQuery,
  visionConfig,
  fileConfig,
}) => {
  const { t } = useTranslation()
  const { notify } = Toast
  const isUseInputMethod = useRef(false)

  const [shareId, setShareId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  const queryRef = useRef('')
  const [quickQuestions, setQuickQuestions] = React.useState<string[]>([])
  const [inputSuggestions, setInputSuggestions] = React.useState<string[]>([])
  const [inputFocused, setInputFocused] = React.useState(false)
  const [suggestionsDismissed, setSuggestionsDismissed] = React.useState(false)
  const [activeSuggestion, setActiveSuggestion] = React.useState(-1)
  const suggestionListId = useId()
  const handledSuggestionEnter = useRef(false)
  const showInputSuggestions = inputFocused && !suggestionsDismissed && !isResponding && !!query.trim() && inputSuggestions.length > 0

  useEffect(() => {
    // 复用配置中心的问题库，在输入停止后匹配，避免每次按键调用工作流。
    const timer = setTimeout(() => {
      const keywords = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
      setInputSuggestions(keywords.length
        ? quickQuestions.filter(question => keywords.every(keyword => question.toLocaleLowerCase().includes(keyword)) && question.trim() !== query.trim()).slice(0, 5)
        : [])
      setActiveSuggestion(-1)
    }, 150)
    return () => clearTimeout(timer)
  }, [query, quickQuestions])

  useEffect(() => {
    const controller = new AbortController()
    const loadQuickQuestions = async () => {
      try {
        const response = await fetch('/api/quick-questions', { signal: controller.signal, cache: 'no-store' })
        if (!response.ok)
        { throw new Error('问题配置获取失败') }
        const result: unknown = await response.json()
        if (typeof result !== 'object' || result === null || !('quick_questions' in result))
        { throw new Error('问题配置格式无效') }
        const questions: unknown = result.quick_questions
        if (!Array.isArray(questions) || !questions.length || !questions.every((question: unknown) => typeof question === 'string' && question.trim()))
        { throw new Error('问题配置为空或格式无效') }
        if (!controller.signal.aborted)
        { setQuickQuestions([...new Set((questions as string[]).map(question => question.trim()))]) }
      }
      catch {
        // 加载期间不展示默认问题，仅确认无法获取配置后兜底，卸载取消不更新状态。
        if (!controller.signal.aborted)
        { setQuickQuestions(DEFAULT_QUICK_QUESTIONS) }
      }
    }
    void loadQuickQuestions()
    return () => controller.abort()
  }, [])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setQuery(value)
    queryRef.current = value
    setInputSuggestions([])
    setActiveSuggestion(-1)
    setSuggestionsDismissed(false)
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const valid = () => {
    const query = queryRef.current
    if (!query || query.trim() === '') {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  useEffect(() => {
    if (controlClearQuery) {
      setQuery('')
      queryRef.current = ''
    }
  }, [controlClearQuery])
  const {
    files,
    onUpload,
    onRemove,
    onReUpload,
    onImageLinkLoadError,
    onImageLinkLoadSuccess,
    onClear,
  } = useImageFiles()

  const [attachmentFiles, setAttachmentFiles] = React.useState<FileEntity[]>([])

  const handleSend = () => {
    if (isResponding || !valid() || (checkCanSend && !checkCanSend())) { return }
    if (files.some(file => file.progress === -1) || attachmentFiles.some(file => file.progress === -1)) {
      logError('有文件上传失败，请重试或移除后再发送')
      return
    }
    const hasPendingImageUploads = files.some(file => file.progress !== -1 && (file.progress < 100 || !file.fileId))
    const hasPendingAttachmentUploads = attachmentFiles.some(file => !fileIsUploaded(file))
    if (hasPendingImageUploads || hasPendingAttachmentUploads) {
      logError(t('app.errorMessage.waitForFileUpload'))
      return
    }
    const imageFiles: VisionFile[] = files.filter(file => file.progress !== -1).map(fileItem => ({
      type: 'image',
      transfer_method: fileItem.type,
      url: fileItem.url,
      upload_file_id: fileItem.fileId,
    }))
    const docAndOtherFiles: VisionFile[] = getProcessedFiles(attachmentFiles)
    const combinedFiles: VisionFile[] = [...imageFiles, ...docAndOtherFiles]
    onSend(queryRef.current, combinedFiles)
    if (!files.find(item => item.type === TransferMethod.local_file && !item.fileId)) {
      if (files.length) { onClear() }
      if (!isResponding) {
        setQuery('')
        queryRef.current = ''
      }
    }
    if (!attachmentFiles.find(item => item.transferMethod === TransferMethod.local_file && !item.uploadedId)) { setAttachmentFiles([]) }
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 选择提示使用的回车不再触发发送，避免填入后立即提交。
    if (e.code === 'Enter' && handledSuggestionEnter.current) {
      handledSuggestionEnter.current = false
      return
    }
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey && !isUseInputMethod.current) { handleSend() }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (isUseInputMethod.current) { return }
    if (showInputSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setActiveSuggestion(current => e.key === 'ArrowDown'
        ? (current + 1) % inputSuggestions.length
        : (current <= 0 ? inputSuggestions.length - 1 : current - 1))
      return
    }
    if (showInputSuggestions && e.key === 'Escape') {
      e.preventDefault()
      setSuggestionsDismissed(true)
      return
    }
    if (showInputSuggestions && activeSuggestion >= 0 && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handledSuggestionEnter.current = true
      selectInputSuggestion(inputSuggestions[activeSuggestion])
      return
    }
    if (e.code === 'Enter' && !e.shiftKey) {
      const result = query.replace(/\n$/, '')
      setQuery(result)
      queryRef.current = result
      e.preventDefault()
    }
  }

  const selectInputSuggestion = (question: string) => {
    setQuery(question)
    queryRef.current = question
    setSuggestionsDismissed(true)
    setActiveSuggestion(-1)
  }

  const suggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    queryRef.current = suggestion
    handleSend()
  }

  return (
    <div className={cn('knowledge-chat', !feedbackDisabled && 'px-3.5')}>
      {shareId && <ShareDialog messages={chatList.filter(message => !message.feedbackDisabled && message.content.trim())} initialId={shareId} onClose={() => setShareId(null)} />}
      {!chatList.some(item => !item.isAnswer) && <section className='knowledge-welcome'>
        <div className='knowledge-welcome-icon'><SparklesIcon /></div>
        <h2>知识问答</h2>
        <p>从知识库里寻找答案，让每一个问题都有据可依。<br />清晰解答，帮助你更快找到所需信息。</p>
        <div className='knowledge-suggestions'>
          {quickQuestions.map(question => <button key={question} disabled={isResponding} onClick={() => suggestionClick(question)}><ChatBubbleLeftIcon /><span>{question}</span></button>)}
        </div>
      </section>}
      {/* Chat List */}
      <div className="knowledge-messages space-y-[30px]">
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            const question = chatList.slice(0, chatList.indexOf(item)).findLast(message => !message.isAnswer)
            return <Answer
              key={item.id}
              item={item}
              onShare={() => setShareId(item.id)}
              actionsDisabled={isResponding}
              onRegenerate={isLast && question
                ? () => {
                // 复用本轮问题及附件重新请求，保留原回答供用户对照。
                  if (!isResponding && (!checkCanSend || checkCanSend())) { onSend(question.content, question.message_files || []) }
                }
                : undefined}
              feedbackDisabled={feedbackDisabled}
              onFeedback={onFeedback}
              isResponding={isResponding && isLast}
              suggestionClick={suggestionClick}
            />
          }
          return (
            <Question
              key={item.id}
              id={item.id}
              content={item.content}
              useCurrentUserAvatar={useCurrentUserAvatar}
              files={item.message_files}
            />
          )
        })}
      </div>
      {
        !isHideSendInput && (
          <div className='knowledge-composer-wrap'>
            {showInputSuggestions && (
              <div className='knowledge-input-suggestions'>
                <div className='knowledge-input-suggestions-heading'>你可能想问<span>↑ ↓ 选择 · Enter 填入 · Esc 关闭</span></div>
                <div id={suggestionListId} role='listbox' aria-label='问题提示'>
                  {inputSuggestions.map((question, index) => (
                    <button
                      key={question}
                      id={`${suggestionListId}-${index}`}
                      type='button'
                      role='option'
                      tabIndex={-1}
                      aria-selected={activeSuggestion === index}
                      className={cn('knowledge-input-suggestion', activeSuggestion === index && 'knowledge-input-suggestion-active')}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => selectInputSuggestion(question)}
                    >
                      <ChatBubbleLeftIcon aria-hidden='true' /><span>{question}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className='knowledge-composer'>
              <div className='knowledge-scope'><CircleStackIcon /><span>检索范围</span><strong>当前应用关联的知识库</strong></div>
              {
                visionConfig?.enabled && (
                  <>
                    <div className='absolute bottom-2 left-2 flex items-center'>
                      <ChatImageUploader
                        settings={visionConfig}
                        onUpload={onUpload}
                        disabled={files.length >= visionConfig.number_limits}
                      />
                      <div className='mx-1 w-[1px] h-4 bg-black/5' />
                    </div>
                    <div className='pl-[52px]'>
                      <ImageList
                        list={files}
                        onRemove={onRemove}
                        onReUpload={onReUpload}
                        onImageLinkLoadSuccess={onImageLinkLoadSuccess}
                        onImageLinkLoadError={onImageLinkLoadError}
                      />
                    </div>
                  </>
                )
              }
              {
                fileConfig?.enabled && (
                  <div className='knowledge-attachments'>
                    <FileUploaderInAttachmentWrapper
                      compact
                      fileConfig={{ ...fileConfig, allowed_file_upload_methods: fileConfig.allowed_file_upload_methods?.filter(method => method === TransferMethod.local_file) }}
                      value={attachmentFiles}
                      onChange={setAttachmentFiles}
                    />
                  </div>
                )
              }
              <Textarea
                className={`
                  block w-full px-2 pr-[118px] py-[7px] leading-5 max-h-none text-base text-gray-700 outline-none appearance-none resize-none
                  ${visionConfig?.enabled && 'pl-12'}
                `}
                placeholder='输入你的问题，例如：这个项目的验收需要哪些材料？'
                aria-label='输入你的问题'
                aria-autocomplete='list'
                aria-controls={showInputSuggestions ? suggestionListId : undefined}
                aria-activedescendant={showInputSuggestions && activeSuggestion >= 0 ? `${suggestionListId}-${activeSuggestion}` : undefined}
                onFocus={() => setInputFocused(true)}
                onBlur={() => { setInputFocused(false); handledSuggestionEnter.current = false }}
                value={query}
                onChange={handleContentChange}
                onKeyUp={handleKeyUp}
                onKeyDown={handleKeyDown}
                autoSize
              />
              <div className='knowledge-composer-actions'>
                {answerModes?.length
                  ? <div className='knowledge-mode-switch' role='group' aria-label='回答模式'>
                    {/* 空值默认快速问答，旧版详细分析归入智能推理，界面只保留两种模式。 */}
                    {['快速问答', '智能推理'].map((mode) => {
                      const currentMode = answerMode === '智能推理' || answerMode === '详细分析' ? '智能推理' : '快速问答'
                      const selected = currentMode === mode
                      return (
                        <button
                          key={mode}
                          type='button'
                          className={cn('knowledge-mode-option', selected && 'knowledge-mode-option-active')}
                          aria-pressed={selected}
                          title='已有对话切换模式会开启新对话'
                          disabled={!canChangeAnswerMode || isResponding || !answerModes.includes(mode)}
                          onClick={() => { if (!selected) { onAnswerModeChange?.(mode) } }}
                        >
                          {mode === '快速问答' ? <BoltIcon /> : <CpuChipIcon />}
                          <span>{mode}</span>
                        </button>
                      )
                    })}
                  </div>
                  : <button className='knowledge-mode' onClick={() => notify({ type: 'info', message: '当前应用没有发布回答模式选项，请在 Dify 发布包含 answer_mode 的流程后刷新页面' })}><BoltIcon />快速问答 ▾</button>}
                {!fileConfig?.enabled && <button className='knowledge-attach-button' onClick={() => notify({ type: 'info', message: '当前 Dify 应用未开启文件上传，请在 Dify 功能设置中启用文件上传并发布，然后刷新页面' })}><PaperClipIcon />上传附件</button>}
                <button className='knowledge-send' aria-label='发送消息' disabled={isResponding || !query.trim()} onClick={handleSend}><ArrowUpIcon /></button>
              </div>
              <div className='knowledge-composer-footer'><span>Enter 发送 · Shift + Enter 换行</span><span>内容由 AI 生成，仅供参考</span></div>
            </div>
          </div>
        )
      }
    </div>
  )
}

export default React.memo(Chat)
