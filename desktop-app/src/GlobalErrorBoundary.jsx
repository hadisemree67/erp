/**
 * ============================================================================
 * BİLEŞEN ADI: GlobalErrorBoundary
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının alt bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (GlobalErrorBoundary.jsx), Uygulamanın ana çekirdeği; genel yönlendirme (routing), kenar çubuğu (Sidebar) ve hata yakalama (ErrorBoundary) yapılarını barındırır.
 */

import React from 'react';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('GlobalErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 5. Arayüz (UI) Çizimi ve Render Edilmesi
      return (
        <div style={{ padding: '20px', backgroundColor: 'white', color: 'red', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, overflow: 'auto' }}>
          <h2>React Kritik Çökme!</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</pre>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px', color: '#333' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}>Sayfayı Yenile</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default GlobalErrorBoundary;

