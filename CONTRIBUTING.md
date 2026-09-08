# Katkıda Bulunma Rehberi

Bu projeye katkıda bulunmak istediğiniz için teşekkür ederiz! 🎉

## 🚀 Başlarken

1. Bu repoyu **fork** edin
2. Forkladığınız repoyu klonlayın:
   ```bash
   git clone https://github.com/<kullanici-adiniz>/erp.git
   cd erp
   ```
3. Yeni bir **feature branch** oluşturun:
   ```bash
   git checkout -b feature/yeni-ozellik
   ```
4. Bağımlılıkları yükleyin (ilgili klasörlerde):
   ```bash
   cd backend-api && npm install
   cd ../web-app && npm install
   cd ../desktop-app && npm install
   cd ../mobile-app && npm install
   ```

## 📝 Commit Mesaj Kuralları

[Conventional Commits](https://www.conventionalcommits.org/) standardını kullanıyoruz:

| Prefix | Açıklama | Örnek |
|--------|----------|-------|
| `feat:` | Yeni özellik | `feat: ürün arama filtresi eklendi` |
| `fix:` | Hata düzeltme | `fix: stok hesaplama hatası giderildi` |
| `docs:` | Dokümantasyon | `docs: API endpoint açıklamaları güncellendi` |
| `style:` | Kod formatı (mantık değişikliği yok) | `style: indent düzeltmeleri` |
| `refactor:` | Kod yeniden yapılandırma | `refactor: WMS modülü optimize edildi` |
| `test:` | Test ekleme/güncelleme | `test: sipariş route testleri eklendi` |
| `chore:` | Genel bakım | `chore: bağımlılıklar güncellendi` |

## 🔀 Pull Request Süreci

1. Değişikliklerinizi commit edin:
   ```bash
   git add .
   git commit -m "feat: açıklayıcı mesaj"
   ```
2. Branch'inizi push edin:
   ```bash
   git push origin feature/yeni-ozellik
   ```
3. GitHub üzerinden **Pull Request** açın
4. PR açıklamasında:
   - Ne değiştiğini kısaca açıklayın
   - İlgili issue numarasını belirtin (varsa)
   - Ekran görüntüleri ekleyin (UI değişikliklerinde)

## 📁 Proje Yapısı

Her modül kendi klasöründe bağımsız olarak geliştirilir:

- **`backend-api/`** — API değişiklikleri ve yeni endpoint'ler
- **`web-app/`** — E-Ticaret arayüz değişiklikleri
- **`desktop-app/`** — ERP paneli değişiklikleri
- **`mobile-app/`** — Mobil uygulama değişiklikleri

## ⚠️ Dikkat Edilmesi Gerekenler

- `.env` dosyalarını **asla** commit etmeyin
- Yeni ortam değişkeni eklediyseniz `.env.example` dosyasını güncelleyin
- Veritabanı şema değişikliklerinde `prisma/schema.prisma` dosyasını güncelleyin
- Büyük değişiklikler için önce bir **Issue** açarak tartışın

## 🐛 Hata Bildirme

Bir hata bulduysanız [Issues](https://github.com/hadisemree67/erp/issues) sayfasından bildirebilirsiniz:

1. Hatanın başlığını ve detaylı açıklamasını yazın
2. Hatayı tekrar oluşturma adımlarını belirtin
3. Beklenen ve gerçekleşen davranışı açıklayın
4. Ekran görüntüleri veya hata logları ekleyin

---

Katkılarınız için teşekkürler! 🙏
