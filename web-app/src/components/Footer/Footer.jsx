import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, 
  Mail, 
  Clock, 
  Lock 
} from 'lucide-react';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      {/* 1. Ana Footer Sütunları */}
      <div className={styles.mainFooter}>
        <div className={`container ${styles.footerGrid}`}>
          
          {/* Kolon 1: Marka & İletişim */}
          <div className={styles.brandCol}>
            <Link to="/" className={styles.footerLogo}>
              <svg width="40" height="40" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="22" cy="22" r="22" fill="#00A896" opacity="0.18"/>
                <path d="M22 6C22 6 28 6 28 12C28 18 22 22 22 22C22 22 16 18 16 12C16 6 22 6 22 6Z" fill="#00A896"/>
                <path d="M22 38C22 38 28 38 28 32C28 26 22 22 22 22C22 22 16 26 16 32C16 38 22 38 22 38Z" fill="#00A896"/>
                <path d="M6 22C6 22 6 16 12 16C18 16 22 22 22 22C22 22 18 28 12 28C6 28 6 22 6 22Z" fill="#00A896"/>
                <path d="M38 22C38 22 38 16 32 16C26 16 22 22 22 22C22 22 26 28 32 28C38 28 38 22 38 22Z" fill="#00A896"/>
                <rect x="20" y="10" width="4" height="24" rx="2" fill="#00A896"/>
                <rect x="10" y="20" width="24" height="4" rx="2" fill="#00A896"/>
              </svg>
              <div>
                <span className={styles.logoMain}>dermo</span>
                <span className={styles.logoSub}>pharma</span>
              </div>
            </Link>

            <p className={styles.brandDescription}>
              Doğal içerikli, dermatolojik olarak test edilmiş kişisel bakım, kozmetik ve sağlıklı yaşam ürünlerinde kurumsal ve güvenilir adresiniz.
            </p>

            <div className={styles.contactList}>
              <div className={styles.contactItem}>
                <Phone size={16} className={styles.contactIcon} />
                <span>0850 885 00 00</span>
              </div>
              <div className={styles.contactItem}>
                <Mail size={16} className={styles.contactIcon} />
                <span>destek@dermopharma.com</span>
              </div>
              <div className={styles.contactItem}>
                <Clock size={16} className={styles.contactIcon} />
                <span>Hafta içi: 09:00 - 18:00</span>
              </div>
            </div>
          </div>

          {/* Kolon 2: Hızlı Kategoriler */}
          <div className={styles.linksCol}>
            <h3 className={styles.colTitle}>Kategoriler</h3>
            <ul className={styles.linksList}>
              <li><Link to="/category/Cilt%20Bakımı">Cilt Bakımı</Link></li>
              <li><Link to="/category/Saç%20Bakımı">Saç Bakımı</Link></li>
              <li><Link to="/category/Güneş%20Bakımı">Güneş Ürünleri</Link></li>
              <li><Link to="/category/Vücut%20Bakımı">Vücut & Banyo</Link></li>
              <li><Link to="/yeni-urunler">Yeni Çıkanlar</Link></li>
              <li><Link to="/kampanyalar">Fırsat Kampanyaları</Link></li>
            </ul>
          </div>

          {/* Kolon 3: Müşteri Hizmetleri */}
          <div className={styles.linksCol}>
            <h3 className={styles.colTitle}>Müşteri Hizmetleri</h3>
            <ul className={styles.linksList}>
              <li><Link to="/profile/orders">Sipariş Takibi</Link></li>
              <li><Link to="/profile/returns">İptal & İade Talepleri</Link></li>
              <li><Link to="/profile/notifications">Bildirimlerim</Link></li>
              <li><Link to="/profile/favorites">Favori Listem</Link></li>
              <li><Link to="/cilt-analizi">Akıllı Cilt Analizi Testi</Link></li>
              <li><Link to="/blog">Sağlık & Güzellik Rehberi</Link></li>
            </ul>
          </div>

          {/* Kolon 4: Kurumsal & Güvenlik */}
          <div className={styles.linksCol}>
            <h3 className={styles.colTitle}>Kurumsal & Güvenlik</h3>
            <ul className={styles.linksList}>
              <li><a href="#hakkimizda" onClick={(e) => e.preventDefault()}>Hakkımızda</a></li>
              <li><a href="#kvkk" onClick={(e) => e.preventDefault()}>KVKK Aydınlatma Metni</a></li>
              <li><a href="#gizlilik" onClick={(e) => e.preventDefault()}>Gizlilik ve Çerez Politikası</a></li>
              <li><a href="#sozlesme" onClick={(e) => e.preventDefault()}>Mesafeli Satış Sözleşmesi</a></li>
              <li><a href="#teslimat" onClick={(e) => e.preventDefault()}>Teslimat ve Kargo Bilgileri</a></li>
            </ul>

            <div className={styles.trustBadgeBox}>
              <Lock size={15} color="#10b981" />
              <span>256-Bit SSL Sertifikalı Güvenli Alışveriş</span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Alt Telif ve Ödeme Yöntemleri */}
      <div className={styles.bottomBar}>
        <div className={`container ${styles.bottomContainer}`}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} <strong>DermoPharma</strong> WMS & ERP Entegre E-Ticaret Platformu. Tüm hakları saklıdır.
          </p>

          <div className={styles.paymentBadges}>
            <span className={styles.paymentCard}>VISA</span>
            <span className={styles.paymentCard}>Mastercard</span>
            <span className={styles.paymentCard}>TROY</span>
            <span className={styles.paymentCard}>3D Secure</span>
            <span className={styles.paymentCard}>SSL 256-Bit</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
