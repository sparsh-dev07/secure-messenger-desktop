import { WebSocketServer, WebSocket } from 'ws'
import db from '../db/database'
import { SecurityService } from './SecurityService'
const LIVE_PHRASES = [
  "Hey! Did you see that?",
  "I'm just checking the new updates.",
  "That looks awesome, let me know when you're done.",
  "Sure thing! I'll ping you in a bit.",
  "How's the performance on your end?",
  "It's buttery smooth with the new virtualization.",
  "Great to hear! Let's sync up later.",
  "Is the database working as expected?",
  "Yes, SQLite is handling the load perfectly.",
  "Perfect. Talk to you soon!",
]
export class SyncServer {
  private wss: WebSocketServer | null = null
  private interval: NodeJS.Timeout | null = null
  constructor(port: number = 9988) {
    this.wss = new WebSocketServer({ port })
    this.wss.on('connection', (ws: WebSocket) => {
      ws.on('message', (message) => {
        if (message.toString() === 'ping') {
          ws.send('pong')
        }
      })
      ws.on('close', () => { })
    })
    this.startSimulation()
  }
  private startSimulation() {
    this.interval = setInterval(
      () => {
        if (!this.wss || this.wss.clients.size === 0) return
        const chats = db.prepare('SELECT id FROM chats').all() as { id: string }[]
        if (chats.length === 0) return
        const chat = chats[Math.floor(Math.random() * chats.length)]
        const messageId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        const ts = Date.now()
        const phrase = LIVE_PHRASES[Math.floor(Math.random() * LIVE_PHRASES.length)]
        const encryptedBody = SecurityService.encrypt(phrase)

        const sender = Math.random() > 0.5 ? 'Alice' : 'Bob'

        const updateEvent = {
          chatId: chat.id,
          messageId,
          ts,
          sender: sender,
          body: encryptedBody,
        }
        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(updateEvent))
          }
        })
      },
      Math.floor(Math.random() * 2000) + 1000,
    )
  }
  public stop() {
    if (this.interval) clearInterval(this.interval)
    if (this.wss) this.wss.close()
  }
  public forceDisconnectAll() {
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        client.close(1001, 'Simulated connection drop')
      })
    }
  }
}
