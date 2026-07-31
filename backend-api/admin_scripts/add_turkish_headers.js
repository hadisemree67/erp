/*
 * ÖZET:
 * Bu script, projedeki hem önyüz (frontend) hem de arkayüz (backend) dosyalarını tarayarak,
 * her dosyanın en başına o modülün ne işe yaradığını anlatan detaylı ve standartlaştırılmış 
 * Türkçe açıklama blokları (header) ekler. Otomatik bir dokümantasyon aracı olarak çalışır.
 */

// Dosya ve yol işlemleri için gerekli Node.js modülleri içeri aktarılıyor
const fs = require('fs');
const path = require('path');

// Projedeki dosyaların görevlerini ve mimari notlarını içeren tanımlama objesi
const fileDescriptions = {
    // === BACKEND: MIDDLEWARE ===
    "auth.js": {
        module: "Arkayüz - Ara Katman (Middleware)",
        purpose: "Kullanıcıların kimlik doğrulamasını (authentication) ve yetki denetimini (authorization) gerçekleştirir. Gelen isteklerdeki JWT (JSON Web Token) veya oturum bilgilerini kontrol ederek yetkisiz erişimleri engeller.",
        tech: "Express.js Middleware, JWT / Oturum Yönetimi",
        arch: "Tüm güvenli API rotalarının (routes) önünde çalışır; yetki kontrolü başarılı olursa isteği ilgili rotaya iletir."
    },

    // === BACKEND: ROUTES ===
    "activities.js": {
        module: "Arkayüz Rotası (API Route) - Aktivite ve Log Yönetimi",
        purpose: "Sistemde gerçekleştirilen kullanıcı hareketlerini, log kayıtlarını, stok değişim geçmişini ve genel denetim (audit) izlerini sorgulamak ve listelemek için API uç noktaları sağlar.",
        tech: "Express.js Router, SQLite3 Veritabanı Sorguları",
        arch: "Önyüzdeki ActivityLog.jsx bileşeni tarafından çağrılır; sistemdeki denetim ve takip mekanizmasının temel verisini sağlar."
    },
    "employees.js": {
        module: "Arkayüz Rotası (API Route) - İnsan Kaynakları (Çalışanlar)",
        purpose: "Şirket çalışanlarının (personelin) özlük bilgileri, maaş bilgileri, departman atamaları, izin talepleri ve işten ayrılma (offboarding) süreçlerini yöneten HTTP API uç noktalarını tanımlar.",
        tech: "Express.js Router, Veritabanı İşlemleri (CRUD), Asenkron Sorgular",
        arch: "Önyüzdeki EmployeeList, EmployeeForm, LeaveManagement ve EmployeeOffboard bileşenleri ile doğrudan haberleşir."
    },
    "production.js": {
        module: "Arkayüz Rotası (API Route) - Üretim ve İmalat Yönetimi",
        purpose: "Üretim siparişleri, reçeteler (BOM - Malzeme İhtiyaç Listesi), üretim hatları, makine listeleri ve üretim aşamalarının takibini gerçekleştiren API uç noktalarını barındırır.",
        tech: "Express.js Router, İlişkisel Veritabanı Sorguları, İş Mantığı Yönetimi",
        arch: "Önyüzdeki ProductionList, ProductionOrder, MachineList ve ProductionRequests bileşenlerinin veritabanı ile etkileşimini sağlar."
    },
    "products.js": {
        module: "Arkayüz Rotası (API Route) - Ürün ve Katalog Yönetimi",
        purpose: "Sistemdeki tüm ürünlerin, kategorilerin, markaların ve ürün varyantlarının listelenmesi, yeni ürün eklenmesi, düzenlenmesi ve toplu güncellenmesi işlemlerini yürüten API uç noktalarıdır.",
        tech: "Express.js Router, Veritabanı Sorguları (SQL), Veri Doğrulama (Validation)",
        arch: "Önyüzdeki ProductList, ProductForm ve BulkEditModal bileşenlerine veri hizmeti sunar."
    },
    "purchasing.js": {
        module: "Arkayüz Rotası (API Route) - Satınalma Yönetimi",
        purpose: "Satınalma talepleri, tedarikçilere verilen siparişler (Purchase Orders), sipariş onay süreçleri ve gelen malzemelerin tedarik takibini yapan API uç noktalarını içerir.",
        tech: "Express.js Router, Veritabanı İşlemleri, Sipariş Durum Yönetimi",
        arch: "Önyüzdeki PurchaseOrders ve PurchaseRequests bileşenleri ile entegre çalışarak tedarik zincirini yönetir."
    },
    "suppliers.js": {
        module: "Arkayüz Rotası (API Route) - Tedarikçi Yönetimi",
        purpose: "Malzeme ve hizmet satın alınan dış tedarikçi firmaların iletişim bilgileri, bakiye/alacak durumları ve firma profillerinin yönetildiği API uç noktalarıdır.",
        tech: "Express.js Router, SQL Sorgulama ve CRUD İşlemleri",
        arch: "Önyüzdeki SupplierList bileşeni tarafından ve satınalma modülleri tarafından tedarikçi seçimi için kullanılır."
    },
    "users.js": {
        module: "Arkayüz Rotası (API Route) - Sistem Kullanıcıları ve Yetkilendirme",
        purpose: "ERP sistemine giriş yapabilen kullanıcı hesaplarının yönetimi, rol atamaları (yönetici, personel vb.), şifre işlemleri ve sistem erişim izinlerinin (permissions) yapılandırıldığı API uç noktalarıdır.",
        tech: "Express.js Router, Şifreli Veri İşleme, Rol ve İzin Kontrolü",
        arch: "Önyüzdeki StaffList ve StaffForm bileşenleri ile sistem genelindeki yetkilendirme mekanizmasını destekler."
    },
    "warehouses.js": {
        module: "Arkayüz Rotası (API Route) - Depo Tanımları ve Fiziksel Yapı",
        purpose: "Fiziksel depoların oluşturulması, depo içindeki raf, koridor ve hücre yapılandırmalarının tanımlanması ve depo yerleşim düzeninin yönetilmesi için API uç noktaları sağlar.",
        tech: "Express.js Router, Veritabanı Yapılandırma Sorguları",
        arch: "Önyüzdeki WarehouseList, WarehouseForm ve WarehouseLayout bileşenleri ile etkileşimlidir."
    },
    "wms.js": {
        module: "Arkayüz Rotası (API Route) - Depo Yönetim Sistemi (WMS Operasyonları)",
        purpose: "Stok giriş/çıkış işlemleri, depolar arası transferler, mal kabul (Goods Receipt), sayım düzeltmeleri, barkodlu takipli stok hareketleri ve envanter bakiyelerinin gerçek zamanlı takibini yönetir.",
        tech: "Express.js Router, Karmaşık SQL Sorguları, Stok Hareket Mantığı (Transaction)",
        arch: "Sistemin en kritik operasyonel rotasıdır; önyüzdeki tüm WMS (StockList, InventoryEntry, GoodsReceipt vb.) bileşenleri tarafından kullanılır."
    },

    // === BACKEND: SERVICES & UTILS ===
    "emailService.js": {
        module: "Arkayüz Servisi (Service) - E-Posta Bildirim Sistemi",
        purpose: "Sistem içindeki otomatik bilgilendirmeleri, kritik stok uyarılarını, satın alma onay bildirimlerini ve kullanıcı şifre sıfırlama e-postalarını göndermekten sorumlu servis katmanıdır.",
        tech: "Nodemailer / SMTP Entegrasyonu, Asenkron İletişim",
        arch: "Rotalar (Routes) ve arka plan görevleri tarafından tetiklenerek dış dünyaya e-posta iletir."
    },
    "logger.js": {
        module: "Arkayüz Yardımcısı (Utility) - Sistem Günlükleme (Logging)",
        purpose: "Sistem hatalarını, istisnaları (exceptions) ve önemli operasyonel olayları dosyaya (error.log) ve konsola tutarlı bir formatta yazan loglama aracıdır.",
        tech: "Dosya Sistemi (fs) İşlemleri, Tarih ve Zaman Damgalama",
        arch: "Tüm arkayüz modülleri ve hata yakalama (error handling) ara katmanları tarafından ortaklaşa kullanılır."
    },
    "stockNotifier.js": {
        module: "Arkayüz Yardımcısı (Utility) - Kritik Stok Uyarıcısı",
        purpose: "Stok miktarı kritik seviyenin (minimum stok eşiğinin) altına düşen ürünleri periyodik olarak veya işlem anında tespit ederek yöneticilere bildirim/uyarı oluşturan arka plan yardımcısıdır.",
        tech: "Veritabanı Analiz Sorguları, Zamanlanmış/Tetiklenmiş Kontroller",
        arch: "WMS stok hareket rotaları işlem yaptığında veya periyodik görevlerde tetiklenerek emailService ile haberleşir."
    },
    "db.js": {
        module: "Arkayüz Çekirdeği - Veritabanı Bağlantı ve Sorgu Havuzu",
        purpose: "SQLite (veya ilişkisel veritabanı) bağlantısını başlatır, bağlantı havuzunu yönetir ve rotaların veritabanı üzerinde güvenli, asenkron SQL sorguları çalıştırması için ortak bir arayüz (query metodu) sunar.",
        tech: "Veritabanı Sürücüsü (SQLite / Pool), Asenkron Promise Yapısı",
        arch: "Sistemin veri katmanıdır (Data Layer). Tüm API rotaları (routes) ve servisler veritabanı işlemleri için bu dosyayı import eder."
    },
    "server.js": {
        module: "Arkayüz Çekirdeği - Ana Sunucu ve Giriş Noktası (Entry Point)",
        purpose: "Express.js HTTP sunucusunu başlatır, CORS ayarlarını yapılandırır, JSON gövde ayrıştırıcılarını (body parser) ekler, tüm API rotalarını (`/api/products`, `/api/wms` vb.) sisteme bağlar ve sunucuyu belirtilen portta dinlemeye alır.",
        tech: "Express.js, HTTP Sunucu Yönetimi, Middleware Yapılandırması",
        arch: "Arkayüz uygulamasının başlama noktasıdır. Tüm yönlendiricileri (routes) ve genel ara katmanları (middleware) bütünleştirir."
    },

    // === FRONTEND: CORE ===
    "App.jsx": {
        module: "Önyüz Çekirdeği - Ana Uygulama Bileşeni ve Yönlendirme (Routing)",
        purpose: "Uygulamanın ana kabuğunu (shell) oluşturur. Kullanıcının oturum durumunu yönetir, aktif sayfalar arası geçişi (tab/navigation) kontrol eder ve sol menü (Sidebar) ile içerik alanını bütünleştirir.",
        tech: "React (useState, useEffect hook'ları), Durum Yönetimi (State Management)",
        arch: "Tüm alt sayfa bileşenlerini (WMS, Products, Employees vb.) içinde barındıran en üst düzey kök bileşendir."
    },
    "GlobalErrorBoundary.jsx": {
        module: "Önyüz Çekirdeği - Global Hata Yakalama Kalkanı (Error Boundary)",
        purpose: "React bileşen ağacında render sırasında, yaşam döngüsü metodlarında veya alt bileşenlerde meydana gelebilecek beklenmeyen hataları (crash) yakalar; uygulamanın tamamen beyaz ekrana düşmesini engelleyerek kullanıcıya şık bir hata ekranı ve yenileme seçeneği sunar.",
        tech: "React Class Component, Error Boundary Yaşam Döngüsü (componentDidCatch)",
        arch: "main.jsx içerisinde ana App bileşenini sarmalayarak tüm önyüzü uygulama çökmelerine karşı korur."
    },
    "main.jsx": {
        module: "Önyüz Çekirdeği - DOM Başlatıcı (Entry Point)",
        purpose: "React uygulamasını tarayıcının HTML DOM ağacındaki root elementine bağlar (mount eder). Genel stil dosyalarını ve GlobalErrorBoundary kalkanını başlatır.",
        tech: "React 18 / ReactDOM, JSX, CSS İçe Aktarma",
        arch: "Vite/Webpack tarafından derlenen ve tarayıcıda ilk çalışan önyüz giriş dosyasıdır."
    },

    // === FRONTEND: COMPONENTS (GENERAL) ===
    "ActivityLog.jsx": {
        module: "Önyüz Bileşeni - Sistem Aktivite Günlüğü (Dashboard Logları)",
        purpose: "Sistemde yapılan son işlemleri, kullanıcı hareketlerini, stok değişim loglarını ve denetim kayıtlarını tablo halinde gösterir. Kullanıcıların tarih, işlem tipi veya kullanıcı adına göre filtreleme yapmasına olanak tanır.",
        tech: "React, Lucide-React İkonları, Asenkron API İsteği (apiFetch)",
        arch: "Arkayüzdeki `/api/activities` uç noktasına bağlanarak sistemin işlem denetim geçmişini görselleştirir."
    },
    "Sidebar.jsx": {
        module: "Önyüz Bileşeni - Ana Menü ve Navigasyon (Sidebar)",
        purpose: "Uygulamanın sol tarafında yer alan ana gezinme menüsüdür. Kullanıcının yetkilerine (permissions) göre ilgili modülleri (Ürünler, WMS, Üretim, İK, Satınalma vb.) gösterir veya gizler; sayfa değişimlerini tetikler.",
        tech: "React, Lucide-React İkonları, CSS Modülasyonu, Yetki Denetim Mantığı",
        arch: "App.jsx ile koordine çalışarak kullanıcının sistem içinde menüler arası gezinmesini sağlar."
    },

    // === FRONTEND: EMPLOYEES (HR) ===
    "BulkEditEmployeeModal.jsx": {
        module: "Önyüz Bileşeni - İnsan Kaynakları / Toplu Çalışan Düzenleme Modalı",
        purpose: "Birden fazla çalışanın maaşlarına yüzdelik veya sabit zam uygulama, departman değiştirme veya pozisyon toplu atama işlemlerini gerçekleştiren açılır penceredir (modal).",
        tech: "React Form Yönetimi, Lucide-React İkonları, Asenkron API İstekleri",
        arch: "EmployeeList.jsx üzerinden seçilen çalışan ID'leri ile tetiklenir ve `/api/employees/bulk-update` rotasıyla haberleşir."
    },
    "EmployeeForm.jsx": {
        module: "Önyüz Bileşeni - İnsan Kaynakları / Çalışan Ekleme ve Düzenleme Formu",
        purpose: "Yeni bir personel/çalışan kaydı oluşturmak veya mevcut çalışanın kişisel bilgilerini, maaşını, departmanını, işe başlama tarihini ve iletişim detaylarını düzenlemek için kullanılan form arayüzüdür.",
        tech: "React (useState, useEffect), Form Doğrulama (Validation), Lucide İkonları",
        arch: "Arkayüzdeki `/api/employees` rotasının POST (ekleme) ve PUT (güncelleme) uç noktalarıyla iletişim kurar."
    },
    "EmployeeList.jsx": {
        module: "Önyüz Bileşeni - İnsan Kaynakları / Çalışan Listesi ve Yönetimi",
        purpose: "Şirket bünyesindeki tüm çalışanları (personelleri) tablo halinde listeler. Departman, durum (aktif/pasif) veya isme göre arama/filtreleme sağlar; yeni çalışan ekleme, düzenleme, toplu işlem veya işten çıkarma modallarını tetikler.",
        tech: "React, Lucide-React, Tablo Veri Yönetimi, Filtreleme Mantığı",
        arch: "İnsan Kaynakları modülünün ana ekranıdır; `/api/employees` rotasından verileri çeker ve alt modalları yönetir."
    },
    "EmployeeOffboard.jsx": {
        module: "Önyüz Bileşeni - İnsan Kaynakları / İşten Çıkarma (Offboarding) Yönetimi",
        purpose: "Bir çalışanın işten ayrılma sürecini yönetir. Kıdem tazminatı hesaplama, ihbar süresi takibi, zimmetli demirbaşların iadesi ve iş akdi sonlandırma onay işlemlerini gerçekleştiren arayüzdür.",
        tech: "React, Tarih ve Tazminat Hesaplama Algoritmaları, Lucide-React",
        arch: "Arkayüzdeki `/api/employees/:id/offboard` rotaları ile çalışarak personelin ilişik kesme sürecini veritabanına işler."
    },
    "LeaveManagement.jsx": {
        module: "Önyüz Bileşeni - İnsan Kaynakları / İzin ve Tatil Yönetimi",
        purpose: "Çalışanların yıllık izin, mazeret izni veya hastalık izni taleplerini oluşturmalarını, kalan izin günlerini görüntülemelerini ve yöneticilerin bu izin taleplerini onaylamasını veya reddetmesini sağlayan yönetim ekranıdır.",
        tech: "React, İzin Gün Hesaplama, Durum Yönetimi (Onay/Red Akışları)",
        arch: "`/api/employees/:id/leaves` ve `/api/employees/:id/leave-summary` uç noktalarıyla haberleşerek personel izin bakiye takibini sağlar."
    },

    // === FRONTEND: PRODUCTION ===
    "MachineList.jsx": {
        module: "Önyüz Bileşeni - Üretim Modülü / Makine ve Ekipman Listesi",
        purpose: "Üretim tesisinde kullanılan makinelerin, montaj hatlarının ve operasyonel ekipmanların listelendiği, çalışma kapasitelerinin, durumlarının (aktif/arızalı/bakımda) takip edildiği ekrandır.",
        tech: "React, Lucide İkonları, Durum Göstergeleri (Badge), Asenkron Veri Çekme",
        arch: "`/api/production/machines` uç noktasına bağlanarak üretim altyapısının durumunu yönetir."
    },
    "ProductionDetail.jsx": {
        module: "Önyüz Bileşeni - Üretim Modülü / Üretim Siparişi Detay ve Süreç Ekranı",
        purpose: "Seçilen bir üretim siparişinin detaylı aşamalarını (kesim, montaj, kalite kontrol vb.), kullanılan hammaddeleri (reçete tüketimi) ve fire oranlarını gösteren, aşama tamamladıkça stoktan otomatik hammadde düşümünü tetikleyen detay ekranıdır.",
        tech: "React, Adım Takip Göstergeleri (Stepper), Dinamik Stok Tüketim Hesaplama",
        arch: "`/api/production/orders/:id` rotası ile haberleşerek imalat sürecinin canlı takibini sağlar."
    },
    "ProductionList.jsx": {
        module: "Önyüz Bileşeni - Üretim Modülü / Üretim Emirleri Listesi",
        purpose: "Planlanan, devam eden ve tamamlanan tüm üretim siparişlerini listeler. Sipariş durumu, ürün adı veya tarih aralığına göre filtreleme sunar ve yeni üretim emri oluşturma akışını başlatır.",
        tech: "React, Tablo ve Filtre Yönetimi, Lucide İkonları",
        arch: "Üretim modülünün ana panosudur; `/api/production/orders` API uç noktası üzerinden imalat emirlerini çeker."
    },
    "ProductionOrder.jsx": {
        module: "Önyüz Bileşeni - Üretim Modülü / Yeni Üretim Emri Oluşturma Formu",
        purpose: "Üretilecek ürünü (mamul), üretim miktarını, hedef teslim tarihini ve kullanılacak makine/hattı seçerek yeni bir üretim emri (Production Order) planlamak için kullanılan form arayüzüdür.",
        tech: "React Form Doğrulama, Reçete (BOM) Hesaplama, Dinamik Seçim Listeleri",
        arch: "Arkayüzdeki `/api/production/orders` rotasına POST isteği göndererek imalat sürecini başlatır."
    },
    "ProductionRequests.jsx": {
        module: "Önyüz Bileşeni - Üretim Modülü / Üretim Talepleri ve Onay Ekranı",
        purpose: "Satış veya stok departmanlarından gelen üretim taleplerini (imalat ihtiyaçlarını) inceler; yöneticilerin bu talepleri onaylayarak doğrudan üretim emrine dönüştürmesini sağlar.",
        tech: "React, Talep Onay İş Akışı (Workflow), Lucide İkonları",
        arch: "`/api/production/requests` uç noktasıyla haberleşerek departmanlar arası üretim koordinasyonunu sağlar."
    },

    // === FRONTEND: PRODUCTS ===
    "BulkEditModal.jsx": {
        module: "Önyüz Bileşeni - Ürün Katalog Modülü / Toplu Ürün Güncelleme Modalı",
        purpose: "Seçilen çok sayıda ürünün satış fiyatı, KDV oranı, kategori, marka veya minimum stok uyarı eşiği gibi özelliklerini tek seferde toplu olarak değiştirmeye yarayan işlem penceresidir.",
        tech: "React, Toplu Form Düzenleme Mantığı, Lucide İkonları",
        arch: "ProductList.jsx üzerinden seçilen ürün ID'lerini alır ve `/api/products/bulk-update` rotasıyla veritabanını günceller."
    },
    "ProductForm.jsx": {
        module: "Önyüz Bileşeni - Ürün Katalog Modülü / Ürün Ekleme ve Düzenleme Formu",
        purpose: "Sisteme yeni bir ürün, hammadde veya yarı mamul eklemek ya da mevcut ürünün adını, barkodunu, stok kodunu (SKU), fiyatlarını, boyutlarını ve teknik özelliklerini düzenlemek için kullanılan detaylı formdur.",
        tech: "React (useState, useEffect), Barkod ve SKU Doğrulama, Dinamik Form Alanları",
        arch: "`/api/products` rotasının POST ve PUT uç noktalarıyla çalışarak ürün kataloğunu günceller."
    },
    "ProductList.jsx": {
        module: "Önyüz Bileşeni - Ürün Katalog Modülü / Ürün Listesi ve Katalog Yönetimi",
        purpose: "Sistemde tanımlı tüm ürünleri (hammadde, mamul, ticari mal) tablo halinde sunar. Barkod, stok kodu, kategori veya marka bazlı gelişmiş arama ve filtreleme imkanı tanır; ürün ekleme, düzenleme ve toplu işlem modallarını kontrol eder.",
        tech: "React, Gelişmiş Filtreleme ve Arama, Sayfalama / Sonsuz Kaydırma, Lucide İkonları",
        arch: "Ürün yönetim modülünün ana ekranıdır; `/api/products` API'sinden çektiği verileri görselleştirir."
    },

    // === FRONTEND: PURCHASING ===
    "PurchaseOrders.jsx": {
        module: "Önyüz Bileşeni - Satınalma Modülü / Satınalma Siparişleri Listesi",
        purpose: "Tedarikçi firmalara verilen mal ve hizmet siparişlerinin (Purchase Orders) listelendiği, sipariş durumlarının (beklemede, onaylandı, yolda, teslim alındı) takip edildiği ve yeni sipariş oluşturulduğu yönetim ekrandır.",
        tech: "React, Sipariş Durum Takip Mantığı, Tablo Listeleme, Lucide İkonları",
        arch: "`/api/purchasing/orders` uç noktası üzerinden tedarikçi sipariş süreçlerini veritabanı ile senkronize eder."
    },
    "PurchaseRequests.jsx": {
        module: "Önyüz Bileşeni - Satınalma Modülü / Satınalma Talepleri ve Onay Akışı",
        purpose: "Şirket içi departmanların veya stok uyarı sisteminin oluşturduğu malzeme satın alma taleplerini listeler; satınalma yöneticilerinin bu talepleri inceleyip onaylamasına, reddetmesine veya doğrudan tedarikçi siparişine dönüştürmesine olanak tanır.",
        tech: "React, Onay Akışı (Approval Workflow), Talep Durum Yönetimi",
        arch: "`/api/purchasing/requests` rotası ile haberleşerek şirket içi talep ve tedarik koordinasyonunu sağlar."
    },

    // === FRONTEND: STAFF (SYSTEM USERS) ===
    "StaffForm.jsx": {
        module: "Önyüz Bileşeni - Sistem Kullanıcıları Modülü / Kullanıcı ve Yetki Tanımlama Formu",
        purpose: "ERP sistemine giriş yapacak yeni bir kullanıcı hesabı oluşturmak veya mevcut kullanıcının şifresini, rolünü (yönetici, personel, depo sorumlusu vb.) ve modül bazlı ince yetkilerini (permissions) yapılandırmak için kullanılan form arayüzüdür.",
        tech: "React, Yetki Checkbox Ağacı, Şifre ve Rol Yönetimi",
        arch: "Arkayüzdeki `/api/users` rotası ile etkileşim kurarak sistem güvenlik ve yetkilendirme altyapısını yönetir."
    },
    "StaffList.jsx": {
        module: "Önyüz Bileşeni - Sistem Kullanıcıları Modülü / Kullanıcı Hesapları Listesi",
        purpose: "Sisteme erişim hakkı olan tüm hesapları ve yetki seviyelerini listeler. Kullanıcı hesaplarını aktif/pasif yapma, şifre sıfırlama veya yetki düzenleme işlemlerine giriş noktası sunar.",
        tech: "React, Kullanıcı Tablosu, Lucide İkonları",
        arch: "Sistem yönetimi modülünün ana ekranıdır; `/api/users` rotasından hesap bilgilerini çeker."
    },

    // === FRONTEND: SUPPLIERS ===
    "SupplierList.jsx": {
        module: "Önyüz Bileşeni - Tedarikçi Modülü / Tedarikçi Firmalar ve Rehber",
        purpose: "Mal ve hizmet satın alınan dış tedarikçi firmaların iletişim bilgilerini, vergi numaralarını, adreslerini ve genel ticari ilişkilerini listeler; yeni tedarikçi ekleme veya mevcut firma bilgilerini düzenleme imkanı sunar.",
        tech: "React, Firma Rehberi Yönetimi, Lucide İkonları, Arama Filtreleri",
        arch: "`/api/suppliers` rotası ile çalışarak satınalma ve depo kabul modüllerinin tedarikçi altyapısını sağlar."
    },

    // === FRONTEND: WAREHOUSES (PHYSICAL) ===
    "WarehouseForm.jsx": {
        module: "Önyüz Bileşeni - Depo Tanım Modülü / Depo ve Konum Oluşturma Formu",
        purpose: "Sisteme yeni bir fiziksel depo, lokasyon veya şube tanımlamak; mevcut deponun adını, adresini, sorumlu personelini ve genel kapasite özelliklerini düzenlemek için kullanılan formdur.",
        tech: "React, Depo Tanım Doğrulama, Lucide İkonları",
        arch: "`/api/warehouses` rotasına POST ve PUT istekleri göndererek lojistik yapılandırmayı günceller."
    },
    "WarehouseLayout.jsx": {
        module: "Önyüz Bileşeni - Depo Tanım Modülü / Depo Yerleşim ve Raf Düzeni (Layout)",
        purpose: "Bir deponun içindeki koridorları, raf sistemlerini, katları ve hücreleri görsel veya yapısal olarak tanımlamayı, raf barkodlarını oluşturmayı ve depo içi lokasyon haritasını yönetmeyi sağlayan arayüzdür.",
        tech: "React, Raf/Hücre Ağaç Yapısı, Hiyerarşik Veri Yönetimi",
        arch: "`/api/warehouses/:id/layout` ve raf yönetim rotalarıyla etkileşime girerek WMS hücre takibini mümkün kılar."
    },
    "WarehouseList.jsx": {
        module: "Önyüz Bileşeni - Depo Tanım Modülü / Depolar ve Lojistik Merkezler Listesi",
        purpose: "Şirkete ait tüm depoları, şubeleri ve lojistik merkezleri listeler. Depoların doluluk oranlarını, sorumlu kişileri ve genel durumlarını özetler; depo düzenleme veya raf tasarım sayfalarına geçiş sağlar.",
        tech: "React, Depo Kartları / Tablosu, Kapasite Göstergeleri, Lucide İkonları",
        arch: "Depo tanımlama modülünün ana ekranıdır; `/api/warehouses` rotasından aldığı verileri listeler."
    },

    // === FRONTEND: WMS (OPERATIONS) ===
    "BulkActionModal.jsx": {
        module: "Önyüz Bileşeni - WMS Operasyonları / Toplu Stok İşlemleri Modalı",
        purpose: "Depodaki birden fazla stok kalemi üzerinde toplu sayım düzeltmesi, toplu durum değiştirme (örn: karantinaya alma) veya toplu lokasyon/raf taşıma işlemlerini gerçekleştiren araçtır.",
        tech: "React, Toplu WMS İşlem Mantığı, Lucide İkonları",
        arch: "StockList.jsx veya InventoryList.jsx üzerinden seçilen kalemleri `/api/wms/bulk-action` rotasıyla işler."
    },
    "GoodsReceipt.jsx": {
        module: "Önyüz Bileşeni - WMS Operasyonları / Mal Kabul (Goods Receipt) Ekranı",
        purpose: "Tedarikçilerden gelen irsaliyeli veya satın alma siparişine bağlı ürünlerin depoya fiziksel kabulünü gerçekleştirir. Gelen ürünlerin barkodlarının okutulması, miktar sayımı, hasar/kalite kontrolü ve depo rafına ilk giriş kaydının yapılmasını sağlar.",
        tech: "React, Barkod Okuma Entegrasyonu, İrsaliye ve miktar eşleme, Lucide İkonları",
        arch: "`/api/wms/goods-receipt` ve `/api/purchasing/orders` rotalarıyla entegre çalışarak stokları artırır."
    },
    "InventoryEntry.jsx": {
        module: "Önyüz Bileşeni - WMS Operasyonları / Envanter Giriş ve Sayım Kaydı",
        purpose: "Depoya manuel stok girişi yapmak, sayım sonuçlarını veritabanına işlemek veya devir stoklarını sisteme kaydetmek için kullanılan operasyonel giriş formudur.",
        tech: "React, Ürün ve Raf Seçim Listeleri, Miktar ve Tarih Doğrulama",
        arch: "`/api/wms/inventory-entry` uç noktasına bağlanarak envanter bakiyelerinde doğrudan güncelleme yapar."
    },
    "InventoryList.jsx": {
        module: "Önyüz Bileşeni - WMS Operasyonları / Envanter ve Bakiye Raporu",
        purpose: "Tüm depolardaki anlık stok bakiyelerini, depo ve raf bazında ürün miktarlarını, rezerve edilmiş stokları ve kullanılabilir envanter durumunu detaylı olarak listeler.",
        tech: "React, Çoklu Depo Filtreleme, Envanter Tablosu, Dışa Aktarım (Export) Hazırlığı",
        arch: "`/api/wms/inventory` rotasından çektiği gerçek zamanlı stok verilerini kullanıcıya sunar."
    },
    "MaterialEditForm.jsx": {
        module: "Önyüz Bileşeni - WMS Operasyonları / Stok Kalemi ve Bakiye Düzenleme Formu",
        purpose: "Belirli bir rafta veya lokasyonda bulunan stok kaleminin parti numarası (batch), son kullanma tarihi (SKT), miktar veya lokasyon detaylarında düzeltme yapmak için kullanılan formdur.",
        tech: "React, Parti ve SKT Yönetimi, Form Doğrulama",
        arch: "`/api/wms/stock-balances/:id` rotasıyla haberleşerek hatalı stok kayıtlarını düzeltir."
    },
    "StockEntry.jsx": {
        module: "Önyüz Bileşeni - WMS Operasyonları / Hızlı Stok Giriş ve Çıkış İşlemleri",
        purpose: "Üretimden depoya mamul girişi, üretime hammadde çıkışı, fire/zayi çıkışı veya numune gönderimi gibi günlük operasyonel stok hareketlerini hızlıca kaydetmek için kullanılan ekrandır.",
        tech: "React, Hareket Tipi Seçimi (Giriş/Çıkış/Fire), Barkod Desteği",
        arch: "`/api/wms/stock-movements` rotası üzerinden depodaki stok miktarlarını anlık artırır veya azaltır."
    },
    "StockList.jsx": {
        module: "Önyüz Bileşeni - WMS Operasyonları / Stok Hareket Geçmişi (Stock Ledger)",
        purpose: "Depolarda gerçekleşen tüm stok giriş, çıkış, transfer, mal kabul ve fire hareketlerinin tarihsel günlüğünü (log table) sunar. İşlem tarihi, ürün, depo ve hareket türüne göre filtreleme sağlar.",
        tech: "React, Hareket Günlüğü Tablosu, Tarih ve İşlem Filtreleri, Lucide İkonları",
        arch: "WMS modülünün denetim merkezidir; `/api/wms/stock-moves` API rotasından hareket geçmişini sorgular."
    },
    "WarehouseAcceptance.jsx": {
        module: "Önyüz Bileşeni - WMS Operasyonları / Gelişmiş Depo Kabul ve Kalite Kontrol",
        purpose: "Gelen sevkiyatların detaylı kabulünü, kalite kontrol (QC) süreçlerini, karantina alanına alımını ve onaylanan ürünlerin nihai depolama raflarına yerleştirme (put-away) akışını yöneten gelişmiş kabul ekranıdır.",
        tech: "React, Adım Adım Kabul Akışı (Workflow), CSS Modülasyonu (WarehouseAcceptance.css)",
        arch: "`/api/wms/acceptance` ve kalite kontrol API rotalarıyla tam entegreli çalışan lojistik kabul panelidir."
    },
    "WarehouseTransfer.jsx": {
        module: "Önyüz Bileşeni - WMS Operasyonları / Depolar ve Raflar Arası Transfer",
        purpose: "Bir depodan diğerine şubeler arası mal sevkiyatını (İrsaliyeli Transfer) veya aynı depo içinde bir raftan başka bir rafa hücre taşıma (Put-away / Replenishment) işlemlerini gerçekleştirir.",
        tech: "React, Kaynak ve Hedef Depo/Raf Seçimi, Miktar Doğrulama, Lucide İkonları",
        arch: "`/api/wms/transfer` API rotasına istek atarak kaynak depodan stoğu düşer, hedef depoya/rafa ekler."
    },
    "api.js": {
        module: "Önyüz Yardımcısı (Utility) - Merkezi HTTP İstek Yöneticisi",
        purpose: "Uygulama genelinde arkayüz (backend) API uç noktalarına yapılan tüm HTTP (GET, POST, PUT, DELETE) isteklerini standart hale getiren, yetkilendirme token'larını (JWT) başlığa ekleyen ve hata yakalamayı merkezi olarak yöneten yardımcı modüldür.",
        tech: "Fetch API Wrapper, Asenkron İletişim, Hata Yakalama (Error Interception)",
        arch: "Tüm önyüz bileşenleri ve servisleri tarafından arkayüzle konuşmak için ortaklaşa kullanılan temel iletişim köprüsüdür."
    }
};

