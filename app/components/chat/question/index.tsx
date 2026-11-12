'use client'
import type { FC } from 'react'
import React from 'react'
import type { IChatItem } from '../type'
import s from '../style.module.css'

import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import ImageGallery from '@/app/components/base/image-gallery'
import type { VisionFile } from '@/types/app'
import FileItem from '@/app/components/base/file-uploader-in-attachment/file-item'

type IQuestionProps = Pick<IChatItem, 'id' | 'content' | 'useCurrentUserAvatar'> & {
  files?: VisionFile[]
}

const Question: FC<IQuestionProps> = ({ id, content, useCurrentUserAvatar, files = [] }) => {
  const userName = ''
  const imgSrcs = files.filter(file => file.type === 'image' && file.url).map(file => file.url)
  return (
    <div className='flex items-start justify-end' key={id}>
      <div>
        <div className={`${s.question} relative text-sm text-gray-900`}>
          <div
            className={'mr-2 py-3 px-4 bg-blue-500 rounded-tl-2xl rounded-b-2xl'}
          >
            {imgSrcs && imgSrcs.length > 0 && (
              <ImageGallery srcs={imgSrcs} />
            )}
            <div className='knowledge-question-files'>
              {files.filter(file => file.type !== 'image').map(file => (
                <FileItem
                  key={file.id || file.upload_file_id || file.url}
                  file={{
                    id: file.id || file.upload_file_id || file.url,
                    name: file.name || file.filename || '已发送附件',
                    size: file.size || 0,
                    type: file.mime_type || '',
                    progress: 100,
                    transferMethod: file.transfer_method,
                    supportFileType: file.type,
                    uploadedId: file.upload_file_id || file.id,
                    url: file.url,
                  }}
                  showDownloadAction={!!file.url}
                />
              ))}
            </div>
            <StreamdownMarkdown content={content} />
          </div>
        </div>
      </div>
      {useCurrentUserAvatar
        ? (
          <div className='w-10 h-10 shrink-0 leading-10 text-center mr-2 rounded-full bg-primary-600 text-white'>
            {userName?.[0].toLocaleUpperCase()}
          </div>
        )
        : (
          <div className={`${s.questionIcon} w-10 h-10 shrink-0 `}></div>
        )}
    </div>
  )
}

export default React.memo(Question)
