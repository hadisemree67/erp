# Mobile App — Depo Personeli Uygulaması

React Native + Expo ile geliştirilmiş depo operasyonları mobil uygulaması.

## Teknolojiler

- **React Native v0.81** — Mobil uygulama çatısı
- **Expo v54** — Geliştirme platformu
- **Expo Camera** — Barkod ve QR kod okuma
- **React Navigation v7** — Ekran navigasyonu
- **AsyncStorage** — Yerel depolama
- **Axios** — HTTP istemcisi

## Proje Yapısı

```
mobile-app/
├── App.js                 # Ana uygulama ve navigation ayarları
├── index.js               # Giriş noktası
├── app.json               # Expo yapılandırması
├── src/
│   ├── api/
│   │   └── api.js         # Axios HTTP istemci yapılandırması
│   ├── context/           # React context (Auth)
│   └── screens/
│       ├── LoginScreen.js         # Giriş ekranı
│       ├── HomeScreen.js          # Ana menü
│       ├── PendingOrdersScreen.js # Bekleyen siparişler
│       ├── PendingPackagingScreen.js # Paketleme sırası
│       ├── PickingScreen.js       # Toplama (picking) ekranı
│       ├── PackagingScreen.js     # Paketleme ekranı (barkod doğrulama)
│       ├── ShippingScreen.js      # Sevkiyat ekranı
│       ├── StatsScreen.js         # İstatistikler
│       └── SummaryScreen.js       # Özet rapor
└── assets/                # Uygulama görselleri
```

## Kurulum

```bash
# Bağımlılıkları yükleyin
npm install

# Expo geliştirme sunucusunu başlatın
npm start

# Platform seçenekleri:
npm run android   # Android emülatör/cihaz
npm run ios       # iOS simülatör/cihaz
npm run web       # Web tarayıcısı
```

## Ortam Değişkenleri

```env
API_URL=http://192.168.1.X:3000
```

> **Not:** Fiziksel cihazda test ederken, bilgisayarınızın yerel IP adresini kullanın.

## Özellikler

- 📱 **Barkod Okuma** — Kamera ile gerçek zamanlı barkod doğrulama
- 📦 **Toplama (Picking)** — Raf konumu bazlı ürün toplama
- 📋 **Paketleme** — Hatasız paketleme doğrulama sistemi
- 🚚 **Sevkiyat** — Teslimat durumu takibi
- 📊 **İstatistikler** — Günlük performans metrikleri
- 🔐 **JWT Kimlik Doğrulama** — Güvenli giriş
