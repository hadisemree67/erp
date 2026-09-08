# Web App — E-Ticaret Platformu

React + Vite ile geliştirilmiş müşteri odaklı e-ticaret web uygulaması.

## Teknolojiler

- **React v19** — UI kütüphanesi
- **Vite v8** — Hızlı build aracı ve dev server
- **React Router v7** — İstemci tarafı yönlendirme
- **Axios** — HTTP istemcisi
- **Lucide React** — İkon kütüphanesi
- **React Toastify** — Bildirim sistemi
- **DOMPurify** — XSS koruması

## Proje Yapısı

```
web-app/
├── index.html
├── vite.config.js
├── src/
│   ├── main.jsx          # React DOM render
│   ├── App.jsx            # Ana uygulama ve route tanımları
│   ├── App.css            # Global stiller
│   ├── index.css          # CSS reset ve temel stiller
│   ├── pages/
│   │   ├── Home/          # Ana sayfa
│   │   ├── ProductDetail/ # Ürün detay sayfası
│   │   ├── Category/      # Kategori sayfası
│   │   ├── Cart/          # Sepet sayfası
│   │   ├── Checkout/      # Ödeme sayfası
│   │   ├── Profile/       # Kullanıcı profili
│   │   ├── Favorites/     # Favoriler
│   │   ├── Search/        # Arama
│   │   ├── Brand/         # Marka sayfası
│   │   ├── Blog/          # Blog
│   │   ├── Campaigns/     # Kampanyalar
│   │   ├── NewProducts/   # Yeni ürünler
│   │   └── SkinAnalysis/  # Cilt analizi
│   ├── components/        # Yeniden kullanılabilir bileşenler
│   ├── context/           # React context (Auth, Cart)
│   ├── layouts/           # Sayfa düzenleri
│   ├── data/              # Statik veri dosyaları
│   └── assets/            # Görseller ve medya
└── public/                # Statik dosyalar
```

## Kurulum

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
# ✅ http://localhost:5173

# Production build
npm run build
```

## Ortam Değişkenleri

```env
VITE_API_URL=http://localhost:3000
```

## Özellikler

- 🛍️ Tam kapsamlı e-ticaret deneyimi
- 🔍 Ürün arama ve filtreleme
- 🛒 Sepet yönetimi
- 💳 Ödeme akışı
- 🎫 Kupon ve kampanya desteği
- 👤 Kullanıcı profili ve sipariş geçmişi
- 🧴 Cilt analizi ve ürün önerisi
- 📱 Responsive tasarım
