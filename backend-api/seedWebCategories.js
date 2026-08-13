const prisma = require('./prisma');

const rawData = {
  cilt: {
    mainTitle: 'Cilt Bakımı',
    columns: [
      { title: 'Cilt Tipine Göre', links: ['Kuru Cilt', 'Yağlı Cilt', 'Karma Cilt', 'Hassas Cilt', 'Normal Cilt', 'Akneye Eğilimli Cilt'] },
      { title: 'Temizleme', links: ['Yüz Temizleme Jelleri', 'Temizleme Köpükleri', 'Misel Sular', 'Makyaj Temizleyiciler', 'Temizleme Yağları', 'Tonikler'] },
      { title: 'Cilt Bakım Ürünleri', links: ['Nemlendiriciler', 'Serumlar', 'Maskeler', 'Peelingler', 'Göz Çevresi'] },
      { title: 'Cilt Sorunlarına Göre', links: ['Akne & Sivilce', 'Leke', 'Kızarıklık', 'Gözenek', 'Kırışıklık'] }
    ]
  },
  sac: {
    mainTitle: 'Saç Bakımı',
    columns: [
      { title: 'Saç Tipine Göre', links: ['Kuru & Yıpranmış', 'Yağlı', 'İnce Telli', 'Kıvırcık & Dalgalı', 'Boyalı', 'Hassas Saç Derisi'] },
      { title: 'Şampuanlar', links: ['Kepek Karşıtı', 'Dökülme Karşıtı', 'Hacim Veren', 'Nemlendirici', 'Boyalı Saçlar'] },
      { title: 'Saç Bakım Ürünleri', links: ['Saç Kremleri', 'Saç Maskeleri', 'Durulanmayan Bakım', 'Saç Serumları & Yağları', 'Ampuller'] },
      { title: 'Şekillendirme & Aletler', links: ['Saç Spreyleri', 'Köpükler', 'Wax & Jöle', 'Saç Kurutma Makineleri', 'Düzleştirici & Maşa'] }
    ]
  },
  vucut: {
    mainTitle: 'Vücut Bakımı',
    columns: [
      { title: 'Duş & Banyo', links: ['Duş Jelleri', 'Katı Sabunlar', 'Banyo Köpükleri', 'Duş Yağları'] },
      { title: 'Vücut Nemlendirme', links: ['Vücut Kremleri', 'Vücut Losyonları', 'Vücut Yağları', 'El Kremleri'] },
      { title: 'Özel Bakım & Peeling', links: ['Vücut Peelingleri', 'Çatlak Bakımı', 'Selülit Bakımı', 'Sıkılaştırıcılar'] },
      { title: 'El, Ayak & Deodorant', links: ['El Bakımı', 'Ayak Kremleri', 'Topuk Bakımı', 'Deodorant & Antiperspirant'] }
    ]
  },
  makyaj: {
    mainTitle: 'Makyaj',
    columns: [
      { title: 'Ten Makyajı', links: ['Fondöten', 'BB & CC Kremler', 'Kapatıcı', 'Pudra', 'Allık', 'Bronzer', 'Highlighter'] },
      { title: 'Göz Makyajı', links: ['Maskara', 'Eyeliner', 'Göz Kalemi', 'Far', 'Kaş Ürünleri'] },
      { title: 'Dudak Makyajı', links: ['Ruj', 'Dudak Parlatıcısı', 'Dudak Kalemi', 'Dudak Bakımı'] },
      { title: 'Aksesuarlar & Temizleme', links: ['Makyaj Fırçaları', 'Makyaj Süngerleri', 'Kirpik Kıvırıcı', 'Makyaj Aynaları', 'Makyaj Temizleme Suları'] }
    ]
  },
  parfum: {
    mainTitle: 'Parfüm',
    columns: [
      { title: 'Kadın Parfümleri', links: ['EDP Kadın', 'EDT Kadın', 'Roll-on Parfümler', 'Çiçeksi Notalar', 'Odunsu Notalar'] },
      { title: 'Erkek Parfümleri', links: ['EDP Erkek', 'EDT Erkek', 'Tıraş Sonrası Losyonlar', 'Baharatlı Notalar', 'Ferah Notalar'] },
      { title: 'Unisex & Niş Parfümler', links: ['Unisex Parfümler', 'Niş (Niche) Parfümler', 'Seyahat Boy Parfümler'] },
      { title: 'Yan Ürünler', links: ['Vücut Spreyleri', 'Deodorantlar', 'Saç Parfümleri', 'Parfüm Setleri'] }
    ]
  },
  anne: {
    mainTitle: 'Anne & Bebek',
    columns: [
      { title: 'Bebek Cilt & Vücut', links: ['Pişik Kremleri', 'Bebek Yağları', 'Bebek Losyonları', 'Bebek Pudraları'] },
      { title: 'Bebek Banyo & Temizlik', links: ['Bebek Şampuanları', 'Bebek Sabunları', 'Islak Mendiller', 'Bebek Banyo Ürünleri'] },
      { title: 'Bebek Beslenme', links: ['Biberon', 'Emzik', 'Mama', 'Beslenme Aksesuarları'] },
      { title: 'Anne Bakımı & Hijyen', links: ['Göğüs Ucu Kremleri', 'Emzirme Ürünleri', 'Anne Hijyeni', 'Bebek Bezleri', 'Bebek Bakım Setleri'] }
    ]
  },
  agiz: {
    mainTitle: 'Ağız & Diş Bakımı',
    columns: [
      { title: 'Diş Macunları', links: ['Beyazlatıcı Macunlar', 'Hassasiyet Karşıtı', 'Florürsüz Macunlar', 'Diş Eti Koruması'] },
      { title: 'Diş Fırçaları', links: ['Manuel Fırçalar', 'Elektrikli Fırçalar', 'Arayüz Fırçaları', 'Çocuk Fırçaları'] },
      { title: 'Ağız Suları & Spreyler', links: ['Ağız Gargaraları', 'Ağız Spreyleri', 'Alkolsüz Gargaralar'] },
      { title: 'Ekstra Bakım', links: ['Diş İpi', 'Diş Beyazlatma Setleri', 'Protez Bakımı', 'Çocuk Ağız & Diş Bakımı'] }
    ]
  },
  saglik: {
    mainTitle: 'Sağlık / Takviye',
    columns: [
      { title: 'Vitaminler', links: ['Multivitamin', 'C Vitamini', 'D Vitamini', 'B Vitaminleri', 'E Vitamini'] },
      { title: 'Mineraller', links: ['Magnezyum', 'Çinko', 'Demir', 'Kalsiyum'] },
      { title: 'Özel Destekler', links: ['Kolajen', 'Omega 3', 'Probiyotik', 'Glukozamin', 'Melatonin'] },
      { title: 'Bitkisel Takviyeler', links: ['Bitkisel Çaylar', 'Ginseng', 'Zerdeçal', 'Propolis', 'Ekinezya'] }
    ]
  },
  kisisel: {
    mainTitle: 'Kişisel Bakım',
    columns: [
      { title: 'Tıraş & Epilasyon', links: ['Tıraş Makineleri', 'Tıraş Bıçakları', 'Tıraş Köpükleri', 'Tıraş Sonrası', 'Ağda & Tüy Dökücüler'] },
      { title: 'Hijyen', links: ['El Dezenfektanı', 'Islak Mendil', 'Pamuk & Kulak Çubuğu', 'Sıvı Sabunlar'] },
      { title: 'Kadın Bakımı', links: ['Ped', 'Tampon', 'Günlük Ped', 'İntim Bakım'] },
      { title: 'Aksesuarlar', links: ['Kişisel Bakım Aksesuarları', 'Tırnak Makası & Törpü', 'Banyo Süngerleri'] }
    ]
  },
  erkek: {
    mainTitle: 'Erkek Bakım',
    columns: [
      { title: 'Erkek Cilt Bakımı', links: ['Yüz Yıkama Jeli', 'Erkek Nemlendirici', 'Göz Çevresi Bakımı', 'Akne Karşıtı'] },
      { title: 'Sakal & Bıyık Bakımı', links: ['Sakal Yağı', 'Sakal Şampuanı', 'Sakal Balmı', 'Sakal Tarağı'] },
      { title: 'Tıraş', links: ['Tıraş Köpüğü', 'Tıraş Jeli', 'Tıraş Sonrası (Aftershave)', 'Kan Taşı & Şap'] },
      { title: 'Saç & Vücut', links: ['Erkek Saç Bakımı', 'Kepek Karşıtı Şampuan', 'Erkek Parfümleri', 'Erkek Deodorant'] }
    ]
  },
  medikal: {
    mainTitle: 'Medikal Ürünler',
    columns: [
      { title: 'Ölçüm Cihazları', links: ['Ateş Ölçer', 'Tansiyon Aletleri', 'Şeker Ölçüm', 'Oksimetre', 'Baskül'] },
      { title: 'Yara & İlk Yardım', links: ['Yara Bakımı', 'Bandaj & Flaster', 'Yanık Kremi', 'Antiseptik & Baticon'] },
      { title: 'Koruyucu Ürünler', links: ['Medikal Eldiven', 'Maske', 'Hasta Bezi', 'Ortopedik Destekler'] },
      { title: 'Evde Sağlık', links: ['Medikal Cihazlar', 'Buhar Makinesi', 'Isıtıcı Bantlar', 'Sıcak Su Torbası'] }
    ]
  },
  dogal: {
    mainTitle: 'Doğal & Organik',
    columns: [
      { title: 'Cilt Bakımı', links: ['Organik Cilt Bakımı', 'Doğal Yüz Temizleme', 'Saf Aromaterapi Yağları', 'Vegan Göz Kremleri'] },
      { title: 'Saç Bakımı', links: ['Doğal Saç Bakımı', 'Organik Şampuan', 'Katı Şampuan (Sıfır Atık)', 'Sülfatsız Şampuan'] },
      { title: 'Vücut & Kozmetik', links: ['Doğal Vücut Bakımı', 'Organik El Yapımı Sabunlar', 'Vegan Kozmetik', 'Cruelty Free Ürünler', 'Bitkisel Ürünler'] },
      { title: 'Bebek & Anne', links: ['Organik Bebek Şampuanı', 'Doğal Pişik Kremi', 'Organik Emzirme Çayı'] }
    ]
  },
  gunes: {
    mainTitle: 'Güneş Ürünleri',
    columns: [
      { title: 'Yüz Güneş Kremleri', links: ['Kuru Cilt Güneş Kremi', 'Yağlı Cilt Güneş Kremi', 'Renkli Güneş Kremleri', 'Leke Karşıtı Güneş Kremi'] },
      { title: 'Vücut & Çocuk', links: ['Vücut Güneş Kremleri', 'Güneş Koruyucu Spreyler', 'Çocuk Güneş Kremleri', 'Mineral Filtreli Kremler'] },
      { title: 'Güneş Sonrası', links: ['Güneş Sonrası Losyonlar', 'Aloe Vera Jelleri', 'Yanık Rahatlatıcılar'] },
      { title: 'Bronzlaştırıcılar', links: ['Bronzlaştırıcı Yağlar', 'Oto Bronzanlar (Güneşsiz)', 'Havuç & Kakao Yağı'] }
    ]
  },
  hediyelik: {
    mainTitle: 'Hediyelik Ürünler',
    columns: [
      { title: 'Hediye Setleri', links: ['Kadın Hediye Setleri', 'Erkek Hediye Setleri', 'Özel Gün Hediyeleri', 'Yılbaşı Hediye Kutuları'] },
      { title: 'Cilt Bakım Setleri', links: ['Kırışıklık Karşıtı Setler', 'Nemlendirici Kofreler', 'Seyahat Boy (Travel Size)'] },
      { title: 'Saç & Vücut Setleri', links: ['Saç Bakım Setleri', 'Duş & Vücut Setleri', 'Masaj & Spa Setleri'] },
      { title: 'Parfüm Setleri', links: ['Kadın Parfüm Setleri', 'Erkek Parfüm Setleri', 'Mini Parfüm Koleksiyonu'] }
    ]
  }
};

