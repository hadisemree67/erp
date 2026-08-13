// -----------------------------------------------------------------------------
// Bileşen Adı: Giriş/Kayıt Penceresi (Modal)
// Açıklama: Kullanıcıların siteye giriş yapmasını veya yeni kayıt oluşturmasını sağlayan açılır penceredir.
// -----------------------------------------------------------------------------
import React, { useState, useRef } from 'react';
import { X, CheckCircle2, Leaf, Eye, EyeOff, UserPlus, Check, ArrowLeft } from 'lucide-react';
import styles from './LoginModal.module.css';

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  // 1. State Tanımlamaları (Durum Yönetimi)
  const [showPassword, setShowPassword] = useState(false);
  const [loginContact, setLoginContact] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [view, setView] = useState('login'); // 'login', 'register', 'verify', 'forgot_password'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    contact: '',
    password: '',
    confirmPassword: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;
  // 3. Yardımcı Fonksiyonlar (Helper Methods)

  // Modal penceresini kapatır ve içindeki state (durum) verilerini sıfırlar
  const handleClose = () => {
    setView('login');
    setErrorMsg('');
    setSuccessMsg('');
    setRegisterData({firstName:'', lastName:'', contact:'', password:'', confirmPassword:''});
    setLoginContact('');
    setLoginPassword('');
    onClose();
  };

  // OTP (Doğrulama Kodu) kutucuklarına girilen değerleri yönetir ve otomatik odaklama geçişini sağlar
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  // OTP giriş alanlarında geri silme (Backspace) tuşuna basıldığında bir önceki kutuya dönülmesini sağlar
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:3000/api/customers/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: loginContact, password: loginPassword })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Giriş başarısız');
      
      localStorage.setItem('customerToken', data.token);
      
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
      handleClose();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (registerData.password !== registerData.confirmPassword) {
      return setErrorMsg('Şifreler uyuşmuyor.');
    }

    try {
      const response = await fetch('http://localhost:3000/api/customers/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          contact: registerData.contact,
          password: registerData.password
        })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Kayıt başarısız');
      
      setView('verify');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return setErrorMsg('Kodu eksiksiz giriniz.');

    try {
      const response = await fetch('http://localhost:3000/api/customers/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: registerData.contact, otpCode })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Doğrulama başarısız');
      
      setView('login');
      setSuccessMsg('Hesabınız başarıyla oluşturuldu, giriş yapabilirsiniz.');
      setRegisterData({firstName:'', lastName:'', contact:'', password:'', confirmPassword:''});
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Modalin sol tarafında yer alan bilgi ve avantajları listeler (UI Render)
  const renderLeftInfo = () => {
    if (view === 'login' || view === 'forgot_password') {
  // 4. Arayüz (UI) Çizimi ve Render Edilmesi
      return (
        <div className={styles.infoContent}>
          <h2 className={styles.infoTitle}>Doğal bakım,<br/>sağlıklı bir sen.</h2>
          <div className={styles.greenLine}></div>
          <p className={styles.infoSubtitle}>Doğadan gelen içeriklerle cildinize iyi bakın.</p>
          <Leaf size={24} color="#00A896" className={styles.decorativeLeaf} />
        </div>
      );
    }

    return (
      <div className={styles.infoContent}>
        <div className={styles.iconCircle}>
          <UserPlus size={32} color="#00A896" />
        </div>
        <h2 className={styles.infoTitle}>Aramıza katılın! <Leaf size={24} color="#00A896" style={{display: 'inline', verticalAlign: 'middle', marginLeft: '4px'}}/></h2>
        <p className={styles.infoSubtitle}>Doğal içerikli ürünlerle sağlıklı bir yaşam sizi bekliyor.</p>
        
        <ul className={styles.benefitsList}>
          <li>
            <CheckCircle2 size={18} className={styles.checkIcon} />
            <span>Hızlı ve kolay alışveriş</span>
          </li>
          <li>
            <CheckCircle2 size={18} className={styles.checkIcon} />
            <span>Özel kampanya ve indirimler</span>
          </li>
          <li>
            <CheckCircle2 size={18} className={styles.checkIcon} />
            <span>Siparişlerini kolayca takip et</span>
          </li>
        </ul>
      </div>
    );
  };

  // Giriş ve Kayıt (OTP dahil) aşamalarının form arayüzünü (UI Render) oluşturur
  const renderForm = () => {
    if (view === 'login') {
      return (
        <div className={styles.formContent}>
          <div className={styles.formHeader}>
            <h2>Giriş Yap</h2>
            <p>Hesabınıza giriş yaparak avantajlardan yararlanın.</p>
          </div>

          {successMsg && <div style={{color: '#00A896', fontSize: '14px', marginBottom: '16px', textAlign: 'center', backgroundColor: '#e6f6f4', padding: '10px', borderRadius: '8px'}}>{successMsg}</div>}
          {errorMsg && <div style={{color: 'red', fontSize: '13px', marginBottom: '16px', textAlign: 'center'}}>{errorMsg}</div>}

          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input type="text" placeholder="E-posta veya telefon numarası" className={styles.input} value={loginContact} onChange={(e) => setLoginContact(e.target.value)} required />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Şifreniz" 
                  className={styles.input} 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  required 
                />
                <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className={styles.formOptions}>
              <label className={styles.checkboxContainer}>
                <input type="checkbox" />
                <span className={styles.checkmark}></span>
                Beni hatırla
              </label>
              <button type="button" className={styles.forgotPassword} onClick={() => setView('forgot_password')}>Şifremi Unuttum?</button>
            </div>

            <button type="submit" className={styles.submitBtn}>Giriş Yap</button>
          </form>

          <div className={styles.divider}>
            <span>veya</span>
          </div>

          <div className={styles.socialLogins}>
            <button className={styles.socialBtn}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              <span>Google ile devam et</span>
            </button>
            <button className={styles.socialBtn}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="18" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
              <span>Apple ile devam et</span>
            </button>
          </div>

          <div className={styles.switchMode}>
            Hesabın yok mu? <button onClick={() => setView('register')}>Kayıt Ol</button>
          </div>
        </div>
      );
    }

    if (view === 'forgot_password') {
      return (
        <div className={styles.formContent}>
          <div className={styles.formHeader}>
            <button className={styles.backBtn} onClick={() => setView('login')}>
              <ArrowLeft size={16} /> Geri Dön
            </button>
            <h2 style={{marginTop: '16px'}}>Şifremi Unuttum</h2>
            <p>Hesabınıza kayıtlı e-posta adresinizi girin,<br/>şifre sıfırlama bağlantısı gönderelim.</p>
          </div>

          <form className={styles.form} onSubmit={(e) => { e.preventDefault(); alert('Şifre sıfırlama bağlantısı gönderildi.'); setView('login'); }}>
            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <input type="email" placeholder="E-posta adresiniz" className={styles.input} required />
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} style={{marginTop: '16px'}}>Gönder</button>
          </form>
        </div>
      );
    }

    if (view === 'register') {
      return (
        <div className={styles.formContent}>
          <div className={styles.stepperContainer}>
            <div className={styles.stepActive}>
              <div className={styles.stepCircle}>1</div>
              <span>Hesap Bilgileri</span>
            </div>
            <div className={styles.stepLine}></div>
            <div className={styles.stepInactive}>
              <div className={styles.stepCircle}>2</div>
              <span>Doğrulama</span>
            </div>
          </div>

          {errorMsg && <div style={{color: 'red', fontSize: '13px', marginBottom: '16px', textAlign: 'center'}}>{errorMsg}</div>}

          <form className={styles.form} onSubmit={handleRegister}>
            <div className={styles.rowInputs}>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <input type="text" placeholder="Adınız" className={styles.input} value={registerData.firstName} onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})} required />
              </div>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <input type="text" placeholder="Soyadınız" className={styles.input} value={registerData.lastName} onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})} required />
              </div>
            </div>
            
            <div className={styles.inputGroup}>
              <label style={{fontSize: '12px', color: '#666'}}>E-posta Adresi *</label>
              <input type="email" placeholder="E-posta adresiniz" className={styles.input} value={registerData.contact} onChange={(e) => setRegisterData({...registerData, contact: e.target.value})} required />
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input type={showPassword ? "text" : "password"} placeholder="Şifreniz" className={styles.input} value={registerData.password} onChange={(e) => setRegisterData({...registerData, password: e.target.value})} required />
                <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <input type={showPassword ? "text" : "password"} placeholder="Şifrenizi tekrar giriniz" className={styles.input} value={registerData.confirmPassword} onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})} required />
                <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className={styles.formOptions} style={{marginTop: '0'}}>
              <label className={styles.checkboxContainer}>
                <input type="checkbox" required />
                <span className={styles.checkmark}></span>
                KVKK ve aydınlatma metnini okudum, onaylıyorum.
              </label>
            </div>

            <button type="submit" className={styles.submitBtn}>Devam Et</button>
          </form>

          <div className={styles.divider}>
            <span>veya</span>
          </div>

          <div className={styles.socialLogins} style={{flexDirection: 'row'}}>
            <button className={styles.socialBtn} style={{height: '36px'}}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="16"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              <span>Google</span>
            </button>
            <button className={styles.socialBtn} style={{height: '36px'}}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="16" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
              <span>Apple</span>
            </button>
          </div>

          <div className={styles.switchMode}>
            Zaten hesabın var mı? <button onClick={() => setView('login')}>Giriş Yap</button>
          </div>
        </div>
      );
    }

    if (view === 'verify') {
      return (
        <div className={styles.formContent}>
          <div className={styles.stepperContainer}>
            <div className={styles.stepCompleted}>
              <div className={styles.stepCircle}><Check size={14} strokeWidth={3} /></div>
              <span>Hesap Bilgileri</span>
            </div>
            <div className={styles.stepLineActive}></div>
            <div className={styles.stepActive}>
              <div className={styles.stepCircle}>2</div>
              <span>Doğrulama</span>
            </div>
          </div>

          <div className={styles.verifyHeader}>
            <h2>Doğrulama</h2>
            <p>Hesabınızı doğrulamak için e-posta adresinize<br/>6 haneli kodu giriniz.</p>
          </div>

          {errorMsg && <div style={{color: 'red', fontSize: '13px', marginBottom: '16px', textAlign: 'center'}}>{errorMsg}</div>}

          <form className={styles.form} onSubmit={handleVerify}>
            <div className={styles.otpContainer}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength="1"
                  className={styles.otpInput}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  ref={(el) => otpRefs.current[idx] = el}
                />
              ))}
            </div>

            <div className={styles.resendCode}>
              Kodu almadınız mı? <button type="button">Yeniden Gönder (58s)</button>
            </div>

            <button type="submit" className={styles.submitBtn}>Kayıt Ol</button>
          </form>
        </div>
      );
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Left Side */}
        <div className={styles.infoSide}>
          <div className={styles.bgImage}></div>
          <div className={styles.bgOverlay}></div>
          {renderLeftInfo()}
        </div>

        {/* Right Side */}
        <div className={styles.formSide}>
          <div className={styles.formHeaderArea}>
            <span style={{flex: 1}}></span>
            {view === 'register' && <h2>Kayıt Ol</h2>}
            {view === 'verify' && <div></div>}
            <button className={styles.closeBtn} onClick={handleClose}>
              <X size={20} />
            </button>
          </div>
          {view === 'register' && <p className={styles.formHeaderSub}>Hesap oluşturarak avantajlardan yararlanın.</p>}
          
          {renderForm()}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
