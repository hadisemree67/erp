/**
 * ============================================================================
 * DOSYA ADI: App.jsx
 * MODÜL / KATMAN: Önyüz Çekirdeği - Ana Uygulama Bileşeni ve Yönlendirme (Routing)
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Uygulamanın ana kabuğunu (shell) oluşturur. Kullanıcının oturum durumunu yönetir, aktif sayfalar arası geçişi (tab/navigation) kontrol eder ve sol menü (Sidebar) ile içerik alanını bütünleştirir.
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - React (useState, useEffect hook'ları), Durum Yönetimi (State Management)
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - Tüm alt sayfa bileşenlerini (WMS, Products, Employees vb.) içinde barındıran en üst düzey kök bileşendir.
 * ============================================================================
 */

/*
 * ÖZET:
 * Bu dosya (App.jsx), Uygulamanın ana çekirdeği; genel yönlendirme (routing), kenar çubuğu (Sidebar) ve hata yakalama (ErrorBoundary) yapılarını barındırır.
 */

import { useState, useEffect } from 'react';
import { apiFetch } from './utils/api';
import Sidebar from './components/Sidebar';
import ActivityLog from './components/ActivityLog';
import ProductList from './components/Products/ProductList';
import ProductForm from './components/Products/ProductForm';
import OutsourcedProducts from './components/Products/OutsourcedProducts';
import PurchasedProducts from './components/Products/PurchasedProducts';
import StaffList from './components/Staff/StaffList';
import StaffForm from './components/Staff/StaffForm';
import EmployeeList from './components/Employees/EmployeeList';
import EmployeeForm from './components/Employees/EmployeeForm';
import EmployeeOffboard from './components/Employees/EmployeeOffboard';
import LeaveManagement from './components/Employees/LeaveManagement';
import OvertimeManagement from './components/Employees/OvertimeManagement';
import StockEntry from './components/WMS/StockEntry';
import StockList from './components/WMS/StockList';
import InventoryEntry from './components/WMS/InventoryEntry';
import InventoryList from './components/WMS/InventoryList';
import WhatsAppApprovals from './components/WMS/WhatsAppApprovals';
import WarehouseList from './components/Warehouses/WarehouseList';
import WarehouseForm from './components/Warehouses/WarehouseForm';
import PickingCarts from './components/Warehouses/PickingCarts';
import WarehouseTransfer from './components/WMS/WarehouseTransfer';
import WarehouseAcceptance from './components/WMS/WarehouseAcceptance';
import WarehouseLayout from './components/Warehouses/WarehouseLayout';
import SupplierList from './components/Suppliers/SupplierList';
import MachineList from './components/Production/MachineList';
import ProductionOrder from './components/Production/ProductionOrder';
import ProductionList from './components/Production/ProductionList';
import ProductionDetail from './components/Production/ProductionDetail';
import ProductionRequests from './components/Production/ProductionRequests';
import PurchaseRequests from './components/Purchasing/PurchaseRequests';
import PurchaseOrders from './components/Purchasing/PurchaseOrders';
import GoodsReceipt from './components/WMS/GoodsReceipt';
import CampaignList from './components/Campaigns/CampaignList';
import CampaignForm from './components/Campaigns/CampaignForm';
import Coupons from './components/Campaigns/Coupons';
import FinanceAccounts from './components/Finance/FinanceAccounts';
import CustomerList from './components/Customers/CustomerList';
import CustomerForm from './components/Customers/CustomerForm';
import CustomerOrders from './components/Orders/CustomerOrders';
import PackagingBoxes from './components/Orders/PackagingBoxes';
import OrderPacking from './components/Orders/OrderPacking';
import CourierDelivery from './components/Orders/CourierDelivery';
import Reports from './components/Reports/Reports';
import Settings from './components/Settings/Settings';
import DataImport from './components/DataImport/DataImport';
import DataExport from './components/DataExport/DataExport';
import './index.css';

