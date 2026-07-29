/**
 * ============================================================================
 * DOSYA ADI: main.jsx
 * MODÜL / KATMAN: Önyüz Çekirdeği - DOM Başlatıcı (Entry Point)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   React uygulamasını tarayıcının HTML DOM ağacındaki root elementine bağlar (mount eder). Genel stil dosyalarını ve GlobalErrorBoundary kalkanını başlatır.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React 18 / ReactDOM, JSX, CSS İçe Aktarma
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Vite/Webpack tarafından derlenen ve tarayıcıda ilk çalışan önyüz giriş dosyasıdır.
 * ============================================================================
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import GlobalErrorBoundary from './GlobalErrorBoundary';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);
