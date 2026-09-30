const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 950,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handlers IPC
ipcMain.handle('get-products', async () => {
  try {
    return await db.getProducts();
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return [];
  }
});

ipcMain.handle('add-product', async (event, product) => {
  try {
    return await db.addProduct(product);
  } catch (error) {
    console.error('Error al agregar producto:', error);
    throw error;
  }
});

ipcMain.handle('dispatch-product', async (event, data) => {
  try {
    return await db.dispatchProduct(data);
  } catch (error) {
    console.error('Error en el despacho:', error);
    throw error;
  }
});

ipcMain.handle('delete-product', async (event, productId) => {
  try {
    return await db.deleteProduct(productId);
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    throw error;
  }
});

ipcMain.handle('get-dispatches', async (event, filter) => {
  try {
    return await db.getDispatches(filter);
  } catch (error) {
    console.error('Error al obtener despachos:', error);
    return [];
  }
});

ipcMain.handle('clean-dispatches', async (event, period) => {
  try {
    return await db.cleanDispatches(period);
  } catch (error) {
    console.error('Error al limpiar el historial:', error);
    throw error;
  }
});