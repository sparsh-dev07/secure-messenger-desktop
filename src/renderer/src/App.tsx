import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from './store'
import { setChats, handleNewMessage, setSyncStatus } from './store'
import ChatList from './components/ChatList'
import MessageView from './components/MessageView'
const App: React.FC = () => {
  const dispatch = useDispatch()
  const syncStatus = useSelector((state: RootState) => state.chat.syncStatus)
  useEffect(() => {
    window.electronAPI.getStatus().then((status: any) => {
      dispatch(setSyncStatus(status))
    })
    window.electronAPI
      .getChats(0, 50)
      .then((chats: any) => {
        dispatch(setChats(chats))
      })
      .catch((err: Error) => {
        console.error('Failed to fetch chats:', err)
      })
    window.electronAPI.onNewMessage((_: any, message: any) => {
      dispatch(handleNewMessage(message))
    })
    window.electronAPI.onSyncStatus((_: any, status: any) => {
      dispatch(setSyncStatus(status))
    })
  }, [dispatch])
  return (
    <div className="app-container">
      <div className="chat-list-container">
        <div className="header">
          <strong>Secure Messenger</strong>
          <span className={`status-indicator status-${syncStatus}`}>
            {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
          </span>
        </div>
        <ChatList />
      </div>
      <div className="message-view-container">
        <MessageView />
      </div>
    </div>
  )
}
export default App
