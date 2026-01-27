# SofaScout 

Scoutlar için profesyonel SofaScore deneyimi. Oyuncu takibi, ısı haritaları, maç istatistikleri ve akıllı bildirim sistemi.

## Özellikler

### 📊 Panel (Dashboard)
- Takip edilen oyuncuların hızlı görünümü
- Aktif maç sayısı ve bekleyen uyarılar
- Son aktivitelerin listesi

### 👤 Oyuncu Takibi
- Favori oyuncuları takip etme
- SofaScore'dan otomatik profil fotoğrafı çekme
- Arama ve filtreleme
- Maç bazlı rating takibi

### ⚽ Maç Takibi
- Canlı maç skorları
- Yaklaşan maç bildirimleri
- Kadro açıklaması bildirimleri

### 🔔 Akıllı Bildirim Sistemi
- **Kadro Açıklamaları** - Takip edilen maçların kadroları açıklandığında
- **Maç Başlangıcı** - 15 dakika önce hatırlatma
- **Gol Bildirimleri** - Takip edilen oyuncu gol attığında
- **İlk 11 Bildirimi** - Oyuncu ilk 11'de yer aldığında
- **Rating Güncellemeleri** - Maç sonu performans değerlendirmesi

### 🔥 Isı Haritası (Yakında)
- Oyuncu hareket haritası görselleştirme
- Pozisyon analizi
- Performans metrikleri

## Kurulum

### Chrome'a Yükleme

1. Chrome'da `chrome://extensions` adresine gidin
2. Sağ üstten **"Geliştirici modu"**nu aktif edin
3. **"Paketlenmemiş öğe yükle"** butonuna tıklayın
4. `sofascore-scout-extension` klasörünü seçin
5. Eklenti yüklenecek ve araç çubuğunda görünecektir

### Edge'e Yükleme

1. Edge'de `edge://extensions` adresine gidin
2. Sol menüden **"Geliştirici modu"**nu aktif edin
3. **"Paketlenmemiş yükle"** butonuna tıklayın
4. Klasörü seçin

## Kullanım

1. SofaScore.com açın
2. Eklenti ikonuna tıklayın
3. Oyuncu veya maç takip etmeye başlayın
4. Bildirim ayarlarını ihtiyacınıza göre düzenleyin

## Tasarım

- **Renkler**: `#171C1F` (koyu), `#000000` (siyah), `#00D4AA` (accent)
- **Font**: Inter (Variable Sans-Serif)
- **Modern dark theme** ile göz yorgunluğunu azaltır
- **Yumuşak kenarlar** (border-radius) ile premium görünüm

## Teknik Detaylar

- **Manifest Version**: 3
- **Permissions**: storage, notifications, alarms
- **API**: SofaScore Public API

## Dosya Yapısı

```
sofascore-scout-extension/
├── manifest.json           # Extension manifest
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Styles
│   └── popup.js           # Logic
├── background/
│   └── service-worker.js  # Background tasks
├── content/
│   ├── content.js         # Page injection
│   └── content.css        # Injected styles
└── icons/
    ├── icon16.svg
    ├── icon48.svg
    └── icon128.svg
```

## Roadmap

- [ ] Isı haritası görselleştirme
- [ ] Detaylı istatistik sayfası
- [ ] Export/Import ayarlar
- [ ] Takım karşılaştırma
- [ ] Oyuncu karşılaştırma
- [ ] Favori aramalarını kaydetme

## Geliştirici

Bu eklenti scoutlar için profesyonel bir SofaScore deneyimi sunmak amacıyla geliştirilmektedir.

---

**Not**: Bu eklenti SofaScore'un resmi bir ürünü değildir. Kişisel kullanım için geliştirilmiştir.