// Dosya başına eklenecek standart Türkçe başlık şablonunu oluşturan fonksiyon
function generateTurkishHeader(filename, info) {
    return `/**
 * ============================================================================
 * DOSYA ADI: ${filename}
 * MODÜL / KATMAN: ${info.module}
 * 
 * GÖREV VE AKIŞ AÇIKLAMASI:
 *   ${info.purpose}
 * 
 * KULLANILAN TEKNOLOJİLER VE KÜTÜPHANELER:
 *   - ${info.tech}
 * 
 * MİMARİ VE ENTEGRASYON NOTLARI:
 *   - ${info.arch}
 * ============================================================================
 */
`;
}

// Belirtilen dizindeki tüm klasör ve dosyaları özyinelemeli (recursive) olarak tarayan fonksiyon
function processDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
            if (item.name === 'node_modules' || item.name === 'admin_scripts' || item.name === 'uploads') continue;
            processDirectory(fullPath);
        } else if (item.isFile() && (item.name.endsWith('.js') || item.name.endsWith('.jsx'))) {
            if (fileDescriptions[item.name]) {
                annotateFile(fullPath, item.name, fileDescriptions[item.name]);
            }
        }
    }
}

// Hedef dosyayı okuyup, eski açıklamayı silerek yerine yeni Türkçe başlığı ekleyen fonksiyon
function annotateFile(filePath, fileName, info) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove existing basic JSDoc header at the very beginning of the file if present
    content = content.replace(/^\s*\/\*\*[\s\S]*?\*\/\s*/, '');

    const header = generateTurkishHeader(fileName, info);
    fs.writeFileSync(filePath, header + '\n' + content.trim() + '\n', 'utf8');
    console.log(`[OK] Açıklama eklendi: ${fileName}`);
}

// Proje dizin yolları belirleniyor ve dokümantasyon ekleme işlemi başlatılıyor
const rootDir = path.resolve(__dirname, '..', '..');
const backendDir = path.join(rootDir, 'backend-api');
const frontendDir = path.join(rootDir, 'desktop-app', 'src');

console.log('--- Türkçe Açıklama Satırları ve Mimari Notlar Ekleniyor ---');
processDirectory(backendDir);
processDirectory(frontendDir);
console.log('--- İşlem Tamamlandı ---');
