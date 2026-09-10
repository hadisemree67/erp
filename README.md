<div align="center">
  <h1>🏭 Stok, Üretim ve Depo Yönetim Sistemi</h1>
  <h3>WMS & ERP — Full-Stack Enterprise Solution</h3>

  <p>
    Uçtan uca üretim, tedarik zinciri, depo yerleşimi ve sipariş yönetimi sağlayan<br/>
    kapsamlı kurumsal kaynak planlama sistemi.
  </p>

  <p>
    <a href="#-özellikler"><strong>Özellikleri Keşfet »</strong></a>
    <br />
    <a href="#-hızlı-başlangıç">Kurulum</a>
    ·
    <a href="#-iş-akışı">İş Akışı</a>
    ·
    <a href="#-api-yapısı">API Dökümantasyonu</a>
    ·
    <a href="#-mimari">Mimari</a>
  </p>
</div>

<!-- Badges -->
<div align="center">

  ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
  ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)
  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
  ![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)
  ![MySQL2](https://img.shields.io/badge/MySQL2_Pool-00546B?style=for-the-badge&logo=mysql&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
  ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
  ![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)

</div>

---

## 📖 Proje Hakkında

Bu proje; bir üretim tesisinin veya e-ticaret deposunun günlük operasyon akışını **dijitalleştirmek ve otonom hale getirmek** için tasarlanmış kapsamlı bir kurumsal kaynak planlama (ERP) ve depo yönetim sistemidir (WMS).

Sistem **dört ana bileşenden** oluşur:

| Bileşen | Teknoloji | Açıklama |
|---------|-----------|----------|
| **Backend API** | Node.js, Express, MySQL2 (Connection Pool) | RESTful API sunucusu, iş mantığı ve optimize veritabanı katmanı |
| **Web App** | React (Vite) | E-Ticaret platformu — müşteri arayüzü |
| **Desktop App** | React (Vite) + Electron | ERP yönetim paneli — masaüstü uygulaması |
| **Mobile App** | React Native (Expo) | Depo personeli uygulaması — barkod okuma ve paketleme |

Manuel hataları en aza indirir, süreçleri hızlandırır ve depo hacmini maksimum verimle kullanmanızı sağlar.

---

## ✨ Özellikler

### 📦 Depo Yönetim Sistemi (WMS)
- Hacim ve ağırlık bazlı **otonom raf yönlendirmesi**
- Gerçek zamanlı depo doluluk takibi (m³ hesaplama)
- İstifleme limiti ve ağırlık kontrolü
- Akıllı yerleşim optimizasyonu

### 🏭 Üretim Yönetimi
- **Ürün Reçetesi (BOM):** Dinamik formül ve bileşen tanımlama
- Üretim planlama ve takip
- Makine bakım bildirimleri
- Hammadde gereksinim hesaplama

### 📉 Akıllı Stok Takibi
- Kritik stok seviyelerinde **otomatik üretim veya tedarik talebi**
- Anlık stok izleme ve raporlama
- Stok hareket geçmişi

### 🤝 Satın Alma (Purchasing)
- Tedarikçi yönetimi ve karşılaştırma
- **Otomatik sipariş e-postaları** (Nodemailer ile)
- Fiyat teklifi ve onay süreçleri

### 🛒 E-Ticaret & Sipariş Yönetimi
- Tam kapsamlı e-ticaret platformu (web)
- Sepet, ödeme, kupon ve kampanya yönetimi
- Sipariş durumu takibi ve demografik analiz
- Cilt analizi ve ürün önerisi

### 📱 Mobil Depo Operasyonları
- **Barkod okutarak paketleme** — hatalı paketlemeyi %100 engeller
- Toplama (picking) ve sevkiyat süreçleri
- Gerçek zamanlı bildirimler

### 👥 İnsan Kaynakları & Finans
- Çalışan yönetimi ve maaş hesaplama (otomatik cron)
- Rol bazlı erişim kontrolü (RBAC)
- Finansal raporlama

### 📊 Raporlama & Veri Çıkışı
- Demografik veri analizi
- **Tek tıkla Excel çıktıları** (ExcelJS)
- Detaylı iş zekası raporları

### 🛡️ Güvenlik
- **Kill Switch:** Siber saldırı veya sayım anında sistemi güvenli dondurma (HTTP 503)
- JWT tabanlı kimlik doğrulama
- Rate limiting ve Helmet güvenliği
- XSS koruması (DOMPurify)
- RBAC (Rol Bazlı Erişim Kontrolü)

---

## 🔄 İş Akışı

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  1. Malzeme &    │────▶│  2. Ürün Reçetesi │────▶│  3. Depo Girişleri │
│  Tedarikçi Tanım │     │  (BOM) Oluşturma  │     │  (Akıllı Yerleşim) │
└─────────────────┘     └──────────────────┘     └────────────────────┘
                                                           │
         ┌─────────────────────────────────────────────────┘
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  4. Akıllı Stok  │────▶│  5. Otomatik      │────▶│  6. Sipariş &      │
│  Takibi          │     │  Satın Alma       │     │  Satış Yönetimi    │
└─────────────────┘     └──────────────────┘     └────────────────────┘
                                                           │
         ┌─────────────────────────────────────────────────┘
         ▼
┌─────────────────┐     ┌──────────────────┐
│  7. Mobil App    │────▶│  8. Kill Switch   │
│  Paketleme       │     │  (Acil Durdurma)  │
└─────────────────┘     └──────────────────┘
```

### Adım Adım:

1. **🏢 Malzeme & Tedarikçi Tanımlamaları** — Hammadde, tedarikçi ve fiyat bilgileri girilir
2. **🧪 Ürün Reçetesi Oluşturma** — Nihai ürünler için formül/reçete tanımlanır
3. **🧩 Akıllı Depo Yerleşimi** — Sistem hacim/ağırlık hesaplayarak raf önerir
4. **📉 Stok Takibi** — Stok kritik seviyeye düşünce otomatik talep oluşur
5. **🤝 Otomatik Satın Alma** — Hammadde eksikliğinde tedarikçiye otomatik sipariş
6. **🛒 Sipariş Yönetimi** — E-Ticaret veya B2B siparişleri sisteme yansır
7. **📱 Mobil Paketleme** — Personel barkod okutarak hatasız paketleme yapar
8. **🛡️ Kill Switch** — Acil durumlarda tüm yazma işlemlerini dondurur

---

## 🏗 Mimari

```
stokerpsistemi/
├── backend-api/              # 🖥️  Node.js + Express API Sunucusu
│   ├── middleware/            #     Auth, RBAC middleware'leri
│   ├── routes/                #     24 adet modüler API route dosyası
│   ├── services/              #     E-posta servisi (Nodemailer)
│   ├── utils/                 #     Logger, WMS hesaplama, cron job'lar
│   ├── prisma/                #     Veritabanı şeması (schema.prisma)
│   ├── server.js              #     Ana sunucu dosyası
│   └── db.js                  #     MySQL bağlantı havuzu
│
├── web-app/                   # 🌐 React E-Ticaret Sitesi (Vite)
│   └── src/
│       ├── pages/             #     13 sayfa (Home, Cart, Checkout vb.)
│       ├── components/        #     Yeniden kullanılabilir bileşenler
│       ├── context/           #     React context (Auth, Cart)
│       └── layouts/           #     Sayfa düzenleri
│
├── desktop-app/               # 🖥️  Electron ERP Yönetim Paneli
│   ├── electron/              #     Electron ana süreç dosyaları
│   └── src/
│       └── components/        #     18 modül (WMS, Üretim, Finans vb.)
│
├── mobile-app/                # 📱 React Native Depo Uygulaması (Expo)
│   └── src/
│       └── screens/           #     9 ekran (Picking, Packaging vb.)
│
├── docker-compose.yml         # 🐳 Docker orkestrasyon dosyası
├── e_ticaret_depo_full.sql    # 🗃️  Veritabanı şema dosyası
└── .env.example               # ⚙️  Ortam değişkenleri şablonu
```

---

## 🛠 Kullanılan Teknolojiler

### Backend
| Teknoloji | Sürüm | Açıklama |
|-----------|-------|----------|
| Node.js | v16+ | Asenkron çalışma ortamı |
| Express.js | v5.x | Web framework |
| MySQL2 (Pool) | v3.x | Yüksek performanslı bağlantı havuzu & parametrik SQL |
| MySQL | v8.0 | İlişkisel veritabanı |
| Nodemailer | v9.x | E-posta gönderimi |
| Helmet | v8.x | HTTP güvenlik başlıkları |
| JWT | v9.x | Kimlik doğrulama |
| Multer | v2.x | Dosya yükleme |

### Frontend (Web & Desktop)
| Teknoloji | Sürüm | Açıklama |
|-----------|-------|----------|
| React | v19.x | UI kütüphanesi |
| Vite | v8.x | Build aracı ve dev server |
| Electron | v43.x | Masaüstü uygulama çatısı |
| ExcelJS | v4.x | Excel dosyası oluşturma |
| Lucide React | v1.x | İkon kütüphanesi |
| React Router | v7.x | İstemci tarafı yönlendirme |

### Mobil
| Teknoloji | Sürüm | Açıklama |
|-----------|-------|----------|
| React Native | v0.81 | Mobil uygulama çatısı |
| Expo | v54.x | Geliştirme platformu |
| Expo Camera | v17.x | Barkod ve kamera erişimi |

### DevOps
| Teknoloji | Açıklama |
|-----------|----------|
| Docker & Docker Compose | Konteyner orkestrasyonu |
| Nodemon | Geliştirme ortamı otomatik yenileme |

---

## 🚀 Hızlı Başlangıç

### Ön Koşullar

- [Node.js](https://nodejs.org/) v16 veya üzeri
- [MySQL](https://www.mysql.com/) v8.0
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) (opsiyonel — Docker ile çalıştırmak istiyorsanız)

### 📋 Yöntem 1: Docker ile Kurulum (Önerilen)

```bash
# 1. Repoyu klonlayın
git clone https://github.com/hadisemree67/erp.git
cd erp

# 2. Ortam değişkenlerini ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin ve gerçek değerleri girin

# 3. Docker ile tüm servisleri ayağa kaldırın
docker-compose up -d

# ✅ Backend:  http://localhost:3000
# ✅ Web App:  http://localhost:5173
```

### 📋 Yöntem 2: Manuel Kurulum

```bash
# 1. Repoyu klonlayın
git clone https://github.com/hadisemree67/erp.git
cd erp
```

**Backend API:**
```bash
cd backend-api
npm install

# .env dosyasını oluşturun (.env.example'dan)
cp .env.example .env
# .env dosyasını düzenleyin: veritabanı (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME), SMTP ve JWT bilgilerinizi girin

# Sunucuyu başlatın (Tablolar ve sütunlar otomatik kontrol edilir)
npm run dev
# ✅ http://localhost:3000
```

**Web App (E-Ticaret):**
```bash
cd web-app
npm install
npm run dev
# ✅ http://localhost:5173
```

**Desktop App (ERP Paneli):**
```bash
cd desktop-app
npm install
npm run desktop
```

**Mobile App (Depo Uygulaması):**
```bash
cd mobile-app
npm install
npm start
# Expo Go uygulaması ile telefonunuzda açın
```

---

## 🔌 API Yapısı

Backend API 24 adet modüler route dosyasından oluşur:

| Route | Endpoint | Açıklama |
|-------|----------|----------|
| `products` | `/api/products` | Ürün CRUD ve formül yönetimi |
| `orders` | `/api/orders` | Sipariş yönetimi ve durumu |
| `warehouses` | `/api/warehouses` | Depo ve raf yönetimi |
| `wms` | `/api/wms` | WMS — akıllı raf yönlendirme |
| `production` | `/api/production` | Üretim planlama ve takip |
| `purchasing` | `/api/purchasing` | Satın alma süreçleri |
| `suppliers` | `/api/suppliers` | Tedarikçi yönetimi |
| `customers` | `/api/customers` | Müşteri yönetimi |
| `customerAuth` | `/api/customer-auth` | Müşteri kimlik doğrulama |
| `cart` | `/api/cart` | Sepet işlemleri |
| `coupons` | `/api/coupons` | Kupon yönetimi |
| `campaigns` | `/api/campaigns` | Kampanya yönetimi |
| `employees` | `/api/employees` | Çalışan ve İK yönetimi |
| `finance` | `/api/finance` | Finansal işlemler |
| `reports` | `/api/reports` | Raporlama |
| `data_export` | `/api/data-export` | Veri dışa aktarma (Excel) |
| `activities` | `/api/activities` | Aktivite logları |
| `users` | `/api/users` | Kullanıcı yönetimi |
| `settings` | `/api/settings` | Sistem ayarları |
| `mobile` | `/api/mobile` | Mobil uygulama endpoint'leri |
| `boxes` | `/api/boxes` | Kutu/ambalaj yönetimi |
| `picking_carts` | `/api/picking-carts` | Toplama arabaları |
| `shippers` | `/api/shippers` | Kargo firmaları |
| `webCategories` | `/api/web-categories` | E-Ticaret kategorileri |

---

## ⚙️ Ortam Değişkenleri

Projeyi çalıştırmak için aşağıdaki ortam değişkenlerini `.env` dosyasında tanımlamanız gerekir:

```env
# Veritabanı (MySQL2 Connection Pool)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=e_ticaret_depo
# Opsiyonel / Geriye dönük uyumluluk:
# DATABASE_URL="mysql://root:your_password@localhost:3306/e_ticaret_depo"

# Sunucu
PORT=3000
BASE_URL=http://localhost:3000

# Güvenlik
JWT_SECRET=your_jwt_secret_key

# E-posta (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Docker (docker-compose için)
MYSQL_ROOT_PASSWORD=your_password
MYSQL_DATABASE=erp_db
VITE_API_URL=http://localhost:3000
```

> ⚠️ **Güvenlik Uyarısı:** `.env` dosyasını asla Git'e commit etmeyin. `.env.example` şablonunu kullanın.

---

## 🤝 Katkıda Bulunma

Katkılarınızı memnuniyetle karşılıyoruz! Detaylar için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasına göz atın.

1. Bu repoyu **fork** edin
2. Yeni bir **feature branch** oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi **commit** edin (`git commit -m 'feat: yeni özellik eklendi'`)
4. Branch'inizi **push** edin (`git push origin feature/yeni-ozellik`)
5. Bir **Pull Request** açın

---

## 📄 Lisans

Bu projenin tüm hakları saklıdır. Detaylar için [LICENSE](LICENSE) dosyasına bakın. İzinsiz kopyalama, dağıtma ve kullanma yasaktır.

---

## 📬 İletişim

Proje hakkında sorularınız veya önerileriniz için:
- **GitHub Issues:** [Issues](https://github.com/hadisemree67/erp/issues)
- **Pull Requests:** [Pull Requests](https://github.com/hadisemree67/erp/pulls)

---

<div align="center">
  <sub>⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!</sub>
</div>
<img width="1892" height="930" alt="image" src="https://github.com/user-attachments/assets/7a1f73c3-268e-4716-8d28-8f379c2e8c55" />
<img width="1888" height="922" alt="image" src="https://github.com/user-attachments/assets/f370e650-fcf1-4d64-832b-4f0b98648d95" />
<img width="1912" height="973" alt="image" src="https://github.com/user-attachments/assets/e1f53bf9-804d-4a02-90c2-998cc4486781" />
<img width="1913" height="971" alt="image" src="https://github.com/user-attachments/assets/3a280d73-9f2e-494d-8e50-b178003a0c87" />
<img width="354" height="599" alt="image" src="https://github.com/user-attachments/assets/647d9bbd-b836-473d-b2c0-36e21e5371e8" />
<img width="359" height="611" alt="image" src="https://github.com/user-attachments/assets/51c17236-d54e-4df3-8891-2a6f71df1b8c" />
