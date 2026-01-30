import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { WebSocket } from 'ws'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import db from '../src/main/db/database'
import { seedData } from '../src/main/db/seed'
import { SyncServer } from '../src/main/services/SyncServer'
import { SecurityService } from '../src/main/services/SecurityService'

const appRoot = path.join(__dirname, '..')
process.env.APP_ROOT = appRoot

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(appRoot, 'dist-electron')
export const RENDERER_DIST = path.join(appRoot, 'dist')

const vitePublic = VITE_DEV_SERVER_URL ? path.join(appRoot, 'public') : RENDERER_DIST
process.env.VITE_PUBLIC = vitePublic

let win: BrowserWindow | null
let syncServer: SyncServer | null = null
let wsClient: WebSocket | null = null
let reconnectTimeout: NodeJS.Timeout | null = null
let heartbeatInterval: NodeJS.Timeout | null = null
let backoffDelay = 1000

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(vitePublic, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

ipcMain.handle('db:getChats', (_, offset: number, limit: number) => {
  const chats = db
    .prepare('SELECT * FROM chats ORDER BY lastMessageAt DESC LIMIT ? OFFSET ?')
    .all(limit, offset)
  return chats
})

ipcMain.handle('db:getMessages', (_, chatId: string, offset: number, limit: number) => {
  const rows = db
    .prepare('SELECT * FROM messages WHERE chatId = ? ORDER BY ts DESC LIMIT ? OFFSET ?')
    .all(chatId, limit, offset) as any[]
  return rows.map((r) => ({
    ...r,
    body: SecurityService.decrypt(r.body),
  }))
})

ipcMain.handle('db:searchMessages', (_, chatId: string, query: string, limit: number) => {
  const rows = db
    .prepare('SELECT * FROM messages WHERE chatId = ? AND decrypt(body) LIKE ? ORDER BY ts DESC LIMIT ?')
    .all(chatId, `%${query}%`, limit) as any[]
  return rows.map((r) => ({
    ...r,
    body: SecurityService.decrypt(r.body),
  }))
})

ipcMain.handle('db:markAsRead', (_, chatId: string) => {
  return db.prepare('UPDATE chats SET unreadCount = 0 WHERE id = ?').run(chatId)
})

ipcMain.on('ws:simulateDisconnect', () => {
  if (syncServer) syncServer.forceDisconnectAll()
})

ipcMain.on('ws:reconnect', () => {
  backoffDelay = 1000
  connectToSyncServer()
})

ipcMain.handle('ws:getStatus', () => {
  return wsClient && wsClient.readyState === WebSocket.OPEN ? 'connected' : 'offline'
})

function connectToSyncServer() {
  if (wsClient) wsClient.close()

  wsClient = new WebSocket('ws://localhost:9988')

  wsClient.on('open', () => {
    backoffDelay = 1000
    win?.webContents.send('ws:status', 'connected')

    if (heartbeatInterval) clearInterval(heartbeatInterval)
    heartbeatInterval = setInterval(() => {
      if (wsClient?.readyState === WebSocket.OPEN) {
        wsClient.send('ping')
      }
    }, 10000)
  })

  wsClient.on('message', (data) => {
    const rawData = data.toString()
    if (rawData === 'pong') return

    const event = JSON.parse(rawData)
    const insertMessage = db.prepare(
      'INSERT INTO messages (id, chatId, ts, sender, body) VALUES (?, ?, ?, ?, ?)',
    )
    insertMessage.run(event.messageId, event.chatId, event.ts, event.sender, event.body)
    db.prepare(
      'UPDATE chats SET lastMessageAt = ?, unreadCount = unreadCount + 1 WHERE id = ?',
    ).run(event.ts, event.chatId)

    win?.webContents.send('ws:newMessage', {
      ...event,
      body: SecurityService.decrypt(event.body),
    })
  })

  wsClient.on('close', () => {
    win?.webContents.send('ws:status', 'reconnecting')

    if (heartbeatInterval) clearInterval(heartbeatInterval)
    if (reconnectTimeout) clearTimeout(reconnectTimeout)

    reconnectTimeout = setTimeout(() => {
      connectToSyncServer()
      backoffDelay = Math.min(backoffDelay * 2, 30000)
    }, backoffDelay)
  })

  wsClient.on('error', (err) => {
    console.error('WS Error:', err.message)
    wsClient?.close()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
  if (syncServer) syncServer.stop()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  seedData()
  syncServer = new SyncServer(9988)
  createWindow()
  connectToSyncServer()
})
