-- ============================================================
-- SimWarga — Sistem Informasi Manajemen Warga
-- Database : SQLite
-- Versi    : 1.0.0
-- Dibuat   : 2025
-- ============================================================
-- KONVENSI:
--   PK  → INTEGER PRIMARY KEY AUTOINCREMENT
--   FK  → INTEGER NOT NULL REFERENCES tabel(Id)
--   Timestamp → TEXT (ISO 8601: '2025-01-15 08:30:00')
--   Boolean   → INTEGER (0 = false, 1 = true)
--   Uang      → REAL (IDR, tanpa desimal berarti)
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- BAGIAN 1: MULTI TENANT
-- Analogi: satu server, banyak "kantor RT/RW" di dalamnya
-- ============================================================

CREATE TABLE IF NOT EXISTS Tenants (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    NamaTenant  TEXT    NOT NULL,           -- "RT 03 RW 07 Kel. Sukajadi"
    KodeTenant  TEXT    NOT NULL UNIQUE,    -- "RT03RW07-BDG"
    Alamat      TEXT,
    Kelurahan   TEXT,
    Kecamatan   TEXT,
    Kota        TEXT,
    NoTelp      TEXT,
    Email       TEXT,
    LogoUrl     TEXT,
    IsAktif     INTEGER NOT NULL DEFAULT 1,
    CreatedAt   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    UpdatedAt   TEXT
);

-- ============================================================
-- BAGIAN 2: AUTH — ROLES, USERS, USER IN ROLES
-- Analogi: Roles = jabatan (Ketua RT, Bendahara, Warga)
--          Users = orang yang bisa login
--          UserInRoles = siapa pegang jabatan apa
-- ============================================================

