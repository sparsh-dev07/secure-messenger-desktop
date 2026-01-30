import db from './database'
import { SecurityService } from '../services/SecurityService'

const RANDOM_PHRASES = [
  "Hey, how's it going?",
  'Did you see the latest update?',
  "Let's catch up later today.",
  "I'm working on the secure messenger project.",
  'Everything looks good on my end.',
  'Can you send over the documents?',
  "I'll be there in 10 minutes.",
  'The performance is amazing with virtualization!',
  'SQLite is a great choice for this app.',
  'Security is our top priority.',
  'Have a great day!',
  'See you tomorrow at the office.',
  'Are you free for a quick call?',
  "I'm testing the real-time sync now.",
  'The encryption boundary works perfectly.',
]

export function seedData() {
  const chatCount = db.prepare('SELECT COUNT(*) as count FROM chats').get() as { count: number }
  if (chatCount.count > 0) return

  const insertChat = db.prepare(
    'INSERT INTO chats (id, title, lastMessageAt, unreadCount) VALUES (?, ?, ?, ?)',
  )
  const insertMessage = db.prepare(
    'INSERT INTO messages (id, chatId, ts, sender, body) VALUES (?, ?, ?, ?, ?)',
  )

  const chats = []
  const now = Date.now()
  for (let i = 0; i < 200; i++) {
    const chatId = `chat_${i}`
    const lastMessageAt = now - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30)
    chats.push({ id: chatId, lastMessageAt })
    insertChat.run(chatId, `Room ${i + 1}`, lastMessageAt, 0)
  }

  const transaction = db.transaction((messagesToInsert) => {
    for (const msg of messagesToInsert) {
      insertMessage.run(msg.id, msg.chatId, msg.ts, msg.sender, msg.body)
    }
  })

  const messages = []
  for (let i = 0; i < 20000; i++) {
    const chat = chats[Math.floor(Math.random() * chats.length)]
    const messageId = `msg_${i}`
    const ts = chat.lastMessageAt - Math.floor(Math.random() * 1000 * 60 * 60)
    const phrase = RANDOM_PHRASES[Math.floor(Math.random() * RANDOM_PHRASES.length)]
    const encryptedBody = SecurityService.encrypt(phrase)
    messages.push({
      id: messageId,
      chatId: chat.id,
      ts: ts,
      sender: i % 2 === 0 ? 'Alice' : 'Bob',
      body: encryptedBody,
    })

    if (messages.length >= 1000) {
      transaction(messages)
      messages.length = 0
    }
  }

  if (messages.length > 0) transaction(messages)
}
