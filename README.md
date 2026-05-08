# Dompet Keluarga

Aplikasi manajemen keuangan keluarga berbasis React + Vite dengan backend Google Apps Script (GAS) + Google Sheets.

Project ini dirancang untuk penggunaan mobile-first, mendukung multi-user dalam satu keluarga, analisa laporan, notifikasi, dan insight AI per kategori anggaran.

## Fitur Utama

- Autentikasi user: register, login, update profil.
- Family management: buat keluarga, join dengan kode undangan, transfer admin, keluar keluarga, hapus anggota.
- Audit log keluarga + rollback aksi penting.
- Kelola transaksi pemasukan/pengeluaran.
- Kelola pos anggaran pemasukan/pengeluaran.
- Dashboard beranda + laporan periodik (harian, mingguan, bulanan, tahunan).
- Notifikasi in-app dengan status sudah dibaca.
- Pengingat harian dan laporan mingguan via email (scheduler GAS).
- Insight AI global laporan dan insight AI per kategori anggaran.
- Fallback non-AI (rule-based) untuk analisa kategori saat API key Gemini tidak tersedia.
- Histori insight mingguan per kategori + badge skor pada kartu kategori.

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, Chart.js, lucide-react.
- Backend: Google Apps Script (Web App).
- Database: Google Sheets.
- Deployment: GitHub Pages via GitHub Actions.
- Domain: custom domain (saat ini terkonfigurasi di CNAME).

## Struktur Proyek

```text
app_keuangan/
	gas/                     # Backend Google Apps Script
		Code.gs
	src/
		components/
			layout/
			overlays/
		context/
		services/
			api.js               # Wrapper API ke GAS
		views/
			Beranda.jsx
			Anggaran.jsx
			Laporan.jsx
			Login.jsx
			Profil.jsx
	public/
		CNAME
	.github/workflows/
		deploy.yml             # CI/CD GitHub Pages
```

## Arsitektur Singkat

1. Frontend memanggil endpoint GAS melalui src/services/api.js.
2. GAS memproses action pada handleRequest, validasi user/family, baca/tulis Google Sheets.
3. Data utama disimpan di sheet seperti:
   - Users
   - Keluarga
   - Anggota_Keluarga
   - Transaksi
   - Pos_Anggaran
   - User_Settings
   - Notification_Reads
   - Family_Audit
   - AI_Insight_History

## Prasyarat

- Node.js 20+ (disarankan).
- NPM 10+.
- Akun Google (untuk Apps Script + Sheets).
- Repository GitHub (untuk deploy Pages).

## Menjalankan Secara Lokal

1. Install dependency:

```bash
npm ci
```

2. Jalankan mode development:

```bash
npm run dev
```

3. Build production:

```bash
npm run build
```

4. Preview hasil build:

```bash
npm run preview
```

## Setup Backend GAS

### 1) Buat project Apps Script

- Buat project baru di Google Apps Script.
- Paste isi gas/Code.gs.

### 2) Deploy sebagai Web App

- Deploy > New deployment > Web app.
- Execute as: Me.
- Who has access: Anyone.
- Simpan URL web app.

### 3) Update URL backend di frontend

- Buka src/services/api.js.
- Ubah GAS_WEB_APP_URL ke URL web app terbaru.

### 4) Inisialisasi header sheet

Panggil endpoint:

```text
<GAS_WEB_APP_URL>?action=init
```

atau:

```text
<GAS_WEB_APP_URL>?action=syncHeaders
```

Ini akan memastikan semua sheet dan header tersedia.

### 5) (Opsional) Aktifkan Gemini AI

- Di Apps Script: Project Settings > Script properties.
- Tambahkan key: GEMINI_API_KEY.
- Tanpa key ini, fitur analisa kategori tetap berjalan dengan mode rule-based.

### 6) Aktifkan trigger email otomatis

Jalankan fungsi berikut sekali di editor Apps Script:

```text
setupScheduledTriggers()
```

Fungsi ini membuat trigger:

- sendDailyReminderEmails (setiap jam).
- sendWeeklyReportEmails (setiap Senin pagi).

## Deployment

Project sudah punya workflow CI/CD di .github/workflows/deploy.yml.

Alur deploy:

1. Push ke branch main.
2. GitHub Actions build aplikasi.
3. Artifact dist di-deploy ke GitHub Pages.

Catatan:

- Vite base saat ini sudah diset ke "/" di vite.config.js.
- CNAME sudah tersedia di public/CNAME untuk custom domain.

## Integrasi AI Kategori Anggaran

Fitur ini sudah mendukung 3 mode:

1. Gemini (jika GEMINI_API_KEY tersedia).
2. Rule-based fallback (otomatis jika API key kosong/gagal).
3. Histori mingguan tersimpan di sheet AI_Insight_History untuk badge skor dan riwayat.

Endpoint terkait:

- getAICategoryInsight
- getAICategoryWeeklyHistory

## Commands Ringkas

```bash
npm run dev      # development
npm run build    # build production
npm run preview  # preview build
npm run lint     # linting
```

## Troubleshooting

### 1) Analisa AI error API_KEY_MISSING

- Pastikan script property GEMINI_API_KEY sudah dibuat.
- Jika belum, sistem akan fallback rule-based untuk analisa kategori.

### 2) Data tidak muncul setelah update backend

- Pastikan URL web app terbaru sudah diupdate di src/services/api.js.
- Re-deploy versi terbaru GAS setelah perubahan Code.gs.
- Jalankan action syncHeaders.

### 3) Trigger email tidak jalan

- Jalankan setupScheduledTriggers() manual sekali.
- Cek trigger di Apps Script > Triggers.

### 4) Build gagal di CI

- Jalankan npm ci dan npm run build lokal terlebih dahulu.
- Pastikan tidak ada syntax error di gas/Code.gs (opsional cek via parser lokal).

## Keamanan dan Catatan Teknis

- Data user dan transaksi disimpan di Google Sheets.
- Password saat ini di-encode base64 di backend (bukan hashing kuat).
- Untuk production skala besar, disarankan migrasi ke hashing yang aman + backend terdedikasi.

## Roadmap Rekomendasi

- Peningkatan keamanan autentikasi (hash password + token session).
- Export laporan PDF/CSV yang lebih fleksibel.
- Monitoring biaya token AI dan strategi caching lebih agresif.
- Unit/integration test untuk service API dan logic perhitungan skor.

## Kontribusi

Jika ingin lanjut pengembangan:

1. Buat branch baru.
2. Commit perubahan dengan pesan yang jelas.
3. Buka Pull Request.

## Lisensi

Belum ditentukan. Tambahkan file LICENSE jika ingin menggunakan lisensi open-source tertentu.
