# Awtoyoly Vault

IT altyapi sifre ve kimlik bilgisi yoneticisi. Ag/sistem yoneticileri icin tasarlandi.

## Ozellikler

### Guvenlik
- **AES-256 sifreleme** -- tum sifreler veritabaninda sifrelenmis olarak saklanir
- **JWT kimlik dogrulama** -- 30 dakika inaktivite sonrasi otomatik oturum kapanir
- **2FA (TOTP)** -- Google Authenticator / herhangi bir TOTP uygulamasi ile iki faktorlu dogrulama
- **Brute-force korumasi** -- belirli sayida yanlis giristen sonra IP kilitlenir
- **HTTPS** -- Docker'da otomatik self-signed sertifika olusturulur

### Kullanici Yonetimi (RBAC)
- **Admin** -- tam yetki: kullanici olusturma, silme, yetki atama, tum subelere erisim
- **Manager** -- kimlik bilgisi ekleme/duzenleme, sube yonetimi
- **Viewer** -- sadece yetki verilen sube ve kimlik bilgilerini goruntuleyebilir

### Kimlik Bilgisi Yonetimi
- Sube (firma) bazli organizasyon
- Cihaz tipi siniflandirmasi: server, firewall, switch, NVR, PBX, ESXi, router, printer, kamera vb.
- IP adresi, port, hostname, protokol, notlar, etiketler
- Sifre gorunturleme audit log'a kaydedilir
- Sifre degisiklik gecmisi (credential history)
- Otomatik guclu sifre uretici

### Yetki Yonetimi
- Sube bazli erisim kontrolu (read/write/none)
- Kimlik bilgisi bazli erisim kontrolu
- Toplu yetki atama

### Yedekleme & Geri Yukleme
- Admin panelinden tek tikla veritabani yedegi indirme (.db)
- Yedek dosyasindan geri yukleme (tablo dogrulamasi ile)
- Geri yukleme oncesi otomatik yedek alinir

### Diger
- Dashboard -- genel istatistikler ve son aktiviteler
- Audit log -- tum islemler kayit altinda
- Dark/Light tema destegi
- Responsive tasarim (mobil uyumlu)
- Turkce arayuz

## Teknoloji

### Backend
- **Python 3.12** + **Flask**
- **SQLite** -- hafif, dosya tabanli veritabani
- **PyCryptodome** -- AES-256-CBC sifreleme
- **PyOTP** -- TOTP 2FA
- **bcrypt** -- sifre hashleme
- **Flask-JWT-Extended** -- JWT token yonetimi

### Frontend
- **React 19** + **React Router**
- **Tailwind CSS 4** -- modern, ozellestirilmis tasarim
- **Radix UI** -- erisilebilir UI bilesenler
- **Zustand** -- state yonetimi
- **Lucide React** -- ikon seti
- **Vite** -- hizli build araci

## Kurulum

### Docker (Onerilen)

```bash
# Repoyu klonla
git clone https://github.com/jumabayev/Awtoyoly-vault.git
cd Awtoyoly-vault

# Docker ile calistir
docker build -t awtoyoly-vault .
docker run -d --name awtoyoly-vault -p 5111:5111 awtoyoly-vault
```

Tarayicida ac: `https://localhost:5111`

**Varsayilan giris:** `admin` / `admin123`

### Manuel Kurulum

```bash
# Backend bagimliliklari
pip install -r requirements.txt

# Frontend build
cd frontend
npm install
npm run build
cd ..

# Calistir
python app.py
```

### Gelistirme Ortami

```bash
# Backend
python app.py

# Frontend (ayri terminalde)
cd frontend
npm run dev
```

Frontend dev server `http://localhost:5173` uzerinde calisir, API isteklerini `https://localhost:5111` adresine proxy eder.

## API Endpointleri

| Method | Endpoint | Yetki | Aciklama |
|--------|----------|-------|----------|
| POST | `/api/auth/login` | Herkese acik | Giris yap |
| GET | `/api/auth/me` | Giris yapmis | Kullanici bilgisi |
| POST | `/api/auth/2fa/setup` | Giris yapmis | 2FA kurulumu |
| POST | `/api/auth/2fa/verify` | Giris yapmis | 2FA dogrulama |
| POST | `/api/auth/2fa/disable` | Giris yapmis | 2FA kapatma |
| GET | `/api/dashboard` | Giris yapmis | Dashboard istatistikleri |
| GET | `/api/credentials` | Giris yapmis | Kimlik bilgileri listesi |
| GET | `/api/credentials/:id` | Giris yapmis | Kimlik bilgisi detay (sifre dahil) |
| POST | `/api/credentials` | Admin/Manager | Yeni kimlik bilgisi |
| PUT | `/api/credentials/:id` | Admin/Manager | Kimlik bilgisi guncelle |
| DELETE | `/api/credentials/:id` | Admin | Kimlik bilgisi sil |
| GET | `/api/branches` | Giris yapmis | Subeler |
| POST | `/api/branches` | Admin/Manager | Yeni sube |
| GET | `/api/users` | Admin | Kullanicilar |
| POST | `/api/users` | Admin | Yeni kullanici |
| PUT | `/api/users/:id` | Admin | Kullanici guncelle |
| DELETE | `/api/users/:id` | Admin | Kullanici sil |
| GET | `/api/audit` | Admin | Audit log |
| GET | `/api/device-types` | Giris yapmis | Cihaz tipleri |
| GET | `/api/backup` | Admin | Veritabani yedegi indir |
| POST | `/api/restore` | Admin | Veritabanini geri yukle |
| GET | `/api/generate-password` | Herkese acik | Rastgele sifre uret |

## Proje Yapisi

```
awtoyoly_vault/
  app.py              # Flask backend (tek dosya)
  requirements.txt    # Python bagimliliklari
  Dockerfile          # Multi-stage Docker build
  vault.db            # SQLite veritabani (otomatik olusur)
  certs/              # SSL sertifikalari (Docker'da otomatik)
  frontend/
    src/
      components/     # Login, Layout, Sidebar
      pages/          # Dashboard, Credentials, Users, Settings, ...
      store/          # Zustand state (auth, theme)
      lib/            # API istemcisi, yardimci fonksiyonlar
    vite.config.js
    package.json
```

## Subeler (Firmalar)

Merkez Ofis, ARTYK AE, AWTOMOTIW, AWTOYOLY, BANAN, DOWLETLI DOWRAN, DURUN, ENGINEERING, ESRETLI ATYZ, EZIZ DOGANLAR, GURSAK, HEMSAYA, KONSENTRAT, LEBIZ, MIWEAGPJ, NEKTARIN, SINTEPON, TOMATNY, TRANSPORT, YIGIT, YUMAK, YUPLUK

## Lisans

Bu proje ozel kullanim icindir.
