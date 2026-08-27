/**
 * ============================================================================
 * BİLEŞEN ADI: SecuritySettings
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Info } from 'lucide-react';
import styles from './SecuritySettings.module.css';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-toastify';

const SecuritySettings = () => {
  const { user, login } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  
  const [is2FAEnabled, setIs2FAEnabled] = useState(user?.TwoFactorEnabled || false);
  const [is2FALoading, setIs2FALoading] = useState(false);
  
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      toast.error('Lütfen tüm şifre alanlarını doldurun.');
      return;
    }
    
    if (newPassword !== newPasswordConfirm) {
      toast.error('Yeni şifreler eşleşmiyor.');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('customerToken');
      
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || 'Şifreniz başarıyla güncellendi.');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
      } else {
        toast.error(data.message || 'Şifre güncellenemedi.');
      }
    } catch (error) {
      console.error('Şifre güncelleme hatası:', error);
      toast.error('Sunucu hatası.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      setIs2FALoading(true);
      const token = localStorage.getItem('customerToken');
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/toggle-2fa', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setIs2FAEnabled(data.TwoFactorEnabled);
        toast.success(data.message);
        if (user) {
          login({ ...user, TwoFactorEnabled: data.TwoFactorEnabled }, token);
        }
      } else {
        toast.error(data.message || '2FA ayarı değiştirilemedi.');
      }
    } catch (error) {
      console.error('2FA hatası:', error);
      toast.error('Sunucu hatası.');
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleLoadSessions = async () => {
    if (showSessions) {
      setShowSessions(false);
      return;
    }
    
    try {
      setSessionsLoading(true);
      const token = localStorage.getItem('customerToken');
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
        setShowSessions(true);
      } else {
        toast.error('Oturumlar yüklenemedi.');
      }
    } catch (error) {
      console.error('Sessions hatası:', error);
      toast.error('Sunucu hatası.');
    } finally {
      setSessionsLoading(false);
    }
  };


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconBox}>
          <ShieldCheck size={28} />
        </div>
        <div>
          <h2 className={styles.title}>Güvenlik Ayarlarım</h2>
          <p className={styles.subtitle}>Hesabınızın güvenliğini artırmak için ayarlarınızı yönetin.</p>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Sol Kolon - Şifre Değiştir */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Şifre Değiştir</h3>
          
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Mevcut Şifre</label>
              <input
                type={showCurrent ? "text" : "password"}
                className={styles.input}
                placeholder="Mevcut şifrenizi giriniz"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <div className={styles.eyeIcon} onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Yeni Şifre</label>
              <input
                type={showNew ? "text" : "password"}
                className={styles.input}
                placeholder="Yeni şifrenizi giriniz"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className={styles.eyeIcon} onClick={() => setShowNew(!showNew)}>
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Yeni Şifre (Tekrar)</label>
              <input
                type={showConfirm ? "text" : "password"}
                className={styles.input}
                placeholder="Yeni şifrenizi tekrar giriniz"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
              />
              <div className={styles.eyeIcon} onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>

            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        </div>

        {/* Sağ Kolon */}
        <div className={styles.rightColumn}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>İki Adımlı Doğrulama (2FA)</h3>
            <p className={styles.cardSubtitle}>
              Hesabınızı daha güvenli hale getirmek için iki adımlı doğrulamayı etkinleştirin.
            </p>
            <div className={styles.statusRow}>
              <span className={styles.statusBadge} style={{ backgroundColor: is2FAEnabled ? '#ecfdf5' : '#f1f5f9', color: is2FAEnabled ? '#10b981' : '#64748b'}}>
                {is2FAEnabled ? 'Aktif' : 'Pasif'}
              </span>
              <button className={styles.actionBtn} onClick={handleToggle2FA} disabled={is2FALoading}>
                {is2FALoading ? 'İşleniyor...' : (is2FAEnabled ? 'Devre Dışı Bırak' : 'Etkinleştir')}
              </button>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Oturumlarım</h3>
            <p className={styles.cardSubtitle}>
              Hesabınıza giriş yapmış olduğunuz cihazları yönetin.
            </p>
            <button className={styles.actionBtn} onClick={handleLoadSessions} disabled={sessionsLoading}>
              {sessionsLoading ? 'Yükleniyor...' : (showSessions ? 'Gizle' : 'Tüm Oturumları Görüntüle')}
            </button>

            {showSessions && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sessions.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#666' }}>Kayıtlı oturum bulunamadı.</p>
                ) : (
                  sessions.map(session => (
                    <div key={session.id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}>
                      <div style={{ fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Cihaz: {session.device_info}</div>
                      <div style={{ color: '#64748b', marginBottom: '2px' }}>IP Adresi: {session.ip_address}</div>
                      <div style={{ color: '#64748b', fontSize: '11px' }}>Son Aktif: {new Date(session.last_active).toLocaleString('tr-TR')}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      <div className={styles.infoAlert}>
        <Info size={18} />
        <span>Hesabınızın güvenliği bizim için önemli. Lütfen şifrenizi düzenli olarak güncelleyiniz.</span>
      </div>
    </div>
  );
};

export default SecuritySettings;


