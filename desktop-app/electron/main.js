/*
 * main.js
 * Projenin çalışması için gereken kodları barındırıyor.
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// WINDOWS ODAKLANMA (FOCUS / INPUT) HATASI ÇÖZÜMLERİ
// Donanım hızlandırmasını kapatmak bazen input lag/odak kaybına sebep olduğu için kaldırıldı.
// Bunun yerine React tarafında inputlara autoFocus eklendi.

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'ERP',
    show: false, // Sayfa tam çizilmeden gösterme (odak kaybı ve beyaz ekranı önler)
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false // Arka planda donmayı ve uykuya geçmeyi engeller
    }
  });

  // Sayfa içeriği ve DOM hazır olduğunda pencereyi göster ve girdileri odakla
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Sayfa yüklendikten sonra Chromium alt pencere odağını kesinleştir
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      mainWindow.webContents.focus();
    }
  });

  // GÜVENLİK: Dış bağlantılara izinsiz yönlendirmeyi engelle
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // Sadece izin verilen alan adlarına (localhost) izin ver
    if (parsedUrl.hostname !== 'localhost') {
      event.preventDefault();
      console.log(`Engellenen dış bağlantı: ${navigationUrl}`);
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3002');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

