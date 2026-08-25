/**
 * ============================================================================
 * BİLEŞEN ADI: main
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (main.jsx), Uygulamanın ana çekirdeği; genel yönlendirme (routing), kenar çubuğu (Sidebar) ve hata yakalama (ErrorBoundary) yapılarını barındırır.
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

