# Analisis Schema Database SimWarga

## Ringkasan Temuan

### 1. Tabel Notifikasi - ✅ SUDAH ADA

Tabel **Notifikasi** sudah ada dalam database dengan struktur yang lengkap.

#### Query untuk Membaca Schema:
```sql
.schema Notifikasi
```

#### Struktur Tabel Notifikasi:
```sql
CREATE TABLE Notifikasi (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId    INTEGER NOT NULL REFERENCES Tenants(Id),
    UserId      INTEGER REFERENCES Users(Id),   -- NULL = broadcast semua
    Judul       TEXT    NOT NULL,
    Pesan       TEXT    NOT NULL,
    Tipe        TEXT    NOT NULL DEFAULT 'Info',  -- 'Info','Warning','Sukses','Error'
    Icon        TEXT,
    IsRead      INTEGER NOT NULL DEFAULT 0,
    ReadAt      TEXT,
    CreatedAt   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    CreatedBy   INTEGER REFERENCES Users(Id)
);
```

#### Field Notifikasi Detail:
| Field | Type | Keterangan |
|-------|------|-----------|
| **Id** | INTEGER | Primary Key (Auto Increment) |
| **TenantId** | INTEGER | Referensi ke Tenants, identitas pemilik tenant |
| **UserId** | INTEGER | Referensi ke Users. NULL = broadcast ke semua user |
| **Judul** | TEXT | Judul/subject notifikasi |
| **Pesan** | TEXT | Isi/body notifikasi |
| **Tipe** | TEXT | Tipe notifikasi: 'Info', 'Warning', 'Sukses', atau 'Error' |
| **Icon** | TEXT | Path/URL untuk icon notifikasi (optional) |
| **IsRead** | INTEGER | Status baca (0 = belum dibaca, 1 = sudah dibaca) |
| **ReadAt** | TEXT | Timestamp kapan notifikasi dibaca |
| **CreatedAt** | TEXT | Timestamp pembuatan notifikasi (auto) |
| **CreatedBy** | INTEGER | Referensi ke Users yang membuat notifikasi |

#### Index yang Ada:
```sql
CREATE INDEX idx_notifikasi_user ON Notifikasi(UserId, IsRead);
```

---

### 2. Tabel "Info & Pengumuman" - ❌ TIDAK ADA

**Tidak ada tabel khusus** untuk "Info & Pengumuman". Namun ada beberapa opsi:

#### Opsi A: Gunakan Tabel Notifikasi dengan Tipe 'Info'
```sql
SELECT * FROM Notifikasi 
WHERE Tipe = 'Info' 
AND UserId IS NULL  -- broadcast ke semua
ORDER BY CreatedAt DESC;
```

#### Opsi B: Ada Tabel Pengaduan (untuk feedback)
Tabel **Pengaduan** mungkin bisa digunakan untuk pengumuman/feedback:
```sql
CREATE TABLE Pengaduan (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    WargaId         INTEGER REFERENCES Warga(Id),
    NamaPengadu     TEXT,
    NoHpPengadu     TEXT,
    Judul           TEXT    NOT NULL,
    Isi             TEXT    NOT NULL,
    Kategori        TEXT,   -- 'Infrastruktur','Keamanan','Kebersihan','Lainnya'
    FotoUrl         TEXT,
    Status          TEXT    NOT NULL DEFAULT 'Masuk',
    CatatanAdmin    TEXT,
    DitanganiOleh   INTEGER REFERENCES Users(Id),
    TanggalSelesai  TEXT,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
```

---

### 3. Tabel Emergency Contact / Kontak Darurat - ❌ TIDAK ADA

**Tidak ada tabel khusus** untuk "Emergency Contact" atau "Kontak Darurat".

#### Alternatif Saat Ini:
Tabel **Warga** memiliki field **NoHp** untuk kontak:
```sql
CREATE TABLE Warga (
    ...
    NoHp            TEXT,     -- Field ini bisa digunakan untuk kontak darurat
    Email           TEXT,
    ...
);
```

