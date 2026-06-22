# SimWarga - Sistem Informasi Manajemen Warga

Sistem ini dirancang untuk membantu pengelolaan data warga, iuran, dan pengaduan.

## Teknologi
- **Backend**: Node.js, Express, Better-SQLite3
- **Frontend**: Vue.js 3, Vite, Tailwind CSS
- **Database**: SQLite

## Persiapan
1. Pastikan Node.js sudah terinstal.
2. Jalankan perintah di bawah untuk menginstal dependensi.

### Instalasi Dependensi
```bash
# Di folder backend
cd backend
npm install

# Di folder frontend
cd frontend
npm install
```

## Menjalankan Aplikasi

### Mode Standalone (Produksi)
Untuk menjalankan aplikasi secara utuh (Frontend + Backend) dalam satu perintah:
```bash
cd backend
npm start
```
Akses aplikasi di `http://localhost:5001`.

### Mode Pengembangan (Development)
Jalankan backend dan frontend secara terpisah:
1. **Backend**: `cd backend && npm run dev` (Port 5001)
2. **Frontend**: `cd frontend && npm run dev` (Port 5173)

## Fitur Utama
- **Dashboard Publik**: Menampilkan statistik warga dan pengumuman terbaru.
- **Manajemen Warga**: Data KK, NIK, dan status huni.
- **Pencatatan Meteran Air**: Integrasi dengan tarif air.
- **Sistem Iuran**: Kelola iuran wajib dan insidental.
- **E-Surat**: Pengajuan surat keterangan secara online.
- **Pengaduan**: Wadah aspirasi warga.
