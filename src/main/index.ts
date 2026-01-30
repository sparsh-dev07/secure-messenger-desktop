import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import db from './db/database'
import { seedData } from './db/seed'
import { SyncServer } from './services/SyncServer'
import { WebSocket } from 'ws'
import { SecurityService } from './services/SecurityService'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let syncServer: SyncServer | null = null
let wsClient: WebSocket | null = null
let reconnectTimeout: NodeJS.Timeout | null = null
let backoffDelay = 1000

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('db:getChats', (_, offset: number, limit: number) => {
  return db
    .prepare('SELECT * FROM chats ORDER BY lastMessageAt DESC LIMIT ? OFFSET ?')
    .all(limit, offset)
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
    .prepare('SELECT * FROM messages WHERE chatId = ? AND body LIKE ? ORDER BY ts DESC LIMIT ?')
    .all(chatId, `%${SecurityService.encrypt(query)}%`, limit) as any[]

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

function connectToSyncServer() {
  if (wsClient) wsClient.close()

  wsClient = new WebSocket('ws://localhost:9988')

  wsClient.on('open', () => {
    backoffDelay = 1000
    mainWindow?.webContents.send('ws:status', 'connected')
  })

  wsClient.on('message', (data) => {
    const event = JSON.parse(data.toString())

    const insertMessage = db.prepare(
      'INSERT INTO messages (id, chatId, ts, sender, body) VALUES (?, ?, ?, ?, ?)',
    )
    insertMessage.run(event.messageId, event.chatId, event.ts, event.sender, event.body)

    db.prepare(
      'UPDATE chats SET lastMessageAt = ?, unreadCount = unreadCount + 1 WHERE id = ?',
    ).run(event.ts, event.chatId)

    mainWindow?.webContents.send('ws:newMessage', {
      ...event,
      body: SecurityService.decrypt(event.body),
    })
  })

  wsClient.on('close', () => {
    mainWindow?.webContents.send('ws:status', 'reconnecting')

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

app.whenReady().then(() => {
  seedData()
  syncServer = new SyncServer(9988)
  createWindow()
  connectToSyncServer()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
  if (syncServer) syncServer.stop()
})
