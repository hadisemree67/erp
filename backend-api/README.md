# Backend API

Stok, Üretim ve Depo Yönetim Sistemi'nin RESTful API sunucusu.

## Teknolojiler

- **Node.js** + **Express.js v5** — Asenkron web framework
- **Prisma ORM v5** — Tip güvenli veritabanı erişimi
- **MySQL v8** — İlişkisel veritabanı
- **JWT** — Kimlik doğrulama ve yetkilendirme
- **Nodemailer** — Otomatik e-posta gönderimi
- **Helmet** — HTTP güvenlik başlıkları
- **Multer** — Dosya yükleme

## Proje Yapısı

```
backend-api/
├── server.js            # Ana sunucu — route bağlantıları ve middleware
├── db.js                # MySQL bağlantı havuzu (connection pooling)
├── prisma.js            # Prisma Client yapılandırması
├── middleware/
│   ├── auth.js          # JWT kimlik doğrulama middleware
│   ├── customerAuth.js  # Müşteri kimlik doğrulama
│   └── rbac.js          # Rol bazlı erişim kontrolü (RBAC)
├── routes/              # 24 adet modüler API route dosyası
│   ├── products.js      # Ürün CRUD, formül/reçete yönetimi
│   ├── orders.js        # Sipariş yönetimi ve durumları
│   ├── wms.js           # Depo Yönetim Sistemi (WMS) algoritmaları
│   ├── production.js    # Üretim planlama ve takip
│   ├── purchasing.js    # Satın alma süreçleri
│   ├── employees.js     # İK ve çalışan yönetimi
│   ├── finance.js       # Finansal işlemler
│   ├── mobile.js        # Mobil uygulama endpoint'leri
│   └── ...              # Ve 16 diğer route modülü
├── services/
│   └── emailService.js  # SMTP e-posta servisi (Nodemailer)
├── utils/
│   ├── logger.js        # Aktivite loglama
│   ├── wmsUtils.js      # WMS hacim/ağırlık hesaplama
│   ├── stockNotifier.js # Kritik stok bildirimleri
│   ├── salaryCron.js    # Otomatik maaş hesaplama (cron)
│   └── ...
├── prisma/
│   └── schema.prisma    # Veritabanı şeması
└── uploads/             # Yüklenen dosyalar (runtime)
```

## Kurulum

```bash
# Bağımlılıkları yükleyin
npm install

# .env dosyasını oluşturun
cp .env.example .env
# .env dosyasını düzenleyip veritabanı bilgilerinizi girin

# Prisma şemasını veritabanına uygulayın
npx prisma db push

# Geliştirme sunucusunu başlatın (nodemon ile)
npm run dev
```

## Ortam Değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `PORT` | Sunucu portu (varsayılan: 3000) |
| `DB_HOST` | MySQL host adresi |
| `DB_USER` | MySQL kullanıcı adı |
| `DB_PASSWORD` | MySQL şifresi |
| `DB_NAME` | Veritabanı adı |
| `DATABASE_URL` | Prisma bağlantı URL'si |
| `JWT_SECRET` | JWT imzalama anahtarı |
| `SMTP_HOST` | E-posta sunucu adresi |
| `SMTP_PORT` | E-posta sunucu portu |
| `SMTP_USER` | E-posta adresi |
| `SMTP_PASS` | E-posta uygulama şifresi |
| `BASE_URL` | API base URL'si |

## API Endpoint'leri

Sunucu `http://localhost:3000` adresinde çalışır. Tüm API route'ları `/api` prefix'i altındadır.

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/products` | Tüm ürünleri listele |
| `POST` | `/api/orders` | Yeni sipariş oluştur |
| `GET` | `/api/wms/suggest-shelf` | WMS raf önerisi al |
| `POST` | `/api/production/start` | Üretim başlat |
| `POST` | `/api/purchasing/auto-order` | Otomatik satın alma |
| ... | ... | 24 route dosyasında yüzlerce endpoint |
