const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('inventoryAPI', {
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  dispatchProduct: (data) => ipcRenderer.invoke('dispatch-product', data),
  deleteProduct: (productId) => ipcRenderer.invoke('delete-product', productId),
  getDispatches: (filter) => ipcRenderer.invoke('get-dispatches', filter),
  cleanDispatches: (period) => ipcRenderer.invoke('clean-dispatches', period)
});