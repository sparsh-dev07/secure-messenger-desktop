import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('electronAPI', {
  getChats: (offset: number, limit: number) => ipcRenderer.invoke('db:getChats', offset, limit),
  getMessages: (chatId: string, offset: number, limit: number) =>
    ipcRenderer.invoke('db:getMessages', chatId, offset, limit),
  searchMessages: (chatId: string, query: string, limit: number) =>
    ipcRenderer.invoke('db:searchMessages', chatId, query, limit),
  markAsRead: (chatId: string) => ipcRenderer.invoke('db:markAsRead', chatId),
  onNewMessage: (callback: (event: any, message: any) => void) =>
    ipcRenderer.on('ws:newMessage', callback),
  onSyncStatus: (callback: (event: any, status: string) => void) =>
    ipcRenderer.on('ws:status', callback),
  simulateDisconnect: () => ipcRenderer.send('ws:simulateDisconnect'),
  reconnect: () => ipcRenderer.send('ws:reconnect'),
})
