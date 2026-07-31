const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'src');

const folderSummaries = {
    'Campaigns': 'Kampanya listeleme, ekleme ve düzenleme işlemlerini yöneten bileşenleri içerir.',
    'Customers': 'Müşteri kayıtlarını, B2B/B2C ayrımını ve müşteri detaylarını yöneten bileşenleri içerir.',
    'Employees': 'Personel listesi, mesai (overtime) ve izin (leave) yönetim arayüzlerini içerir.',
    'Finance': 'Finansal hesaplar, e-fatura modalları ve genel bütçe göstergelerini içerir.',
    'Orders': 'Müşteri siparişleri, kargo takibi ve siparişlerin paketlenmesi aşamalarını içerir.',
    'Production': 'Üretim talepleri, makineler, reçete (BOM) tanımları ve aktif üretim süreçlerini içerir.',
    'Products': 'Ürün katalogu, fason/satın alma detayları, barkod işlemleri ve toplu ürün güncelleme araçlarını içerir.',
    'Purchasing': 'Satın alma talepleri, onay süreçleri ve satın alma siparişlerinin takibini içerir.',
    'Reports': 'Satış, üretim ve envanter verilerine dair kapsamlı analiz raporları ve grafikleri sunar.',
    'Staff': 'Sistem kullanıcılarının yetkilendirmesi, şifre sıfırlama ve personel giriş bilgilerini yönetir.',
    'Suppliers': 'Tedarikçi firmaların, anlaşma tarihlerinin ve fason üretici detaylarının listelendiği bileşenleri içerir.',
    'Warehouses': 'Depo tanımları, raf koordinatları ve depo yerleşim düzeninin (Layout) görselleştirilmesini sağlar.',
    'WMS': 'Mal kabul, stok giriş/çıkış, raf transferleri ve genel depo envanter işlemlerini (Warehouse Management System) yönetir.',
    'utils': 'Proje genelinde kullanılan API istekleri (fetch) ve tarih/sayı formatlama gibi yardımcı fonksiyonları barındırır.',
    'src': 'Uygulamanın ana çekirdeği; genel yönlendirme (routing), kenar çubuğu (Sidebar) ve hata yakalama (ErrorBoundary) yapılarını barındırır.'
};

