/**
 * ============================================================================
 * BİLEŞEN ADI: vite.config
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */
/*
 * vite.config.js
 * Projenin çalışması için gereken kodları barındırıyor.
 * Biraz karışık görünebilir ama işin özünü burada hallediyoruz.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3002,
    strictPort: true,
  }
})

