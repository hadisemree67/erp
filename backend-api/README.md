# Backend API

Stok, Üretim ve Depo Yönetim Sistemi'nin RESTful API sunucusu.

## Teknolojiler

- **Node.js** + **Express.js v5** — Asenkron web framework
- **MySQL2 / Promise Pool** — Yüksek performanslı veritabanı bağlantı havuzu & parametrik SQL
- **MySQL v8** — İlişkisel veritabanı
- **JWT (JSON Web Token)** — Kimlik doğrulama, yetkilendirme ve oturum yönetimi
- **Redis (Opsiyonel)** — Kara liste (Blacklist) ve oturum önbellekleme
- **Nodemailer** — Otomatik e-posta gönderimi (SMTP)
- **Helmet** — HTTP güvenlik başlıkları
- **Multer** — Dosya ve görsel yükleme

## Proje Yapısı

```
backend-api/
├── server.js            # Ana sunucu — route bağlantıları, hata kalkanı ve middleware
├── db.js                # MySQL2 bağlantı havuzu (connection pooling)
├── middleware/
│   ├── auth.js          # ERP Personel JWT kimlik doğrulama
│   ├── customerAuth.js  # Müşteri (E-Ticaret) kimlik doğrulama
│   └── rbac.js          # Rol ve izin bazlı erişim kontrolü (RBAC)
├── routes/              # 25+ adet modüler API route dosyası
│   ├── products.js      # Ürün CRUD, formül/reçete ve onaylı yorumlar
│   ├── orders.js        # Sipariş yönetimi, durum geçişleri ve checkout
│   ├── wms.js           # Depo Yönetim Sistemi (WMS) algoritmaları ve raflar
│   ├── production.js    # Üretim planlama ve reçete takip
│   ├── purchasing.js    # Satın alma süreçleri ve tedarikçi teklifleri
│   ├── crm.js           # Müşteri soruları, şikayetler ve vitrin yayını
│   ├── employees.js     # İK ve çalışan yönetimi (KVKK korumalı)
│   ├── finance.js       # Finansal işlemler ve kasa hareketleri
│   ├── mobile.js        # Mobil el terminali toplama ve paketleme
│   └── ...              # Ve diğer modüler route'lar
├── services/
│   ├── emailService.js  # SMTP e-posta servisi (Nodemailer)
│   └── redisService.js  # Token blacklist ve cache servisi
├── utils/
│   ├── logger.js        # Aktivite loglama motoru
│   ├── orderNotifier.js # Canlı sipariş durumu bildirim servisi
│   ├── stockMonitor.js  # Otomatik stok ve satın alma takipçisi
│   ├── salaryCron.js    # Otomatik maaş hesaplama (cron)
│   └── ...
└── uploads/             # Ürün ve evrak görselleri (runtime)
```

## Kurulum

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. .env dosyasını oluşturun (.env.example şablonundan)
cp .env.example .env
# .env dosyasını açıp MySQL, SMTP ve JWT bilgilerinizi girin

# 3. Geliştirme sunucusunu başlatın (Nodemon ile hot-reload)
npm run dev
# ✅ Sunucu http://localhost:3000 portunda çalışmaya başlar
```

## Ortam Değişkenleri

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `PORT` | Hayır | Sunucu portu (varsayılan: 3000) |
| `DB_HOST` | **Evet** | MySQL sunucu adresi (örn: `localhost` veya `127.0.0.1`) |
| `DB_USER` | **Evet** | MySQL kullanıcı adı (örn: `root`) |
| `DB_PASSWORD` | **Evet** | MySQL şifresi |
| `DB_NAME` | **Evet** | Veritabanı adı (örn: `e_ticaret_depo`) |
| `JWT_SECRET` | **Evet** | JWT imzalama anahtarı (güçlü 64-karakter hex önerilir) |
| `BASE_URL` | Hayır | Sunucu dış erişim adresi (örn: `http://localhost:3000`) |
| `SMTP_HOST` | Hayır | E-posta sunucu adresi (`smtp.gmail.com`) |
| `SMTP_PORT` | Hayır | E-posta sunucu portu (`587`) |
| `SMTP_USER` | Hayır | Bildirim e-posta hesabı |
| `SMTP_PASS` | Hayır | E-posta uygulama şifresi |
| `DATABASE_URL` | Hayır | Opsiyonel / Geriye dönük uyumluluk bağlantı dizesi |

## API Yapısı

Sunucu `http://localhost:3000` adresinde hizmet verir. Tüm uç noktalar `/api` öneki altındadır.

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/products` | Tüm ürünleri listele |
| `POST` | `/api/orders` | Yeni sipariş oluştur |
| `GET` | `/api/wms/suggest-shelf` | WMS raf önerisi al |
| `POST` | `/api/production/start` | Üretim başlat |
| `POST` | `/api/purchasing/auto-order` | Otomatik satın alma |
| `GET` | `/api/crm/questions` | Müşteri soruları & talepleri |
| `...` | `...` | 25+ route dosyasında yüzlerce optimize endpoint |
