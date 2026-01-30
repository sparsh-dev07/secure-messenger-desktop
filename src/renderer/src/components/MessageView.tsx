import React, { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, setMessages, prependMessages } from '../store'
import { Search, Wifi, WifiOff } from 'lucide-react'
const MessageView: React.FC = () => {
  const dispatch = useDispatch()
  const { selectedChatId, messages, syncStatus, chats } = useSelector((state: RootState) => state.chat)
  const currentMessages = selectedChatId ? messages[selectedChatId] || [] : []
  const selectedChat = chats.find((c) => c.id === selectedChatId)
  const [searchQuery, setSearchQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const isConnected = syncStatus === 'connected'
  const loadMessages = useCallback(
    (chatId: string, reset: boolean = false) => {
      const newOffset = reset ? 0 : offset
      window.electronAPI.getMessages(chatId, newOffset, 50).then((msgs: any) => {
        if (reset) {
          dispatch(setMessages({ chatId, messages: msgs }))
          setOffset(50)
        } else {
          dispatch(prependMessages({ chatId, messages: msgs }))
          setOffset(newOffset + 50)
        }
      })
    },
    [dispatch, offset],
  )
  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId, true)
    }
  }, [selectedChatId])
  useEffect(() => {
    if (!selectedChatId) return

    if (searchQuery.trim() === '') {
      loadMessages(selectedChatId, true)
      return
    }

    const delayDebounceFn = setTimeout(() => {
      window.electronAPI.searchMessages(selectedChatId, searchQuery, 50).then((msgs: any) => {
        dispatch(setMessages({ chatId: selectedChatId, messages: msgs }))
      })
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, selectedChatId, dispatch])

  const handleToggleConnection = () => {
    if (isConnected) {
      window.electronAPI.simulateDisconnect()
    } else {
      window.electronAPI.reconnect()
    }
  }
  if (!selectedChatId) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
        }}
      >
        Select a chat to start messaging
      </div>
    )
  }
  return (
    <>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="chat-avatar" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
            {selectedChat?.title.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px' }}>
              {selectedChat?.title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Securely encrypted</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <form
            onSubmit={(e) => e.preventDefault()}
            style={{
              display: 'flex',
              background: '#f0f2f5',
              borderRadius: '20px',
              padding: '0 12px',
              alignItems: 'center',
              height: '36px',
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                padding: '5px 8px',
                width: '120px',
                background: 'transparent',
                fontSize: '13px',
              }}
            />
          </form>
          <button
            onClick={handleToggleConnection}
            title={isConnected ? 'Simulate connection drop' : 'Reconnect'}
            style={{
              border: 'none',
              background: isConnected ? '#fff0f0' : '#e6fffa',
              color: isConnected ? '#ff4d4f' : '#38a169',
              padding: '8px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {isConnected ? (
              <>
                <WifiOff size={16} />
                <span>Simulate Drop</span>
              </>
            ) : (
              <>
                <Wifi size={16} />
                <span>Reconnect</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className="message-list">
        {currentMessages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '14px',
              height: '100%',
            }}
          >
            {searchQuery ? 'No messages found' : 'No messages in this chat yet'}
          </div>
        ) : (
          <>
            {currentMessages.map((msg: any) => {
              const isMe = msg.sender === 'You' || msg.sender === 'Alice'
              return (
                <div key={msg.id} className={`message-bubble ${isMe ? 'sent' : 'received'}`}>
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: '11px',
                      marginBottom: '4px',
                      color: isMe ? 'rgba(255,255,255,0.9)' : 'var(--primary)',
                    }}
                  >
                    {isMe ? 'You' : msg.sender}
                  </div>
                  <div>{msg.body}</div>
                  <div
                    style={{ fontSize: '10px', opacity: 0.7, textAlign: 'right', marginTop: '4px' }}
                  >
                    {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
            {!searchQuery && (
              <button className="load-more-btn" onClick={() => loadMessages(selectedChatId)}>
                Load older messages
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}
export default MessageView