CREATE TABLE IF NOT EXISTS Roles (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    NamaRole    TEXT    NOT NULL UNIQUE,    -- 'SuperAdmin','Admin','Bendahara','Kasir','Warga'
    Deskripsi   TEXT,
    IsAktif     INTEGER NOT NULL DEFAULT 1,
    CreatedAt   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS Users (
    Id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId            INTEGER NOT NULL REFERENCES Tenants(Id) ON DELETE CASCADE,
    Username            TEXT    NOT NULL UNIQUE,
    Email               TEXT    UNIQUE,
    NoHp                TEXT,
    PasswordHash        TEXT    NOT NULL,   -- bcrypt / PBKDF2 hash
    PasswordSalt        TEXT    NOT NULL,   -- salt terpisah
    NamaLengkap         TEXT    NOT NULL,
    AvatarUrl           TEXT,
    IsAktif             INTEGER NOT NULL DEFAULT 1,
    IsEmailVerified     INTEGER NOT NULL DEFAULT 0,
    -- ── Session & Security ──────────────────────────────────
    LastLoginAt         TEXT,               -- timestamp login terakhir berhasil
    LastLoginIp         TEXT,               -- IP address saat login
    LastLoginDevice     TEXT,               -- user-agent / device info
    FailedLoginCount    INTEGER NOT NULL DEFAULT 0,
    LockedUntil         TEXT,               -- NULL = tidak terkunci
    -- ── Password Management ─────────────────────────────────
    PasswordChangedAt   TEXT,               -- kapan terakhir ganti password
    MustChangePassword  INTEGER NOT NULL DEFAULT 0,  -- 1 = wajib ganti saat login
    ResetToken          TEXT,               -- token untuk reset password
    ResetTokenExpiry    TEXT,               -- expiry token reset
    -- ── Audit ───────────────────────────────────────────────
    CreatedAt           TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    UpdatedAt           TEXT,
    CreatedBy           INTEGER REFERENCES Users(Id),
    UpdatedBy           INTEGER REFERENCES Users(Id)
);

CREATE TABLE IF NOT EXISTS UserInRoles (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId      INTEGER NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
    RoleId      INTEGER NOT NULL REFERENCES Roles(Id) ON DELETE CASCADE,
    AssignedAt  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    AssignedBy  INTEGER REFERENCES Users(Id),
    UNIQUE(UserId, RoleId)   -- satu user tidak bisa duplikat role yang sama
);

-- Riwayat ganti password (untuk enforce: tidak boleh pakai 5 password lama)
CREATE TABLE IF NOT EXISTS PasswordHistories (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId          INTEGER NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
    PasswordHash    TEXT    NOT NULL,
    ChangedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    ChangedByIp     TEXT
);

-- Sesi aktif / refresh token (untuk JWT refresh)
CREATE TABLE IF NOT EXISTS UserSessions (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    UserId          INTEGER NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
    RefreshToken    TEXT    NOT NULL UNIQUE,
    DeviceInfo      TEXT,
    IpAddress       TEXT,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    ExpiresAt       TEXT    NOT NULL,
    RevokedAt       TEXT,   -- NULL = masih aktif
    IsRevoked       INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- BAGIAN 3: DATA MASTER WARGA
-- ============================================================

CREATE TABLE IF NOT EXISTS Warga (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id) ON DELETE CASCADE,
    NoKK            TEXT,
    NIK             TEXT    UNIQUE,
    NamaKepalaKK    TEXT    NOT NULL,
    Alamat          TEXT,
    NoRumah         TEXT,
    RT              TEXT,
    RW              TEXT,
    JumlahAnggota   INTEGER NOT NULL DEFAULT 1,
    NoHp            TEXT,
    Email           TEXT,
    StatusHuni      TEXT    NOT NULL DEFAULT 'Tetap',  -- 'Tetap','Kontrak','Kos'
    IsAktif         INTEGER NOT NULL DEFAULT 1,
    Latitude        REAL,   -- untuk fitur Peta Warga
    Longitude       REAL,
    FotoUrl         TEXT,
    Keterangan      TEXT,
    UserId          INTEGER REFERENCES Users(Id),      -- akun portal warga (nullable)
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    UpdatedAt       TEXT,
    CreatedBy       INTEGER REFERENCES Users(Id),
    UpdatedBy       INTEGER REFERENCES Users(Id)
);

-- ============================================================
-- BAGIAN 4: METERAN AIR
-- ============================================================

CREATE TABLE IF NOT EXISTS Meteran (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id) ON DELETE CASCADE,
    WargaId         INTEGER NOT NULL REFERENCES Warga(Id) ON DELETE RESTRICT,
    NoMeteran       TEXT    NOT NULL UNIQUE,
    LokasiPasang    TEXT,
    TanggalPasang   TEXT,
    StandAwal       REAL    NOT NULL DEFAULT 0,
    StandTerakhir   REAL    NOT NULL DEFAULT 0,
    IsAktif         INTEGER NOT NULL DEFAULT 1,
    Keterangan      TEXT,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    UpdatedAt       TEXT
);

-- Pencatatan meteran bulanan
CREATE TABLE IF NOT EXISTS PencatatanMeteran (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    MeteranId       INTEGER NOT NULL REFERENCES Meteran(Id) ON DELETE RESTRICT,
    Periode         TEXT    NOT NULL,   -- '2025-01' (YYYY-MM)
    StandAwal       REAL    NOT NULL,
    StandAkhir      REAL    NOT NULL,
    Pemakaian       REAL    GENERATED ALWAYS AS (StandAkhir - StandAwal) VIRTUAL,
    TanggalCatat    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    FotoMeteranUrl  TEXT,
    CatatanOleh     INTEGER REFERENCES Users(Id),
    Keterangan      TEXT,
    UNIQUE(MeteranId, Periode)
);

-- ============================================================
-- BAGIAN 5: TARIF AIR
-- ============================================================

