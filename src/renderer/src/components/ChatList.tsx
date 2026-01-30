import React from 'react'
import { FixedSizeList as List } from 'react-window'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, selectChat, appendChats } from '../store'
import { formatDistanceToNow } from 'date-fns'
import { AutoSizer } from 'react-virtualized-auto-sizer'
const ChatList: React.FC = () => {
  const dispatch = useDispatch()
  const { chats, selectedChatId } = useSelector((state: RootState) => state.chat)
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const chat = chats[index]
    if (!chat) return null
    return (
      <div
        style={{ ...style, width: '100%', padding: '0 10px' }}
        className={`chat-item ${selectedChatId === chat.id ? 'active' : ''}`}
        onClick={() => {
          dispatch(selectChat(chat.id))
          window.electronAPI.markAsRead(chat.id)
        }}
      >
        <div className="chat-avatar">{chat.title.charAt(0)}</div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'start',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontWeight: '600',
                fontSize: '15px',
                color: 'var(--text-main)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {chat.title}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginTop: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Latest secure message...
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'end',
              gap: '8px',
              marginRight: '20px',
            }}
          >
            {chat.unreadCount > 0 && <div className="unread-badge">{chat.unreadCount}</div>}
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {formatDistanceToNow(chat.lastMessageAt, { addSuffix: false }).replace('about ', '')}
            </div>
          </div>
        </div>
      </div>
    )
  }
  const [offset, setOffset] = React.useState(50)

  const loadMoreChats = () => {
    window.electronAPI.getChats(offset, 50).then((moreChats: any) => {
      dispatch(appendChats(moreChats))
      setOffset(offset + 50)
    })
  }

  const AutoSizerAny = AutoSizer as any
  if (chats.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}
      >
        No chats found
      </div>
    )
  }
  return (
    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, width: '100%', position: 'relative' }}>
        <AutoSizerAny
          renderProp={({ height, width }: { height: number; width: number }) => {
            const finalHeight = height || 0
            const finalWidth = width || 420
            return (
              <List
                height={finalHeight}
                itemCount={chats.length}
                itemSize={80}
                width={finalWidth}
                style={{ overflowX: 'hidden' }}
              >
                {Row}
              </List>
            )
          }}
        />
      </div>
      {chats.length % 50 === 0 && chats.length > 0 && (
        <button className="load-more-btn" onClick={loadMoreChats} style={{ margin: '10px' }}>
          Load older chats
        </button>
      )}
    </div>
  )
}
export default ChatList
