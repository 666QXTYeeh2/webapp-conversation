import 'server-only'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export interface SharedMessage { role: 'user' | 'assistant', content: string }
export interface SharedConversation { messages: SharedMessage[], createdAt: string }
const directory = () => process.env.SHARE_STORAGE_DIR || path.join(process.cwd(), '.share-data')

export async function createShare(messages: SharedMessage[]) {
  const id = randomBytes(24).toString('hex')
  await mkdir(directory(), { recursive: true })
  // 保存不可猜测标识对应的文字快照，不暴露原对话身份、附件地址及后续消息。
  await writeFile(path.join(directory(), `${id}.json`), JSON.stringify({ messages, createdAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 })
  return id
}

export async function readShare(id: string): Promise<SharedConversation | null> {
  if (!/^[a-f0-9]{48}$/.test(id)) { return null }
  try { return JSON.parse(await readFile(path.join(directory(), `${id}.json`), 'utf8')) }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') { return null }
    throw error
  }
}
