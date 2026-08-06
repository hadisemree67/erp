# Stok, Üretim ve Depo Yönetim Sistemi (WMS & ERP)

Bu proje; üretim, tedarik, depo yerleşimi, sipariş yönetimi ve raporlama süreçlerini tek bir merkezden uçtan uca yönetmeyi sağlayan kapsamlı bir sistemdir. Masaüstü (Electron/React), Mobil (React Native) ve Backend (Node.js/MySQL) olarak üç ana bileşenden oluşur.

## 🔄 Temel İş Akışı (Sistem Nasıl Çalışır?)

Sistem, bir üretim tesisinin veya e-ticaret deposunun günlük operasyon akışına göre tasarlanmıştır:

### 1. Malzeme ve Tedarikçi Tanımlamaları
Her şeyin başlangıcı temel verilerin girilmesidir. Sisteme öncelikle hammadde tedarikçileri ve bu tedarikçilerden alınacak malzemeler (Hammaddeler, ambalajlar vb.) girilir. Hangi tedarikçiden hangi malzemenin kaç paraya ve kaç günde temin edildiği (Sözleşmeler ve PDF'ler dahil) sisteme işlenir.

### 2. Ürün Formülü (Reçete) Oluşturma
Üretilecek nihai ürünler için "Formül / Reçete" tanımlanır. Örneğin, "Bir adet A ürünü üretmek için, X hammaddesinden 10 gram, Y ambalajından 1 adet gerekir" şeklinde ürün mimarisi sisteme tanıtılır.

### 3. Depo ve Stok Girişleri (WMS Algoritmaları)
Sisteme giren hammaddeler veya üretilen yeni ürünler için stok girişleri yapılır. Sistem bu aşamada çok akıllı davranır:
* Ürünün hacmi (en, boy, derinlik, çap) ve ağırlığı otomatik hesaplanır.
* Koli / Kutu kapasitesi ve "Üst üste konulabilir mi?" (İstifleme limiti) özellikleri okunur.
* Depodaki rafların boş m³ hacimlerine ve taşıma kapasitelerine bakılarak personeline **"Bu ürünü A deposundaki 3 numaralı rafa yerleştir"** şeklinde otonom yönlendirme yapar.

### 4. Akıllı Stok Takibi ve Üretim Talebi
Satışlar oldukça veya üretim yapıldıkça stoklar anlık olarak sistemden düşer.
* Bir nihai ürünün (Satılan ürünün) stoku, belirlenen **Kritik Stok Seviyesi**nin altına düştüğünde sistem bunu algılar ve hemen "Üretime Talep" oluşturur.

### 5. Otomatik Satın Alma ve Tedarikçi Mailleri (Purchasing)
Eğer üretime talep oluşturulduğunda içeride yeterli "Hammadde" yoksa (hammadde kritik seviyenin altına düşmüşse), sistem Satın Alma döngüsünü tetikler.
* Tedarikçiler arasından en uygun olanı (fiyat veya hıza göre) otomatik seçer.
* Tedarikçiye onay linki içeren otonom e-postalar gönderir. Tedarikçi e-postadaki linke tıklayarak siparişi onayladığında ERP sistemine "Yola Çıktı" olarak düşer.

### 6. Sipariş ve Satış Yönetimi
E-Ticaret veya B2B müşterilerinden gelen siparişler sisteme yansır.
* Müşterilerin detaylı bilgileri (Cinsiyet, Yaş, Şehir gibi demografik veriler) tutulur.
* Onaylanan siparişler doğrudan **Paketleme Sırasına** aktarılır.

### 7. Mobil Uygulama ve El Terminalleri
Paketleme sırasına giren siparişler deponun içinde personelin telefonuna (veya el terminaline) bildirim olarak düşer.
* Personel mobil uygulama üzerinden siparişteki ürünlerin barkodlarını okutarak paketleme işlemini yapar. Hatalı ürün konulmasını %100 engeller.
* Sevkiyat (Kargo) işlemi tamamlandığında stoklar sistemden kalıcı olarak düşer.

### 8. Gelişmiş Raporlama (Excel Dışa Aktarım)
Sistemdeki tüm hareketler; Müşteri, Sipariş, Stok ve Yaş/Cinsiyet/Şehir filtrelerine göre analiz edilip tek tıkla Excel formatında indirilebilir. İşletmenin anlık durumu (Nereden kim ne almış, hangi rafta ne var) en ince ayrıntısına kadar raporlanır.

### 9. Güvenli Sayım Modu / Acil Durum Kalkanı (Kill Switch)
Depolarda genel sayım (Inventory Count) yapılacağı zaman veya **olası bir siber saldırı / iç sabotaj durumunda**, işlemlerin durdurulması için **Sistem Durdurma (Zamanı Dondurma)** özelliği devreye alınır.
* Ayarlardan "Sistemi Durdur" butonuna basıldığı milisaniyede tüm sistemde çok güçlü bir güvenlik kalkanı (Global Middleware) aktif olur.
* Sistem o saniyede donar; personel, dış API'ler veya hacker botları yeni ürün, stok ekleyemez ve en önemlisi **hiçbir veriyi SİLEMEZ** (Uygulama arka planda HTTP 503 güvenliğiyle tüm veritabanı yazma/silme isteklerini reddeder).
* Sayım bittiğinde veya tehdit geçtiğinde kilit açılır ve sistem normal akışına sorunsuz devam eder. Hiçbir veri bozulması veya çakışma yaşanmaz.

---

## 🛠 Kullanılan Teknolojiler
* **Backend:** Node.js, Express.js, Prisma ORM, MySQL (Tamamen Parametrik Güvenli Sorgular).
* **Masaüstü Frontend:** React.js, Vite, Electron.js, TailwindCSS.
* **Mobil Frontend:** React Native, Expo (Barkod ve Kamera entegreli).
