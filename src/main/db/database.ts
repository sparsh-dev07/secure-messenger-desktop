import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'
import { SecurityService } from '../services/SecurityService'

const dbPath = path.join(app.getPath('userData'), 'messenger.db')
if (!fs.existsSync(app.getPath('userData'))) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true })
}
const db = new Database(dbPath)

db.function('decrypt', (cipherText: string) => {
  return SecurityService.decrypt(cipherText)
})

db.exec(`
  CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    lastMessageAt INTEGER NOT NULL,
    unreadCount INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chatId TEXT NOT NULL,
    ts INTEGER NOT NULL,
    sender TEXT NOT NULL,
    body TEXT NOT NULL,
    FOREIGN KEY (chatId) REFERENCES chats(id)
  );

  -- Index on (chatId, ts) for efficient message history retrieval and pagination
  CREATE INDEX IF NOT EXISTS idx_messages_chatId_ts ON messages(chatId, ts DESC);

  -- Index on lastMessageAt for sorting chats by most recent activity
  CREATE INDEX IF NOT EXISTS idx_chats_lastMessageAt ON chats(lastMessageAt DESC);
`)
export default db
