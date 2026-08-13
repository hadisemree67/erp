// -----------------------------------------------------------------------------
// Bileşen Adı: Geniş Menü Verisi
// Açıklama: Geniş açılır menüde (Mega Menu) gösterilecek olan kategori linklerini ve yapısal verileri barındırır.
// -----------------------------------------------------------------------------
import React from 'react';
import { Smile, User, Droplet, Wind, Sun, Heart, Sparkles, Box, Activity, Beaker, Droplets, ShieldCheck, Scissors, UserCheck } from 'lucide-react';

const charMap = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
// Verilen metni (kategori adı vb.) URL dostu, küçük harfli ve boşluksuz bir yapıya (slug) dönüştürür
  function slugify(text) {
  return text.toLowerCase().replace(/[çğıöşüÇĞİÖŞÜ]/g, match => charMap[match] || match).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Kategori yapısı içindeki link dizilerini, sistemde kullanılabilir URL objelerine (href, label) çevirir
  function createLinks(basePath, linksArr) {
  return linksArr.map(name => ({
    name,
    url: `${basePath}/${slugify(name)}`
  }));
}

export const categoriesList = [
  { id: 'cilt', name: 'Cilt Bakımı', icon: <Smile size={18} strokeWidth={1.5} />, url: '/kategori/cilt-bakimi' },
  { id: 'sac', name: 'Saç Bakımı', icon: <Wind size={18} strokeWidth={1.5} />, url: '/kategori/sac-bakimi' },
  { id: 'vucut', name: 'Vücut Bakımı', icon: <User size={18} strokeWidth={1.5} />, url: '/kategori/vucut-bakimi' },
  { id: 'makyaj', name: 'Makyaj', icon: <Sparkles size={18} strokeWidth={1.5} />, url: '/kategori/makyaj' },
  { id: 'parfum', name: 'Parfüm', icon: <Droplet size={18} strokeWidth={1.5} />, url: '/kategori/parfum' },
  { id: 'anne', name: 'Anne & Bebek', icon: <Heart size={18} strokeWidth={1.5} />, url: '/kategori/anne-bebek' },
  { id: 'agiz', name: 'Ağız & Diş Bakımı', icon: <Smile size={18} strokeWidth={1.5} />, url: '/kategori/agiz-dis-bakimi' },
  { id: 'saglik', name: 'Sağlık / Takviye', icon: <ShieldCheck size={18} strokeWidth={1.5} />, url: '/kategori/saglik-takviye' },
  { id: 'kisisel', name: 'Kişisel Bakım', icon: <Scissors size={18} strokeWidth={1.5} />, url: '/kategori/kisisel-bakim' },
  { id: 'erkek', name: 'Erkek Bakım', icon: <UserCheck size={18} strokeWidth={1.5} />, url: '/kategori/erkek-bakim' },
  { id: 'medikal', name: 'Medikal Ürünler', icon: <Activity size={18} strokeWidth={1.5} />, url: '/kategori/medikal-urunler' },
  { id: 'dogal', name: 'Doğal & Organik', icon: <Droplets size={18} strokeWidth={1.5} />, url: '/kategori/dogal-organik' },
  { id: 'gunes', name: 'Güneş Ürünleri', icon: <Sun size={18} strokeWidth={1.5} />, url: '/kategori/gunes-urunleri' },
  { id: 'hediyelik', name: 'Hediyelik Ürünler', icon: <Heart size={18} strokeWidth={1.5} />, url: '/kategori/hediyelik-urunler' },
];

export const megaMenuData = {
  cilt: {
    mainTitle: 'Cilt Bakımı',
    description: 'Cildinizin ihtiyacı olan tüm dermokozmetik ve medikal bakım ürünleri.',
    url: '/kategori/cilt-bakimi',
    columns: [
      {
        title: 'Cilt Tipine Göre', icon: Wind, // using wind as placeholder for the subtle icon
        links: createLinks('/kategori/cilt-bakimi/cilt-tipine-gore', ['Kuru Cilt', 'Yağlı Cilt', 'Karma Cilt', 'Hassas Cilt', 'Normal Cilt', 'Akneye Eğilimli Cilt'])
      },
      {
        title: 'Temizleme', icon: Box,
        links: createLinks('/kategori/cilt-bakimi/temizleme', ['Yüz Temizleme Jelleri', 'Temizleme Köpükleri', 'Misel Sular', 'Makyaj Temizleyiciler', 'Temizleme Yağları', 'Tonikler'])
      },
      {
        title: 'Cilt Bakım Ürünleri', icon: Beaker,
        links: createLinks('/kategori/cilt-bakimi/cilt-bakim-urunleri', ['Nemlendiriciler', 'Serumlar', 'Maskeler', 'Peelingler', 'Göz Çevresi'])
      },
      {
        title: 'Cilt Sorunlarına Göre', icon: Droplets,
        links: createLinks('/kategori/cilt-bakimi/cilt-sorunlarina-gore', ['Akne & Sivilce', 'Leke', 'Kızarıklık', 'Gözenek', 'Kırışıklık'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'La Roche-Posay', url: '/marka/la-roche-posay' },
          { name: 'Vichy', url: '/marka/vichy' },
          { name: 'Bioderma', url: '/marka/bioderma' },
          { name: 'Avène', url: '/marka/avene' },
          { name: 'The Ordinary', url: '/marka/the-ordinary' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['C vitamini', 'Güneş Kremi', 'Nemlendirici', 'Tonik', 'Sivilce Karşıtı']),
    adBanner: {
      tag: 'ÖNE ÇIKAN',
      title: 'Cildinize değer katan özel bakım ürünleri',
      text: 'En çok tercih edilen cilt bakım ürünlerini keşfedin.',
      buttonText: 'Ürünleri İncele',
      url: '/kampanyalar/cilt-bakimi',
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=300&auto=format&fit=crop'
    }
  },
  
  sac: {
    mainTitle: 'Saç Bakımı',
    description: 'Güçlü, sağlıklı ve ışıldayan saçlar için profesyonel bakım ürünleri.',
    url: '/kategori/sac-bakimi',
    columns: [
      {
        title: 'Saç Tipine Göre', icon: Wind,
        links: createLinks('/kategori/sac-bakimi/sac-tipine-gore', ['Kuru & Yıpranmış', 'Yağlı', 'İnce Telli', 'Kıvırcık & Dalgalı', 'Boyalı', 'Hassas Saç Derisi'])
      },
      {
        title: 'Şampuanlar', icon: Box,
        links: createLinks('/kategori/sac-bakimi/sampuanlar', ['Kepek Karşıtı', 'Dökülme Karşıtı', 'Hacim Veren', 'Nemlendirici', 'Boyalı Saçlar'])
      },
      {
        title: 'Saç Bakım Ürünleri', icon: Droplets,
        links: createLinks('/kategori/sac-bakimi/sac-bakim-urunleri', ['Saç Kremleri', 'Saç Maskeleri', 'Durulanmayan Bakım', 'Saç Serumları & Yağları', 'Ampuller'])
      },
      {
        title: 'Şekillendirme & Aletler', icon: Scissors,
        links: createLinks('/kategori/sac-bakimi/sekillendirme-aletler', ['Saç Spreyleri', 'Köpükler', 'Wax & Jöle', 'Saç Kurutma Makineleri', 'Düzleştirici & Maşa'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'Kerastase', url: '/marka/kerastase' },
          { name: 'L\'Oréal Professionnel', url: '/marka/loreal-professionnel' },
          { name: 'Vichy Dercos', url: '/marka/vichy' },
          { name: 'Ducray', url: '/marka/ducray' },
          { name: 'Olaplex', url: '/marka/olaplex' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Şampuan', 'Saç Dökülmesi', 'Kepek', 'Saç Maskesi', 'Kerastase']),
    adBanner: {
      tag: 'ÖNE ÇIKAN',
      title: 'Saçlarınıza değer katan özel bakım ürünleri',
      text: 'En çok tercih edilen saç bakım ürünlerini keşfedin.',
      buttonText: 'Ürünleri İncele',
      url: '/kampanyalar/sac-bakimi',
      image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=300&auto=format&fit=crop'
    }
  },

  vucut: {
    mainTitle: 'Vücut Bakımı',
    description: 'Pürüzsüz ve nemli bir cilt için vücut temizleme ve bakım ürünleri.',
    url: '/kategori/vucut-bakimi',
    columns: [
      {
        title: 'Duş & Banyo', icon: Droplets,
        links: createLinks('/kategori/vucut-bakimi/dus-banyo', ['Duş Jelleri', 'Katı Sabunlar', 'Banyo Köpükleri', 'Duş Yağları'])
      },
      {
        title: 'Vücut Nemlendirme', icon: User,
        links: createLinks('/kategori/vucut-bakimi/vucut-nemlendirme', ['Vücut Kremleri', 'Vücut Losyonları', 'Vücut Yağları', 'El Kremleri'])
      },
      {
        title: 'Özel Bakım & Peeling', icon: Box,
        links: createLinks('/kategori/vucut-bakimi/ozel-bakim', ['Vücut Peelingleri', 'Çatlak Bakımı', 'Selülit Bakımı', 'Sıkılaştırıcılar'])
      },
      {
        title: 'El, Ayak & Deodorant', icon: Wind,
        links: createLinks('/kategori/vucut-bakimi/el-ayak-deodorant', ['El Bakımı', 'Ayak Kremleri', 'Topuk Bakımı', 'Deodorant & Antiperspirant'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'CeraVe', url: '/marka/cerave' },
          { name: 'Neutrogena', url: '/marka/neutrogena' },
          { name: 'Nuxe', url: '/marka/nuxe' },
          { name: 'L\'Occitane', url: '/marka/loccitane' },
          { name: 'Sebamed', url: '/marka/sebamed' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Duş Jeli', 'Vücut Losyonu', 'Deodorant', 'Çatlak Kremi', 'El Kremi']),
    adBanner: {
      tag: 'KAMPANYA',
      title: 'Tüm vücut ürünlerinde %30 indirim',
      text: 'Yenilenen stoklarla vücudunuza hak ettiği bakımı verin.',
      buttonText: 'İndirimleri Gör',
      url: '/kampanyalar/vucut',
      image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?q=80&w=300&auto=format&fit=crop'
    }
  },

  makyaj: {
    mainTitle: 'Makyaj',
    description: 'Kusursuz bir görünüm için en iyi dermokozmetik ve renkli kozmetik markaları.',
    url: '/kategori/makyaj',
    columns: [
      {
        title: 'Ten Makyajı', icon: User,
        links: createLinks('/kategori/makyaj/ten-makyaji', ['Fondöten', 'BB & CC Kremler', 'Kapatıcı', 'Pudra', 'Allık', 'Bronzer', 'Highlighter'])
      },
      {
        title: 'Göz Makyajı', icon: Sparkles,
        links: createLinks('/kategori/makyaj/goz-makyaji', ['Maskara', 'Eyeliner', 'Göz Kalemi', 'Far', 'Kaş Ürünleri'])
      },
      {
        title: 'Dudak Makyajı', icon: Smile,
        links: createLinks('/kategori/makyaj/dudak-makyaji', ['Ruj', 'Dudak Parlatıcısı', 'Dudak Kalemi', 'Dudak Bakımı'])
      },
      {
        title: 'Aksesuarlar & Temizleme', icon: Scissors,
        links: createLinks('/kategori/makyaj/aksesuarlar', ['Makyaj Fırçaları', 'Makyaj Süngerleri', 'Kirpik Kıvırıcı', 'Makyaj Aynaları', 'Makyaj Temizleme Suları'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'Clinique', url: '/marka/clinique' },
          { name: 'Estée Lauder', url: '/marka/estee-lauder' },
          { name: 'Maybelline', url: '/marka/maybelline' },
          { name: 'L\'Oréal Paris', url: '/marka/loreal-paris' },
          { name: 'Jane Iredale', url: '/marka/jane-iredale' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Fondöten', 'Maskara', 'Kapatıcı', 'BB Krem', 'Makyaj Temizleyici']),
    adBanner: {
      tag: 'YENİ ÜRÜN',
      title: 'Dermokozmetik fondötenlerle tanışın',
      text: 'Cildinize nefes aldıran, tam kapatıcı ten ürünleri.',
      buttonText: 'İncele',
      url: '/kampanyalar/makyaj',
      image: 'https://images.unsplash.com/photo-1512496015851-a1c814b74bb1?q=80&w=300&auto=format&fit=crop'
    }
  },

  parfum: {
    mainTitle: 'Parfüm',
    description: 'Dünyaca ünlü markaların en kalıcı ve özel imza parfümleri.',
    url: '/kategori/parfum',
    columns: [
      {
        title: 'Kadın Parfümleri', icon: User,
        links: createLinks('/kategori/parfum/kadin', ['EDP Kadın', 'EDT Kadın', 'Roll-on Parfümler', 'Çiçeksi Notalar', 'Odunsu Notalar'])
      },
      {
        title: 'Erkek Parfümleri', icon: UserCheck,
        links: createLinks('/kategori/parfum/erkek', ['EDP Erkek', 'EDT Erkek', 'Tıraş Sonrası Losyonlar', 'Baharatlı Notalar', 'Ferah Notalar'])
      },
      {
        title: 'Unisex & Niş Parfümler', icon: Droplet,
        links: createLinks('/kategori/parfum/unisex-nis', ['Unisex Parfümler', 'Niş (Niche) Parfümler', 'Seyahat Boy Parfümler'])
      },
      {
        title: 'Yan Ürünler', icon: Wind,
        links: createLinks('/kategori/parfum/yan-urunler', ['Vücut Spreyleri', 'Deodorantlar', 'Saç Parfümleri', 'Parfüm Setleri'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'Dior', url: '/marka/dior' },
          { name: 'Chanel', url: '/marka/chanel' },
          { name: 'Versace', url: '/marka/versace' },
          { name: 'Tom Ford', url: '/marka/tom-ford' },
          { name: 'Bvlgari', url: '/marka/bvlgari' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Kadın Parfüm', 'Erkek Parfüm', 'EDP', 'Vücut Spreyi', 'Deodorant']),
    adBanner: {
      tag: 'ÖZEL İNDİRİM',
      title: 'İmza kokunuzu bulun',
      text: 'Seçili markalarda net %20 indirim fırsatı sizi bekliyor.',
      buttonText: 'Parfümleri Keşfet',
      url: '/kampanyalar/parfum',
      image: 'https://images.unsplash.com/photo-1590736704728-f4730bb30770?q=80&w=300&auto=format&fit=crop'
    }
  },

  anne: {
    mainTitle: 'Anne & Bebek',
    description: 'Bebeğinizin hassas cildi ve anne sağlığı için pediatrist onaylı ürünler.',
    url: '/kategori/anne-bebek',
    columns: [
      {
        title: 'Bebek Cilt & Vücut', icon: Smile,
        links: createLinks('/kategori/anne-bebek/bebek-cilt', ['Pişik Kremleri', 'Bebek Yağları', 'Bebek Losyonları', 'Bebek Pudraları'])
      },
      {
        title: 'Bebek Banyo & Temizlik', icon: Droplets,
        links: createLinks('/kategori/anne-bebek/bebek-banyo', ['Bebek Şampuanları', 'Bebek Sabunları', 'Islak Mendiller', 'Bebek Banyo Ürünleri'])
      },
      {
        title: 'Bebek Beslenme', icon: Beaker,
        links: createLinks('/kategori/anne-bebek/bebek-beslenme', ['Biberon', 'Emzik', 'Mama', 'Beslenme Aksesuarları'])
      },
      {
        title: 'Anne Bakımı & Hijyen', icon: Heart,
        links: createLinks('/kategori/anne-bebek/anne-bakimi', ['Göğüs Ucu Kremleri', 'Emzirme Ürünleri', 'Anne Hijyeni', 'Bebek Bezleri', 'Bebek Bakım Setleri'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'Mustela', url: '/marka/mustela' },
          { name: 'Sudocrem', url: '/marka/sudocrem' },
          { name: 'Sebamed Baby', url: '/marka/sebamed' },
          { name: 'Philips Avent', url: '/marka/philips-avent' },
          { name: 'Chicco', url: '/marka/chicco' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Pişik Kremi', 'Bebek Şampuanı', 'Bebek Bezi', 'Biberon', 'Göğüs Ucu Kremi']),
    adBanner: {
      tag: 'ÖNE ÇIKAN',
      title: 'Bebeğiniz için en iyisi',
      text: 'Doğal içerikli, hassas ciltlere uygun ürünleri inceleyin.',
      buttonText: 'Ürünleri İncele',
      url: '/kampanyalar/anne-bebek',
      image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=300&auto=format&fit=crop'
    }
  },

  agiz: {
    mainTitle: 'Ağız & Diş Bakımı',
    description: 'Sağlıklı dişler ve mükemmel gülüşler için özel ağız bakım çözümleri.',
    url: '/kategori/agiz-dis-bakimi',
    columns: [
      {
        title: 'Diş Macunları', icon: Box,
        links: createLinks('/kategori/agiz-dis-bakimi/dis-macunlari', ['Beyazlatıcı Macunlar', 'Hassasiyet Karşıtı', 'Florürsüz Macunlar', 'Diş Eti Koruması'])
      },
      {
        title: 'Diş Fırçaları', icon: Smile,
        links: createLinks('/kategori/agiz-dis-bakimi/dis-fircalari', ['Manuel Fırçalar', 'Elektrikli Fırçalar', 'Arayüz Fırçaları', 'Çocuk Fırçaları'])
      },
      {
        title: 'Ağız Suları & Spreyler', icon: Droplets,
        links: createLinks('/kategori/agiz-dis-bakimi/agiz-sulari', ['Ağız Gargaraları', 'Ağız Spreyleri', 'Alkolsüz Gargaralar'])
      },
      {
        title: 'Ekstra Bakım', icon: Activity,
        links: createLinks('/kategori/agiz-dis-bakimi/ekstra-bakim', ['Diş İpi', 'Diş Beyazlatma Setleri', 'Protez Bakımı', 'Çocuk Ağız & Diş Bakımı'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'Sensodyne', url: '/marka/sensodyne' },
          { name: 'Oral-B', url: '/marka/oral-b' },
          { name: 'Curaprox', url: '/marka/curaprox' },
          { name: 'Paradontax', url: '/marka/paradontax' },
          { name: 'Listerine', url: '/marka/listerine' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Diş Macunu', 'Elektrikli Fırça', 'Arayüz Fırçası', 'Gargara', 'Diş İpi']),
    adBanner: {
      tag: 'KAMPANYA',
      title: 'Bembeyaz gülüşler',
      text: 'Diş beyazlatma ürünlerinde sepette ek %10 indirim.',
      buttonText: 'İncele',
      url: '/kampanyalar/agiz-dis',
      image: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=300&auto=format&fit=crop'
    }
  },

  saglik: {
    mainTitle: 'Sağlık / Takviye',
    description: 'Günlük enerjinizi destekleyen, güvenilir marka vitamin ve besin takviyeleri.',
    url: '/kategori/saglik-takviye',
    columns: [
      {
        title: 'Vitaminler', icon: Activity,
        links: createLinks('/kategori/saglik-takviye/vitaminler', ['Multivitamin', 'C Vitamini', 'D Vitamini', 'B Vitaminleri', 'E Vitamini'])
      },
      {
        title: 'Mineraller', icon: Box,
        links: createLinks('/kategori/saglik-takviye/mineraller', ['Magnezyum', 'Çinko', 'Demir', 'Kalsiyum'])
      },
      {
        title: 'Özel Destekler', icon: Heart,
        links: createLinks('/kategori/saglik-takviye/ozel-destekler', ['Kolajen', 'Omega 3', 'Probiyotik', 'Glukozamin', 'Melatonin'])
      },
      {
        title: 'Bitkisel Takviyeler', icon: Droplets,
        links: createLinks('/kategori/saglik-takviye/bitkisel-takviyeler', ['Bitkisel Çaylar', 'Ginseng', 'Zerdeçal', 'Propolis', 'Ekinezya'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'Solgar', url: '/marka/solgar' },
          { name: 'Supradyn', url: '/marka/supradyn' },
          { name: 'Pharmaton', url: '/marka/pharmaton' },
          { name: 'Venatura', url: '/marka/venatura' },
          { name: 'Ocean', url: '/marka/ocean' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Magnezyum', 'Omega 3', 'D Vitamini', 'Kolajen', 'Multivitamin']),
    adBanner: {
      tag: 'ÖNE ÇIKAN',
      title: 'Bağışıklığınızı güçlendirin',
      text: 'Mevsim geçişlerinde sizi koruyacak en iyi takviyeler.',
      buttonText: 'Keşfet',
      url: '/kampanyalar/saglik',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5e4a8b79f?q=80&w=300&auto=format&fit=crop'
    }
  },

  kisisel: {
    mainTitle: 'Kişisel Bakım',
    description: 'Günlük hijyen ve kişisel bakım rutininiz için ihtiyacınız olan her şey.',
    url: '/kategori/kisisel-bakim',
    columns: [
      {
        title: 'Tıraş & Epilasyon', icon: Scissors,
        links: createLinks('/kategori/kisisel-bakim/tiras-epilasyon', ['Tıraş Makineleri', 'Tıraş Bıçakları', 'Tıraş Köpükleri', 'Tıraş Sonrası', 'Ağda & Tüy Dökücüler'])
      },
      {
        title: 'Hijyen', icon: Droplets,
        links: createLinks('/kategori/kisisel-bakim/hijyen', ['El Dezenfektanı', 'Islak Mendil', 'Pamuk & Kulak Çubuğu', 'Sıvı Sabunlar'])
      },
      {
        title: 'Kadın Bakımı', icon: Heart,
        links: createLinks('/kategori/kisisel-bakim/kadin-bakimi', ['Ped', 'Tampon', 'Günlük Ped', 'İntim Bakım'])
      },
      {
        title: 'Aksesuarlar', icon: Box,
        links: createLinks('/kategori/kisisel-bakim/aksesuarlar', ['Kişisel Bakım Aksesuarları', 'Tırnak Makası & Törpü', 'Banyo Süngerleri'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'Gillette', url: '/marka/gillette' },
          { name: 'Veet', url: '/marka/veet' },
          { name: 'Orkid', url: '/marka/orkid' },
          { name: 'Kotex', url: '/marka/kotex' },
          { name: 'Activex', url: '/marka/activex' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Tıraş Bıçağı', 'Günlük Ped', 'Dezenfektan', 'Ağda Bantları', 'Islak Mendil']),
    adBanner: {
      tag: 'YENİ ÜRÜN',
      title: 'Kişisel bakımda %50 indirim',
      text: 'Seçili hijyen ürünlerinde dev fırsat.',
      buttonText: 'İncele',
      url: '/kampanyalar/kisisel-bakim',
      image: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=300&auto=format&fit=crop'
    }
  },

  erkek: {
    mainTitle: 'Erkek Bakım',
    description: 'Erkeklerin cilt ve saç yapısına özel olarak formüle edilmiş dermokozmetik çözümler.',
    url: '/kategori/erkek-bakim',
    columns: [
      {
        title: 'Erkek Cilt Bakımı', icon: Smile,
        links: createLinks('/kategori/erkek-bakim/cilt-bakimi', ['Yüz Yıkama Jeli', 'Erkek Nemlendirici', 'Göz Çevresi Bakımı', 'Akne Karşıtı'])
      },
      {
        title: 'Sakal & Bıyık Bakımı', icon: UserCheck,
        links: createLinks('/kategori/erkek-bakim/sakal-bakimi', ['Sakal Yağı', 'Sakal Şampuanı', 'Sakal Balmı', 'Sakal Tarağı'])
      },
      {
        title: 'Tıraş', icon: Scissors,
        links: createLinks('/kategori/erkek-bakim/tiras', ['Tıraş Köpüğü', 'Tıraş Jeli', 'Tıraş Sonrası (Aftershave)', 'Kan Taşı & Şap'])
      },
      {
        title: 'Saç & Vücut', icon: Wind,
        links: createLinks('/kategori/erkek-bakim/sac-vucut', ['Erkek Saç Bakımı', 'Kepek Karşıtı Şampuan', 'Erkek Parfümleri', 'Erkek Deodorant'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'L\'Oréal Men Expert', url: '/marka/loreal-men-expert' },
          { name: 'Nivea Men', url: '/marka/nivea-men' },
          { name: 'Proraso', url: '/marka/proraso' },
          { name: 'Head & Shoulders', url: '/marka/head-shoulders' },
          { name: 'Old Spice', url: '/marka/old-spice' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Tıraş Jeli', 'Sakal Yağı', 'Erkek Parfümü', 'Kepek Şampuanı', 'Aftershave']),
    adBanner: {
      tag: 'ÖNE ÇIKAN',
      title: 'Erkeklere özel cilt bakımı',
      text: 'Erkek cildine uygun, matlaştırıcı ve onarıcı ürünleri keşfedin.',
      buttonText: 'İncele',
      url: '/kampanyalar/erkek-bakim',
      image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=300&auto=format&fit=crop'
    }
  },

  medikal: {
    mainTitle: 'Medikal Ürünler',
    description: 'Evdeki acil durumlar ve düzenli takipleriniz için güvenilir medikal gereçler.',
    url: '/kategori/medikal-urunler',
    columns: [
      {
        title: 'Ölçüm Cihazları', icon: Activity,
        links: createLinks('/kategori/medikal-urunler/olcum-cihazlari', ['Ateş Ölçer', 'Tansiyon Aletleri', 'Şeker Ölçüm', 'Oksimetre', 'Baskül'])
      },
      {
        title: 'Yara & İlk Yardım', icon: Box,
        links: createLinks('/kategori/medikal-urunler/yara-ilkyardim', ['Yara Bakımı', 'Bandaj & Flaster', 'Yanık Kremi', 'Antiseptik & Baticon'])
      },
      {
        title: 'Koruyucu Ürünler', icon: ShieldCheck,
        links: createLinks('/kategori/medikal-urunler/koruyucu-urunler', ['Medikal Eldiven', 'Maske', 'Hasta Bezi', 'Ortopedik Destekler'])
      },
      {
        title: 'Evde Sağlık', icon: Beaker,
        links: createLinks('/kategori/medikal-urunler/evde-saglik', ['Medikal Cihazlar', 'Buhar Makinesi', 'Isıtıcı Bantlar', 'Sıcak Su Torbası'])
      },
      {
        title: 'Popüler Markalar', icon: Heart,
        links: [
          { name: 'Omron', url: '/marka/omron' },
          { name: 'Braun', url: '/marka/braun' },
          { name: 'Hartmann', url: '/marka/hartmann' },
          { name: 'Tena', url: '/marka/tena' },
          { name: '3M', url: '/marka/3m' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Ateş Ölçer', 'Tansiyon Aleti', 'Yara Bandı', 'Flaster', 'Baskül']),
    adBanner: {
      tag: 'KAMPANYA',
      title: 'Güvenilir medikal markalar',
      text: 'Temel sağlık ihtiyaçlarınız eczane güvencesiyle kapınızda.',
      buttonText: 'İncele',
      url: '/kampanyalar/medikal',
      image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?q=80&w=300&auto=format&fit=crop'
    }
  },

  dogal: {
    mainTitle: 'Doğal & Organik',
    description: 'Doğadan ilham alan, temiz içerikli, vegan ve sürdürülebilir güzellik ürünleri.',
    url: '/kategori/dogal-organik',
    columns: [
      {
        title: 'Cilt Bakımı', icon: Smile,
        links: createLinks('/kategori/dogal-organik/cilt-bakimi', ['Organik Cilt Bakımı', 'Doğal Yüz Temizleme', 'Saf Aromaterapi Yağları', 'Vegan Göz Kremleri'])
      },
      {
        title: 'Saç Bakımı', icon: Wind,
        links: createLinks('/kategori/dogal-organik/sac-bakimi', ['Doğal Saç Bakımı', 'Organik Şampuan', 'Katı Şampuan (Sıfır Atık)', 'Sülfatsız Şampuan'])
      },
      {
        title: 'Vücut & Kozmetik', icon: Droplets,
        links: createLinks('/kategori/dogal-organik/vucut-kozmetik', ['Doğal Vücut Bakımı', 'Organik El Yapımı Sabunlar', 'Vegan Kozmetik', 'Cruelty Free Ürünler', 'Bitkisel Ürünler'])
      },
      {
        title: 'Bebek & Anne', icon: Heart,
        links: createLinks('/kategori/dogal-organik/bebek-anne', ['Organik Bebek Şampuanı', 'Doğal Pişik Kremi', 'Organik Emzirme Çayı'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'Burt\'s Bees', url: '/marka/burts-bees' },
          { name: 'Weleda', url: '/marka/weleda' },
          { name: 'Yves Rocher', url: '/marka/yves-rocher' },
          { name: 'Ziaja', url: '/marka/ziaja' },
          { name: 'Caudalie', url: '/marka/caudalie' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Vegan Şampuan', 'Organik Cilt Bakımı', 'Katı Şampuan', 'Cruelty Free', 'Çay Ağacı Yağı']),
    adBanner: {
      tag: 'DOĞANIN GÜCÜ',
      title: 'Temiz içerikli, vegan kozmetikler',
      text: 'Doğaya ve cildinize dost en seçkin ürünler.',
      buttonText: 'İncele',
      url: '/kampanyalar/dogal',
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=300&auto=format&fit=crop'
    }
  },

  gunes: {
    mainTitle: 'Güneş Ürünleri',
    description: 'Cildinizi zararlı UV ışınlarından koruyan dermatolojik güneş kremleri.',
    url: '/kategori/gunes-urunleri',
    columns: [
      {
        title: 'Yüz Güneş Kremleri', icon: Smile,
        links: createLinks('/kategori/gunes-urunleri/yuz', ['Kuru Cilt Güneş Kremi', 'Yağlı Cilt Güneş Kremi', 'Renkli Güneş Kremleri', 'Leke Karşıtı Güneş Kremi'])
      },
      {
        title: 'Vücut & Çocuk', icon: User,
        links: createLinks('/kategori/gunes-urunleri/vucut-cocuk', ['Vücut Güneş Kremleri', 'Güneş Koruyucu Spreyler', 'Çocuk Güneş Kremleri', 'Mineral Filtreli Kremler'])
      },
      {
        title: 'Güneş Sonrası', icon: Wind,
        links: createLinks('/kategori/gunes-urunleri/gunes-sonrasi', ['Güneş Sonrası Losyonlar', 'Aloe Vera Jelleri', 'Yanık Rahatlatıcılar'])
      },
      {
        title: 'Bronzlaştırıcılar', icon: Droplets,
        links: createLinks('/kategori/gunes-urunleri/bronzlastiricilar', ['Bronzlaştırıcı Yağlar', 'Oto Bronzanlar (Güneşsiz)', 'Havuç & Kakao Yağı'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'La Roche-Posay', url: '/marka/la-roche-posay' },
          { name: 'Heliocare', url: '/marka/heliocare' },
          { name: 'Avene', url: '/marka/avene' },
          { name: 'Solante', url: '/marka/solante' },
          { name: 'Bioderma', url: '/marka/bioderma' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Renkli Güneş Kremi', 'Leke Karşıtı Güneş', 'Aloe Vera Jel', 'Çocuk Güneş Kremi', 'Bronzlaştırıcı']),
    adBanner: {
      tag: 'YAZ FIRSATI',
      title: 'Güneşe karşı tam koruma',
      text: 'En iyi markalarda 2. ürüne %50 indirim fırsatını kaçırmayın.',
      buttonText: 'Kampanyaya Git',
      url: '/kampanyalar/gunes',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=300&auto=format&fit=crop'
    }
  },

  hediyelik: {
    mainTitle: 'Hediyelik Ürünler',
    description: 'Sevdiklerinizi mutlu edecek en seçkin parfüm ve bakım setleri.',
    url: '/kategori/hediyelik-urunler',
    columns: [
      {
        title: 'Hediye Setleri', icon: Box,
        links: createLinks('/kategori/hediyelik-urunler/hediye-setleri', ['Kadın Hediye Setleri', 'Erkek Hediye Setleri', 'Özel Gün Hediyeleri', 'Yılbaşı Hediye Kutuları'])
      },
      {
        title: 'Cilt Bakım Setleri', icon: Smile,
        links: createLinks('/kategori/hediyelik-urunler/cilt-bakim', ['Kırışıklık Karşıtı Setler', 'Nemlendirici Kofreler', 'Seyahat Boy (Travel Size)'])
      },
      {
        title: 'Saç & Vücut Setleri', icon: Droplets,
        links: createLinks('/kategori/hediyelik-urunler/sac-vucut', ['Saç Bakım Setleri', 'Duş & Vücut Setleri', 'Masaj & Spa Setleri'])
      },
      {
        title: 'Parfüm Setleri', icon: Wind,
        links: createLinks('/kategori/hediyelik-urunler/parfum', ['Kadın Parfüm Setleri', 'Erkek Parfüm Setleri', 'Mini Parfüm Koleksiyonu'])
      },
      {
        title: 'Popüler Markalar', icon: ShieldCheck,
        links: [
          { name: 'L\'Occitane', url: '/marka/loccitane' },
          { name: 'Nuxe', url: '/marka/nuxe' },
          { name: 'Caudalie', url: '/marka/caudalie' },
          { name: 'Darphin', url: '/marka/darphin' },
          { name: 'Kérastase', url: '/marka/kerastase' }
        ],
        bottomLink: { text: 'Tüm Markalar', url: '/markalar' }
      }
    ],
    popularSearches: createLinks('/arama', ['Parfüm Seti', 'Cilt Bakım Seti', 'Kofre', 'Erkek Hediye Seti', 'Yılbaşı Hediyesi']),
    adBanner: {
      tag: 'ÖNE ÇIKAN',
      title: 'Sevdiklerinize en güzel armağan',
      text: 'Özel günlerde sevdiklerinizi mutlu edecek seçkin kofreler.',
      buttonText: 'Setleri Gör',
      url: '/kampanyalar/hediyelik',
      image: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=300&auto=format&fit=crop'
    }
  }
};