CREATE TABLE IF NOT EXISTS TarifAir (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    NamaTarif       TEXT    NOT NULL,       -- 'Tarif Dasar 2025'
    HargaPerM3      REAL    NOT NULL,       -- Rp per m³
    BiayaAdmin      REAL    NOT NULL DEFAULT 0,
    BiayaMinimum    REAL    NOT NULL DEFAULT 0,  -- biaya minimum pemakaian
    MinimumM3       REAL    NOT NULL DEFAULT 0,  -- minimum m³ dikenakan
    BerlakuMulai    TEXT    NOT NULL,
    BerlakuSampai   TEXT,                   -- NULL = masih berlaku
    IsAktif         INTEGER NOT NULL DEFAULT 1,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    CreatedBy       INTEGER REFERENCES Users(Id)
);

-- ============================================================
-- BAGIAN 6: JENIS IURAN
-- ============================================================

CREATE TABLE IF NOT EXISTS JenisIuran (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    NamaIuran       TEXT    NOT NULL,       -- 'Iuran Kebersihan', 'Keamanan'
    Nominal         REAL    NOT NULL,
    Periode         TEXT    NOT NULL DEFAULT 'Bulanan',  -- 'Bulanan','Tahunan','Insidental'
    IsWajib         INTEGER NOT NULL DEFAULT 1,
    Keterangan      TEXT,
    IsAktif         INTEGER NOT NULL DEFAULT 1,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    CreatedBy       INTEGER REFERENCES Users(Id)
);

-- ============================================================
-- BAGIAN 7: TAGIHAN AIR
-- ============================================================

CREATE TABLE IF NOT EXISTS TagihanAir (
    Id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId            INTEGER NOT NULL REFERENCES Tenants(Id),
    WargaId             INTEGER NOT NULL REFERENCES Warga(Id) ON DELETE RESTRICT,
    PencatatanId        INTEGER NOT NULL REFERENCES PencatatanMeteran(Id),
    TarifId             INTEGER NOT NULL REFERENCES TarifAir(Id),
    Periode             TEXT    NOT NULL,       -- '2025-01'
    Pemakaian           REAL    NOT NULL,       -- m³
    HargaPerM3          REAL    NOT NULL,
    BiayaAdmin          REAL    NOT NULL DEFAULT 0,
    TotalTagihan        REAL    NOT NULL,
    StatusTagihan       TEXT    NOT NULL DEFAULT 'Belum',  -- 'Belum','Sebagian','Lunas'
    JatuhTempo          TEXT,
    Keterangan          TEXT,
    CreatedAt           TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    CreatedBy           INTEGER REFERENCES Users(Id),
    UNIQUE(WargaId, Periode)
);

-- ============================================================
-- BAGIAN 8: PEMBAYARAN AIR
-- ============================================================

