<div align="center">
  <img src="https://raw.githubusercontent.com/github/explore/80688e429a7d4ef2fca1e82350fe8e3517d3494d/topics/nodejs/nodejs.png" alt="Logo" width="80" height="80">
  <h1 align="center">Stok, Üretim ve Depo Yönetim Sistemi (WMS & ERP)</h1>
  
  <p align="center">
    Uçtan uca üretim, tedarik, depo yerleşimi ve sipariş yönetimi sağlayan kapsamlı sistem.
    <br />
    <a href="#-özellikler"><strong>Özellikleri Keşfet »</strong></a>
    <br />
    <br />
    <a href="#-kurulum">Kurulum</a>
    ·
    <a href="#-temel-iş-akışı">İş Akışı</a>
    ·
    <a href="#-kullanılan-teknolojiler">Teknolojiler</a>
  </p>
</div>

<!-- Badges -->
<div align="center">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white" alt="Electron.js" />
  <img src="https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
</div>

---

## 📖 Proje Hakkında

Bu proje; bir üretim tesisinin veya e-ticaret deposunun günlük operasyon akışını dijitalleştirmek ve otonom hale getirmek için tasarlanmıştır. **Web (E-Ticaret Platformu), Masaüstü (ERP Yönetim Paneli), Mobil (Depo Personeli Uygulaması) ve Backend (Sunucu API)** olarak dört ana bileşenden oluşur. Manuel hataları en aza indirir, süreçleri hızlandırır ve depo hacmini maksimum verimle kullanmanızı sağlar.

## ✨ Özellikler

- 📦 **Gelişmiş WMS Algoritmaları:** Hacim ve ağırlık bazlı otonom raf yönlendirmesi.
- 🏭 **Ürün Reçetesi (BOM):** Nihai ürünler için dinamik formül ve bileşen tanımlama.
- 📉 **Akıllı Stok Takibi:** Kritik stok seviyelerinde otomatik üretim veya tedarik talebi.
- 📧 **Otonom Satın Alma:** Tedarikçilere otomatik sipariş ve onay e-postaları.
- 📱 **Mobil Barkod Okuma:** Hatalı paketlemeyi %100 engelleyen el terminali entegrasyonu.
- 📊 **Detaylı Raporlama:** Demografik veri analizi ve tek tıkla Excel çıktıları.
- 🛡️ **Acil Durum Kalkanı (Kill Switch):** Siber saldırı veya sayım anında sistemi güvenli dondurma.

---

## 🔄 Temel İş Akışı

Sistem aşağıdaki adımları birbirine entegre bir şekilde yürütür:

### 1. 🏢 Malzeme ve Tedarikçi Tanımlamaları
Her şeyin başlangıcı temel verilerin girilmesidir. Sisteme öncelikle hammadde tedarikçileri ve bu tedarikçilerden alınacak malzemeler (Hammaddeler, ambalajlar vb.) girilir. Hangi tedarikçiden hangi malzemenin kaç paraya ve kaç günde temin edildiği sisteme işlenir.

### 2. 🧪 Ürün Formülü (Reçete) Oluşturma
Üretilecek nihai ürünler için "Formül / Reçete" tanımlanır. (Örn: *Bir adet A ürünü için X'ten 10g, Y'den 1 adet gerekir.*)

### 3. 🧩 Depo ve Stok Girişleri (Akıllı Yerleşim)
Sisteme giren malzemeler için stok girişleri yapılır. Sistem:
- Ürünün hacmi (en/boy/derinlik/çap) ve ağırlığını hesaplar.
- İstifleme limitini kontrol eder.
- Rafların boş m³ hacimlerine bakarak personele **"Bu ürünü A deposundaki 3 numaralı rafa yerleştir"** şeklinde otonom yönlendirme yapar.

