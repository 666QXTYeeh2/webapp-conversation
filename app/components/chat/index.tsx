'use client'
import type { FC } from 'react'
import React, { useEffect, useRef } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import Textarea from 'rc-textarea'
import { ArrowUpIcon, BoltIcon, ChatBubbleLeftIcon, CircleStackIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Answer from './answer'
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

  const [query, setQuery] = React.useState('')
  const queryRef = useRef('')

  const handleContentChange = (e: any) => {
    const value = e.target.value
    setQuery(value)
    queryRef.current = value
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

  const handleKeyUp = (e: any) => {
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey && !isUseInputMethod.current) { handleSend() }
    }
  }

  const handleKeyDown = (e: any) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (e.code === 'Enter' && !e.shiftKey) {
      const result = query.replace(/\n$/, '')
      setQuery(result)
      queryRef.current = result
      e.preventDefault()
    }
  }

  const suggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    queryRef.current = suggestion
    handleSend()
  }

  return (
    <div className={cn('knowledge-chat', !feedbackDisabled && 'px-3.5')}>
      {!chatList.some(item => !item.isAnswer) && <section className='knowledge-welcome'>
        <div className='knowledge-welcome-icon'><SparklesIcon /></div>
        <h2>知识问答</h2>
        <p>从知识库里寻找答案，让每一个问题都有据可依。<br />清晰解答，帮助你更快找到所需信息。</p>
        <div className='knowledge-suggestions'>
          {['这个知识库主要包含哪些方面的内容？', '帮我梳理一下相关的流程和注意事项', '有哪些容易踩坑的细节？'].map(question => <button key={question} disabled={isResponding} onClick={() => suggestionClick(question)}><ChatBubbleLeftIcon /><span>{question}</span></button>)}
        </div>
      </section>}
      {/* Chat List */}
      <div className="knowledge-messages space-y-[30px]">
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return <Answer
              key={item.id}
              item={item}
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
              imgSrcs={(item.message_files && item.message_files?.length > 0) ? item.message_files.map(item => item.url) : []}
            />
          )
        })}
      </div>
      {
        !isHideSendInput && (
          <div className='knowledge-composer-wrap'>
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
                    <p className='mb-2 text-xs text-gray-500'>添加附件，与问题一起发送（最多 {fileConfig.number_limits || 1} 个）</p>
                    <FileUploaderInAttachmentWrapper
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
                value={query}
                onChange={handleContentChange}
                onKeyUp={handleKeyUp}
                onKeyDown={handleKeyDown}
                autoSize
              />
              <div className='knowledge-composer-actions'>
                {answerModes?.length
                  ? <label className='knowledge-mode'>
                    <BoltIcon />
                    <select aria-label='回答模式' title={canChangeAnswerMode ? '选择回答模式' : '当前对话的回答模式，新建对话可重新选择'} value={answerMode || ''} disabled={!canChangeAnswerMode || isResponding} onChange={e => onAnswerModeChange?.(e.target.value)}>
                      <option value=''>默认模式（快速问答）</option>
                      {answerModes.map(mode => <option key={mode} value={mode}>{mode}</option>)}
                    </select>
                  </label>
                  : <span className='knowledge-mode'><BoltIcon />快速问答</span>}
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
