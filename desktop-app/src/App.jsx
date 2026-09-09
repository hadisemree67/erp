/**
 * ============================================================================
 * BİLEŞEN ADI: App
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   Masaüstü ERP uygulamasının ana bileşenidir. İlgili veri işlemlerini ve UI gösterimini sağlar.
 *   REACT ROUTER VE LAZY LOADING İLE YENİDEN YAZILMIŞTIR.
 * ============================================================================
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from './utils/api';
import Sidebar from './components/Sidebar';
import './index.css';

// Lazy Loaded Components
const ActivityLog = lazy(() => import('./components/ActivityLog'));
const ProductList = lazy(() => import('./components/Products/ProductList'));
const ProductForm = lazy(() => import('./components/Products/ProductForm'));
const OutsourcedProducts = lazy(() => import('./components/Products/OutsourcedProducts'));
const PurchasedProducts = lazy(() => import('./components/Products/PurchasedProducts'));
const CategoryManager = lazy(() => import('./components/Categories/CategoryManager'));
const StaffList = lazy(() => import('./components/Staff/StaffList'));
const StaffForm = lazy(() => import('./components/Staff/StaffForm'));
const EmployeeList = lazy(() => import('./components/Employees/EmployeeList'));
const EmployeeForm = lazy(() => import('./components/Employees/EmployeeForm'));
const EmployeeOffboard = lazy(() => import('./components/Employees/EmployeeOffboard'));
const LeaveManagement = lazy(() => import('./components/Employees/LeaveManagement'));
const OvertimeManagement = lazy(() => import('./components/Employees/OvertimeManagement'));
const StockEntry = lazy(() => import('./components/WMS/StockEntry'));
const StockList = lazy(() => import('./components/WMS/StockList'));
const InventoryEntry = lazy(() => import('./components/WMS/InventoryEntry'));
const InventoryList = lazy(() => import('./components/WMS/InventoryList'));
const WarehouseList = lazy(() => import('./components/Warehouses/WarehouseList'));
const WarehouseForm = lazy(() => import('./components/Warehouses/WarehouseForm'));
const PickingCarts = lazy(() => import('./components/Warehouses/PickingCarts'));
const WarehouseTransfer = lazy(() => import('./components/WMS/WarehouseTransfer'));
const WarehouseAcceptance = lazy(() => import('./components/WMS/WarehouseAcceptance'));
const WarehouseLayout = lazy(() => import('./components/Warehouses/WarehouseLayout'));
const SupplierList = lazy(() => import('./components/Suppliers/SupplierList'));
const MachineList = lazy(() => import('./components/Production/MachineList'));
const ProductionOrder = lazy(() => import('./components/Production/ProductionOrder'));
const ProductionList = lazy(() => import('./components/Production/ProductionList'));
const ProductionDetail = lazy(() => import('./components/Production/ProductionDetail'));
const ProductionRequests = lazy(() => import('./components/Production/ProductionRequests'));
const PurchaseRequests = lazy(() => import('./components/Purchasing/PurchaseRequests'));
const PurchaseOrders = lazy(() => import('./components/Purchasing/PurchaseOrders'));
const GoodsReceipt = lazy(() => import('./components/WMS/GoodsReceipt'));
const CampaignList = lazy(() => import('./components/Campaigns/CampaignList'));
const CampaignForm = lazy(() => import('./components/Campaigns/CampaignForm'));
const Coupons = lazy(() => import('./components/Campaigns/Coupons'));
const FinanceAccounts = lazy(() => import('./components/Finance/FinanceAccounts'));
const CustomerList = lazy(() => import('./components/Customers/CustomerList'));
const CustomerForm = lazy(() => import('./components/Customers/CustomerForm'));
const CustomerOrders = lazy(() => import('./components/Orders/CustomerOrders'));
const CustomerReturns = lazy(() => import('./components/Orders/CustomerReturns'));
const PackagingBoxes = lazy(() => import('./components/Orders/PackagingBoxes'));
const OrderPacking = lazy(() => import('./components/Orders/OrderPacking'));
const CourierDelivery = lazy(() => import('./components/Orders/CourierDelivery'));
const Reports = lazy(() => import('./components/Reports/Reports'));
const Settings = lazy(() => import('./components/Settings/Settings'));
const DataImport = lazy(() => import('./components/DataImport/DataImport'));
const DataExport = lazy(() => import('./components/DataExport/DataExport'));
const CustomerQuestions = lazy(() => import('./components/CRM/CustomerQuestions'));

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = location.pathname.replace('/', '') || 'anasayfa';

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

  const handleNavigate = (view, dataId = null) => {
    if (dataId !== null) {
      if (['uretim-detayi'].includes(view)) {
         setSelectedOrderId(dataId);
      }
    }
    navigate('/' + view);
  };

  // 3. Backend API İstekleri (Veri Çekme)
  const fetchStats = async () => {
    try {
      const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/dashboard-stats');
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
      const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/production/requests');
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
    const verifySession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await apiFetch(import.meta.env.VITE_API_URL + '/api/auth/verify');
          const data = await res.json();
          if (data.success) {
            setCurrentUser(data.user);
            setIsLoggedIn(true);
            
            const perms = data.user.permissions || [];
            const isAdmin = data.user.role === 'admin';
            
            if (location.pathname === '/' || location.pathname === '') {
              if (isAdmin || perms.includes('view_dashboard')) {
                navigate('/anasayfa', { replace: true });
                fetchStats();
              } else if (perms.includes('view_products')) {
                navigate('/urun-listesi', { replace: true });
              } else if (perms.includes('view_employees')) {
                navigate('/insan-kaynaklari', { replace: true });
              } else if (perms.includes('view_offboarding')) {
                navigate('/personel-cikis', { replace: true });
              } else {
                navigate('/anasayfa', { replace: true });
              }
            } else if (location.pathname === '/anasayfa' || location.pathname === '/') {
                fetchStats();
            }
          } else {
            localStorage.removeItem('token');
            setIsLoggedIn(false);
            alert("Oturumunuz başka bir cihazdan açıldığı için sonlandırıldı.");
          }
        } catch (e) {
          console.error("Session verify failed", e);
          localStorage.removeItem('token');
          setIsLoggedIn(false);
        }
      }
    };
    verifySession();
  }, [navigate]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchPendingRequests();
      const interval = setInterval(fetchPendingRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await apiFetch(import.meta.env.VITE_API_URL + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          navigate('/anasayfa', { replace: true });
          fetchStats();
        } else if (perms.includes('view_products')) {
          navigate('/urun-listesi', { replace: true });
        } else if (perms.includes('view_employees')) {
          navigate('/insan-kaynaklari', { replace: true });
        } else if (perms.includes('view_offboarding')) {
          navigate('/personel-cikis', { replace: true });
        } else {
          navigate('/anasayfa', { replace: true });
        }
      } else {
        setErrorMsg(data.message || 'Giriş başarısız.');
      }
    } catch (err) {
      setErrorMsg('Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
        <Sidebar 
          currentUser={currentUser}
          userRole={currentUser?.role}
          onLogout={async () => { 
            try {
              await apiFetch(import.meta.env.VITE_API_URL + '/api/logout', { method: 'POST' });
            } catch (e) {
              console.error("Logout API hatası:", e);
            }
            localStorage.removeItem('token');
            setIsLoggedIn(false); 
            setCurrentUser(null); 
            window.location.reload();
          }}
          onNavigate={(view) => {
            handleNavigate(view);
            if (view === 'anasayfa') fetchStats();
          }} 
          currentView={currentView}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top Navbar */}
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
                      onClick={() => { setShowNotifications(false); handleNavigate('uretim-talepleri'); }}
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
                        <div key={req.id} onClick={() => { setShowNotifications(false); handleNavigate('uretim-talepleri'); }} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', backgroundColor: req.priority === 'Acil' ? '#fef2f2' : 'white' }} className="notification-item">
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
            <Suspense fallback={<div style={{padding: '20px', color: '#64748b'}}>Yükleniyor...</div>}>
              <Routes>
                <Route path="/ayarlar" element={<Settings currentUser={currentUser} />} />
                <Route path="/anasayfa" element={
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
                        <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{stats.todayOrders || 0}</div>
                        <div style={{ color: '#10b981', fontSize: '12px', marginTop: '8px', fontWeight: '500' }}>Bugün alınan siparişler</div>
                      </div>
                    </div>
                  </div>
                } />
                <Route path="/son-hareketler" element={<ActivityLog currentUser={currentUser} />} />
                
                <Route path="/urun-listesi" element={<ProductList currentUser={currentUser} onNavigate={handleNavigate} />} />
                <Route path="/urun-ekle" element={<ProductForm currentUser={currentUser} product={null} onClose={() => handleNavigate('urun-listesi')} />} />
                <Route path="/fason-urunler" element={<OutsourcedProducts currentUser={currentUser} />} />
                <Route path="/ticari-urunler" element={<PurchasedProducts currentUser={currentUser} />} />
                <Route path="/kategoriler" element={<CategoryManager />} />

                <Route path="/stok-giris" element={<StockEntry currentUser={currentUser} onNavigate={handleNavigate} />} />
                <Route path="/stok-listesi" element={<StockList currentUser={currentUser} initialEntryVisible={false} />} />
                
                <Route path="/envanter-giris" element={<InventoryEntry currentUser={currentUser} />} />
                <Route path="/envanter-listesi" element={<InventoryList currentUser={currentUser} />} />
                
                <Route path="/depo-listesi" element={<WarehouseList onNavigate={handleNavigate} onEdit={(w) => { setSelectedWarehouse(w); handleNavigate('depo-ekle'); }} />} />
                <Route path="/depo-ekle" element={<WarehouseForm onNavigate={handleNavigate} warehouse={selectedWarehouse} />} />
                <Route path="/tasima-arabalari" element={<PickingCarts currentUser={currentUser} />} />
                <Route path="/depo-transfer" element={<WarehouseTransfer currentUser={currentUser} />} />
                <Route path="/depo-kabulleri" element={<WarehouseAcceptance currentUser={currentUser} onNavigate={handleNavigate} />} />
                <Route path="/mal-kabul" element={<GoodsReceipt currentUser={currentUser} onNavigate={handleNavigate} />} />
                <Route path="/depo-krokisi" element={<WarehouseLayout currentUser={currentUser} />} />

                <Route path="/personeller" element={<StaffList currentUser={currentUser} onAdd={() => { setSelectedStaff(null); handleNavigate('personel-ekle'); }} onEdit={(user) => { setSelectedStaff(user); handleNavigate('personel-ekle'); }} />} />
                <Route path="/personel-ekle" element={<StaffForm currentUser={currentUser} staff={selectedStaff} onClose={() => handleNavigate('personeller')} />} />

                <Route path="/insan-kaynaklari" element={<EmployeeList currentUser={currentUser} onNavigate={handleNavigate} />} />
                <Route path="/personel-kaydi" element={<EmployeeForm currentUser={currentUser} onNavigate={handleNavigate} onClose={() => handleNavigate('insan-kaynaklari')} employee={null} />} />
                <Route path="/personel-cikis" element={<EmployeeOffboard currentUser={currentUser} onNavigate={handleNavigate} />} />
                <Route path="/izin-yonetimi" element={<LeaveManagement currentUser={currentUser} onNavigate={handleNavigate} />} />
                <Route path="/mesai-yonetimi" element={<OvertimeManagement currentUser={currentUser} />} />

                <Route path="/tedarikciler" element={<SupplierList currentUser={currentUser} />} />
                <Route path="/satin-alma-talepleri" element={<PurchaseRequests currentUser={currentUser} />} />
                <Route path="/tedarik-siparisleri" element={<PurchaseOrders currentUser={currentUser} />} />

                <Route path="/kampanya-listesi" element={<CampaignList currentUser={currentUser} onNavigate={handleNavigate} />} />
                <Route path="/kampanya-ekle" element={<CampaignForm currentUser={currentUser} onNavigate={handleNavigate} campaign={null} />} />
                <Route path="/kuponlar" element={<Coupons currentUser={currentUser} />} />
                
                <Route path="/gelir-gider" element={<FinanceAccounts onNavigate={handleNavigate} />} />
                <Route path="/musteri-listesi" element={<CustomerList currentUser={currentUser} onNavigate={handleNavigate} onEdit={(c) => { setSelectedCustomer(c); handleNavigate('musteri-ekle'); }} />} />
                <Route path="/b2b-b2c-cari" element={<CustomerList currentUser={currentUser} onNavigate={handleNavigate} onEdit={(c) => { setSelectedCustomer(c); handleNavigate('musteri-ekle'); }} />} />
                <Route path="/musteri-ekle" element={<CustomerForm currentUser={currentUser} customer={selectedCustomer} onClose={() => handleNavigate('musteri-listesi')} onNavigate={handleNavigate} />} />
                <Route path="/sikayet-sorular" element={<CustomerQuestions currentUser={currentUser} />} />
                <Route path="/musteri-siparisleri" element={<CustomerOrders currentUser={currentUser} onNavigate={handleNavigate} statusFilter="tumu" customerId={selectedCustomer?.Id} />} />
                <Route path="/aktif-siparis" element={<CustomerOrders currentUser={currentUser} onNavigate={handleNavigate} statusFilter="tumu" />} />
                <Route path="/gecmis-siparis" element={<CustomerOrders currentUser={currentUser} onNavigate={handleNavigate} statusFilter="tumu" />} />
                <Route path="/iade-talepleri" element={<CustomerReturns currentUser={currentUser} />} />
                <Route path="/kutu-tanim" element={<PackagingBoxes />} />
                <Route path="/siparis-paketleme" element={<OrderPacking />} />
                <Route path="/kurye-teslimat" element={<CourierDelivery />} />

                <Route path="/makine-listesi" element={<MachineList currentUser={currentUser} />} />
                <Route path="/uretim-yap" element={<ProductionOrder currentUser={currentUser} onNavigate={handleNavigate} />} />
                <Route path="/uretim-talepleri" element={<ProductionRequests currentUser={currentUser} onNavigate={(view, orderId) => { setSelectedOrderId(orderId); handleNavigate(view); }} />} />
                <Route path="/uretim-listesi" element={<ProductionList currentUser={currentUser} onNavigate={(view, orderId) => { setSelectedOrderId(orderId); handleNavigate(view); }} />} />
                <Route path="/uretim-detayi" element={<ProductionDetail currentUser={currentUser} orderId={selectedOrderId} onNavigate={handleNavigate} />} />
                
                <Route path="/raporlar" element={<Reports currentUser={currentUser} />} />
                <Route path="/veri-ice-aktar" element={<DataImport currentUser={currentUser} />} />
                <Route path="/veri-aktar" element={<DataExport currentUser={currentUser} />} />
                
                <Route path="*" element={<div style={{padding: '20px', fontSize: '18px', color: '#64748b', textAlign: 'center', marginTop: '50px'}}>Lütfen sol menüden bir işlem seçin.</div>} />
              </Routes>
            </Suspense>
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
              autoComplete="username"
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
              autoComplete="current-password"
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

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
