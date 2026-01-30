import { describe, it, expect } from 'vitest'
import { store, selectChat, handleNewMessage } from './index'

describe('Chat Reducer', () => {
    it('should handle selecting a chat and marking it as read', () => {
        const initialChat = {
            id: 'chat_1',
            title: 'Room 1',
            lastMessageAt: Date.now(),
            unreadCount: 5,
        }

        store.dispatch({ type: 'chat/setChats', payload: [initialChat] })
        expect(store.getState().chat.chats[0].unreadCount).toBe(5)

        store.dispatch(selectChat('chat_1'))

        expect(store.getState().chat.selectedChatId).toBe('chat_1')
        expect(store.getState().chat.chats[0].unreadCount).toBe(0)
    })

    it('should handle incoming messages and unshift chat', () => {
        const chat1 = { id: 'chat_1', title: 'Room 1', lastMessageAt: 1000, unreadCount: 0 }
        const chat2 = { id: 'chat_2', title: 'Room 2', lastMessageAt: 2000, unreadCount: 0 }

        store.dispatch({ type: 'chat/setChats', payload: [chat1, chat2] })

        const newMessage = {
            id: 'msg_new',
            chatId: 'chat_1',
            ts: 3000,
            sender: 'Alice',
            body: 'Hello!',
        }

        store.dispatch(handleNewMessage(newMessage))

        const state = store.getState().chat
        // Chat 1 should be moved to the top
        expect(state.chats[0].id).toBe('chat_1')
        expect(state.chats[0].lastMessageAt).toBe(3000)
        expect(state.chats[1].id).toBe('chat_2')
    })
})