function App() {
  // 1. Durum (State) Tanımlamaları ve Hook'lar
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('anasayfa');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalBrands: 0,
    totalCategories: 0,
    lowStock: 0,
    todayOrders: 0
  });

  // 3. Backend API İstekleri (Veri Çekme)

  const fetchStats = async () => {
    try {
      const res = await apiFetch('http://localhost:3000/api/dashboard-stats');
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (e) {
      console.error('Stats fetching error:', e);
    }
  };

  const fetchPendingRequests = async () => {
    if (!isLoggedIn) return;
    const canSee = currentUser?.role === 'admin' || currentUser?.role === 'Üretim' || (currentUser?.permissions || []).includes('view_production');
    if (!canSee) return;
    try {
      const res = await apiFetch('http://localhost:3000/api/production/requests');
      const data = await res.json();
      if (data.success) {
        setPendingRequests(data.data.filter(r => r.status === 'Bekleyen'));
      }
    } catch (err) {
      console.error('Bildirimler alınamadı', err);
    }
  };

  // 2. Sayfa Yüklendiğinde Çalışacak İşlemler (useEffect)

  useEffect(() => {
    if (isLoggedIn) {
      fetchPendingRequests();
      const interval = setInterval(fetchPendingRequests, 30000); // Her 30 saniyede bir kontrol et
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await apiFetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, role })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);
        setIsLoggedIn(true);
        const perms = data.user.permissions || [];
        const isAdmin = data.user.role === 'admin';
        
        if (isAdmin || perms.includes('view_dashboard')) {
          setCurrentView('anasayfa');
          fetchStats();
        } else if (perms.includes('view_products')) {
          setCurrentView('urun-listesi');
        } else if (perms.includes('view_employees')) {
          setCurrentView('insan-kaynaklari');
        } else if (perms.includes('view_offboarding')) {
          setCurrentView('personel-cikis');
        } else {
          setCurrentView('anasayfa');
        }
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
    // 5. Arayüz (UI) Çizimi ve Render Edilmesi
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
        <Sidebar 
          currentUser={currentUser}
          userRole={currentUser?.role}
          onLogout={async () => { 
            try {
              // Sunucu tarafında token'ı kara listeye al (Blacklist)
              await apiFetch('http://localhost:3000/api/logout', { method: 'POST' });
            } catch (e) {
              console.error("Logout API hatası:", e);
            }
            // İstemci tarafında temizle
            localStorage.removeItem('token');
            setIsLoggedIn(false); 
            setCurrentUser(null); 
            window.location.reload();
          }}
          onNavigate={(view) => {
            setCurrentView(view);
            if (view === 'anasayfa') fetchStats();
          }} 
          currentView={currentView}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top Navbar - Only show in Production views */}
          {['makine-listesi', 'uretim-yap', 'uretim-listesi', 'uretim-talepleri', 'uretim-detayi'].includes(currentView) && (
          <div style={{ padding: '16px 32px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', fontSize: '20px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Bildirimler"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {pendingRequests.length > 0 && (
                  <span style={{ position: 'absolute', top: '0', right: '0', backgroundColor: '#333', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px' }}>
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div style={{ position: 'absolute', top: '100%', right: '0', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', width: '350px', zIndex: 1000, marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{pendingRequests.length} Yeni Talep</span>
                    <button 
                      onClick={() => { setShowNotifications(false); setCurrentView('uretim-talepleri'); }}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Tümünü Gör &rarr;
                    </button>
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {pendingRequests.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Bekleyen talep yok.</div>
                    ) : (
                      pendingRequests
                        .sort((a, b) => (a.priority === 'Acil' && b.priority !== 'Acil' ? -1 : a.priority !== 'Acil' && b.priority === 'Acil' ? 1 : 0))
                        .slice(0, 5).map(req => (
                        <div key={req.id} onClick={() => { setShowNotifications(false); setCurrentView('uretim-talepleri'); }} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: req.priority === 'Acil' ? '#fef2f2' : 'white' }} className="notification-item">
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '16px' }}>{req.source === 'Otomatik' ? '🤖' : '👤'}</div>
                            <div>
                              <div style={{ fontSize: '13px', color: req.priority === 'Acil' ? '#dc2626' : '#0f172a', fontWeight: 'bold' }}>
                                {req.priority === 'Acil' && '🚨 '}
                                {req.source === 'Otomatik' ? 'OTOMATİK:' : `${req.creator}:`} {req.ProductName}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Talep: {req.requested_quantity} Adet</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
          
          <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          
          {currentView === 'ayarlar' && <Settings currentUser={currentUser} />}
          {currentView === 'anasayfa' && (
            <div>
              <h1 style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif', fontSize: '24px', fontWeight: 'bold' }}>
                Gösterge Paneli
              </h1>
              <p style={{ color: '#64748b', marginTop: '8px', marginBottom: '24px' }}>Sisteminizin genel durumunu buradan takip edebilirsiniz.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Toplam Ürün Çeşidi</div>
                  <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{stats.totalProducts}</div>
                  <div style={{ color: '#10b981', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>Sistemdeki ürünler</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Kayıtlı Markalar</div>
                  <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{stats.totalBrands}</div>
                  <div style={{ color: '#10b981', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>Sistemdeki markalar</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Azalan Stoklar</div>
                  <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{stats.lowStock}</div>
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>Kalan: 10 ve altı</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>Bugünkü Siparişler</div>
                  <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>0</div>
                  <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>Henüz modül hazır değil</div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'son-hareketler' && <ActivityLog currentUser={currentUser} />}

          {currentView === 'urun-listesi' && <ProductList currentUser={currentUser} onNavigate={setCurrentView} />}
          {currentView === 'urun-ekle' && <ProductForm currentUser={currentUser} product={null} onClose={() => setCurrentView('urun-listesi')} />}
          {currentView === 'fason-urunler' && <OutsourcedProducts currentUser={currentUser} />}
          {currentView === 'ticari-urunler' && <PurchasedProducts currentUser={currentUser} />}

          {currentView === 'stok-giris' && <StockEntry currentUser={currentUser} onNavigate={setCurrentView} />}
          {currentView === 'stok-listesi' && <StockList currentUser={currentUser} initialEntryVisible={false} />}
          
          {currentView === 'envanter-giris' && <InventoryEntry currentUser={currentUser} />}
          {currentView === 'envanter-listesi' && <InventoryList currentUser={currentUser} />}
          
          {currentView === 'depo-listesi' && <WarehouseList onNavigate={setCurrentView} onEdit={setSelectedWarehouse} />}
          {currentView === 'depo-ekle' && <WarehouseForm onNavigate={setCurrentView} warehouse={selectedWarehouse} />}
          {currentView === 'tasima-arabalari' && <PickingCarts currentUser={currentUser} />}
          {currentView === 'depo-transfer' && <WarehouseTransfer currentUser={currentUser} />}
          {currentView === 'depo-kabulleri' && <WarehouseAcceptance currentUser={currentUser} onNavigate={setCurrentView} />}
          {currentView === 'mal-kabul' && <GoodsReceipt currentUser={currentUser} onNavigate={setCurrentView} />}
          {currentView === 'depo-krokisi' && <WarehouseLayout currentUser={currentUser} />}
          {currentView === 'whatsapp-onaylari' && <WhatsAppApprovals currentUser={currentUser} />}

          {currentView === 'personeller' && <StaffList currentUser={currentUser} onAdd={() => { setSelectedStaff(null); setCurrentView('personel-ekle'); }} onEdit={(user) => { setSelectedStaff(user); setCurrentView('personel-ekle'); }} />}
          {currentView === 'personel-ekle' && <StaffForm currentUser={currentUser} staff={selectedStaff} onClose={() => setCurrentView('personeller')} />}

          {currentView === 'insan-kaynaklari' && <EmployeeList currentUser={currentUser} onNavigate={setCurrentView} />}
          {currentView === 'personel-kaydi' && <EmployeeForm currentUser={currentUser} onNavigate={setCurrentView} onClose={() => setCurrentView('insan-kaynaklari')} employee={null} />}
          {currentView === 'personel-cikis' && <EmployeeOffboard currentUser={currentUser} onNavigate={setCurrentView} />}
          {currentView === 'izin-yonetimi' && <LeaveManagement currentUser={currentUser} onNavigate={setCurrentView} />}
          {currentView === 'mesai-yonetimi' && <OvertimeManagement currentUser={currentUser} />}

          {currentView === 'tedarikciler' && <SupplierList currentUser={currentUser} />}
          {currentView === 'satin-alma-talepleri' && <PurchaseRequests currentUser={currentUser} />}
          {currentView === 'tedarik-siparisleri' && <PurchaseOrders currentUser={currentUser} />}

          {currentView === 'kampanya-listesi' && <CampaignList currentUser={currentUser} onNavigate={setCurrentView} />}
          {currentView === 'kuponlar' && <Coupons currentUser={currentUser} />}
          {currentView === 'gelir-gider' && <FinanceAccounts onNavigate={setCurrentView} />}
          {(currentView === 'musteri-listesi' || currentView === 'b2b-b2c-cari') && <CustomerList currentUser={currentUser} onNavigate={setCurrentView} onEdit={setSelectedCustomer} />}
          {currentView === 'musteri-ekle' && <CustomerForm currentUser={currentUser} customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onNavigate={setCurrentView} />}
          {currentView === 'musteri-siparisleri' && <CustomerOrders currentUser={currentUser} onNavigate={setCurrentView} statusFilter="tumu" customerId={selectedCustomer?.Id} />}
          {currentView === 'aktif-siparis' && <CustomerOrders currentUser={currentUser} onNavigate={setCurrentView} statusFilter="aktif" />}
          {currentView === 'gecmis-siparis' && <CustomerOrders currentUser={currentUser} onNavigate={setCurrentView} statusFilter="gecmis" />}
          {currentView === 'kutu-tanim' && <PackagingBoxes />}
          {currentView === 'siparis-paketleme' && <OrderPacking />}
          {currentView === 'kurye-teslimat' && <CourierDelivery />}

          {currentView === 'makine-listesi' && <MachineList currentUser={currentUser} />}
          {currentView === 'uretim-yap' && <ProductionOrder currentUser={currentUser} onNavigate={setCurrentView} />}
          {currentView === 'uretim-talepleri' && <ProductionRequests currentUser={currentUser} onNavigate={(view, orderId) => { setSelectedOrderId(orderId); setCurrentView(view); }} />}
          {currentView === 'uretim-listesi' && <ProductionList currentUser={currentUser} onNavigate={(view, orderId) => { setSelectedOrderId(orderId); setCurrentView(view); }} />}
          {currentView === 'uretim-detayi' && <ProductionDetail currentUser={currentUser} orderId={selectedOrderId} onNavigate={setCurrentView} />}
          {currentView === 'raporlar' && <Reports currentUser={currentUser} />}
          {currentView === 'veri-ice-aktar' && <DataImport currentUser={currentUser} />}
          {currentView === 'veri-aktar' && <DataExport currentUser={currentUser} />}
        </div>
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