### 4. 📉 Akıllı Stok Takibi ve Üretim Talebi
Satış oldukça veya üretim yapıldıkça stoklar anlık düşer. Stok, **Kritik Seviyenin** altına düştüğünde sistem otomatik "Üretime Talep" oluşturur.

### 5. 🤝 Otomatik Satın Alma (Purchasing)
Üretime talep oluşturulduğunda içeride yeterli hammadde yoksa sistem Satın Alma döngüsünü tetikler. Tedarikçiler arasından en uygununu seçer, otonom e-postalar gönderir ve onay bekler.

### 6. 🛒 Sipariş ve Satış Yönetimi
E-Ticaret veya B2B müşterilerinden gelen siparişler (demografik verilerle birlikte) sisteme yansır. Onaylanan siparişler doğrudan **Paketleme Sırasına** aktarılır.

### 7. 📱 Mobil Uygulama ve El Terminalleri
Paketleme sırasına giren siparişler deponun içinde personelin telefonuna (veya el terminaline) bildirim olarak düşer. Personel mobil üzerinden barkod okutarak paketleme yapar. Sevkiyat tamamlandığında stoklar kalıcı olarak düşer.

### 8. 🛡️ Güvenli Sayım Modu / Acil Durum Kalkanı (Kill Switch)
Depolarda genel sayım (Inventory Count) yapılacağı zaman veya **olası bir siber saldırı/iç sabotaj durumunda**, işlemlerin durdurulması için "Sistemi Durdur" özelliği devreye alınır. Tüm veritabanı yazma/silme işlemleri HTTP 503 güvenliğiyle reddedilir.

---

## 🛠 Kullanılan Teknolojiler

Proje modern, ölçeklenebilir ve güvenli teknolojiler üzerine inşa edilmiştir:

### Backend (Sunucu & Veritabanı)
- **Node.js & Express.js:** Hızlı ve asenkron API sunucusu
- **Prisma ORM:** Tip güvenli veritabanı sorguları
- **MySQL:** İlişkisel veritabanı (Parametrik güvenlikli)

### Web (E-Ticaret Sitesi) & Masaüstü (Yönetim Paneli)
- **React.js (Vite):** Yüksek performanslı e-ticaret arayüzü ve yönetim paneli
- **Electron.js:** Cross-platform masaüstü ERP uygulama yeteneği
- **TailwindCSS:** Hızlı ve modern stillendirme

### Mobil Uygulama (Depo Personeli İçin)
- **React Native & Expo:** iOS ve Android uyumlu mobil uygulama (Barkod & Kamera entegreli)

---

## 🚀 Kurulum

Projeyi kendi ortamınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz.

### Ön Koşullar
- [Node.js](https://nodejs.org/) (v16 veya üzeri)
- [MySQL](https://www.mysql.com/) Veritabanı
- Git

### Adımlar

1. **Repoyu klonlayın**
   ```bash
   git clone https://github.com/kullaniciadi/stokerpsistemi.git
   cd stokerpsistemi
   ```

2. **Backend'i başlatın**
   ```bash
   cd backend-api
   npm install
   # .env.example dosyasını .env olarak kopyalayın ve veritabanı bilgilerinizi girin
   cp .env.example .env
   # Prisma veritabanı tablolarını oluşturun
   npx prisma migrate dev
   npm run dev
   ```

3. **E-Ticaret Sitesini (Web App) başlatın** (Yeni bir terminalde)
   ```bash
   cd ../web-app
   npm install
   npm run dev
   ```

4. **Mobil Uygulamayı (Expo) başlatın** (Yeni bir terminalde)
   ```bash
   cd ../mobile-app
   npm install
   npm start
   ```

5. **Masaüstü ERP Uygulamasını başlatın** (Yeni bir terminalde)
   ```bash
   cd ../desktop-app
   npm install
   npm run desktop
   ```

---

<div align="center">
  <p>Geliştirme ve tasarımla ilgili tüm sorularınız için Pull Request açabilir veya Issues kısmından ulaşabilirsiniz.</p>
</div>
