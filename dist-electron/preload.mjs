"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  getChats: (offset, limit) => electron.ipcRenderer.invoke("db:getChats", offset, limit),
  getMessages: (chatId, offset, limit) => electron.ipcRenderer.invoke("db:getMessages", chatId, offset, limit),
  searchMessages: (chatId, query, limit) => electron.ipcRenderer.invoke("db:searchMessages", chatId, query, limit),
  markAsRead: (chatId) => electron.ipcRenderer.invoke("db:markAsRead", chatId),
  onNewMessage: (callback) => electron.ipcRenderer.on("ws:newMessage", callback),
  onSyncStatus: (callback) => electron.ipcRenderer.on("ws:status", callback),
  simulateDisconnect: () => electron.ipcRenderer.send("ws:simulateDisconnect"),
  reconnect: () => electron.ipcRenderer.send("ws:reconnect"),
  getStatus: () => electron.ipcRenderer.invoke("ws:getStatus")
});
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
