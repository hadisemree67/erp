/**
 * ============================================================================
 * DOSYA ADI: Sidebar.jsx
 * MODÜL / KATMAN: Önyüz Bileşeni - Ana Menü ve Navigasyon (Sidebar)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Uygulamanın sol tarafında yer alan ana gezinme menüsüdür. Kullanıcının yetkilerine (permissions) göre ilgili modülleri (Ürünler, WMS, Üretim, İK, Satınalma vb.) gösterir veya gizler; sayfa değişimlerini tetikler.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React, Lucide-React İkonları, CSS Modülasyonu, Yetki Denetim Mantığı
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - App.jsx ile koordine çalışarak kullanıcının sistem içinde menüler arası gezinmesini sağlar.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (Sidebar.jsx), Uygulamanın arayüz bileşenlerini barındırır.
 */

import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import './Sidebar.css';

const Sidebar = ({ onLogout, onNavigate, currentView, userRole, currentUser }) => {
  // 1. Durum (State) Tanımlamaları ve Hook'lar
  const [openDropdown, setOpenDropdown] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [pendingCount, setPendingCount] = useState(0);

  // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

  useEffect(() => {
    // 3. Backend API İstekleri (Veri Çekme)
    const fetchPendingCount = async () => {
      try {
        const res = await apiFetch('http://localhost:3000/api/production/requests');
        const data = await res.json();
        if (data.success) {
          setPendingCount(data.data.filter(r => r.status === 'Bekleyen').length);
        }
      } catch (err) {}
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);
  const isResizing = useRef(false);

  const toggleDropdown = (menuName) => {
    if (sidebarWidth < 120) setSidebarWidth(280);
    setOpenDropdown(openDropdown === menuName ? null : menuName);
  };

  useEffect(() => {
    // 4. Arayüz Etkileşim ve Kontrol Fonksiyonları (Event Handlers)
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      let newWidth = e.clientX;
      if (newWidth < 80) newWidth = 80; // Minimum width
      if (newWidth > 600) newWidth = 600; // Maximum width
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const isCollapsed = sidebarWidth < 120;

  const toggleCollapse = () => {
    if (isCollapsed) {
      setSidebarWidth(280);
    } else {
      setSidebarWidth(80);
      setOpenDropdown(null);
    }
  };

  const hasPerm = (key) => userRole === 'admin' || (currentUser?.permissions || []).includes(key);

  const canSeeProducts = hasPerm('view_products');
  const canSeeHR = hasPerm('view_employees');
  const canSeeOffboarding = hasPerm('view_offboarding');
  const canSeeStaff = hasPerm('view_staff');
  const canSeeActivity = hasPerm('view_activity_log');
  const canSeeCRM = hasPerm('view_crm');
  const canSeeFinance = hasPerm('view_finance');
  const canSeeWMS = hasPerm('view_wms');
  const canSeeProcurement = hasPerm('view_procurement');
  const canSeeOrders = hasPerm('view_orders');
  const canSeeProduction = hasPerm('view_production');
  const canSeeCampaigns = hasPerm('view_campaigns');
  const canSeeReports = hasPerm('view_reports');
  const canManageBoxes = hasPerm('box_manage');
  const canManageStockEntry = hasPerm('stock_entry');
  const canViewInventory = hasPerm('inventory_view');
  const canManageSuppliers = hasPerm('supplier_manage');

  const roleNameMap = {
    admin: 'Sistem Yöneticisi',
    hr: 'İnsan Kaynakları',
    erp: 'ERP Uzmanı',
    legal: 'Hukuk Yetkilisi',
    finance: 'Finans Yetkilisi',
    idari: 'İdari İşler',
    manager: 'Alt Yönetici'
  };

  // 5. Arayüz (UI) Çizimi ve Render Edilmesi

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ width: `${sidebarWidth}px`, transition: isResizing.current ? 'none' : 'width 0.2s ease' }}>
      {/* Header Section */}
      <div className="sidebar-header" style={{ cursor: 'pointer' }} onClick={() => { if(hasPerm('view_dashboard')) onNavigate('anasayfa'); }}>
        <h2 className="brand-name">ERP</h2>
        <button className="collapse-btn" onClick={(e) => { e.stopPropagation(); toggleCollapse(); }} title="Menüyü Daralt/Genişlet">
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="sidebar-nav">
        
        {/* 1. Ürün Yönetimi */}
        {canSeeProducts && (
          <div className="nav-item">
            <div className={`nav-link ${(openDropdown === 'urunler' || currentView === 'urun-ekle' || currentView === 'urun-listesi' || currentView === 'fason-urunler' || currentView === 'ticari-urunler') ? 'active' : ''}`} onClick={() => toggleDropdown('urunler')}>
              <span className="nav-icon"></span>
              <span className="nav-text">Ürün Yönetimi</span>
              <span className={`nav-arrow ${openDropdown === 'urunler' ? 'open' : ''}`}>▼</span>
            </div>
            {openDropdown === 'urunler' && (
              <div className="dropdown-menu">
                {hasPerm('product_add') && <a href="#yeni-urun" className={`dropdown-item ${currentView === 'urun-ekle' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('urun-ekle'); }}>Yeni Ürün Tanımla</a>}
                <a href="#urun-listesi" className={`dropdown-item ${currentView === 'urun-listesi' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('urun-listesi'); }}>Ürünleri Görüntüle</a>
                <a href="#fason-urunler" className={`dropdown-item ${currentView === 'fason-urunler' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('fason-urunler'); }}>Fason Ürünler (Dış)</a>
                <a href="#ticari-urunler" className={`dropdown-item ${currentView === 'ticari-urunler' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('ticari-urunler'); }}>Ticari Ürünler (Satın Al)</a>
              </div>
            )}
          </div>
        )}

        {/* 2. Satın Alma Yönetimi */}
        {(canSeeProcurement || canManageSuppliers) && (
          <div className="nav-item">
            <div className={`nav-link ${openDropdown === 'satinalma' ? 'active' : ''}`} onClick={() => toggleDropdown('satinalma')}>
              <span className="nav-icon"></span>
              <span className="nav-text">Satın Alma Yönetimi</span>
              <span className={`nav-arrow ${openDropdown === 'satinalma' ? 'open' : ''}`}>▼</span>
            </div>
            {openDropdown === 'satinalma' && (
              <div className="dropdown-menu">
                {canSeeProcurement && <a href="#satinalma-talepleri" className={`dropdown-item ${currentView === 'satin-alma-talepleri' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('satin-alma-talepleri'); }}>Satın Alma Talepleri (PR)</a>}
                {canSeeProcurement && <a href="#satinalma-siparisleri" className={`dropdown-item ${currentView === 'tedarik-siparisleri' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('tedarik-siparisleri'); }}>Satın Alma Siparişleri (PO)</a>}
                {canManageSuppliers && <a href="#tedarikciler-listesi" className={`dropdown-item ${currentView === 'tedarikciler' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('tedarikciler'); }}>Tedarikçi Firmalar (Ekle/Düzenle)</a>}
              </div>
            )}
          </div>
        )}

        {/* 3. Stok & Envanter */}
        {(canManageStockEntry || canViewInventory || canManageBoxes) && (
          <div className="nav-item">
            <div className={`nav-link ${openDropdown === 'stok' ? 'active' : ''}`} onClick={() => toggleDropdown('stok')}>
              <span className="nav-icon"></span>
              <span className="nav-text">Stok & Envanter</span>
              <span className={`nav-arrow ${openDropdown === 'stok' ? 'open' : ''}`}>▼</span>
            </div>
            {openDropdown === 'stok' && (
              <div className="dropdown-menu">
                {canManageStockEntry && <a href="#stok-giris" className={`dropdown-item ${currentView === 'stok-giris' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('stok-giris'); }}>Stok Girişi</a>}
                {canViewInventory && <a href="#stok-listesi" className={`dropdown-item ${currentView === 'stok-listesi' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('stok-listesi'); }}>Stok Listesi</a>}
                {canManageStockEntry && <a href="#envanter-giris" className={`dropdown-item ${currentView === 'envanter-giris' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('envanter-giris'); }}>Malzeme Girişi (Envanter)</a>}
                {canViewInventory && <a href="#envanter-listesi" className={`dropdown-item ${currentView === 'envanter-listesi' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('envanter-listesi'); }}>Envanter Listesi</a>}
                {canManageBoxes && <a href="#kutu-tanim" className={`dropdown-item ${currentView === 'kutu-tanim' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('kutu-tanim'); }}>Ambalaj / Kutu Ayarları</a>}
              </div>
            )}
          </div>
        )}

        {/* 4. Depo İşlemleri */}
        {canSeeWMS && (
          <div className="nav-item">
            <div className={`nav-link ${openDropdown === 'depo' ? 'active' : ''}`} onClick={() => toggleDropdown('depo')}>
              <span className="nav-icon"></span>
              <span className="nav-text">Depo İşlemleri</span>
              <span className={`nav-arrow ${openDropdown === 'depo' ? 'open' : ''}`}>▼</span>
            </div>
            {openDropdown === 'depo' && (
              <div className="dropdown-menu">
                <a href="#mal-kabul" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('mal-kabul'); }}>Mal Kabul (Depo Onayı)</a>
                <a href="#depo-kabulleri" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('depo-kabulleri'); }}>Depo Kabulleri</a>
                <a href="#depo-listesi" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('depo-listesi'); }}>Depolar & Raflar</a>
                <a href="#tasima-arabalari" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('tasima-arabalari'); }}>Taşıma Arabaları</a>
                <a href="#depo-transfer" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('depo-transfer'); }}>Depo Transferleri</a>
                <a href="#depo-krokisi" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('depo-krokisi'); }}>Depo Krokisi</a>
                <a href="#whatsapp-onaylari" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('whatsapp-onaylari'); }}>WhatsApp Onayları</a>
              </div>
            )}
          </div>
        )}

        {/* 5. Üretim Yönetimi */}
        {canSeeProduction && (
          <div className="nav-item">
            <div className={`nav-link ${openDropdown === 'uretim' ? 'active' : ''}`} onClick={() => toggleDropdown('uretim')}>
              <span className="nav-icon"></span>
              <span className="nav-text">Üretim Yönetimi</span>
              <span className={`nav-arrow ${openDropdown === 'uretim' ? 'open' : ''}`}>▼</span>
            </div>
            {openDropdown === 'uretim' && (
              <div className="dropdown-menu">
                <a href="#uretim-yap" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('uretim-yap'); }}>Yeni Üretim (Üretim Yap)</a>
                <a href="#uretim-talepleri" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('uretim-talepleri'); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Üretim Talepleri
                  {pendingCount > 0 && <span style={{ backgroundColor: '#ef4444', color: 'white', borderRadius: '10px', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>{pendingCount}</span>}
                </a>
                <a href="#uretim-listesi" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('uretim-listesi'); }}>Üretim Listesi</a>
                <a href="#makine-listesi" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('makine-listesi'); }}>Makineler</a>
              </div>
            )}
          </div>
        )}

        {/* 6. Sipariş Yönetimi */}
        {canSeeOrders && (
          <div className="nav-item">
            <div className={`nav-link ${currentView === 'aktif-siparis' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('aktif-siparis'); }}>
              <span className="nav-icon"></span>
              <span className="nav-text">Sipariş Yönetimi</span>
            </div>
          </div>
        )}

        {/* 7. Müşteri İlişkileri (CRM) */}
        {canSeeCRM && (
          <div className="nav-item">
            <div className={`nav-link ${(openDropdown === 'crm' || currentView === 'musteri-ekle' || currentView === 'musteri-listesi' || currentView === 'b2b-b2c-cari') ? 'active' : ''}`} onClick={() => toggleDropdown('crm')}>
              <span className="nav-icon"></span>
              <span className="nav-text">Müşteri İlişkileri (CRM)</span>
              <span className={`nav-arrow ${openDropdown === 'crm' ? 'open' : ''}`}>▼</span>
            </div>
            {openDropdown === 'crm' && (
              <div className="dropdown-menu">
                <a href="#musteri-ekle" className={`dropdown-item ${currentView === 'musteri-ekle' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('musteri-ekle'); }}>Yeni Müşteri Ekle</a>
                <a href="#musteri-listesi" className={`dropdown-item ${currentView === 'musteri-listesi' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('musteri-listesi'); }}>Müşteri Listesi</a>
                <a href="#b2b-b2c-cari" className={`dropdown-item ${currentView === 'b2b-b2c-cari' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('b2b-b2c-cari'); }}>B2B / B2C Cari Hesapları</a>
                <a href="#sikayet-oneri" className="dropdown-item">Şikayet ve Talepler</a>
              </div>
            )}
          </div>
        )}

        {/* 8. Kampanyalar */}
        {canSeeCampaigns && (
          <div className="nav-item">
            <div className={`nav-link ${currentView === 'kampanya-listesi' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('kampanya-listesi'); }}>
              <span className="nav-icon"></span>
              <span className="nav-text">Kampanyalar</span>
            </div>
          </div>
        )}

        {/* 9. Finans & Muhasebe */}
        {canSeeFinance && (
          <div className="nav-item">
            <div className={`nav-link ${(openDropdown === 'finans' || currentView === 'gelir-gider') ? 'active' : ''}`} onClick={() => toggleDropdown('finans')}>
              <span className="nav-icon"></span>
              <span className="nav-text">Finans & Muhasebe</span>
              <span className={`nav-arrow ${openDropdown === 'finans' ? 'open' : ''}`}>▼</span>
            </div>
            {openDropdown === 'finans' && (
              <div className="dropdown-menu">
                <a href="#kasa-banka" className="dropdown-item">Kasa & Banka Yönetimi</a>
                <a href="#gelir-gider" className={`dropdown-item ${currentView === 'gelir-gider' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('gelir-gider'); }}>Gelir & Gider Hesapları</a>
                <a href="#fatura" className="dropdown-item">Fatura / E-Fatura</a>
                <a href="#cari-ekstre" className="dropdown-item">Cari Hesap Ekstreleri</a>
              </div>
            )}
          </div>
        )}

        {/* 10. Raporlar & Analiz */}
        {canSeeReports && (
          <div className="nav-item">
            <a href="#raporlar" className={`nav-link direct-link ${currentView === 'raporlar' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('raporlar'); }}>
              <span className="nav-icon"></span>
              <span className="nav-text">Raporlar & Analiz</span>
            </a>
          </div>
        )}

        {/* 11. Son Hareketler */}
        {canSeeActivity && (
          <div className="nav-item">
            <a href="#son-hareketler" className={`nav-link direct-link ${currentView === 'son-hareketler' ? 'active' : ''}`} onClick={() => onNavigate('son-hareketler')}>
              <span className="nav-icon"></span>
              <span className="nav-text">Son Hareketler</span>
            </a>
          </div>
        )}

        {/* 12. Sistem Kullanıcıları */}
        {canSeeStaff && (
          <div className="nav-item">
            <div className={`nav-link ${(openDropdown === 'sistem-kullanicilari' || currentView === 'personeller' || currentView === 'personel-ekle') ? 'active' : ''}`} onClick={() => toggleDropdown('sistem-kullanicilari')}>
              <span className="nav-icon"></span>
              <span className="nav-text">Sistem Kullanıcıları</span>
              <span className={`nav-arrow ${openDropdown === 'sistem-kullanicilari' ? 'open' : ''}`}>▼</span>
            </div>
            {openDropdown === 'sistem-kullanicilari' && (
              <div className="dropdown-menu">
                <a href="#yeni-kullanici" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('personel-ekle'); }}>Yeni Kullanıcı Aç</a>
                <a href="#kullanici-listesi" className="dropdown-item" onClick={(e) => { e.preventDefault(); onNavigate('personeller'); }}>Kullanıcı Listesi & Rol</a>
              </div>
            )}
          </div>
        )}

        {/* 13. Personel & Çıkış */}
        {(canSeeHR || canSeeOffboarding) && (
          <div className="nav-item">
            <div className={`nav-link ${(openDropdown === 'ik' || currentView === 'insan-kaynaklari' || currentView === 'personel-kaydi' || currentView === 'personel-cikis' || currentView === 'izin-yonetimi' || currentView === 'mesai-yonetimi') ? 'active' : ''}`} onClick={() => toggleDropdown('ik')}>
              <span className="nav-icon"></span>
              <span className="nav-text">Personel & Çıkış</span>
              <span className={`nav-arrow ${openDropdown === 'ik' ? 'open' : ''}`}>▼</span>
            </div>
            {openDropdown === 'ik' && (
              <div className="dropdown-menu">
                {hasPerm('employee_add') && <a href="#yeni-personel" className={`dropdown-item ${currentView === 'personel-kaydi' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('personel-kaydi'); }}>Yeni Personel Kaydı</a>}
                {canSeeHR && <a href="#personel-listesi" className={`dropdown-item ${currentView === 'insan-kaynaklari' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('insan-kaynaklari'); }}>Personel Listesi</a>}
                {canSeeHR && <a href="#mesai-yonetimi" className={`dropdown-item ${currentView === 'mesai-yonetimi' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('mesai-yonetimi'); }}>Mesai ve Maaşlar</a>}
                {hasPerm('view_leaves') && <a href="#izin-yonetimi" className={`dropdown-item ${currentView === 'izin-yonetimi' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('izin-yonetimi'); }}>İzin Yönetimi</a>}
                {canSeeOffboarding && <a href="#personel-cikis" className={`dropdown-item ${currentView === 'personel-cikis' ? 'active-sub' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('personel-cikis'); }}>Personel Çıkış İşlemleri</a>}
              </div>
            )}
          </div>
        )}

        {/* 14. Araçlar & İçe Aktarma */}
        {hasPerm('view_dashboard') && (
          <div className="nav-item">
            <a href="#veri-ice-aktar" className={`nav-link direct-link ${currentView === 'veri-ice-aktar' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('veri-ice-aktar'); }}>
              <span className="nav-icon"></span>
              <span className="nav-text">Veri İçe Aktar (Excel)</span>
            </a>
          </div>
        )}

        {/* 15. Sistem Ayarları */}
        {(userRole === 'Yönetici' || userRole === 'Admin') && (
          <div className="nav-item">
            <a href="#ayarlar" className={`nav-link direct-link ${currentView === 'ayarlar' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('ayarlar'); }}>
              <span className="nav-icon"></span>
              <span className="nav-text">Sistem Ayarları</span>
            </a>
          </div>
        )}

      </div>

      {/* Bottom Section (User Card) */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">
            {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{currentUser?.name || 'Kullanıcı Profilim'}</span>
            <span className="user-role">{roleNameMap[userRole] || 'Personel'}</span>
            <span className="user-dept">X ŞİRKET</span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Çıkış Yap">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M12 21c-1.103 0-2-.897-2-2v-3H8v3c0 2.206 1.794 4 4 4h8c2.206 0 4-1.794 4-4V5c0-2.206-1.794-4-4-4h-8c-2.206 0-4 1.794-4 4v3h2V5c0-1.103.897-2 2-2h8c1.103 0 2 .897 2 2v14c0 1.103-.897 2-2 2h-8z" />
              <path d="M13 16l5-4-5-4v3H2v2h11z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Resizer Handle */}
      <div className="sidebar-resizer" onMouseDown={handleMouseDown}></div>
    </div>
  );
};

export default Sidebar;
