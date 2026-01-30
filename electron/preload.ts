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
  getStatus: () => ipcRenderer.invoke('ws:getStatus'),
})
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})
