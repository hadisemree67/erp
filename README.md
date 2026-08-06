# Kapsamlı Stok, ERP ve WMS Sistemi

Modern teknolojilerle geliştirilmiş, uçtan uca Depo Yönetim (WMS), Üretim, Satın Alma, Satış ve Müşteri İlişkileri (CRM) süreçlerini yöneten tam kapsamlı bir ERP uygulamasıdır. Sistem; Masaüstü (Electron/React), Mobil (React Native/Expo) ve Güçlü bir Backend (Node.js/Express) altyapısından oluşmaktadır.

## Temel Özellikler ve Modüller

### 1. Gelişmiş Depo Yönetim Sistemi (WMS - Akıllı Raf ve Yerleşim)
Sistemin en güçlü yanlarından biri olan WMS modülü, depoların hacimsel (m³) ve fiziksel özelliklerine göre tamamen otonom yerleşim algoritmaları kullanır.
* **Hacimsel (Volume) Hesaplama:** Ürünlerin en, boy, derinlik ve çap özelliklerini okuyarak silindirik veya dikdörtgen prizma hacim hesaplamalarını otomatik yapar.
* **Akıllı Raf Optimizasyonu:** Rafların maksimum hacim (m³) ve ağırlık (kg) taşıma kapasitelerine göre ürünlerin sığıp sığmayacağını otonom hesaplar.
* **Üst Üste İstifleme (Stackability):** Ürünün "Üst üste konulabilir mi?" (is_stackable) özelliğine ve "Maksimum istifleme limitine" (max_stack_limit) göre yer hesaplaması yapar. Kırılacak veya ezilecek ürünleri korur.
* **Koli ve Kutu (Package) Hesaplama:** Bir koli/kutu içinde kaç adet ürün olduğu ve bir rafa kaç koli sığabileceği algoritmik olarak arka planda yönetilir.
* **Dinamik Raf Önerisi:** Depoya mal kabul edilirken (veya üretimden çıkarken), sistem depodaki boş yerleri tarar ve "Bu ürün X deposunun Y rafına tam sığmaktadır" şeklinde personeli yönlendirir.

### 2. Akıllı Satın Alma ve Tedarik Zinciri (Purchasing)
Ürünlerin tedarik süreçleri kritik stok seviyeleri ile tetiklenir.
* **Kritik Stok Uyarıları:** Her ürün için belirlenen kritik stok seviyesinin altına düşüldüğünde sistem otomatik olarak uyarı verir.
* **Akıllı Tedarikçi Seçimi:** Bir ürünü sağlayan birden fazla tedarikçi arasından en ucuz (unit_price) veya en hızlı (lead_time_days) olanı analiz eder.
* **Sözleşme Yönetimi:** Tedarikçiler ile yapılan resmi sözleşmeler (PDF/Görsel) sisteme yüklenir. "Ana Tedarikçi" (Primary) mantığıyla ürünlerin satın alma fiyatları otomatik çekilir.
* **Otomatik Onay Mailleri:** Tedarikçilere otomatik "Sipariş Onay" linkleri içeren e-postalar gönderilir, tedarikçi tıkladığında ERP sisteminde sipariş durumu "Onaylandı" olarak güncellenir.

### 3. CRM ve Satış (Müşteri ve Sipariş Yönetimi)
* **Gelişmiş Müşteri Demografisi:** Müşterilerin (veya son tüketicilerin) **Cinsiyet, Yaş ve Şehir (İl)** gibi demografik özellikleri kayıt altına alınır.
* **Sipariş ve Paketleme (Packaging):** Siparişler onaylandığında paketleme sırasına alınır (Mobil uygulamadan barkod okutularak paketlenebilir).
* **Excel İçe/Dışa Aktarım:** Siparişler, müşteri verileri, şehir ve yaş grubu filtrelemeleriyle anında Excel formatında raporlanır.

### 4. Güvenlik ve "Sayım / Bakım Modu" (Time Freeze Architecture)
Depolarda sayım yapılacağı zaman sistemin durdurulması gerekir. Bu sistemde kusursuz bir güvenlik kalkanı (Global Middleware) bulunur.
* **Tüm Hareketleri Durdur:** Tek bir butonla tüm sistem veri girişine kapatılır. (Ürün ekleme, satış, sipariş vb.)
* **503 Shield:** Sistem kilitliyken API'ye atılan tüm `POST`, `PUT`, `DELETE` istekleri Node.js katmanında reddedilir ve veritabanı %100 koruma altına alınır. Hiçbir kaçak ürün veya eksik görsel/dosya işlenemez.
* **E-Ticaret ve Dış Link İstisnaları:** Sistem dondurulmuş olsa bile tedarikçi e-posta onayları veya salt-okunur (listeleme) işlemleri sorunsuz çalışmaya devam eder.

---

## 🛠 Kullanılan Teknolojiler (Tech Stack)

### Backend (API)
- **Node.js & Express.js:** Hızlı ve ölçeklenebilir RESTful API mimarisi.
- **MySQL & Prisma ORM:** Gelişmiş ilişkisel veritabanı, raw query optimizasyonları ve parametrik sorgular (`?` parametresiyle %100 SQL Injection koruması).
- **JWT (JSON Web Token):** Rol tabanlı (Role-based) gelişmiş kimlik doğrulama, API güvenliği.
- **Multer:** Sunucuya görsel, PDF, sözleşme gibi dosyaların `multipart/form-data` ile aktarılması.

### Frontend (Desktop & Web)
- **React.js & Vite:** Hızlı arayüzler ve komponent tabanlı yapı.
- **Electron.js:** Projenin Windows/Mac üzerinde native masaüstü uygulaması (Executable) olarak çalışmasını sağlar.
- **Tailwind CSS / Pure CSS:** Modern, esnek ve dinamik kullanıcı arayüzleri.
- **Axios & Fetch:** API iletişimleri.

### Mobil Uygulama (Depo / Paketleme Operasyonları)
- **React Native & Expo:** iOS ve Android uyumlu, el terminalleriyle (veya telefonlarla) %100 uyumlu barkod okuma ve depo yönetim uygulaması.

---

## 🛡 Güvenlik Mimarisi (Security First)
1. **Veri Tipleri Koruması:** Frontend'den sayı beklenen bir alana (Örn: `Yaş`, `Genişlik`, `Fiyat`) harf veya metin girilirse backend bunu fark eder. Sistemi çökertmek (Crash) yerine kullanıcıya zarifçe (HTTP 400) **kırmızı uyarı** döndürür (`isNaN` ve `safeFloat` mimarisi).
2. **Kör Noktasız SQL:** Veritabanına dışarıdan gelen hiçbir metin direkt birleştirilerek yazılmaz. Node.js `mysql2` kütüphanesinin en güvenli hali olan Prepared Statements kullanılır.
3. **Şifre ve Sırların Gizliliği:** `.env` mimarisi ile veritabanı şifreleri, JWT anahtarları ve e-posta şifreleri kod içine (Hardcoded) yazılmaz.

Sistem; performans, güvenlik ve ticari sürdürülebilirlik açısından güncel standartların en üst düzey mimarisi ile tasarlanmıştır. Yüksek işlem hacimli ve kompleks hesaplamalı tüm endüstriyel operasyonları (Hacim-Ağırlık hesaplamaları vb.) kusursuz şekilde karşılar.