CREATE TABLE IF NOT EXISTS PembayaranAir (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    TagihanAirId    INTEGER NOT NULL REFERENCES TagihanAir(Id) ON DELETE RESTRICT,
    NomorTransaksi  TEXT    NOT NULL UNIQUE,    -- 'TX-AIR-202501-000001'
    TanggalBayar    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    JumlahBayar     REAL    NOT NULL,
    MetodeBayar     TEXT    NOT NULL DEFAULT 'Tunai',  -- 'Tunai','Transfer','QRIS'
    BuktiUrl        TEXT,   -- foto bukti transfer
    KasirId         INTEGER REFERENCES Users(Id),
    Keterangan      TEXT,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ============================================================
-- BAGIAN 9: TAGIHAN IURAN
-- ============================================================

CREATE TABLE IF NOT EXISTS TagihanIuran (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    WargaId         INTEGER NOT NULL REFERENCES Warga(Id) ON DELETE RESTRICT,
    JenisIuranId    INTEGER NOT NULL REFERENCES JenisIuran(Id),
    Periode         TEXT    NOT NULL,
    Nominal         REAL    NOT NULL,
    StatusTagihan   TEXT    NOT NULL DEFAULT 'Belum',  -- 'Belum','Lunas'
    JatuhTempo      TEXT,
    Keterangan      TEXT,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    CreatedBy       INTEGER REFERENCES Users(Id),
    UNIQUE(WargaId, JenisIuranId, Periode)
);

-- ============================================================
-- BAGIAN 10: PEMBAYARAN IURAN
-- ============================================================

CREATE TABLE IF NOT EXISTS PembayaranIuran (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    TagihanIuranId  INTEGER NOT NULL REFERENCES TagihanIuran(Id),
    NomorTransaksi  TEXT    NOT NULL UNIQUE,
    TanggalBayar    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    JumlahBayar     REAL    NOT NULL,
    MetodeBayar     TEXT    NOT NULL DEFAULT 'Tunai',
    BuktiUrl        TEXT,
    KasirId         INTEGER REFERENCES Users(Id),
    Keterangan      TEXT,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ============================================================
-- BAGIAN 11: PENGELUARAN KAS
-- ============================================================

CREATE TABLE IF NOT EXISTS KategoriPengeluaran (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId    INTEGER NOT NULL REFERENCES Tenants(Id),
    NamaKategori TEXT   NOT NULL,   -- 'Kebersihan','Perbaikan','ATK','Sosial'
    IsAktif     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Pengeluaran (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    KategoriId      INTEGER REFERENCES KategoriPengeluaran(Id),
    NomorBukti      TEXT    UNIQUE,
    Tanggal         TEXT    NOT NULL,
    Keterangan      TEXT    NOT NULL,
    Nominal         REAL    NOT NULL,
    BuktiUrl        TEXT,
    DisetujuiOleh  INTEGER REFERENCES Users(Id),
    StatusApproval  TEXT    NOT NULL DEFAULT 'Disetujui',  -- 'Draft','Disetujui','Ditolak'
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    CreatedBy       INTEGER REFERENCES Users(Id)
);

-- ============================================================
-- BAGIAN 12: E-SURAT
-- ============================================================

CREATE TABLE IF NOT EXISTS JenisSurat (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId    INTEGER NOT NULL REFERENCES Tenants(Id),
    NamaJenis   TEXT    NOT NULL,   -- 'Surat Keterangan Domisili','Pengantar KTP'
    Template    TEXT,               -- template HTML/teks surat
    IsAktif     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Surat (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    JenisSuratId    INTEGER NOT NULL REFERENCES JenisSurat(Id),
    WargaId         INTEGER NOT NULL REFERENCES Warga(Id),
    NomorSurat      TEXT    UNIQUE,
    Perihal         TEXT    NOT NULL,
    Keperluan       TEXT,
    TanggalAjuan    TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    TanggalSelesai  TEXT,
    Status          TEXT    NOT NULL DEFAULT 'Pending',  -- 'Pending','Diproses','Selesai','Ditolak'
    CatatanAdmin    TEXT,
    DiprosesOleh    INTEGER REFERENCES Users(Id),
    FileUrl         TEXT,   -- URL dokumen surat jadi (PDF)
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ============================================================
-- BAGIAN 13: PENGADUAN
-- ============================================================

CREATE TABLE IF NOT EXISTS Pengaduan (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    WargaId         INTEGER REFERENCES Warga(Id),   -- nullable (bisa anonim)
    NamaPengadu     TEXT,
    NoHpPengadu     TEXT,
    Judul           TEXT    NOT NULL,
    Isi             TEXT    NOT NULL,
    Kategori        TEXT,   -- 'Infrastruktur','Keamanan','Kebersihan','Lainnya'
    FotoUrl         TEXT,
    Status          TEXT    NOT NULL DEFAULT 'Masuk',  -- 'Masuk','Diproses','Selesai','Ditolak'
    CatatanAdmin    TEXT,
    DitanganiOleh   INTEGER REFERENCES Users(Id),
    TanggalSelesai  TEXT,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ============================================================
-- BAGIAN 14: NOTIFIKASI
-- ============================================================

CREATE TABLE IF NOT EXISTS Notifikasi (
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

-- ============================================================
-- BAGIAN 15: AUDIT LOG
-- Analogi: CCTV digital — semua aksi terekam
-- ============================================================

CREATE TABLE IF NOT EXISTS AuditLogs (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId    INTEGER REFERENCES Tenants(Id),
    UserId      INTEGER REFERENCES Users(Id),
    Username    TEXT,                   -- snapshot saat aksi (user bisa dihapus)
    Aksi        TEXT    NOT NULL,       -- 'CREATE','UPDATE','DELETE','LOGIN','LOGOUT','RESET_PASSWORD'
    Modul       TEXT    NOT NULL,       -- 'Warga','TagihanAir','Users', dst
    RecordId    TEXT,                   -- ID record yang diaksi
    DataLama    TEXT,                   -- JSON snapshot sebelum ubah
    DataBaru    TEXT,                   -- JSON snapshot setelah ubah
    IpAddress   TEXT,
    UserAgent   TEXT,
    Keterangan  TEXT,
    CreatedAt   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ============================================================
-- BAGIAN 16: LISENSI / SAAS
-- ============================================================

CREATE TABLE IF NOT EXISTS Lisensi (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id) ON DELETE CASCADE,
    KodeLisensi     TEXT    NOT NULL UNIQUE,
    TipeLisensi     TEXT    NOT NULL DEFAULT 'Basic',   -- 'Basic','Pro','Enterprise'
    TanggalMulai    TEXT    NOT NULL,
    TanggalExpiry   TEXT,               -- NULL = seumur hidup
    IsAktif         INTEGER NOT NULL DEFAULT 1,
    MaksWarga       INTEGER,            -- NULL = unlimited
    FiturJson       TEXT,               -- JSON array fitur yang diaktifkan
    AktifkasiOleh   INTEGER REFERENCES Users(Id),
    AktifkasiAt     TEXT,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS RiwayatLisensi (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId    INTEGER NOT NULL REFERENCES Tenants(Id),
    LisensiId   INTEGER NOT NULL REFERENCES Lisensi(Id),
    Aksi        TEXT    NOT NULL,   -- 'AKTIVASI','PERPANJANG','REVOKE','UPGRADE'
    KeteranganAksi TEXT,
    OlehUserId  INTEGER REFERENCES Users(Id),
    CreatedAt   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- Tagihan SaaS dari SuperAdmin ke Tenant
CREATE TABLE IF NOT EXISTS TagihanSistem (
    Id              INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId        INTEGER NOT NULL REFERENCES Tenants(Id),
    Periode         TEXT    NOT NULL,
    JumlahWarga     INTEGER NOT NULL DEFAULT 0,
    JumlahTransaksi INTEGER NOT NULL DEFAULT 0,
    TotalTagihan    REAL    NOT NULL,
    StatusTagihan   TEXT    NOT NULL DEFAULT 'Belum',
    JatuhTempo      TEXT,
    DibayarAt       TEXT,
    CreatedAt       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

-- ============================================================
-- BAGIAN 17: PENGATURAN APLIKASI
-- ============================================================

CREATE TABLE IF NOT EXISTS AppSettings (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId    INTEGER REFERENCES Tenants(Id),  -- NULL = global
    Kunci       TEXT    NOT NULL,
    Nilai       TEXT,
    Keterangan  TEXT,
    UpdatedAt   TEXT,
    UpdatedBy   INTEGER REFERENCES Users(Id),
    UNIQUE(TenantId, Kunci)
);

-- ============================================================
-- INDEX — untuk performa query umum
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_username       ON Users(Username);
CREATE INDEX IF NOT EXISTS idx_users_tenant         ON Users(TenantId);
CREATE INDEX IF NOT EXISTS idx_userinroles_user     ON UserInRoles(UserId);
CREATE INDEX IF NOT EXISTS idx_userinroles_role     ON UserInRoles(RoleId);
CREATE INDEX IF NOT EXISTS idx_warga_tenant         ON Warga(TenantId);
CREATE INDEX IF NOT EXISTS idx_meteran_warga        ON Meteran(WargaId);
CREATE INDEX IF NOT EXISTS idx_pencatatan_periode   ON PencatatanMeteran(Periode);
CREATE INDEX IF NOT EXISTS idx_tagihanair_periode   ON TagihanAir(Periode);
CREATE INDEX IF NOT EXISTS idx_tagihanair_status    ON TagihanAir(StatusTagihan);
CREATE INDEX IF NOT EXISTS idx_tagihaniuran_periode ON TagihanIuran(Periode);
CREATE INDEX IF NOT EXISTS idx_pengeluaran_tanggal  ON Pengeluaran(Tanggal);
CREATE INDEX IF NOT EXISTS idx_notifikasi_user      ON Notifikasi(UserId, IsRead);
CREATE INDEX IF NOT EXISTS idx_auditlog_modul       ON AuditLogs(Modul, CreatedAt);
CREATE INDEX IF NOT EXISTS idx_auditlog_user        ON AuditLogs(UserId);
CREATE INDEX IF NOT EXISTS idx_surat_status         ON Surat(Status);
CREATE INDEX IF NOT EXISTS idx_pengaduan_status     ON Pengaduan(Status);
CREATE INDEX IF NOT EXISTS idx_sessions_token       ON UserSessions(RefreshToken);
CREATE INDEX IF NOT EXISTS idx_sessions_user        ON UserSessions(UserId, IsRevoked);

-- ============================================================
-- SEED DATA — Data awal wajib ada
-- ============================================================

-- Tenant default
INSERT OR IGNORE INTO Tenants (Id, NamaTenant, KodeTenant, Kota, IsAktif)
VALUES (1, 'RT 03 RW 07', 'RT03RW07-DEFAULT', 'Bandung', 1);

-- Roles
INSERT OR IGNORE INTO Roles (NamaRole, Deskripsi) VALUES
    ('SuperAdmin',  'Akses penuh lintas tenant — pengelola platform'),
    ('Admin',       'Admin RT/RW — akses penuh dalam satu tenant'),
    ('Bendahara',   'Kelola keuangan, tagihan, dan laporan'),
    ('Kasir',       'Input pembayaran dan cetak kuitansi'),
    ('Petugas',     'Catat meteran dan data lapangan'),
    ('Warga',       'Akses portal warga — lihat tagihan & ajukan surat');

-- User SuperAdmin awal
-- Password default: Admin@123 (GANTI segera setelah deploy!)
-- Hash ini adalah placeholder — generate ulang di aplikasi
INSERT OR IGNORE INTO Users (
    Id, TenantId, Username, Email, NamaLengkap,
    PasswordHash, PasswordSalt,
    IsAktif, MustChangePassword
) VALUES (
    1, 1, 'superadmin', 'admin@simwarga.id', 'Super Administrator',
    'PLACEHOLDER_HASH',   -- ganti dengan hash bcrypt/PBKDF2 dari aplikasi
    'PLACEHOLDER_SALT',
    1, 1  -- MustChangePassword = 1, wajib ganti saat login pertama
);

-- Assign SuperAdmin role ke user pertama
INSERT OR IGNORE INTO UserInRoles (UserId, RoleId)
SELECT 1, Id FROM Roles WHERE NamaRole = 'SuperAdmin';

-- Setting default
INSERT OR IGNORE INTO AppSettings (TenantId, Kunci, Nilai, Keterangan) VALUES
    (1, 'NAMA_APLIKASI',        'SimWarga',             'Nama aplikasi ditampilkan'),
    (1, 'VERSI',                '2.0',                  'Versi aplikasi'),
    (1, 'TIMEZONE',             'Asia/Jakarta',          'Timezone default'),
    (1, 'MAKS_GAGAL_LOGIN',     '5',                    'Maks percobaan login sebelum dikunci'),
    (1, 'DURASI_KUNCI_MENIT',   '30',                   'Durasi kunci akun (menit)'),
    (1, 'EXPIRY_TOKEN_JAM',     '24',                   'Durasi refresh token (jam)'),
    (1, 'EXPIRY_RESET_MENIT',   '30',                   'Durasi token reset password (menit)');

-- ============================================================
-- END OF SCHEMA
-- ============================================================
