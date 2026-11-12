import React, { useEffect, useRef, useState } from 'react'
import type { FC } from 'react'
import { Dialog, DialogPanel, DialogTitle, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ArrowRightStartOnRectangleIcon, ChatBubbleLeftIcon, Cog6ToothIcon, DevicePhoneMobileIcon, EllipsisHorizontalIcon, MagnifyingGlassIcon, PlusIcon, ChevronRightIcon, QuestionMarkCircleIcon, QueueListIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { ConversationItem } from '@/types/app'
import { APP_ID } from '@/config'
import Toast from '@/app/components/base/toast'

export interface ISidebarProps {
  copyRight: string
  currentId: string
  onCurrentIdChange: (id: string) => void
  list: ConversationItem[]
  onDeleted: (ids: string[]) => void
}

const USER_MENU_ITEMS = [
  { label: '下载手机应用', icon: DevicePhoneMobileIcon },
  { label: '系统设置', icon: Cog6ToothIcon },
  { label: '帮助与反馈', icon: QuestionMarkCircleIcon },
  { label: '退出登录', icon: ArrowRightStartOnRectangleIcon },
]

const Sidebar: FC<ISidebarProps> = ({ currentId, onCurrentIdChange, onDeleted, list }) => {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(true)
  const [managing, setManaging] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [pinned, setPinned] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deletingRef = useRef(false)
  const mounted = useRef(false)
  const pinStorageKey = `conversation-pins:${APP_ID}`
  useEffect(() => {
    mounted.current = true
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(pinStorageKey) || '[]')
      if (Array.isArray(saved) && saved.every((id: unknown) => typeof id === 'string')) { setPinned(saved) }
    }
    catch { /* 本地缓存不可读时仍可正常管理对话。 */ }
    return () => { mounted.current = false }
  }, [pinStorageKey])
  const savePins = (ids: string[]) => {
    try {
      localStorage.setItem(pinStorageKey, JSON.stringify(ids))
      setPinned(ids)
    }
    catch { Toast.notify({ type: 'error', message: '无法保存置顶，请检查浏览器存储设置' }) }
  }
  const deleteSelected = async () => {
    if (deletingRef.current || !selected.length) { return }
    setConfirmDelete(false)
    deletingRef.current = true
    setDeleting(true)
    const targets = [...selected]
    try {
      // 部分删除失败时仅移除成功项，失败项保留选中以便重试。
      const results = await Promise.allSettled(targets.map(async (id) => {
        const response = await fetch(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' })
        if (!response.ok) { throw new Error('删除失败') }
        return id
      }))
      const deleted = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
      onDeleted(deleted)
      if (!mounted.current) { return }
      setSelected(targets.filter(id => !deleted.includes(id)))
      savePins(pinned.filter(id => !deleted.includes(id)))
      if (deleted.length !== targets.length) { Toast.notify({ type: 'error', message: `有 ${targets.length - deleted.length} 个对话删除失败，请重试` }) }
      else { setManaging(false) }
    }
    finally {
      deletingRef.current = false
      if (mounted.current) { setDeleting(false) }
    }
  }
  const history = list.filter(item => item.id !== '-1')
  const filtered = history.filter(item => item.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(pinned.includes(b.id)) - Number(pinned.includes(a.id)))
  const selectedIds = selected.filter(id => history.some(item => item.id === id))
  const allPinned = selectedIds.length > 0 && selectedIds.every(id => pinned.includes(id))
  return (
    <aside className='knowledge-sidebar'>
      <div className='knowledge-sidebar-content'>
        <div className='knowledge-brand'>知识问答</div>
        <div className='knowledge-status'><span />已就绪 · 知识库助手</div>
        <button className='knowledge-new' onClick={() => onCurrentIdChange('-1')}><PlusIcon />新建对话</button>
        <label className='knowledge-search'><MagnifyingGlassIcon /><input aria-label='搜索对话' placeholder='搜索对话' value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className='knowledge-history-toolbar'>
          <button className='knowledge-history-title' onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{managing ? `已选择 ${selectedIds.length} 个对话` : '历史'} <span>{history.length}</span><ChevronRightIcon /></button>
          <button className='knowledge-history-manage' disabled={deleting} title={managing ? '退出多选' : '多选管理'} aria-label={managing ? '退出多选' : '多选管理'} onClick={() => { setManaging(!managing); setSelected([]); setExpanded(true) }}>{managing ? <XMarkIcon aria-hidden='true' /> : <QueueListIcon aria-hidden='true' />}</button>
        </div>
        {expanded && <nav className='knowledge-history'>
          {filtered.map(item => managing
            ? <label key={item.id} className='knowledge-history-select'><input type='checkbox' checked={selectedIds.includes(item.id)} disabled={deleting} onChange={e => setSelected(previous => e.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id))} /><span>{item.name}</span>{pinned.includes(item.id) && <small>置顶</small>}</label>
            : <button key={item.id} className={item.id === currentId ? 'active' : ''} onClick={() => onCurrentIdChange(item.id)}><ChatBubbleLeftIcon /><span>{item.name}</span>{pinned.includes(item.id) && <small>置顶</small>}</button>)}
          {search && !filtered.length && <p>未找到相关对话</p>}
        </nav>}
      </div>
      {managing && <div className='knowledge-history-actions'>
        <button disabled={!selectedIds.length || deleting} onClick={() => savePins(allPinned ? pinned.filter(id => !selectedIds.includes(id)) : [...new Set([...pinned, ...selectedIds])])}>{allPinned ? '取消置顶' : '置顶'}</button>
        <button className='knowledge-history-delete' disabled={!selectedIds.length || deleting} onClick={() => setConfirmDelete(true)}>{deleting ? '删除中…' : '删除'}</button>
      </div>}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} className='knowledge-delete-dialog'>
        <div className='knowledge-delete-backdrop' />
        <div className='knowledge-delete-position'>
          <DialogPanel className='knowledge-delete-panel'>
            <DialogTitle>删除对话</DialogTitle>
            <p>确定删除选中的 {selectedIds.length} 个对话？删除后无法恢复。</p>
            <div className='knowledge-history-actions'>
              <button onClick={() => setConfirmDelete(false)}>取消</button>
              <button className='knowledge-history-delete' onClick={() => { void deleteSelected() }}>确认删除</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
      {/* 账户入口固定在侧栏底部，历史列表独立滚动，菜单不触发账户操作。 */}
      <Menu as='div' className='knowledge-user-menu'>
        <MenuButton className='knowledge-user-trigger' aria-label='打开用户菜单'>
          <span className='knowledge-user-avatar'><UserIcon aria-hidden='true' /></span>
          <span className='knowledge-user-name'>访客用户</span>
          <EllipsisHorizontalIcon className='knowledge-user-more' aria-hidden='true' />
        </MenuButton>
        <MenuItems className='knowledge-user-options'>
          {USER_MENU_ITEMS.map(({ label, icon: Icon }) => (
            <MenuItem key={label}>
              {({ focus, close }) => (
                <button type='button' className={`knowledge-user-option${focus ? ' knowledge-user-option-focused' : ''}`} onClick={() => close()}>
                  <Icon aria-hidden='true' /><span>{label}</span>
                </button>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      </Menu>
    </aside>
  )
}
export default React.memo(Sidebar)
