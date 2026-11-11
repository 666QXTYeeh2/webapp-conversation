import React, { useState } from 'react'
import type { FC } from 'react'
import { ChatBubbleLeftIcon, MagnifyingGlassIcon, PlusIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { ConversationItem } from '@/types/app'

export interface ISidebarProps {
  copyRight: string
  currentId: string
  onCurrentIdChange: (id: string) => void
  list: ConversationItem[]
}

const Sidebar: FC<ISidebarProps> = ({ currentId, onCurrentIdChange, list }) => {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(true)
  const history = list.filter(item => item.id !== '-1')
  const filtered = history.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <aside className='knowledge-sidebar'>
      <div className='knowledge-brand'>知识问答</div>
      <div className='knowledge-status'><span />已就绪 · 知识库助手</div>
      <button className='knowledge-new' onClick={() => onCurrentIdChange('-1')}><PlusIcon />新建对话</button>
      <label className='knowledge-search'><MagnifyingGlassIcon /><input aria-label='搜索对话' placeholder='搜索对话' value={search} onChange={e => setSearch(e.target.value)} /></label>
      <button className='knowledge-history-title' onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>历史 <span>{history.length}</span><ChevronRightIcon style={{ transform: expanded ? 'rotate(90deg)' : undefined }} /></button>
      {expanded && <nav className='knowledge-history'>
        {filtered.map(item => <button key={item.id} className={item.id === currentId ? 'active' : ''} onClick={() => onCurrentIdChange(item.id)}><ChatBubbleLeftIcon /><span>{item.name}</span></button>)}
        {search && !filtered.length && <p>未找到相关对话</p>}
      </nav>}
    </aside>
  )
}
export default React.memo(Sidebar)