const slugify = (text) => {
    const charMap = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
    return text.toLowerCase().replace(/[çğıöşüÇĞİÖŞÜ]/g, match => charMap[match] || match).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

async function seed() {
    try {
        if (!prisma.web_categories) return; // DB not updated yet
        
        const count = await prisma.web_categories.count();
        if (count >= 14) return; // Already fully seeded
        
        console.log('Seeding web categories (cleaning old data first)...');
        await prisma.web_subtitles.deleteMany({});
        await prisma.web_subcategories.deleteMany({});
        await prisma.web_categories.deleteMany({});
        for (const [key, categoryData] of Object.entries(rawData)) {
            const cat = await prisma.web_categories.create({
                data: {
                    name: categoryData.mainTitle,
                    slug: key,
                }
            });
            
            for (const col of categoryData.columns) {
                const subCat = await prisma.web_subcategories.create({
                    data: {
                        category_id: cat.id,
                        name: col.title,
                        slug: slugify(col.title)
                    }
                });
                
                for (const titleName of col.links) {
                    await prisma.web_subtitles.create({
                        data: {
                            subcategory_id: subCat.id,
                            name: titleName,
                            slug: slugify(titleName)
                        }
                    });
                }
            }
        }
        console.log('Successfully seeded web categories!');
    } catch (e) {
        console.error('Seed failed:', e);
    }
}

module.exports = seed;
