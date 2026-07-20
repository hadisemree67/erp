import { useState } from 'react';
import Sidebar from './components/Sidebar';
import './index.css';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('anasayfa');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, role })
      });

      const data = await response.json();

      if (data.success) {
        setIsLoggedIn(true);
      } else {
        setErrorMsg(data.message || 'Giriş başarısız.');
      }
    } catch (err) {
      setErrorMsg('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
        <Sidebar 
          onLogout={() => setIsLoggedIn(false)} 
          onNavigate={(view) => setCurrentView(view)} 
          currentView={currentView}
        />
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          
          {currentView === 'anasayfa' && (
            <div>
              <h1 style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>
                Gösterge Paneli
              </h1>
              <p style={{ color: '#64748b', marginTop: '8px', marginBottom: '24px' }}>Sisteminizin genel durumunu buradan takip edebilirsiniz.</p>
              
              {/* İstatistik Kartları */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Bugünkü Siparişler</div>
                  <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>142</div>
                  <div style={{ color: '#10b981', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>+12% dünden fazla</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Toplam Müşteri</div>
                  <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>3,485</div>
                  <div style={{ color: '#10b981', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>+4 yeni kayıt</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Azalan Stoklar</div>
                  <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>8</div>
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>Acil tedarik gerekli</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Aktif Kampanyalar</div>
                  <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>2</div>
                  <div style={{ color: '#3b82f6', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>%15 Sepet İndirimi Yayında</div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'son-hareketler' && (
            <div>
              <h1 style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>
                Son Hareketler
              </h1>
              <p style={{ color: '#64748b', marginTop: '8px', marginBottom: '24px' }}>Sistemdeki en son gerçekleştirilen işlemlerin listesi.</p>
              
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ color: '#94a3b8' }}>Henüz kayıtlı hareket bulunmuyor.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="glass-card">
        <h1>{role === 'admin' ? 'Yönetici Girişi' : 'Çalışan Girişi'}</h1>
        <p>E-Ticaret Depo & Sipariş Sistemi</p>

        <div className="tab-container">
          <button
            type="button"
            className={`tab-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
          >
            Yönetici
          </button>
          <button
            type="button"
            className={`tab-btn ${role === 'employee' ? 'active' : ''}`}
            onClick={() => setRole('employee')}
          >
            Çalışan
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Kullanıcı Adı</label>
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Şifre</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMsg && <p style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', margin: '0 0 10px 0' }}>{errorMsg}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