const translations = [
    // General / Layout
    { en: /We get locations \(shelves\) from the selected warehouse's Shelves_Details/gi, tr: "Seçili deponun raf bilgilerini (Shelves_Details) alırız" },
    { en: /Yön seçimi/gi, tr: "Yön seçimi" },
    { en: /Yönlü Ekleme/gi, tr: "Yönlü Ekleme" },
    { en: /Yönlü Çıkarma/gi, tr: "Yönlü Çıkarma" },
    { en: /Clear existing items in that row\/col/gi, tr: "O satır/sütundaki mevcut öğeleri temizle" },
    { en: /O satır\/sütundaki her şeyi sil ve koridor ekle/gi, tr: "O satır/sütundaki her şeyi sil ve koridor ekle" },
    { en: /Boş beyaz alan olarak işaretle/gi, tr: "Boş beyaz alan olarak işaretle" },
    { en: /O satır\/sütundaki her şeyi sil ve empty ekle/gi, tr: "O satır/sütundaki her şeyi sil ve empty ekle" },
    { en: /Sütun genişliklerini içeriğe göre hesapla/gi, tr: "Sütun genişliklerini içeriğe göre hesapla" },
    { en: /Sütun Başlıkları \(En üst satır\)/gi, tr: "Sütun Başlıkları (En üst satır)" },
    { en: /Sol üst köşe boşluk/gi, tr: "Sol üst köşe boşluk" },
    { en: /Satırlar/gi, tr: "Satırlar" },
    { en: /Satır Başlığı \(En sol\)/gi, tr: "Satır Başlığı (En sol)" },
    { en: /placed shelves/gi, tr: "Yerleştirilen raflar" },
    { en: /Backward compatibility/gi, tr: "Geriye dönük uyumluluk" },
    { en: /Sıralamayı keys array'ine göre yap/gi, tr: "Sıralamayı keys array'ine göre yap" },
    { en: /Hacim formatlayıcı \(cm3 -> m3 çevirimi ile birlikte\)/gi, tr: "Hacim formatlayıcı (cm3 -> m3 çevirimi ile birlikte)" },
    { en: /Nötr \/ sade tonlar/gi, tr: "Nötr / sade tonlar" },
    { en: /Manual Request Form State/gi, tr: "Manuel Talep Formu State'i" },
    { en: /30 saniyede bir otomatik olarak tabloyu sessizce günceller/gi, tr: "30 saniyede bir otomatik olarak tabloyu sessizce günceller" },
    { en: /Ignore time for contract end date comparison/gi, tr: "Sözleşme bitiş tarihi kıyaslamasında saati yoksay" },
    { en: /10 saniyede bir tabloyu sessizce günceller \(tedarikçi mailden tıklayınca ekran anında güncellensin diye\)/gi, tr: "10 saniyede bir tabloyu sessizce günceller (tedarikçi mailden tıklayınca ekran anında güncellensin diye)" },
    { en: /Sadece PURCHASE olanları filtrele/gi, tr: "Sadece satın alınanları (PURCHASE) filtrele" },
    { en: /Eğer stok kritik seviyenin altındaysa, aradaki farkı öner\. Aksi halde 1 öner\./gi, tr: "Eğer stok kritik seviyenin altındaysa, aradaki farkı öner. Aksi halde 1 öner." },
    { en: /Barkod Okuyucu State/gi, tr: "Barkod Okuyucu State'i" },
    { en: /Hammaddeleri state'e alıyoruz ama listede gizleyeceğiz/gi, tr: "Hammaddeleri state'e alıyoruz ama listede gizleyeceğiz" },
    { en: /Tam eşleşen barkod varsa direkt ürünün içine git \(düzenleme modunu aç\)/gi, tr: "Tam eşleşen barkod varsa direkt ürünün içine git (düzenleme modunu aç)" },
    { en: /Bulunamazsa sadece aramaya yaz/gi, tr: "Bulunamazsa sadece aramaya yaz" },
    { en: /Barcode parsing/gi, tr: "Barkod ayıklama (parsing)" },
    { en: /Images parsing/gi, tr: "Görsel ayıklama (parsing)" },
    { en: /Formula parsing/gi, tr: "Reçete ayıklama (parsing)" },
    { en: /Eğer önceden metin olarak kaydedilmişse boş döneriz veya parse edemiyorsak/gi, tr: "Eğer önceden metin olarak kaydedilmişse boş döneriz veya parse edemiyorsak" },
    { en: /Barkod Modal States/gi, tr: "Barkod Modal State'leri" },
    { en: /Re-index steps/gi, tr: "Adımları yeniden indeksle" },
    { en: /Add stacking fields using set to overwrite any value from forEach/gi, tr: "forEach'ten gelen herhangi bir değeri ezmek için yığın (stacking) alanlarını ekle" },
    { en: /Filter out empty barcodes/gi, tr: "Boş barkodları filtrele" },
    { en: /Combine existing images and new URL images/gi, tr: "Mevcut görselleri ve yeni URL görsellerini birleştir" },
    { en: /Filter and save Routing\/Formula JSON/gi, tr: "Reçete JSON'ını filtrele ve kaydet" },
    { en: /Clean empty steps and materials/gi, tr: "Boş adımları ve malzemeleri temizle" },
    { en: /Auto-calculate total production time from steps/gi, tr: "Adımlardan toplam üretim süresini otomatik hesapla" },
    { en: /Sadece FASON \(OUTSOURCED\) olanları filtrele/gi, tr: "Sadece fason (OUTSOURCED) üretimi filtrele" },
    { en: /Eğer sipariş paketi kapasitesi varsa ona yuvarlayabiliriz ama basit tutalım\./gi, tr: "Eğer sipariş paketi kapasitesi varsa ona yuvarlayabiliriz ama basit tutalım." },
    { en: /Independent states for each field to allow multiple updates/gi, tr: "Çoklu güncellemeyi desteklemek için her alana bağımsız state'ler ayarla" },
    { en: /Fetch categories and brands when modal opens/gi, tr: "Modal açıldığında kategori ve markaları getir" },
    { en: /Check SalePrice/gi, tr: "Satış fiyatını (SalePrice) kontrol et" },
    { en: /Check PurchasePrice/gi, tr: "Alış fiyatını (PurchasePrice) kontrol et" },
    { en: /Check Category/gi, tr: "Kategoriyi kontrol et" },
    { en: /Check Brand/gi, tr: "Markayı kontrol et" },
    { en: /We can still show it but disable button, or just block it\. Let's show it\./gi, tr: "Yine de gösterebiliriz ama butonu devre dışı bırakırız veya doğrudan engelleriz. Şimdilik gösterelim." }
];

function processFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processFiles(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // 1. Remove old verbose header if exists
            const oldHeaderRegex1 = /\/\*\r?\n \* .*?\r?\n \* Projenin çalışması için gereken kodları barındırıyor\.\r?\n \* Biraz karışık görünebilir ama işin özünü burada hallediyoruz\.\r?\n \*\/\r?\n\r?\n?/g;
            const oldHeaderRegex2 = /\/\*\r?\n \* .*?\r?\n \* .*?\r?\n \* Biraz karışık görünebilir ama işin özünü burada hallediyoruz\.\r?\n \*\/\r?\n\r?\n?/g;
            content = content.replace(oldHeaderRegex1, '');
            content = content.replace(oldHeaderRegex2, '');
            
            // If there's already an ÖZET header, skip adding a new one, but still translate comments
            if (!content.trim().startsWith('/*\n * ÖZET:')) {
                // Determine folder name to get the right summary
                let parentDirName = path.basename(path.dirname(fullPath));
                if (parentDirName === 'src') parentDirName = 'src'; // Special case for root src files
                
                let summary = folderSummaries[parentDirName] || 'Uygulamanın arayüz bileşenlerini barındırır.';
                const baseName = path.basename(fullPath);
                
                const newHeader = `/*\n * ÖZET:\n * Bu dosya (${baseName}), ${summary}\n */\n\n`;
                content = newHeader + content;
            }

            // 2. Translate inline English comments
            for (const item of translations) {
                // Using regex replace for all occurrences
                content = content.replace(item.en, (match) => {
                    return item.tr;
                });
            }

            fs.writeFileSync(fullPath, content);
        }
    }
}

processFiles(targetDir);
console.log('Tüm frontend (.js/.jsx) dosyaları temizlendi, Türkçe özetleri eklendi ve yorumları Türkçeleştirildi!');
