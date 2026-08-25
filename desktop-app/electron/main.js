/**
 * ============================================================================
 * BİLEŞEN ADI: Desktop-App (Electron Main)
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü (Electron) uygulamasının başlangıç noktasıdır. Pencereyi açar,
 *   güvenlik kısıtlamalarını yönetir ve odaklanma (focus) hatalarını engeller.
 * ============================================================================
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
      webSecurity: false, // [Ağ hatalarını ve katı Chromium CORS kurallarını aşmak için kapatıldı]
      allowRunningInsecureContent: true, // [Yerel geliştirme proxy hatalarını önler]
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

  // GÜVENLİK: Yeni pencerelerde (target="_blank") XSS ve zararlı URL açılmasını engelle
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('file:')) {
      console.log(`Güvenlik nedeniyle engellenen yeni pencere (Tehlikeli URL formatı): ${url}`);
      return { action: 'deny' };
    }
    // Sadece localhost kaynaklı önizlemelere veya blob: adreslerine izin ver
    if (url.startsWith('blob:http://localhost') || url.startsWith('http://localhost')) {
        // Not: Blob adreslerinin içinde HTML varsa bile renderer içerisinde çalışmasını 
        // frontend'de engellediğimiz için blob izni sadece resim/pdf önizlemesi için kullanılıyor.
        return { action: 'allow' };
    }
    console.log(`Güvenlik nedeniyle engellenen yeni pencere: ${url}`);
    return { action: 'deny' };
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

