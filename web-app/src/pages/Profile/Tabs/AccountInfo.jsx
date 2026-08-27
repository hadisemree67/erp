/**
 * ============================================================================
 * BİLEŞEN ADI: AccountInfo
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Web uygulamasının (e-ticaret) alt bileşenidir. Ziyaretçilere kullanıcı dostu arayüz sunar.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import styles from './AccountInfo.module.css';

const AccountInfo = () => {
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: 'Erkek'
  });

  const [originalData, setOriginalData] = useState({
    email: '',
    phone: ''
  });

  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');

  const handleSendPhoneOtp = () => {
    alert("Telefona doğrulama kodu gönderildi (Demo).");
    setShowPhoneOtp(true);
  };

  const handleSendEmailOtp = () => {
    alert("E-posta adresinize doğrulama kodu gönderildi (Demo).");
    setShowEmailOtp(true);
  };

  const handleVerifyPhoneOtp = () => {
    if (phoneOtp === '123456') {
      alert("Telefon doğrulandı!");
      setOriginalData(prev => ({ ...prev, phone: user.phone }));
      setShowPhoneOtp(false);
    } else {
      alert("Hatalı kod!");
    }
  };

  const handleVerifyEmailOtp = () => {
    if (emailOtp === '123456') {
      alert("E-posta doğrulandı!");
      setOriginalData(prev => ({ ...prev, email: user.email }));
      setShowEmailOtp(false);
    } else {
      alert("Hatalı kod!");
    }
  };

  useEffect(() => {
    // Profil bilgilerini API'den çek
    const fetchProfile = async () => {
      const token = localStorage.getItem('customerToken');
      if (!token) return;
      try {
        const response = await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success && data.user) {
          setUser(prev => ({
            ...prev,
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            gender: data.user.gender || '',
            birthDate: data.user.birthDate || ''
          }));
          setOriginalData({
            email: data.user.email || '',
            phone: data.user.phone || ''
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const token = localStorage.getItem('customerToken');
    if (!token) {
      alert("Lütfen giriş yapın.");
      return;
    }

    if (user.birthDate) {
      const birthYear = new Date(user.birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      if (currentYear - birthYear < 18) {
        alert("18 yaşından küçükler kayıt olamaz / bilgilerini güncelleyemez.");
        return;
      }
    }

    let fName = user.firstName.trim();
    let lName = user.lastName.trim();
    const fullName = `${fName} ${lName}`.trim();
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length > 1) {
        lName = parts.pop();
        fName = parts.join(' ');
    } else {
        fName = parts[0] || '';
        lName = '';
    }
    const finalUser = { ...user, firstName: fName, lastName: lName };

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/customers/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(finalUser)
      });
      const data = await response.json();
      if (data.success) {
        alert("Kişisel bilgiler başarıyla güncellendi!");
        // Update local storage slightly so header stays in sync
        const current = JSON.parse(localStorage.getItem('customerUser') || '{}');
        localStorage.setItem('customerUser', JSON.stringify({
          ...current,
          name: `${finalUser.firstName} ${finalUser.lastName}`,
          first_name: finalUser.firstName,
          last_name: finalUser.lastName,
          email: finalUser.email,
          phone: finalUser.phone
        }));
        window.location.reload();
      } else {
        alert(data.message || "Güncelleme başarısız.");
      }
    } catch (e) {
      console.error(e);
      alert("Bir hata oluştu.");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Hesap Bilgilerim</h1>
      <p className={styles.subtitle}>Kişisel bilgilerinizi buradan güncelleyebilirsiniz.</p>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Kişisel Bilgiler</h2>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Ad</label>
            <input
              type="text"
              name="firstName"
              value={user.firstName}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Soyad</label>
            <input
              type="text"
              name="lastName"
              value={user.lastName}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>E-posta</label>
            <div className={styles.inputWithIcon}>
              <input
                type="email"
                name="email"
                value={user.email}
                onChange={handleChange}
                className={styles.input}
                disabled={!!originalData.email}
              />
              {originalData.email ? (
                <span className={styles.verified}><Check size={14} /> Doğrulandı</span>
              ) : (
                <div className={styles.verifyAction}>
                  <span className={styles.unverified}>Doğrulanmadı</span>
                  {user.email && user.email.includes('@') && !showEmailOtp && (
                    <button type="button" className={styles.verifyBtn} onClick={handleSendEmailOtp}>
                      Doğrula
                    </button>
                  )}
                </div>
              )}
            </div>
            {showEmailOtp && !originalData.email && (
              <div className={styles.otpContainer}>
                <input
                  type="text"
                  placeholder="Onay Kodu (Örn: 123456)"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  className={styles.otpInput}
                />
                <button type="button" className={styles.verifyBtn} onClick={handleVerifyEmailOtp}>Onayla</button>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Telefon</label>
            <div className={styles.inputWithIcon}>
              <input
                type="tel"
                name="phone"
                value={user.phone}
                onChange={handleChange}
                className={styles.input}
                placeholder="05XX XXX XX XX"
                disabled={!!originalData.phone}
              />
              {originalData.phone ? (
                <span className={styles.verified}><Check size={14} /> Doğrulandı</span>
              ) : (
                <div className={styles.verifyAction}>
                  <span className={styles.unverified}>Doğrulanmadı</span>
                  {user.phone && user.phone.length > 9 && !showPhoneOtp && (
                    <button type="button" className={styles.verifyBtn} onClick={handleSendPhoneOtp}>
                      Doğrula
                    </button>
                  )}
                </div>
              )}
            </div>
            {showPhoneOtp && !originalData.phone && (
              <div className={styles.otpContainer}>
                <input
                  type="text"
                  placeholder="Onay Kodu (Örn: 123456)"
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value)}
                  className={styles.otpInput}
                />
                <button type="button" className={styles.verifyBtn} onClick={handleVerifyPhoneOtp}>Onayla</button>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Doğum Tarihi <span>(İsteğe bağlı)</span></label>
            <input
              type="date"
              name="birthDate"
              value={user.birthDate}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Cinsiyet <span>(İsteğe bağlı)</span></label>
            <select
              name="gender"
              value={user.gender}
              onChange={handleChange}
              className={styles.input}
            >
              <option value="Erkek">Erkek</option>
              <option value="Kadın">Kadın</option>
              <option value="Belirtmek İstemiyorum">Belirtmek İstemiyorum</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.saveBtn} onClick={handleSave}>Değişiklikleri Kaydet</button>
      </div>
    </div>
  );
};

export default AccountInfo;


