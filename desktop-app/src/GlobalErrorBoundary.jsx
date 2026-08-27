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
        <div style={{ padding: '40px', backgroundColor: 'white', color: '#1e293b', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', marginBottom: '12px' }}>❌ Beklenmedik Bir Hata Oluştu</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>Uygulama beklenmedik bir sorunla karşılaştı. Lütfen sayfayı yenileyerek tekrar deneyin. Sorun devam ederse sistem yöneticinize başvurun.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', fontSize: '15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Sayfayı Yenile</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default GlobalErrorBoundary;

