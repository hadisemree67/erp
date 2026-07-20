import React, { useState, useEffect, useRef } from 'react';
import './Sidebar.css';

const Sidebar = ({ onLogout, onNavigate, currentView }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isResizing = useRef(false);

  const toggleDropdown = (menuName) => {
    if (sidebarWidth < 120) setSidebarWidth(280);
    setOpenDropdown(openDropdown === menuName ? null : menuName);
  };

  useEffect(() => {
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

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ width: `${sidebarWidth}px`, transition: isResizing.current ? 'none' : 'width 0.2s ease' }}>
      {/* Header Section */}
      <div className="sidebar-header" style={{ cursor: 'pointer' }} onClick={() => onNavigate('anasayfa')}>
        <h2 className="brand-name">ERP</h2>
        <button className="collapse-btn" onClick={(e) => { e.stopPropagation(); toggleCollapse(); }} title="Menüyü Daralt/Genişlet">
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation Items */}
      <div className="sidebar-nav">
        
        {/* Ürün Yönetimi */}
        <div className="nav-item">
          <div className={`nav-link ${openDropdown === 'urunler' ? 'active' : ''}`} onClick={() => toggleDropdown('urunler')}>
            <span className="nav-icon"></span>
            <span className="nav-text">Ürün Yönetimi</span>
            <span className={`nav-arrow ${openDropdown === 'urunler' ? 'open' : ''}`}>▼</span>
          </div>
          {openDropdown === 'urunler' && (
            <div className="dropdown-menu">
              <a href="#yeni-urun" className="dropdown-item">Yeni Ürün Tanımla</a>
              <a href="#urun-listesi" className="dropdown-item">Ürünleri Görüntüle</a>
            </div>
          )}
        </div>

        {/* Stok & Envanter */}
        <div className="nav-item">
          <div className={`nav-link ${openDropdown === 'stok' ? 'active' : ''}`} onClick={() => toggleDropdown('stok')}>
            <span className="nav-icon"></span>
            <span className="nav-text">Stok & Envanter</span>
            <span className={`nav-arrow ${openDropdown === 'stok' ? 'open' : ''}`}>▼</span>
          </div>
          {openDropdown === 'stok' && (
            <div className="dropdown-menu dropdown-large">
              <div className="subsection">
                <div className="subsection-title">SATIŞLIK ÜRÜNLER</div>
                <a href="#stok-girisi" className="dropdown-item">Stok Girişi Yap (Mamul)</a>
                <a href="#stok-goruntule" className="dropdown-item">Stok Görüntüle</a>
              </div>
              <div className="subsection">
                <div className="subsection-title">MALZEME & HAMMADDE</div>
                <a href="#malzeme-girisi" className="dropdown-item">Malzeme Girişi Yap</a>
                <a href="#envanter-takibi" className="dropdown-item">Envanter Takibi</a>
              </div>
              <div className="subsection bottom-links">
                <a href="#azalan-urunler" className="dropdown-item azalan">
                  Azalan Ürünler <span className="badge">3</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Personel Yönetimi */}
        <div className="nav-item">
          <div className={`nav-link ${openDropdown === 'personel' ? 'active' : ''}`} onClick={() => toggleDropdown('personel')}>
            <span className="nav-icon"></span>
            <span className="nav-text">Personel Yönetimi</span>
            <span className={`nav-arrow ${openDropdown === 'personel' ? 'open' : ''}`}>▼</span>
          </div>
          {openDropdown === 'personel' && (
            <div className="dropdown-menu">
              <a href="#yeni-personel" className="dropdown-item">Yeni Personel Ekle</a>
              <a href="#personel-listesi" className="dropdown-item">Personel Listesi & Rol</a>
            </div>
          )}
        </div>

        {/* Sipariş Yönetimi */}
        <div className="nav-item">
          <div className={`nav-link ${openDropdown === 'siparis' ? 'active' : ''}`} onClick={() => toggleDropdown('siparis')}>
            <span className="nav-icon"></span>
            <span className="nav-text">Sipariş Yönetimi</span>
            <span className={`nav-arrow ${openDropdown === 'siparis' ? 'open' : ''}`}>▼</span>
          </div>
          {openDropdown === 'siparis' && (
            <div className="dropdown-menu">
              <a href="#aktif-siparis" className="dropdown-item">Aktif / Hazırlananlar</a>
              <a href="#gecmis-siparis" className="dropdown-item">Geçmiş Siparişler</a>
              <a href="#iade-iptal" className="dropdown-item">İade ve İptaller</a>
            </div>
          )}
        </div>

        {/* Direct Links */}
        <div className="nav-item">
          <a href="#son-hareketler" className={`nav-link direct-link ${currentView === 'son-hareketler' ? 'active' : ''}`} onClick={() => onNavigate('son-hareketler')}>
            <span className="nav-icon"></span>
            <span className="nav-text">Son Hareketler</span>
          </a>
        </div>

        <div className="nav-item">
          <a href="#raporlar" className="nav-link direct-link">
            <span className="nav-icon"></span>
            <span className="nav-text">Raporlar & Analiz</span>
          </a>
        </div>

        {/* Kampanyalar */}
        <div className="nav-item">
          <div className={`nav-link ${openDropdown === 'kampanyalar' ? 'active' : ''}`} onClick={() => toggleDropdown('kampanyalar')}>
            <span className="nav-icon"></span>
            <span className="nav-text">Kampanyalar</span>
            <span className={`nav-arrow ${openDropdown === 'kampanyalar' ? 'open' : ''}`}>▼</span>
          </div>
          {openDropdown === 'kampanyalar' && (
            <div className="dropdown-menu">
              <a href="#kampanya-ekle" className="dropdown-item">Kampanya Ekle</a>
              <a href="#kampanyalar-listesi" className="dropdown-item">Kampanyalar</a>
            </div>
          )}
        </div>

        {/* Tedarikçiler */}
        <div className="nav-item">
          <div className={`nav-link ${openDropdown === 'tedarikciler' ? 'active' : ''}`} onClick={() => toggleDropdown('tedarikciler')}>
            <span className="nav-icon"></span>
            <span className="nav-text">Tedarikçiler (Firmalar)</span>
            <span className={`nav-arrow ${openDropdown === 'tedarikciler' ? 'open' : ''}`}>▼</span>
          </div>
          {openDropdown === 'tedarikciler' && (
            <div className="dropdown-menu">
              <a href="#tedarikci-ekle" className="dropdown-item">Tedarikçi Ekle</a>
              <a href="#tedarikciler-listesi" className="dropdown-item">Tedarikçiler</a>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Section (User Card) */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar"></div>
          <div className="user-info">
            <span className="user-name">Hadis Emre Yılmaz</span>
            <span className="user-role">Yönetici (Admin)</span>
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