#### Query untuk Mencari Kontak Warga:
```sql
SELECT 
    Id,
    NamaKepalaKK,
    Alamat,
    NoRumah,
    RT,
    RW,
    NoHp,
    Email
FROM Warga
WHERE TenantId = ? AND IsAktif = 1;
```

---

## Query Berguna

### Query Semua Tabel:
```sql
.tables
```

**Output:**
```
AppSettings          PembayaranIuran      TagihanAir
AuditLogs            PencatatanMeteran    TagihanIuran
JenisIuran           Pengaduan            TagihanSistem
JenisSurat           Pengeluaran          TarifAir
KategoriPengeluaran  PrinterSettings      Tenants
Lisensi              RT                   UserInRoles
Meteran              RW                   UserSessions
Notifikasi           RiwayatLisensi       Users
PasswordHistories    Roles                Warga
PembayaranAir        Surat
```

### Query Notifikasi Belum Dibaca:
```sql
SELECT * FROM Notifikasi 
WHERE IsRead = 0 
AND UserId = ? 
ORDER BY CreatedAt DESC;
```

### Query Notifikasi Broadcast (ke semua user):
```sql
SELECT * FROM Notifikasi 
WHERE UserId IS NULL 
ORDER BY CreatedAt DESC 
LIMIT 10;
```

### Query Notifikasi per User:
```sql
SELECT 
    n.Id,
    n.Judul,
    n.Pesan,
    n.Tipe,
    n.IsRead,
    n.CreatedAt,
    u.NamaLengkap as CreatedByName
FROM Notifikasi n
LEFT JOIN Users u ON n.CreatedBy = u.Id
WHERE n.TenantId = ? 
AND (n.UserId = ? OR n.UserId IS NULL)
ORDER BY n.CreatedAt DESC
LIMIT 20;
```

---

## Rekomendasi

### Untuk Emergency Contact:
Jika Anda ingin membuat tabel khusus untuk kontak darurat, berikut template:

```sql
CREATE TABLE KontakDarurat (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    WargaId         INTEGER NOT NULL REFERENCES Warga(Id) ON DELETE CASCADE,
    NamaKontak      TEXT    NOT NULL,
    Hubungan        TEXT,           -- 'Suami/Istri', 'Anak', 'Orang Tua', 'Saudara', dll
    NoHpKontak      TEXT    NOT NULL,
    Email           TEXT,
    Alamat          TEXT,
    Keterangan      TEXT,
    IsUtama         INTEGER DEFAULT 0,  -- 1 = kontak darurat utama
    IsAktif         INTEGER DEFAULT 1,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    UpdatedAt       TEXT
);

CREATE INDEX idx_kontakdarurat_warga ON KontakDarurat(WargaId);
```

### Untuk Info & Pengumuman:
Jika butuh tabel terpisah, bisa seperti ini:

```sql
CREATE TABLE Pengumuman (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    Judul           TEXT    NOT NULL,
    Isi             TEXT    NOT NULL,
    FotoUrl         TEXT,
    Kategori        TEXT,   -- 'Penting', 'Informasi', 'Event', dll
    StatusPublish   TEXT    DEFAULT 'Draft',  -- 'Draft', 'Published', 'Archived'
    TanggalPublish  TEXT,
    TanggalExpiry   TEXT,   -- kapan pengumuman kadaluarsa
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    CreatedBy       INTEGER REFERENCES Users(Id),
    UpdatedAt       TEXT,
    UpdatedBy       INTEGER REFERENCES Users(Id)
);

CREATE INDEX idx_pengumuman_tenant ON Pengumuman(TenantId, StatusPublish);
```

---

## File Database
- **Lokasi:** `backend/simwarga.db`
- **Driver:** better-sqlite3
- **Cara akses:** `sqlite3 backend/simwarga.db`
