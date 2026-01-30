import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'
interface Chat {
  id: string
  title: string
  lastMessageAt: number
  unreadCount: number
}
interface Message {
  id: string
  chatId: string
  ts: number
  sender: string
  body: string
}
interface ChatState {
  chats: Chat[]
  selectedChatId: string | null
  messages: Record<string, Message[]>
  syncStatus: 'connected' | 'offline' | 'reconnecting'
}
const initialState: ChatState = {
  chats: [],
  selectedChatId: null,
  messages: {},
  syncStatus: 'offline',
}
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChats: (state, action: PayloadAction<Chat[]>) => {
      state.chats = action.payload
    },
    appendChats: (state, action: PayloadAction<Chat[]>) => {
      state.chats = [...state.chats, ...action.payload]
    },
    selectChat: (state, action: PayloadAction<string>) => {
      state.selectedChatId = action.payload
      const chat = state.chats.find((c) => c.id === action.payload)
      if (chat) chat.unreadCount = 0
    },
    setMessages: (state, action: PayloadAction<{ chatId: string; messages: Message[] }>) => {
      state.messages[action.payload.chatId] = action.payload.messages
    },
    prependMessages: (state, action: PayloadAction<{ chatId: string; messages: Message[] }>) => {
      const existing = state.messages[action.payload.chatId] || []
      state.messages[action.payload.chatId] = [...existing, ...action.payload.messages]
    },
    handleNewMessage: (state, action: PayloadAction<Message>) => {
      const msg = action.payload
      if (state.messages[msg.chatId]) {
        state.messages[msg.chatId] = [msg, ...state.messages[msg.chatId]]
      }
      const chatIndex = state.chats.findIndex((c) => c.id === msg.chatId)
      if (chatIndex !== -1) {
        const chat = state.chats[chatIndex]
        chat.lastMessageAt = msg.ts
        if (state.selectedChatId !== msg.chatId) {
          chat.unreadCount += 1
        }
        state.chats.splice(chatIndex, 1)
        state.chats.unshift(chat)
      }
    },
    setSyncStatus: (state, action: PayloadAction<ChatState['syncStatus']>) => {
      state.syncStatus = action.payload
    },
  },
})
export const {
  setChats,
  appendChats,
  selectChat,
  setMessages,
  prependMessages,
  handleNewMessage,
  setSyncStatus,
} = chatSlice.actions
export const store = configureStore({
  reducer: {
    chat: chatSlice.reducer,
  },
})
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
