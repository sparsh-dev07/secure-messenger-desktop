export interface IElectronAPI {
  getChats: (offset: number, limit: number) => Promise<any[]>
  getMessages: (chatId: string, offset: number, limit: number) => Promise<any[]>
  searchMessages: (chatId: string, query: string, limit: number) => Promise<any[]>
  markAsRead: (chatId: string) => Promise<void>
  onNewMessage: (callback: (event: any, msg: any) => void) => void
  onSyncStatus: (callback: (event: any, status: string) => void) => void
  simulateDisconnect: () => void
  reconnect: () => void
  getStatus: () => Promise<'connected' | 'offline' | 'reconnecting'>
}
declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}
