# Desktop App — ERP Yönetim Paneli

React + Vite + Electron ile geliştirilmiş kapsamlı kurumsal yönetim paneli.

## Teknolojiler

- **React v19** — UI kütüphanesi
- **Vite v8** — Hızlı build aracı
- **Electron v43** — Cross-platform masaüstü uygulama
- **ExcelJS** — Excel rapor çıktısı
- **React Barcode** — Barkod oluşturma
- **QRCode.react** — QR kod oluşturma
- **React to Print** — Yazdırma desteği
- **DOMPurify** — XSS koruması

## Proje Yapısı

```
desktop-app/
├── index.html
├── vite.config.js
├── electron/
│   └── main.js            # Electron ana süreç dosyası
├── src/
│   ├── main.jsx           # React DOM render
│   ├── App.jsx            # Ana uygulama (24.000+ satır kapsamlı panel)
│   ├── App.css            # Global stiller
│   ├── index.css          # CSS reset
│   ├── GlobalErrorBoundary.jsx  # Hata yakalama
│   ├── components/
│   │   ├── Sidebar.jsx    # Ana navigasyon menüsü
│   │   ├── ActivityLog.jsx  # Aktivite logları
│   │   ├── Products/      # Ürün yönetimi
│   │   ├── Orders/        # Sipariş yönetimi
│   │   ├── Production/    # Üretim planlama
│   │   ├── WMS/           # Depo Yönetim Sistemi
│   │   ├── Warehouses/    # Depo yönetimi
│   │   ├── Purchasing/    # Satın alma
│   │   ├── Suppliers/     # Tedarikçi yönetimi
│   │   ├── Customers/     # Müşteri yönetimi
│   │   ├── Employees/     # İK yönetimi
│   │   ├── Finance/       # Finans modülü
│   │   ├── Campaigns/     # Kampanya yönetimi
│   │   ├── Categories/    # Kategori yönetimi
│   │   ├── Reports/       # Raporlama
│   │   ├── DataExport/    # Veri dışa aktarma
│   │   ├── DataImport/    # Veri içe aktarma
│   │   ├── Settings/      # Sistem ayarları
│   │   └── Common/        # Ortak bileşenler
│   └── utils/             # Yardımcı fonksiyonlar
└── public/                # Statik dosyalar
```

## Kurulum

```bash
# Bağımlılıkları yükleyin
npm install

# Web geliştirme modunda çalıştırın
npm run dev

# Electron masaüstü uygulaması olarak çalıştırın
npm run desktop

# Production build
npm run build
```

## Ortam Değişkenleri

```env
VITE_API_URL=http://localhost:3000
```

## Modüller

| Modül | Açıklama |
|-------|----------|
| 📦 **Ürünler** | Ürün CRUD, formül/reçete yönetimi, barkod oluşturma |
| 📋 **Siparişler** | Sipariş listesi, durumu, onay/iptal |
| 🏭 **Üretim** | Üretim planlama, hammadde hesaplama, iş emirleri |
| 📍 **WMS** | Depo haritası, raf yönetimi, akıllı yerleşim |
| 🏢 **Depolar** | Depo ve raf tanımlamaları |
| 🤝 **Satın Alma** | Tedarikçi siparişleri, onay süreçleri |
| 👥 **Müşteriler** | Müşteri bilgileri ve demografik analiz |
| 👷 **Çalışanlar** | İK, maaş, izin yönetimi |
| 💰 **Finans** | Gelir/gider takibi, maaş bordrosu |
| 📊 **Raporlar** | İş zekası ve analitik raporlar |
| 📤 **Veri Aktarma** | Excel çıktıları (ExcelJS) |
| ⚙️ **Ayarlar** | Sistem ve Kill Switch yönetimi |
