var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, ipcMain, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
class SecurityService {
  static encrypt(text) {
    return Buffer.from(text).toString("base64");
  }
  static decrypt(cipherText) {
    try {
      return Buffer.from(cipherText, "base64").toString("utf8");
    } catch (e) {
      return "[Decryption Error]";
    }
  }
  static sanitizeForLog(data) {
    if (typeof data === "string") return "[REDACTED]";
    if (data && typeof data === "object") {
      const sanitized = { ...data };
      if ("body" in sanitized) sanitized.body = "[REDACTED]";
      return sanitized;
    }
    return data;
  }
}
const dbPath = path.join(app.getPath("userData"), "messenger.db");
if (!fs.existsSync(app.getPath("userData"))) {
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
}
const db = new Database(dbPath);
db.function("decrypt", (cipherText) => {
  return SecurityService.decrypt(cipherText);
});
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
`);
const RANDOM_PHRASES = [
  "Hey, how's it going?",
  "Did you see the latest update?",
  "Let's catch up later today.",
  "I'm working on the secure messenger project.",
  "Everything looks good on my end.",
  "Can you send over the documents?",
  "I'll be there in 10 minutes.",
  "The performance is amazing with virtualization!",
  "SQLite is a great choice for this app.",
  "Security is our top priority.",
  "Have a great day!",
  "See you tomorrow at the office.",
  "Are you free for a quick call?",
  "I'm testing the real-time sync now.",
  "The encryption boundary works perfectly."
];
function seedData() {
  const chatCount = db.prepare("SELECT COUNT(*) as count FROM chats").get();
  if (chatCount.count > 0) return;
  const insertChat = db.prepare(
    "INSERT INTO chats (id, title, lastMessageAt, unreadCount) VALUES (?, ?, ?, ?)"
  );
  const insertMessage = db.prepare(
    "INSERT INTO messages (id, chatId, ts, sender, body) VALUES (?, ?, ?, ?, ?)"
  );
  const chats = [];
  const now = Date.now();
  for (let i = 0; i < 200; i++) {
    const chatId = `chat_${i}`;
    const lastMessageAt = now - Math.floor(Math.random() * 1e3 * 60 * 60 * 24 * 30);
    chats.push({ id: chatId, lastMessageAt });
    insertChat.run(chatId, `Room ${i + 1}`, lastMessageAt, 0);
  }
  const transaction = db.transaction((messagesToInsert) => {
    for (const msg of messagesToInsert) {
      insertMessage.run(msg.id, msg.chatId, msg.ts, msg.sender, msg.body);
    }
  });
  const messages = [];
  for (let i = 0; i < 2e4; i++) {
    const chat = chats[Math.floor(Math.random() * chats.length)];
    const messageId = `msg_${i}`;
    const ts = chat.lastMessageAt - Math.floor(Math.random() * 1e3 * 60 * 60);
    const phrase = RANDOM_PHRASES[Math.floor(Math.random() * RANDOM_PHRASES.length)];
    const encryptedBody = SecurityService.encrypt(phrase);
    messages.push({
      id: messageId,
      chatId: chat.id,
      ts,
      sender: i % 2 === 0 ? "Alice" : "Bob",
      body: encryptedBody
    });
    if (messages.length >= 1e3) {
      transaction(messages);
      messages.length = 0;
    }
  }
  if (messages.length > 0) transaction(messages);
}
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
  "Perfect. Talk to you soon!"
];
class SyncServer {
  constructor(port = 9988) {
    __publicField(this, "wss", null);
    __publicField(this, "interval", null);
    this.wss = new WebSocketServer({ port });
    this.wss.on("connection", (ws) => {
      ws.on("message", (message) => {
        if (message.toString() === "ping") {
          ws.send("pong");
        }
      });
      ws.on("close", () => {
      });
    });
    this.startSimulation();
  }
  startSimulation() {
    this.interval = setInterval(
      () => {
        if (!this.wss || this.wss.clients.size === 0) return;
        const chats = db.prepare("SELECT id FROM chats").all();
        if (chats.length === 0) return;
        const chat = chats[Math.floor(Math.random() * chats.length)];
        const messageId = `msg_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
        const ts = Date.now();
        const phrase = LIVE_PHRASES[Math.floor(Math.random() * LIVE_PHRASES.length)];
        const encryptedBody = SecurityService.encrypt(phrase);
        const sender = Math.random() > 0.5 ? "Alice" : "Bob";
        const updateEvent = {
          chatId: chat.id,
          messageId,
          ts,
          sender,
          body: encryptedBody
        };
        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(updateEvent));
          }
        });
      },
      Math.floor(Math.random() * 2e3) + 1e3
    );
  }
  stop() {
    if (this.interval) clearInterval(this.interval);
    if (this.wss) this.wss.close();
  }
  forceDisconnectAll() {
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        client.close(1001, "Simulated connection drop");
      });
    }
  }
}
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
const appRoot = path$1.join(__dirname$1, "..");
process.env.APP_ROOT = appRoot;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(appRoot, "dist-electron");
const RENDERER_DIST = path$1.join(appRoot, "dist");
const vitePublic = VITE_DEV_SERVER_URL ? path$1.join(appRoot, "public") : RENDERER_DIST;
process.env.VITE_PUBLIC = vitePublic;
let win;
let syncServer = null;
let wsClient = null;
let reconnectTimeout = null;
let heartbeatInterval = null;
let backoffDelay = 1e3;
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path$1.join(vitePublic, "electron-vite.svg"),
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.handle("db:getChats", (_, offset, limit) => {
  const chats = db.prepare("SELECT * FROM chats ORDER BY lastMessageAt DESC LIMIT ? OFFSET ?").all(limit, offset);
  return chats;
});
ipcMain.handle("db:getMessages", (_, chatId, offset, limit) => {
  const rows = db.prepare("SELECT * FROM messages WHERE chatId = ? ORDER BY ts DESC LIMIT ? OFFSET ?").all(chatId, limit, offset);
  return rows.map((r) => ({
    ...r,
    body: SecurityService.decrypt(r.body)
  }));
});
ipcMain.handle("db:searchMessages", (_, chatId, query, limit) => {
  const rows = db.prepare("SELECT * FROM messages WHERE chatId = ? AND decrypt(body) LIKE ? ORDER BY ts DESC LIMIT ?").all(chatId, `%${query}%`, limit);
  return rows.map((r) => ({
    ...r,
    body: SecurityService.decrypt(r.body)
  }));
});
ipcMain.handle("db:markAsRead", (_, chatId) => {
  return db.prepare("UPDATE chats SET unreadCount = 0 WHERE id = ?").run(chatId);
});
ipcMain.on("ws:simulateDisconnect", () => {
  if (syncServer) syncServer.forceDisconnectAll();
});
ipcMain.on("ws:reconnect", () => {
  backoffDelay = 1e3;
  connectToSyncServer();
});
ipcMain.handle("ws:getStatus", () => {
  return wsClient && wsClient.readyState === WebSocket.OPEN ? "connected" : "offline";
});
function connectToSyncServer() {
  if (wsClient) wsClient.close();
  wsClient = new WebSocket("ws://localhost:9988");
  wsClient.on("open", () => {
    backoffDelay = 1e3;
    win == null ? void 0 : win.webContents.send("ws:status", "connected");
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if ((wsClient == null ? void 0 : wsClient.readyState) === WebSocket.OPEN) {
        wsClient.send("ping");
      }
    }, 1e4);
  });
  wsClient.on("message", (data) => {
    const rawData = data.toString();
    if (rawData === "pong") return;
    const event = JSON.parse(rawData);
    const insertMessage = db.prepare(
      "INSERT INTO messages (id, chatId, ts, sender, body) VALUES (?, ?, ?, ?, ?)"
    );
    insertMessage.run(event.messageId, event.chatId, event.ts, event.sender, event.body);
    db.prepare(
      "UPDATE chats SET lastMessageAt = ?, unreadCount = unreadCount + 1 WHERE id = ?"
    ).run(event.ts, event.chatId);
    win == null ? void 0 : win.webContents.send("ws:newMessage", {
      ...event,
      body: SecurityService.decrypt(event.body)
    });
  });
  wsClient.on("close", () => {
    win == null ? void 0 : win.webContents.send("ws:status", "reconnecting");
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      connectToSyncServer();
      backoffDelay = Math.min(backoffDelay * 2, 3e4);
    }, backoffDelay);
  });
  wsClient.on("error", (err) => {
    console.error("WS Error:", err.message);
    wsClient == null ? void 0 : wsClient.close();
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
  if (syncServer) syncServer.stop();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  seedData();
  syncServer = new SyncServer(9988);
  createWindow();
  connectToSyncServer();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
