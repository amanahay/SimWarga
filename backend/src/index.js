const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const db = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || "simwarga-secret-key-2025";
const allowedOrigins = [
  /^http:\/\/localhost:517\d$/,
  "http://localhost:5001",
  "https://simwarga.itu.biz.id",
  "https://www.simwarga.itu.biz.id",
];

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.some((allowedOrigin) =>
          allowedOrigin instanceof RegExp
            ? allowedOrigin.test(origin)
            : allowedOrigin === origin,
        )
      ) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));

// ===== API Router =====
const api = express.Router();

// Initialize RW/RT tables
db.exec(`
  CREATE TABLE IF NOT EXISTS RW (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId INTEGER NOT NULL REFERENCES Tenants(Id),
    NomorRW TEXT NOT NULL,
    KetuaRW TEXT,
    NoHp TEXT,
    Keterangan TEXT,
    IsAktif INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS RT (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId INTEGER NOT NULL REFERENCES Tenants(Id),
    RW_Id INTEGER REFERENCES RW(Id),
    NomorRT TEXT NOT NULL,
    KetuaRT TEXT,
    NoHp TEXT,
    Alamat TEXT,
    Provinsi TEXT,
    KotaKab TEXT,
    Kecamatan TEXT,
    KelDesa TEXT,
    NamaKomplek TEXT,
    Keterangan TEXT,
    IsAktif INTEGER DEFAULT 1
  );
`);

// Printer settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS PrinterSettings (
    TenantId INTEGER PRIMARY KEY,
    HeaderText TEXT DEFAULT 'SIMWARGA',
    FooterText TEXT DEFAULT 'Terima Kasih',
    FontSize INTEGER DEFAULT 10,
    ShowLogo INTEGER DEFAULT 1,
    UpdatedAt TEXT
  );
`);

// Pengumuman table
db.exec(`
  CREATE TABLE IF NOT EXISTS Pengumuman (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId INTEGER NOT NULL REFERENCES Tenants(Id),
    Judul TEXT NOT NULL,
    Konten TEXT NOT NULL,
    Kategori TEXT,
    Status TEXT DEFAULT 'Draft',
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UpdatedAt TEXT,
    CreatedBy INTEGER REFERENCES Users(Id),
    TanggalTampil TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_pengumuman_tenant ON Pengumuman(TenantId, Status);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS AppSettings (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId INTEGER REFERENCES Tenants(Id),
    Kunci TEXT NOT NULL,
    Nilai TEXT,
    Keterangan TEXT,
    UpdatedAt TEXT,
    UpdatedBy INTEGER REFERENCES Users(Id),
    UNIQUE(TenantId, Kunci)
  );
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_appsettings_tenant_kunci
  ON AppSettings(TenantId, Kunci);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS WhatsAppGatewaySettings (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    NomorPengirim TEXT,
    ApiKey TEXT,
    Provider TEXT DEFAULT 'WABLAS',
    AutoReply TEXT,
    IsAktif INTEGER NOT NULL DEFAULT 1,
    UpdatedAt TEXT,
    UpdatedBy INTEGER REFERENCES Users(Id)
  );
  CREATE TABLE IF NOT EXISTS WhatsAppMessageLogs (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId INTEGER REFERENCES Tenants(Id),
    WargaId INTEGER REFERENCES Warga(Id),
    NamaTujuan TEXT,
    NomorTujuan TEXT NOT NULL,
    Pesan TEXT NOT NULL,
    LampiranUrl TEXT,
    Sumber TEXT NOT NULL DEFAULT 'Manual',
    StatusKirim TEXT NOT NULL DEFAULT 'Terkirim',
    GatewayProvider TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    CreatedBy INTEGER REFERENCES Users(Id)
  );
  CREATE TABLE IF NOT EXISTS BroadcastJobs (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Judul TEXT NOT NULL,
    Pesan TEXT NOT NULL,
    TargetType TEXT NOT NULL DEFAULT 'semua',
    TargetValue TEXT,
    ScheduleAt TEXT,
    Status TEXT NOT NULL DEFAULT 'Selesai',
    TotalPenerima INTEGER NOT NULL DEFAULT 0,
    TotalTerkirim INTEGER NOT NULL DEFAULT 0,
    TotalGagal INTEGER NOT NULL DEFAULT 0,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    CreatedBy INTEGER REFERENCES Users(Id)
  );
  CREATE TABLE IF NOT EXISTS BroadcastRecipients (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    BroadcastJobId INTEGER NOT NULL REFERENCES BroadcastJobs(Id) ON DELETE CASCADE,
    TenantId INTEGER REFERENCES Tenants(Id),
    WargaId INTEGER REFERENCES Warga(Id),
    NamaTujuan TEXT,
    NomorTujuan TEXT,
    StatusKirim TEXT NOT NULL DEFAULT 'Terkirim',
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_wa_logs_createdat ON WhatsAppMessageLogs(CreatedAt DESC);
  CREATE INDEX IF NOT EXISTS idx_broadcast_jobs_createdat ON BroadcastJobs(CreatedAt DESC);
  CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_job ON BroadcastRecipients(BroadcastJobId);
`);

const pengumumanColumns = db
  .prepare("PRAGMA table_info(Pengumuman)")
  .all()
  .map((column) => column.name);
if (!pengumumanColumns.includes("UpdatedAt")) {
  db.exec("ALTER TABLE Pengumuman ADD COLUMN UpdatedAt TEXT");
}
if (!pengumumanColumns.includes("CreatedBy")) {
  db.exec(
    "ALTER TABLE Pengumuman ADD COLUMN CreatedBy INTEGER REFERENCES Users(Id)",
  );
}
if (!pengumumanColumns.includes("TanggalTampil")) {
  db.exec("ALTER TABLE Pengumuman ADD COLUMN TanggalTampil TEXT");
}

const tagihanSistemColumns = db
  .prepare("PRAGMA table_info(TagihanSistem)")
  .all()
  .map((column) => column.name);
for (const [column, definition] of [
  ["JenisFee", "TEXT"],
  ["PersentaseFee", "REAL"],
  ["MinFee", "REAL"],
  ["MaxFee", "REAL"],
  ["NominalFlat", "REAL"],
  ["DasarTagihan", "REAL"],
]) {
  if (tagihanSistemColumns.length && !tagihanSistemColumns.includes(column)) {
    db.exec(`ALTER TABLE TagihanSistem ADD COLUMN ${column} ${definition}`);
  }
}

// KontakDarurat table
db.exec(`
  CREATE TABLE IF NOT EXISTS KontakDarurat (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId INTEGER NOT NULL REFERENCES Tenants(Id),
    NamaKontak TEXT NOT NULL,
    Nomor TEXT NOT NULL,
    Deskripsi TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UpdatedAt TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_kontakdarurat_tenant ON KontakDarurat(TenantId);
`);

// Pengaduan table
db.exec(`
  CREATE TABLE IF NOT EXISTS Pengaduan (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId INTEGER NOT NULL REFERENCES Tenants(Id),
    WargaId INTEGER REFERENCES Warga(Id),
    NamaPengadu TEXT,
    NoHpPengadu TEXT,
    Judul TEXT NOT NULL,
    Isi TEXT NOT NULL,
    Kategori TEXT,
    FotoUrl TEXT,
    Status TEXT NOT NULL DEFAULT 'Masuk',
    CatatanAdmin TEXT,
    DitanganiOleh INTEGER REFERENCES Users(Id),
    TanggalSelesai TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UpdatedAt TEXT,
    CreatedBy INTEGER REFERENCES Users(Id)
  );
`);

const pengaduanColumns = db
  .prepare("PRAGMA table_info(Pengaduan)")
  .all()
  .map((column) => column.name);
for (const [column, definition] of [
  ["WargaId", "INTEGER REFERENCES Warga(Id)"],
  ["NamaPengadu", "TEXT"],
  ["NoHpPengadu", "TEXT"],
  ["FotoUrl", "TEXT"],
  ["Status", "TEXT NOT NULL DEFAULT 'Masuk'"],
  ["CatatanAdmin", "TEXT"],
  ["DitanganiOleh", "INTEGER REFERENCES Users(Id)"],
  ["TanggalSelesai", "TEXT"],
  ["UpdatedAt", "TEXT"],
  ["CreatedBy", "INTEGER REFERENCES Users(Id)"],
]) {
  if (!pengaduanColumns.includes(column)) {
    db.exec(`ALTER TABLE Pengaduan ADD COLUMN ${column} ${definition}`);
  }
}
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_pengaduan_tenant_status ON Pengaduan(TenantId, Status);
  CREATE INDEX IF NOT EXISTS idx_pengaduan_createdby ON Pengaduan(CreatedBy, CreatedAt);
`);

// E-Surat tables
db.exec(`
  CREATE TABLE IF NOT EXISTS JenisSurat (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId INTEGER NOT NULL REFERENCES Tenants(Id),
    NamaJenis TEXT NOT NULL,
    Template TEXT,
    IsAktif INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS Surat (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    TenantId INTEGER NOT NULL REFERENCES Tenants(Id),
    JenisSuratId INTEGER NOT NULL REFERENCES JenisSurat(Id),
    WargaId INTEGER NOT NULL REFERENCES Warga(Id),
    NomorSurat TEXT UNIQUE,
    Perihal TEXT NOT NULL,
    Keperluan TEXT,
    TanggalAjuan TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    TanggalSelesai TEXT,
    Status TEXT NOT NULL DEFAULT 'Pending',
    CatatanAdmin TEXT,
    DiprosesOleh INTEGER REFERENCES Users(Id),
    FileUrl TEXT,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UpdatedAt TEXT,
    CreatedBy INTEGER REFERENCES Users(Id)
  );
`);

const suratColumns = db
  .prepare("PRAGMA table_info(Surat)")
  .all()
  .map((column) => column.name);
for (const [column, definition] of [
  ["TanggalSelesai", "TEXT"],
  ["CatatanAdmin", "TEXT"],
  ["DiprosesOleh", "INTEGER REFERENCES Users(Id)"],
  ["FileUrl", "TEXT"],
  ["UpdatedAt", "TEXT"],
  ["CreatedBy", "INTEGER REFERENCES Users(Id)"],
]) {
  if (!suratColumns.includes(column)) {
    db.exec(`ALTER TABLE Surat ADD COLUMN ${column} ${definition}`);
  }
}
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_surat_tenant_status ON Surat(TenantId, Status);
  CREATE INDEX IF NOT EXISTS idx_surat_warga ON Surat(WargaId, CreatedAt);
`);

const tenantsForJenisSurat = db.prepare("SELECT Id FROM Tenants").all();
const defaultJenisSurat = [
  "Surat Keterangan Domisili",
  "Surat Pengantar KTP",
  "Surat Keterangan Tidak Mampu",
  "Surat Pengantar Nikah",
  "Surat Keterangan Usaha",
];
const jenisSuratCount = db.prepare(
  "SELECT COUNT(*) AS c FROM JenisSurat WHERE TenantId=?",
);
const insertJenisSurat = db.prepare(
  "INSERT INTO JenisSurat (TenantId, NamaJenis, Template, IsAktif) VALUES (?, ?, ?, 1)",
);
for (const tenant of tenantsForJenisSurat) {
  if (jenisSuratCount.get(tenant.Id).c === 0) {
    for (const namaJenis of defaultJenisSurat) {
      insertJenisSurat.run(tenant.Id, namaJenis, null);
    }
  }
}

// Seed sample RW/RT if empty
const rwCount = db
  .prepare("SELECT COUNT(*) as c FROM RW WHERE TenantId=1")
  .get().c;
if (rwCount === 0) {
  db.prepare(
    "INSERT INTO RW (TenantId,NomorRW,KetuaRW,NoHp,Keterangan) VALUES (1,'007','H. Ahmad Suherman','0812-1111-2222','RW 07 Kelurahan Sukajadi')",
  ).run();
  db.prepare(
    "INSERT INTO RW (TenantId,NomorRW,KetuaRW,NoHp,Keterangan) VALUES (1,'008','Drs. Budi Hartono','0813-2222-3333','RW 08 Kelurahan Sukajadi')",
  ).run();
  const rw7 = db
    .prepare("SELECT Id FROM RW WHERE TenantId=1 AND NomorRW='007'")
    .get();
  const rw8 = db
    .prepare("SELECT Id FROM RW WHERE TenantId=1 AND NomorRW='008'")
    .get();
  if (rw7) {
    db.prepare(
      "INSERT INTO RT (TenantId,RW_Id,NomorRT,KetuaRT,NoHp,Alamat,Provinsi,KotaKab,Kecamatan,KelDesa,NamaKomplek,Keterangan) VALUES (1,?,'001','Suparno','0811-1111-0001','Jl. Melati No. 1','Jawa Barat','Bandung','Cileunyi','Sukajadi','Griya Asri','RT 01 - Blok A dan B')",
    ).run(rw7.Id);
    db.prepare(
      "INSERT INTO RT (TenantId,RW_Id,NomorRT,KetuaRT,NoHp,Alamat,Provinsi,KotaKab,Kecamatan,KelDesa,NamaKomplek,Keterangan) VALUES (1,?,'003','Hj. Siti Maryam','0811-1111-0002','Jl. Mawar No. 5','Jawa Barat','Bandung','Cileunyi','Sukajadi','Griya Asri','RT 03 - Blok C dan D')",
    ).run(rw7.Id);
  }
  if (rw8) {
    db.prepare(
      "INSERT INTO RT (TenantId,RW_Id,NomorRT,KetuaRT,NoHp,Alamat,Provinsi,KotaKab,Kecamatan,KelDesa,NamaKomplek,Keterangan) VALUES (1,?,'002','Agus Riyadi','0814-3333-0002','Jl. Kenanga No. 10','Jawa Barat','Bandung','Cileunyi','Sukajadi','Griya Asri','RT 02 - Blok E')",
    ).run(rw8.Id);
  }
}

// Middleware
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer "))
    return res.status(401).json({ error: "Token tidak ditemukan" });
  try {
    req.user = jwt.verify(h.split(" ")[1], JWT_SECRET);
    // SuperAdmin impersonation: override tenantId
    if (req.user.role === "SuperAdmin" && req.headers["x-impersonate-tenant"]) {
      req.user.tenantId = Number(req.headers["x-impersonate-tenant"]);
    }
    next();
  } catch (e) {
    res.status(401).json({ error: "Token tidak valid" });
  }
}
function superOnly(req, res, next) {
  return req.user.role === "SuperAdmin"
    ? next()
    : res.status(403).json({ error: "Super Admin only" });
}
function adminOnly(req, res, next) {
  return ["SuperAdmin", "Admin"].includes(req.user.role)
    ? next()
    : res.status(403).json({ error: "Admin only" });
}

function getLinkedWargaProfile(user) {
  const account = db
    .prepare("SELECT Id, TenantId, Email, NoHp FROM Users WHERE Id=? AND TenantId=?")
    .get(user.userId, user.tenantId);
  if (!account) {
    return { error: "Akun user tidak ditemukan pada tenant aktif" };
  }

  const warga = db
    .prepare(
      `SELECT Id, TenantId, UserId, Email, NoHp, IsAktif
       FROM Warga
       WHERE TenantId=? AND UserId=?
       ORDER BY Id
       LIMIT 1`,
    )
    .get(user.tenantId, user.userId);

  if (!warga || !warga.IsAktif) {
    return {
      error: "Profil warga belum terhubung ke tenant atau belum aktif. Lengkapi dulu profil Anda.",
    };
  }

  const email = String(account.Email || warga.Email || "").trim();
  const noHp = String(warga.NoHp || account.NoHp || "").trim();

  if (!email) {
    return { error: "Email masih kosong. Lengkapi dulu profil Anda." };
  }
  if (!noHp) {
    return { error: "Nomor HP/WhatsApp masih kosong. Lengkapi dulu profil Anda." };
  }

  return { account, warga, email, noHp };
}

function createNotification({
  tenantId,
  userId = null,
  judul,
  pesan,
  tipe = "Info",
  icon = "bi-bell",
  createdBy = null,
}) {
  if (!tenantId || !judul || !pesan) return;
  db.prepare(
    `INSERT INTO Notifikasi
     (TenantId, UserId, Judul, Pesan, Tipe, Icon, IsRead, CreatedBy)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(tenantId, userId, judul, pesan, tipe, icon, createdBy);
}

function writeAuditLog({
  tenantId,
  userId = null,
  username = null,
  aksi,
  modul,
  recordId = null,
  dataLama = null,
  dataBaru = null,
  ipAddress = null,
  userAgent = null,
  keterangan = null,
}) {
  if (!tenantId || !aksi || !modul) return;
  db.prepare(
    `INSERT INTO AuditLogs
     (TenantId, UserId, Username, Aksi, Modul, RecordId, DataLama, DataBaru, IpAddress, UserAgent, Keterangan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    tenantId,
    userId,
    username,
    aksi,
    modul,
    recordId,
    dataLama ? JSON.stringify(dataLama) : null,
    dataBaru ? JSON.stringify(dataBaru) : null,
    ipAddress,
    userAgent,
    keterangan,
  );
}

function getSettingValue(tenantId, key, fallback = null) {
  const row = db
    .prepare("SELECT Nilai FROM AppSettings WHERE TenantId=? AND Kunci=?")
    .get(tenantId, key);
  return row ? row.Nilai : fallback;
}

function upsertSettingValue(tenantId, key, value, updatedBy = null, keterangan = null) {
  db.prepare(
    `INSERT INTO AppSettings (TenantId, Kunci, Nilai, Keterangan, UpdatedAt, UpdatedBy)
     VALUES (?, ?, ?, ?, datetime('now','localtime'), ?)
     ON CONFLICT(TenantId, Kunci) DO UPDATE SET
       Nilai=excluded.Nilai,
       Keterangan=excluded.Keterangan,
       UpdatedAt=excluded.UpdatedAt,
       UpdatedBy=excluded.UpdatedBy`,
  ).run(tenantId, key, value == null ? null : String(value), keterangan, updatedBy);
}

function getTenantFeeSettings(tenantId) {
  const jenis = getSettingValue(tenantId, "saas_fee_type", "Persentase");
  const persentase = Number(getSettingValue(tenantId, "saas_fee_percent", "5")) || 0;
  const minFee = Number(getSettingValue(tenantId, "saas_fee_min", "25000")) || 0;
  const maxFee = Number(getSettingValue(tenantId, "saas_fee_max", "500000")) || 0;
  const nominalFlat = Number(getSettingValue(tenantId, "saas_fee_flat", "50000")) || 0;
  const isAktif = Number(getSettingValue(tenantId, "saas_fee_active", "1")) === 1 ? 1 : 0;
  return { jenis, persentase, minFee, maxFee, nominalFlat, isAktif };
}

function saveTenantFeeSettings(tenantId, payload, userId) {
  const fee = {
    jenis: payload.jenis || "Persentase",
    persentase: Number(payload.persentase) || 0,
    minFee: Number(payload.minFee) || 0,
    maxFee: Number(payload.maxFee) || 0,
    nominalFlat: Number(payload.nominalFlat) || 0,
    isAktif: payload.isAktif === 0 || payload.isAktif === false ? 0 : 1,
  };
  for (const [key, value] of [
    ["saas_fee_type", fee.jenis],
    ["saas_fee_percent", fee.persentase],
    ["saas_fee_min", fee.minFee],
    ["saas_fee_max", fee.maxFee],
    ["saas_fee_flat", fee.nominalFlat],
    ["saas_fee_active", fee.isAktif],
  ]) {
    upsertSettingValue(tenantId, key, value, userId, "Pengaturan fee tenant");
  }
  return fee;
}

function getMonthRange(period) {
  const [year, month] = String(period).split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  return { start, next };
}

function calculateTenantBaseBilling(tenantId, period) {
  const air = db
    .prepare(
      "SELECT COALESCE(SUM(TotalTagihan),0) total FROM TagihanAir WHERE TenantId=? AND Periode=?",
    )
    .get(tenantId, period).total;
  const iuran = db
    .prepare(
      "SELECT COALESCE(SUM(Nominal),0) total FROM TagihanIuran WHERE TenantId=? AND Periode=?",
    )
    .get(tenantId, period).total;
  return Number(air || 0) + Number(iuran || 0);
}

function countTenantTransactions(tenantId, period) {
  const { start } = getMonthRange(period);
  const queryByPrefix = (table, column) =>
    db
      .prepare(
        `SELECT COUNT(*) c FROM ${table} WHERE TenantId=? AND substr(${column},1,7)=?`,
      )
      .get(tenantId, start).c;
  return (
    queryByPrefix("PembayaranAir", "TanggalBayar") +
    queryByPrefix("PembayaranIuran", "TanggalBayar") +
    queryByPrefix("Pengaduan", "CreatedAt") +
    queryByPrefix("Surat", "CreatedAt")
  );
}

function calculateSystemFeeFromSettings(settings, baseAmount) {
  const base = Number(baseAmount || 0);
  if (!settings.isAktif) return 0;
  if (settings.jenis === "Nominal Tetap") {
    return Math.max(0, settings.nominalFlat);
  }
  let fee = (base * settings.persentase) / 100;
  if (settings.jenis === "Hybrid") {
    fee = Math.max(fee, settings.minFee);
  } else if (settings.minFee > 0) {
    fee = Math.max(fee, settings.minFee);
  }
  if (settings.maxFee > 0) {
    fee = Math.min(fee, settings.maxFee);
  }
  return Math.round(fee);
}

function formatTanggalIndonesia(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(String(value).replace(" ", "T")));
}

// ===== AUTH =====
api.post("/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username dan password wajib" });
    const user = db
      .prepare(
        "SELECT u.*, r.NamaRole as Role FROM Users u JOIN UserInRoles ur ON u.Id=ur.UserId JOIN Roles r ON ur.RoleId=r.Id WHERE u.Username=? AND u.IsAktif=1",
      )
      .get(username);
    if (!user)
      return res.status(401).json({ error: "Username atau password salah" });
    if (!bcrypt.compareSync(password, user.PasswordHash)) {
      db.prepare(
        "UPDATE Users SET FailedLoginCount=FailedLoginCount+1 WHERE Id=?",
      ).run(user.Id);
      return res.status(401).json({ error: "Username atau password salah" });
    }
    db.prepare(
      "UPDATE Users SET LastLoginAt=datetime('now','localtime'), FailedLoginCount=0 WHERE Id=?",
    ).run(user.Id);
    writeAuditLog({
      tenantId: user.TenantId,
      userId: user.Id,
      username: user.Username,
      aksi: "LOGIN",
      modul: "Authentication",
      recordId: String(user.Id),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: "Login berhasil via web",
    });
    const token = jwt.sign(
      {
        userId: user.Id,
        tenantId: user.TenantId,
        username: user.Username,
        name: user.NamaLengkap,
        role: user.Role,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );
    res.json({
      token,
      user: {
        id: user.Id,
        tenantId: user.TenantId,
        username: user.Username,
        name: user.NamaLengkap,
        email: user.Email,
        role: user.Role,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/auth/me", auth, (req, res) => {
  const user = db
    .prepare(
      "SELECT u.*, r.NamaRole as Role, t.NamaTenant FROM Users u JOIN UserInRoles ur ON u.Id=ur.UserId JOIN Roles r ON ur.RoleId=r.Id JOIN Tenants t ON u.TenantId=t.Id WHERE u.Id=?",
    )
    .get(req.user.userId);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ user });
});

api.get("/profil", auth, (req, res) => {
  try {
    const user = db
      .prepare(
        `SELECT u.Id, u.TenantId, u.Username, u.Email, u.NamaLengkap, u.NoHp, u.LastLoginAt,
                r.NamaRole AS Role, t.NamaTenant
         FROM Users u
         JOIN UserInRoles ur ON u.Id=ur.UserId
         JOIN Roles r ON ur.RoleId=r.Id
         JOIN Tenants t ON u.TenantId=t.Id
         WHERE u.Id=?`,
      )
      .get(req.user.userId);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    const warga = db
      .prepare(
        `SELECT * FROM Warga
         WHERE TenantId=? AND (UserId=? OR (? <> 'Warga' AND Id=COALESCE(?, Id)))
         ORDER BY CASE WHEN UserId=? THEN 0 ELSE 1 END, Id
         LIMIT 1`,
      )
      .get(req.user.tenantId, req.user.userId, req.user.role, req.query.wargaId || null, req.user.userId);

    if (!warga) {
      return res.json({
        user,
        warga: null,
        meteran: [],
        tagihanAir: [],
        tagihanIuran: [],
        pembayaran: [],
        totalTunggakan: 0,
      });
    }

    const meteran = db
      .prepare(
        `SELECT m.*,
                pm.TanggalCatat AS TanggalCatatTerakhir,
                pm.StandAkhir AS StandAkhirTerakhir,
                pm.Pemakaian AS PemakaianTerakhir
         FROM Meteran m
         LEFT JOIN PencatatanMeteran pm ON pm.Id=(
           SELECT Id FROM PencatatanMeteran WHERE MeteranId=m.Id ORDER BY TanggalCatat DESC, Id DESC LIMIT 1
         )
         WHERE m.TenantId=? AND m.WargaId=?
         ORDER BY m.Id DESC`,
      )
      .all(req.user.tenantId, warga.Id);

    const tagihanAir = db
      .prepare(
        `SELECT ta.*, m.NoMeteran, pm.StandAwal, pm.StandAkhir, pm.TanggalCatat
         FROM TagihanAir ta
         LEFT JOIN PencatatanMeteran pm ON ta.PencatatanId=pm.Id
         LEFT JOIN Meteran m ON pm.MeteranId=m.Id
         WHERE ta.TenantId=? AND ta.WargaId=?
         ORDER BY ta.Id DESC
         LIMIT 24`,
      )
      .all(req.user.tenantId, warga.Id);

    const tagihanIuran = db
      .prepare(
        `SELECT ti.*, ji.NamaIuran
         FROM TagihanIuran ti
         JOIN JenisIuran ji ON ti.JenisIuranId=ji.Id
         WHERE ti.TenantId=? AND ti.WargaId=?
         ORDER BY ti.Id DESC
         LIMIT 50`,
      )
      .all(req.user.tenantId, warga.Id);

    const pembayaranAir = db
      .prepare(
        `SELECT pa.NomorTransaksi, 'Tagihan Air' AS Jenis, ta.Periode, pa.JumlahBayar,
                pa.MetodeBayar, pa.TanggalBayar, 'Sukses' AS Status
         FROM PembayaranAir pa
         JOIN TagihanAir ta ON pa.TagihanAirId=ta.Id
         WHERE pa.TenantId=? AND ta.WargaId=?`,
      )
      .all(req.user.tenantId, warga.Id);

    const pembayaranIuran = db
      .prepare(
        `SELECT pi.NomorTransaksi, ji.NamaIuran AS Jenis, ti.Periode, pi.JumlahBayar,
                pi.MetodeBayar, pi.TanggalBayar, 'Sukses' AS Status
         FROM PembayaranIuran pi
         JOIN TagihanIuran ti ON pi.TagihanIuranId=ti.Id
         JOIN JenisIuran ji ON ti.JenisIuranId=ji.Id
         WHERE pi.TenantId=? AND ti.WargaId=?`,
      )
      .all(req.user.tenantId, warga.Id);

    const pembayaran = [...pembayaranAir, ...pembayaranIuran]
      .sort((a, b) => String(b.TanggalBayar).localeCompare(String(a.TanggalBayar)))
      .slice(0, 50);

    const tunggakanAir = tagihanAir
      .filter((t) => t.StatusTagihan !== "Lunas")
      .reduce((sum, t) => sum + Number(t.TotalTagihan || 0), 0);
    const tunggakanIuran = tagihanIuran
      .filter((t) => t.StatusTagihan !== "Lunas")
      .reduce((sum, t) => sum + Number(t.Nominal || 0), 0);

    res.json({
      user,
      warga,
      meteran,
      tagihanAir,
      tagihanIuran,
      pembayaran,
      totalTunggakan: tunggakanAir + tunggakanIuran,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.put("/profil", auth, (req, res) => {
  try {
    const {
      NamaLengkap,
      Email,
      NoHp,
      NIK,
      Alamat,
      NoRumah,
      RT,
      RW,
    } = req.body;

    if (!NamaLengkap || !String(NamaLengkap).trim()) {
      return res.status(400).json({ error: "Nama lengkap wajib diisi" });
    }

    const user = db
      .prepare("SELECT Id, TenantId FROM Users WHERE Id=? AND TenantId=?")
      .get(req.user.userId, req.user.tenantId);
    if (!user) return res.status(404).json({ error: "User tidak ditemukan" });

    const warga = db
      .prepare(
        "SELECT * FROM Warga WHERE TenantId=? AND UserId=? ORDER BY Id LIMIT 1",
      )
      .get(req.user.tenantId, req.user.userId);

    const nextNama = String(NamaLengkap).trim();
    const nextEmail = Email ? String(Email).trim().toLowerCase() : null;
    const rawNoHp = NoHp ? String(NoHp).trim() : "";
    const rawNik = NIK ? String(NIK).trim() : "";
    const nextNoHp = rawNoHp ? rawNoHp.replace(/\D/g, "") : null;
    const nextNik = rawNik ? rawNik.replace(/\D/g, "") : null;

    if (Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return res.status(400).json({ error: "Format email tidak valid" });
    }
    if (rawNoHp && nextNoHp !== rawNoHp) {
      return res.status(400).json({ error: "Nomor HP hanya boleh angka" });
    }
    if (nextNoHp && nextNoHp.length > 15) {
      return res.status(400).json({ error: "Nomor HP maksimal 15 angka" });
    }
    if (rawNik && nextNik !== rawNik) {
      return res.status(400).json({ error: "NIK hanya boleh angka" });
    }
    if (nextNik && nextNik.length > 20) {
      return res.status(400).json({ error: "NIK maksimal 20 angka" });
    }

    if (nextEmail) {
      const usedEmail = db
        .prepare(
          `SELECT 'users' AS Source FROM Users
           WHERE TenantId=? AND lower(Email)=lower(?) AND Id<>?
           UNION ALL
           SELECT 'warga' AS Source FROM Warga
           WHERE TenantId=? AND lower(Email)=lower(?) AND COALESCE(UserId, 0)<>?
           LIMIT 1`,
        )
        .get(
          req.user.tenantId,
          nextEmail,
          req.user.userId,
          req.user.tenantId,
          nextEmail,
          req.user.userId,
        );
      if (usedEmail) {
        return res.status(400).json({ error: "Email sudah digunakan data lain" });
      }
    }

    if (nextNoHp) {
      const usedNoHp = db
        .prepare(
          `SELECT 'users' AS Source FROM Users
           WHERE TenantId=? AND NoHp=? AND Id<>?
           UNION ALL
           SELECT 'warga' AS Source FROM Warga
           WHERE TenantId=? AND NoHp=? AND COALESCE(UserId, 0)<>?
           LIMIT 1`,
        )
        .get(
          req.user.tenantId,
          nextNoHp,
          req.user.userId,
          req.user.tenantId,
          nextNoHp,
          req.user.userId,
        );
      if (usedNoHp) {
        return res.status(400).json({ error: "Nomor HP sudah digunakan data lain" });
      }
    }

    if (nextNik) {
      const usedNik = db
        .prepare(
          "SELECT Id FROM Warga WHERE TenantId=? AND NIK=? AND COALESCE(UserId, 0)<>? LIMIT 1",
        )
        .get(req.user.tenantId, nextNik, req.user.userId);
      if (usedNik) {
        return res.status(400).json({ error: "NIK sudah digunakan data lain" });
      }
    }

    const tx = db.transaction(() => {
      db.prepare(
        "UPDATE Users SET NamaLengkap=?, Email=?, NoHp=?, UpdatedAt=datetime('now','localtime'), UpdatedBy=? WHERE Id=? AND TenantId=?",
      ).run(
        nextNama,
        nextEmail,
        nextNoHp,
        req.user.userId,
        req.user.userId,
        req.user.tenantId,
      );

      if (warga) {
        db.prepare(
          `UPDATE Warga
           SET NamaKepalaKK=?, NIK=?, Email=?, NoHp=?, Alamat=?, NoRumah=?, RT=?, RW=?,
               UpdatedAt=datetime('now','localtime'), UpdatedBy=?
           WHERE Id=? AND TenantId=? AND UserId=?`,
        ).run(
          nextNama,
          nextNik,
          nextEmail,
          nextNoHp,
          Alamat ? String(Alamat).trim() : null,
          NoRumah ? String(NoRumah).trim() : null,
          RT ? String(RT).trim() : null,
          RW ? String(RW).trim() : null,
          req.user.userId,
          warga.Id,
          req.user.tenantId,
          req.user.userId,
        );
      }
    });

    tx();
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "UPDATE",
      modul: "Profil",
      recordId: String(req.user.userId),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: "Profil akun diperbarui",
      dataBaru: {
        NamaLengkap: nextNama,
        Email: nextEmail,
        NoHp: nextNoHp,
        NIK: nextNik,
      },
    });
    res.json({ message: "Profil berhasil diperbarui" });
  } catch (e) {
    res.status(e.message.includes("UNIQUE") ? 400 : 500).json({
      error: e.message.includes("UNIQUE")
        ? "NIK atau email sudah digunakan"
        : e.message,
    });
  }
});

api.post("/public/register", (req, res) => {
  try {
    const { Username, NamaLengkap, Password, NoHp, Alamat } = req.body;
    if (!Username || !NamaLengkap || !Password) {
      return res
        .status(400)
        .json({ error: "Username, nama lengkap, dan password wajib" });
    }

    const tenant = db
      .prepare("SELECT Id FROM Tenants WHERE IsAktif=1 ORDER BY Id LIMIT 1")
      .get();
    if (!tenant)
      return res.status(400).json({ error: "Tenant aktif belum tersedia" });

    const role = db
      .prepare("SELECT Id FROM Roles WHERE NamaRole='Warga'")
      .get();
    if (!role)
      return res.status(400).json({ error: "Role Warga belum tersedia" });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(Password, salt);
    const userId = db
      .prepare(
        "INSERT INTO Users (TenantId,Username,Email,NamaLengkap,PasswordHash,PasswordSalt,IsAktif,MustChangePassword) VALUES (?,?,?,?,?,?,1,0)",
      )
      .run(
        tenant.Id,
        Username.trim(),
        null,
        NamaLengkap.trim(),
        hash,
        salt,
      ).lastInsertRowid;

    db.prepare("INSERT INTO UserInRoles (UserId,RoleId) VALUES (?,?)").run(
      userId,
      role.Id,
    );
    db.prepare(
      "INSERT INTO Warga (TenantId,NamaKepalaKK,Alamat,NoHp,StatusHuni,UserId,CreatedBy) VALUES (?,?,?,?,?,?,?)",
    ).run(
      tenant.Id,
      NamaLengkap.trim(),
      Alamat || null,
      NoHp || null,
      "Tetap",
      userId,
      userId,
    );

    writeAuditLog({
      tenantId: tenant.Id,
      userId,
      username: Username.trim(),
      aksi: "REGISTER",
      modul: "Portal Warga",
      recordId: String(userId),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: "Registrasi portal warga berhasil",
      dataBaru: {
        Username: Username.trim(),
        NamaLengkap: NamaLengkap.trim(),
      },
    });

    res.status(201).json({ id: userId });
  } catch (e) {
    res.status(e.message.includes("UNIQUE") ? 400 : 500).json({
      error: e.message.includes("UNIQUE")
        ? "Username sudah digunakan"
        : e.message,
    });
  }
});

// ===== DASHBOARD =====
api.get("/dashboard/stats", auth, (req, res) => {
  const tid = req.user.tenantId;
  const m = new Date().toISOString().substring(0, 7);
  res.json({
    totalWarga: db
      .prepare("SELECT COUNT(*) as c FROM Warga WHERE TenantId=? AND IsAktif=1")
      .get(tid).c,
    pelangganAir: db
      .prepare(
        "SELECT COUNT(*) as c FROM Meteran WHERE TenantId=? AND IsAktif=1",
      )
      .get(tid).c,
    belumBayar: db
      .prepare(
        "SELECT COUNT(*) as c FROM TagihanAir WHERE TenantId=? AND StatusTagihan IN ('Belum','Sebagian')",
      )
      .get(tid).c,
    pendapatanAir: db
      .prepare(
        "SELECT COALESCE(SUM(JumlahBayar),0) as t FROM PembayaranAir WHERE TenantId=? AND strftime('%Y-%m',TanggalBayar)=?",
      )
      .get(tid, m).t,
    pendapatanIuran: db
      .prepare(
        "SELECT COALESCE(SUM(JumlahBayar),0) as t FROM PembayaranIuran WHERE TenantId=? AND strftime('%Y-%m',TanggalBayar)=?",
      )
      .get(tid, m).t,
  });
});

// ===== WARGA CRUD =====
api.get("/warga", auth, (req, res) => {
  const { search, rt, page = 1, limit = 20 } = req.query;
  const tid = req.user.tenantId,
    off = (page - 1) * limit;
  let where = "WHERE TenantId=?",
    params = [tid];
  if (req.user.role === "Warga") {
    where += " AND UserId=?";
    params.push(req.user.userId);
  }
  if (search) {
    where += " AND (NamaKepalaKK LIKE ? OR Alamat LIKE ? OR NIK LIKE ?)";
    params.push("%" + search + "%", "%" + search + "%", "%" + search + "%");
  }
  if (rt) {
    where += " AND RT=?";
    params.push(rt);
  }
  const total = db
    .prepare(`SELECT COUNT(*) as c FROM Warga ${where}`)
    .get(...params).c;
  const rows = db
    .prepare(`SELECT * FROM Warga ${where} ORDER BY Id DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(limit), off);
  res.json({
    data: rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
  });
});

api.post("/warga", auth, adminOnly, (req, res) => {
  try {
    const { NIK, NamaKepalaKK, Alamat, NoRumah, RT, RW, NoHp, StatusHuni } =
      req.body;
    if (!NamaKepalaKK) return res.status(400).json({ error: "Nama wajib" });
    const r = db
      .prepare(
        "INSERT INTO Warga (TenantId,NIK,NamaKepalaKK,Alamat,NoRumah,RT,RW,NoHp,StatusHuni,CreatedBy) VALUES (?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        req.user.tenantId,
        NIK,
        NamaKepalaKK,
        Alamat,
        NoRumah,
        RT,
        RW,
        NoHp,
        StatusHuni || "Tetap",
        req.user.userId,
      );
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(e.message.includes("UNIQUE") ? 400 : 500).json({
      error: e.message.includes("UNIQUE") ? "NIK sudah terdaftar" : e.message,
    });
  }
});

api.put("/warga/:id", auth, adminOnly, (req, res) => {
  const { NamaKepalaKK, Alamat, NoRumah, RT, RW, NoHp, StatusHuni, IsAktif } =
    req.body;
  db.prepare(
    "UPDATE Warga SET NamaKepalaKK=?,Alamat=?,NoRumah=?,RT=?,RW=?,NoHp=?,StatusHuni=?,IsAktif=?,UpdatedAt=datetime('now','localtime'),UpdatedBy=? WHERE Id=? AND TenantId=?",
  ).run(
    NamaKepalaKK,
    Alamat,
    NoRumah,
    RT,
    RW,
    NoHp,
    StatusHuni,
    IsAktif !== undefined ? IsAktif : 1,
    req.user.userId,
    req.params.id,
    req.user.tenantId,
  );
  res.json({ message: "OK" });
});

api.delete("/warga/:id", auth, adminOnly, (req, res) => {
  db.prepare("DELETE FROM Warga WHERE Id=? AND TenantId=?").run(
    req.params.id,
    req.user.tenantId,
  );
  res.json({ message: "OK" });
});

// ===== RW (placed after warga) =====
api.get("/rw", auth, (req, res) => {
  res.json({
    data: db
      .prepare("SELECT * FROM RW WHERE TenantId=? ORDER BY NomorRW")
      .all(req.user.tenantId),
  });
});
api.post("/rw", auth, adminOnly, (req, res) => {
  try {
    const { NomorRW, KetuaRW, NoHp, Keterangan } = req.body;
    if (!NomorRW) return res.status(400).json({ error: "Nomor RW wajib" });
    const r = db
      .prepare(
        "INSERT INTO RW (TenantId,NomorRW,KetuaRW,NoHp,Keterangan) VALUES (?,?,?,?,?)",
      )
      .run(req.user.tenantId, NomorRW, KetuaRW, NoHp, Keterangan);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.put("/rw/:id", auth, adminOnly, (req, res) => {
  try {
    const { NomorRW, KetuaRW, NoHp, Keterangan, IsAktif } = req.body;
    db.prepare(
      "UPDATE RW SET NomorRW=?,KetuaRW=?,NoHp=?,Keterangan=?,IsAktif=? WHERE Id=? AND TenantId=?",
    ).run(
      NomorRW,
      KetuaRW,
      NoHp,
      Keterangan,
      IsAktif !== undefined ? IsAktif : 1,
      req.params.id,
      req.user.tenantId,
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.delete("/rw/:id", auth, adminOnly, (req, res) => {
  const rw = db
    .prepare("SELECT NomorRW FROM RW WHERE Id=? AND TenantId=?")
    .get(req.params.id, req.user.tenantId);
  if (!rw) return res.status(404).json({ error: "RW tidak ditemukan" });
  // Cek apakah RW dipakai oleh RT
  const rtCount = db
    .prepare("SELECT COUNT(*) as c FROM RT WHERE RW_Id=? AND TenantId=?")
    .get(req.params.id, req.user.tenantId).c;
  if (rtCount > 0)
    return res.status(400).json({
      error: `RW ${rw.NomorRW} masih digunakan oleh ${rtCount} data RT`,
    });
  // Cek apakah RW dipakai oleh Warga
  const wargaCount = db
    .prepare("SELECT COUNT(*) as c FROM Warga WHERE TenantId=? AND RW=?")
    .get(req.user.tenantId, rw.NomorRW).c;
  if (wargaCount > 0)
    return res.status(400).json({
      error: `RW ${rw.NomorRW} masih digunakan oleh ${wargaCount} data warga`,
    });
  db.prepare("DELETE FROM RW WHERE Id=? AND TenantId=?").run(
    req.params.id,
    req.user.tenantId,
  );
  res.json({ success: true });
});

// RW bulk import
api.post("/rw/bulk", auth, adminOnly, (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || !data.length)
      return res.status(400).json({ error: "Data harus berupa array JSON" });
    let imported = 0,
      skipped = 0;
    const insert = db.prepare(
      "INSERT INTO RW (TenantId,NomorRW,KetuaRW,NoHp,Keterangan) VALUES (?,?,?,?,?)",
    );
    db.transaction(() => {
      for (const r of data) {
        if (!r.NomorRW) {
          skipped++;
          continue;
        }
        try {
          insert.run(
            req.user.tenantId,
            r.NomorRW,
            r.KetuaRW || "",
            r.NoHp || "",
            r.Keterangan || "",
          );
          imported++;
        } catch (e) {
          skipped++;
        }
      }
    })();
    res.status(201).json({ imported, skipped, total: data.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== RT =====
api.get("/rt", auth, (req, res) => {
  const { rw_id } = req.query;
  let sql =
    "SELECT rt.*, rw.NomorRW FROM RT rt LEFT JOIN RW rw ON rt.RW_Id=rw.Id WHERE rt.TenantId=?";
  const params = [req.user.tenantId];
  if (rw_id) {
    sql += " AND rt.RW_Id=?";
    params.push(rw_id);
  }
  sql += " ORDER BY rw.NomorRW, rt.NomorRT";
  res.json({ data: db.prepare(sql).all(...params) });
});
api.post("/rt", auth, adminOnly, (req, res) => {
  try {
    const {
      RW_Id,
      NomorRT,
      KetuaRT,
      NoHp,
      Alamat,
      Provinsi,
      KotaKab,
      Kecamatan,
      KelDesa,
      NamaKomplek,
      Keterangan,
    } = req.body;
    if (!NomorRT) return res.status(400).json({ error: "Nomor RT wajib" });
    const r = db
      .prepare(
        "INSERT INTO RT (TenantId,RW_Id,NomorRT,KetuaRT,NoHp,Alamat,Provinsi,KotaKab,Kecamatan,KelDesa,NamaKomplek,Keterangan) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        req.user.tenantId,
        RW_Id,
        NomorRT,
        KetuaRT,
        NoHp,
        Alamat,
        Provinsi,
        KotaKab,
        Kecamatan,
        KelDesa,
        NamaKomplek,
        Keterangan,
      );
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.put("/rt/:id", auth, adminOnly, (req, res) => {
  try {
    const {
      RW_Id,
      NomorRT,
      KetuaRT,
      NoHp,
      Alamat,
      Provinsi,
      KotaKab,
      Kecamatan,
      KelDesa,
      NamaKomplek,
      Keterangan,
      IsAktif,
    } = req.body;
    db.prepare(
      "UPDATE RT SET RW_Id=?,NomorRT=?,KetuaRT=?,NoHp=?,Alamat=?,Provinsi=?,KotaKab=?,Kecamatan=?,KelDesa=?,NamaKomplek=?,Keterangan=?,IsAktif=? WHERE Id=? AND TenantId=?",
    ).run(
      RW_Id,
      NomorRT,
      KetuaRT,
      NoHp,
      Alamat,
      Provinsi,
      KotaKab,
      Kecamatan,
      KelDesa,
      NamaKomplek,
      Keterangan,
      IsAktif !== undefined ? IsAktif : 1,
      req.params.id,
      req.user.tenantId,
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.delete("/rt/:id", auth, adminOnly, (req, res) => {
  const rt = db
    .prepare("SELECT NomorRT FROM RT WHERE Id=? AND TenantId=?")
    .get(req.params.id, req.user.tenantId);
  if (!rt) return res.status(404).json({ error: "RT tidak ditemukan" });
  const wargaCount = db
    .prepare("SELECT COUNT(*) as c FROM Warga WHERE TenantId=? AND RT=?")
    .get(req.user.tenantId, rt.NomorRT).c;
  if (wargaCount > 0)
    return res.status(400).json({
      error: `RT ${rt.NomorRT} masih digunakan oleh ${wargaCount} data warga`,
    });
  db.prepare("DELETE FROM RT WHERE Id=? AND TenantId=?").run(
    req.params.id,
    req.user.tenantId,
  );
  res.json({ success: true });
});

// RT bulk import
api.post("/rt/bulk", auth, adminOnly, (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || !data.length)
      return res.status(400).json({ error: "Data harus berupa array JSON" });
    let imported = 0,
      skipped = 0;
    const insert = db.prepare(
      "INSERT INTO RT (TenantId,RW_Id,NomorRT,KetuaRT,NoHp,Alamat,Provinsi,KotaKab,Kecamatan,KelDesa,NamaKomplek,Keterangan) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    db.transaction(() => {
      for (const r of data) {
        if (!r.NomorRT) {
          skipped++;
          continue;
        }
        try {
          insert.run(
            req.user.tenantId,
            r.RW_Id || null,
            r.NomorRT,
            r.KetuaRT || "",
            r.NoHp || "",
            r.Alamat || "",
            r.Provinsi || "",
            r.KotaKab || "",
            r.Kecamatan || "",
            r.KelDesa || "",
            r.NamaKomplek || "",
            r.Keterangan || "",
          );
          imported++;
        } catch (e) {
          skipped++;
        }
      }
    })();
    res.status(201).json({ imported, skipped, total: data.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.post("/warga/bulk", auth, adminOnly, (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || !data.length)
      return res.status(400).json({ error: "Data harus berupa array JSON" });
    let imported = 0,
      skipped = 0;
    const insert = db.prepare(
      "INSERT INTO Warga (TenantId,NIK,NamaKepalaKK,Alamat,NoRumah,RT,RW,NoHp,StatusHuni,CreatedBy) VALUES (?,?,?,?,?,?,?,?,?,?)",
    );
    db.transaction(() => {
      for (const w of data) {
        if (!w.NamaKepalaKK) {
          skipped++;
          continue;
        }
        try {
          insert.run(
            req.user.tenantId,
            w.NIK || null,
            w.NamaKepalaKK,
            w.Alamat || "",
            w.NoRumah || "",
            w.RT || "",
            w.RW || "",
            w.NoHp || "",
            w.StatusHuni || "Tetap",
            req.user.userId,
          );
          imported++;
        } catch (e) {
          skipped++;
        }
      }
    })();
    res.status(201).json({ imported, skipped, total: data.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== METERAN =====
api.get("/meteran", auth, (req, res) => {
  res.json({
    data: db
      .prepare(
        "SELECT m.*, w.NamaKepalaKK as NamaWarga, w.Alamat as AlamatWarga, (SELECT pm.StandAkhir - pm.StandAwal FROM PencatatanMeteran pm WHERE pm.MeteranId=m.Id ORDER BY pm.Id DESC LIMIT 1) as Pemakaian, (SELECT pm.StandAkhir FROM PencatatanMeteran pm WHERE pm.MeteranId=m.Id ORDER BY pm.Id DESC LIMIT 1) as LastStand FROM Meteran m JOIN Warga w ON m.WargaId=w.Id WHERE m.TenantId=? ORDER BY m.Id DESC",
      )
      .all(req.user.tenantId),
  });
});

api.post("/meteran", auth, adminOnly, (req, res) => {
  try {
    const { WargaId, NoMeteran, LokasiPasang, TanggalPasang, StandAwal } =
      req.body;
    const r = db
      .prepare(
        "INSERT INTO Meteran (TenantId,WargaId,NoMeteran,LokasiPasang,TanggalPasang,StandAwal,StandTerakhir) VALUES (?,?,?,?,?,?,?)",
      )
      .run(
        req.user.tenantId,
        WargaId,
        NoMeteran,
        LokasiPasang,
        TanggalPasang,
        StandAwal || 0,
        StandAwal || 0,
      );
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(e.message.includes("UNIQUE") ? 400 : 500).json({
      error: e.message.includes("UNIQUE")
        ? "No Meteran sudah terdaftar"
        : e.message,
    });
  }
});

api.put("/meteran/:id", auth, adminOnly, (req, res) => {
  try {
    const {
      WargaId,
      NoMeteran,
      LokasiPasang,
      TanggalPasang,
      StandAwal,
      IsAktif,
    } = req.body;
    db.prepare(
      "UPDATE Meteran SET WargaId=?,NoMeteran=?,LokasiPasang=?,TanggalPasang=?,StandAwal=?,IsAktif=? WHERE Id=? AND TenantId=?",
    ).run(
      WargaId,
      NoMeteran,
      LokasiPasang,
      TanggalPasang,
      StandAwal || 0,
      IsAktif !== undefined ? IsAktif : 1,
      req.params.id,
      req.user.tenantId,
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.delete("/meteran/:id", auth, adminOnly, (req, res) => {
  try {
    // Cek apakah meteran sudah digunakan di pencatatan / tagihan
    const catatCount = db
      .prepare("SELECT COUNT(*) as c FROM PencatatanMeteran WHERE MeteranId=?")
      .get(req.params.id).c;
    if (catatCount > 0)
      return res.status(400).json({
        error: `Meteran tidak dapat dihapus karena sudah memiliki ${catatCount} data pencatatan`,
      });
    db.prepare("DELETE FROM Meteran WHERE Id=? AND TenantId=?").run(
      req.params.id,
      req.user.tenantId,
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== PENCATATAN =====
api.get("/pencatatan", auth, (req, res) => {
  const { periode } = req.query;
  const rows = periode
    ? db
        .prepare(
          "SELECT pm.*, m.NoMeteran, w.NamaKepalaKK FROM PencatatanMeteran pm JOIN Meteran m ON pm.MeteranId=m.Id JOIN Warga w ON m.WargaId=w.Id WHERE pm.TenantId=? AND pm.Periode=? ORDER BY pm.Id DESC",
        )
        .all(req.user.tenantId, periode)
    : db
        .prepare(
          "SELECT pm.*, m.NoMeteran, w.NamaKepalaKK FROM PencatatanMeteran pm JOIN Meteran m ON pm.MeteranId=m.Id JOIN Warga w ON m.WargaId=w.Id WHERE pm.TenantId=? ORDER BY pm.Id DESC LIMIT 50",
        )
        .all(req.user.tenantId);
  res.json({ data: rows });
});

api.post("/pencatatan", auth, (req, res) => {
  try {
    const { MeteranId, Periode, StandAkhir, Keterangan } = req.body;
    const m = db
      .prepare("SELECT StandTerakhir FROM Meteran WHERE Id=? AND TenantId=?")
      .get(MeteranId, req.user.tenantId);
    if (!m) return res.status(404).json({ error: "Meteran tidak ditemukan" });
    if (
      db
        .prepare(
          "SELECT Id FROM PencatatanMeteran WHERE MeteranId=? AND Periode=?",
        )
        .get(MeteranId, Periode)
    )
      return res.status(400).json({ error: "Sudah dicatat" });
    const r = db
      .prepare(
        "INSERT INTO PencatatanMeteran (TenantId,MeteranId,Periode,StandAwal,StandAkhir,CatatanOleh,Keterangan) VALUES (?,?,?,?,?,?,?)",
      )
      .run(
        req.user.tenantId,
        MeteranId,
        Periode,
        m.StandTerakhir,
        StandAkhir,
        req.user.userId,
        Keterangan,
      );
    db.prepare("UPDATE Meteran SET StandTerakhir=? WHERE Id=?").run(
      StandAkhir,
      MeteranId,
    );
    res
      .status(201)
      .json({ id: r.lastInsertRowid, pemakaian: StandAkhir - m.StandTerakhir });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== TARIF, TAGIHAN, BAYAR =====
api.get("/tarif", auth, (req, res) => {
  res.json({
    data: db
      .prepare("SELECT * FROM TarifAir WHERE TenantId=? ORDER BY Id DESC")
      .all(req.user.tenantId),
  });
});
api.post("/tarif", auth, adminOnly, (req, res) => {
  try {
    const { NamaTarif, HargaPerM3, BiayaAdmin, BiayaMinimum, MinimumM3 } =
      req.body;
    const r = db
      .prepare(
        "INSERT INTO TarifAir (TenantId,NamaTarif,HargaPerM3,BiayaAdmin,BiayaMinimum,MinimumM3,BerlakuMulai,CreatedBy) VALUES (?,?,?,?,?,?,date('now'),?)",
      )
      .run(
        req.user.tenantId,
        NamaTarif,
        HargaPerM3,
        BiayaAdmin || 0,
        BiayaMinimum || 0,
        MinimumM3 || 0,
        req.user.userId,
      );
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.put("/tarif/:id", auth, adminOnly, (req, res) => {
  try {
    const { NamaTarif, HargaPerM3, BiayaAdmin, BiayaMinimum, MinimumM3 } =
      req.body;
    db.prepare(
      "UPDATE TarifAir SET NamaTarif=?,HargaPerM3=?,BiayaAdmin=?,BiayaMinimum=?,MinimumM3=? WHERE Id=? AND TenantId=?",
    ).run(
      NamaTarif,
      HargaPerM3,
      BiayaAdmin || 0,
      BiayaMinimum || 0,
      MinimumM3 || 0,
      req.params.id,
      req.user.tenantId,
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.delete("/tarif/:id", auth, adminOnly, (req, res) => {
  try {
    db.prepare("DELETE FROM TarifAir WHERE Id=? AND TenantId=?").run(
      req.params.id,
      req.user.tenantId,
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/tagihan-air", auth, (req, res) => {
  const { status, periode } = req.query;
  let where = "WHERE ta.TenantId=?",
    params = [req.user.tenantId];
  if (status && status !== "semua") {
    where += " AND ta.StatusTagihan=?";
    params.push(status);
  }
  if (periode) {
    where += " AND ta.Periode=?";
    params.push(periode);
  }
  res.json({
    data: db
      .prepare(
        `SELECT ta.*, w.NamaKepalaKK, w.Alamat, w.RT, w.RW, m.NoMeteran, pm.Pemakaian, pm.StandAwal, pm.StandAkhir FROM TagihanAir ta JOIN Warga w ON ta.WargaId=w.Id JOIN PencatatanMeteran pm ON ta.PencatatanId=pm.Id JOIN Meteran m ON pm.MeteranId=m.Id ${where} ORDER BY ta.Id DESC LIMIT 100`,
      )
      .all(...params),
  });
});

api.post("/tagihan-air/generate", auth, adminOnly, (req, res) => {
  try {
    const { periode } = req.body;
    if (!periode) return res.status(400).json({ error: "Periode wajib" });
    // Find all pencatatan for this period that don't have tagihan yet
    const rows = db
      .prepare(
        `SELECT pm.*, m.WargaId, m.StandAwal as MeterStandAwal FROM PencatatanMeteran pm JOIN Meteran m ON pm.MeteranId=m.Id WHERE pm.TenantId=? AND pm.Periode=? AND pm.Id NOT IN (SELECT PencatatanId FROM TagihanAir WHERE TenantId=?)`,
      )
      .all(req.user.tenantId, periode, req.user.tenantId);
    if (!rows.length)
      return res
        .status(400)
        .json({ error: "Semua pencatatan sudah memiliki tagihan" });
    let count = 0;
    const tarif = db
      .prepare("SELECT * FROM TarifAir WHERE TenantId=? LIMIT 1")
      .get(req.user.tenantId);
    if (!tarif) return res.status(400).json({ error: "Belum ada data tarif" });
    db.transaction(() => {
      for (const pm of rows) {
        const pemakaian = pm.StandAkhir - pm.StandAwal;
        let total = tarif.BiayaAdmin || 0;
        if (pemakaian <= (tarif.MinimumM3 || 0))
          total +=
            tarif.BiayaMinimum || tarif.HargaPerM3 * (tarif.MinimumM3 || 0);
        else total += pemakaian * tarif.HargaPerM3;
        db.prepare(
          "INSERT INTO TagihanAir (TenantId,WargaId,PencatatanId,TarifId,Periode,Pemakaian,HargaPerM3,BiayaAdmin,TotalTagihan,StatusTagihan) VALUES (?,?,?,?,?,?,?,?,?,?)",
        ).run(
          req.user.tenantId,
          pm.WargaId,
          pm.Id,
          tarif.Id,
          periode,
          pemakaian,
          tarif.HargaPerM3 || 0,
          tarif.BiayaAdmin || 0,
          Math.round(total),
          "Belum",
        );
        count++;
      }
    })();
    res.status(201).json({ generated: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/pembayaran-air", auth, (req, res) => {
  res.json({
    data: db
      .prepare(
        "SELECT pa.*, w.NamaKepalaKK, w.Alamat, ta.Periode, ta.TotalTagihan FROM PembayaranAir pa JOIN TagihanAir ta ON pa.TagihanAirId=ta.Id JOIN Warga w ON ta.WargaId=w.Id WHERE pa.TenantId=? ORDER BY pa.Id DESC LIMIT 50",
      )
      .all(req.user.tenantId),
  });
});

api.post("/pembayaran-air", auth, (req, res) => {
  try {
    const { TagihanAirId, JumlahBayar, MetodeBayar, Keterangan } = req.body;
    const no =
      "TX-AIR-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 6).toUpperCase();
    db.prepare(
      "INSERT INTO PembayaranAir (TenantId,TagihanAirId,NomorTransaksi,JumlahBayar,MetodeBayar,KasirId,Keterangan) VALUES (?,?,?,?,?,?,?)",
    ).run(
      req.user.tenantId,
      TagihanAirId,
      no,
      JumlahBayar,
      MetodeBayar || "Tunai",
      req.user.userId,
      Keterangan,
    );
    const t = db
      .prepare("SELECT TotalTagihan FROM TagihanAir WHERE Id=?")
      .get(TagihanAirId);
    db.prepare("UPDATE TagihanAir SET StatusTagihan=? WHERE Id=?").run(
      JumlahBayar >= t.TotalTagihan ? "Lunas" : "Sebagian",
      TagihanAirId,
    );
    res.status(201).json({ noTransaksi: no });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== PRINTER SETTINGS =====
api.get("/printer-settings", auth, (req, res) => {
  let s = db
    .prepare("SELECT * FROM PrinterSettings WHERE TenantId=?")
    .get(req.user.tenantId);
  if (!s) {
    db.prepare("INSERT INTO PrinterSettings (TenantId) VALUES (?)").run(
      req.user.tenantId,
    );
    s = {
      HeaderText: "SIMWARGA",
      FooterText: "Terima Kasih",
      FontSize: 10,
      ShowLogo: 1,
    };
  }
  res.json(s);
});
api.put("/printer-settings", auth, adminOnly, (req, res) => {
  const { HeaderText, FooterText, FontSize, ShowLogo } = req.body;
  db.prepare(
    "INSERT OR REPLACE INTO PrinterSettings (TenantId,HeaderText,FooterText,FontSize,ShowLogo,UpdatedAt) VALUES (?,?,?,?,?,datetime('now','localtime'))",
  ).run(req.user.tenantId, HeaderText, FooterText, FontSize, ShowLogo);
  res.json({ success: true });
});

// ===== IURAN =====
api.get("/iuran", auth, (req, res) => {
  res.json({
    data: db
      .prepare("SELECT * FROM JenisIuran WHERE TenantId=? ORDER BY Id")
      .all(req.user.tenantId),
  });
});
api.post("/iuran", auth, adminOnly, (req, res) => {
  try {
    const { NamaIuran, Nominal, Periode, IsWajib, Keterangan } = req.body;
    const r = db
      .prepare(
        "INSERT INTO JenisIuran (TenantId,NamaIuran,Nominal,Periode,IsWajib,Keterangan,CreatedBy) VALUES (?,?,?,?,?,?,?)",
      )
      .run(
        req.user.tenantId,
        NamaIuran,
        Nominal,
        Periode || "Bulanan",
        IsWajib ? 1 : 0,
        Keterangan,
        req.user.userId,
      );
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.put("/iuran/:id", auth, adminOnly, (req, res) => {
  try {
    const { NamaIuran, Nominal, Periode, IsWajib, Keterangan } = req.body;
    db.prepare(
      "UPDATE JenisIuran SET NamaIuran=?,Nominal=?,Periode=?,IsWajib=?,Keterangan=? WHERE Id=? AND TenantId=?",
    ).run(
      NamaIuran,
      Nominal,
      Periode || "Bulanan",
      IsWajib ? 1 : 0,
      Keterangan,
      req.params.id,
      req.user.tenantId,
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.delete("/iuran/:id", auth, adminOnly, (req, res) => {
  try {
    db.prepare("DELETE FROM JenisIuran WHERE Id=? AND TenantId=?").run(
      req.params.id,
      req.user.tenantId,
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/tagihan-iuran", auth, (req, res) => {
  const { warga_id, status } = req.query;
  let sql =
    "SELECT ti.*, w.NamaKepalaKK, w.Alamat, w.RT, w.RW, ji.NamaIuran, ji.Nominal as NominalIuran FROM TagihanIuran ti JOIN Warga w ON ti.WargaId=w.Id JOIN JenisIuran ji ON ti.JenisIuranId=ji.Id WHERE ti.TenantId=?";
  const params = [req.user.tenantId];
  if (warga_id) {
    sql += " AND ti.WargaId=?";
    params.push(warga_id);
  }
  if (status) {
    sql += " AND ti.StatusTagihan=?";
    params.push(status);
  }
  sql += " ORDER BY ti.Id DESC LIMIT 100";
  res.json({ data: db.prepare(sql).all(...params) });
});

api.post("/tagihan-iuran/generate", auth, adminOnly, (req, res) => {
  try {
    const { Tahun, Bulan } = req.body;
    if (!Tahun || !Bulan)
      return res.status(400).json({ error: "Tahun dan Bulan wajib diisi" });
    const Periode = `${Bulan} ${Tahun}`;
    // Cek apakah sudah ada tagihan untuk periode ini
    const existing = db
      .prepare(
        "SELECT COUNT(*) as c FROM TagihanIuran WHERE TenantId=? AND Periode=?",
      )
      .get(req.user.tenantId, Periode).c;
    if (existing > 0)
      return res.status(400).json({
        error: `Tagihan periode ${Periode} sudah pernah dibuat (${existing} data)`,
      });
    const warga = db
      .prepare("SELECT Id FROM Warga WHERE TenantId=? AND IsAktif=1")
      .all(req.user.tenantId);
    const iuran = db
      .prepare(
        "SELECT Id, Nominal, Periode as JP FROM JenisIuran WHERE TenantId=? AND IsAktif=1",
      )
      .all(req.user.tenantId);
    if (!warga.length || !iuran.length)
      return res
        .status(400)
        .json({ error: "Data warga atau jenis iuran kosong" });
    let count = 0;
    db.transaction(() => {
      for (const w of warga) {
        for (const j of iuran) {
          // Hanya generate jika jenis iuran sesuai: Bulanan -> semua bulan, Tahunan -> hanya Januari, Insidentil -> skip
          if (j.JP === "Tahunan" && Bulan !== "Januari") continue;
          if (j.JP === "Insidentil") continue;
          db.prepare(
            "INSERT INTO TagihanIuran (TenantId,WargaId,JenisIuranId,Periode,Nominal,StatusTagihan) VALUES (?,?,?,?,?,?)",
          ).run(req.user.tenantId, w.Id, j.Id, Periode, j.Nominal, "Belum");
          count++;
        }
      }
    })();
    res.status(201).json({ generated: count, periode: Periode });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/pembayaran-iuran", auth, (req, res) => {
  res.json({
    data: db
      .prepare(
        "SELECT pi.*, w.NamaKepalaKK, ti.Periode, ji.NamaIuran FROM PembayaranIuran pi JOIN TagihanIuran ti ON pi.TagihanIuranId=ti.Id JOIN Warga w ON ti.WargaId=w.Id JOIN JenisIuran ji ON ti.JenisIuranId=ji.Id WHERE pi.TenantId=? ORDER BY pi.Id DESC LIMIT 50",
      )
      .all(req.user.tenantId),
  });
});

api.post("/pembayaran-iuran", auth, (req, res) => {
  try {
    const { TagihanIuranId, JumlahBayar, MetodeBayar } = req.body;
    const no =
      "TX-IUR-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 6).toUpperCase();
    db.prepare(
      "INSERT INTO PembayaranIuran (TenantId,TagihanIuranId,NomorTransaksi,JumlahBayar,MetodeBayar,KasirId) VALUES (?,?,?,?,?,?)",
    ).run(
      req.user.tenantId,
      TagihanIuranId,
      no,
      JumlahBayar,
      MetodeBayar || "Tunai",
      req.user.userId,
    );
    db.prepare("UPDATE TagihanIuran SET StatusTagihan=? WHERE Id=?").run(
      "Lunas",
      TagihanIuranId,
    );
    res.status(201).json({ noTransaksi: no });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== PENGELUARAN =====
api.get("/pengeluaran", auth, (req, res) => {
  res.json({
    data: db
      .prepare(
        "SELECT p.*, k.NamaKategori FROM Pengeluaran p LEFT JOIN KategoriPengeluaran k ON p.KategoriId=k.Id WHERE p.TenantId=? ORDER BY p.Tanggal DESC LIMIT 50",
      )
      .all(req.user.tenantId),
  });
});
api.post("/pengeluaran", auth, adminOnly, (req, res) => {
  try {
    const { KategoriId, Tanggal, Keterangan, Nominal } = req.body;
    const r = db
      .prepare(
        "INSERT INTO Pengeluaran (TenantId,KategoriId,NomorBukti,Tanggal,Keterangan,Nominal,CreatedBy) VALUES (?,?,?,?,?,?,?)",
      )
      .run(
        req.user.tenantId,
        KategoriId || null,
        "OUT-" + Date.now(),
        Tanggal,
        Keterangan,
        Nominal,
        req.user.userId,
      );
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.put("/pengeluaran/:id", auth, adminOnly, (req, res) => {
  const { KategoriId, Tanggal, Keterangan, Nominal } = req.body;
  db.prepare(
    "UPDATE Pengeluaran SET KategoriId=?,Tanggal=?,Keterangan=?,Nominal=? WHERE Id=? AND TenantId=?",
  ).run(
    KategoriId,
    Tanggal,
    Keterangan,
    Nominal,
    req.params.id,
    req.user.tenantId,
  );
  res.json({ success: true });
});
api.delete("/pengeluaran/:id", auth, adminOnly, (req, res) => {
  db.prepare("DELETE FROM Pengeluaran WHERE Id=? AND TenantId=?").run(
    req.params.id,
    req.user.tenantId,
  );
  res.json({ success: true });
});

// ===== NERACA =====
api.get("/neraca", auth, (req, res) => {
  const tid = req.user.tenantId;
  const all = !req.query.periode; // if no periode, show all time
  const m = req.query.periode || new Date().toISOString().substring(0, 7);
  const pa = all
    ? db
        .prepare(
          "SELECT COALESCE(SUM(JumlahBayar),0) as t FROM PembayaranAir WHERE TenantId=?",
        )
        .get(tid).t
    : db
        .prepare(
          "SELECT COALESCE(SUM(JumlahBayar),0) as t FROM PembayaranAir WHERE TenantId=? AND strftime('%Y-%m',TanggalBayar)=?",
        )
        .get(tid, m).t;
  const pi = all
    ? db
        .prepare(
          "SELECT COALESCE(SUM(JumlahBayar),0) as t FROM PembayaranIuran WHERE TenantId=?",
        )
        .get(tid).t
    : db
        .prepare(
          "SELECT COALESCE(SUM(JumlahBayar),0) as t FROM PembayaranIuran WHERE TenantId=? AND strftime('%Y-%m',TanggalBayar)=?",
        )
        .get(tid, m).t;
  const pe = all
    ? db
        .prepare(
          "SELECT COALESCE(SUM(Nominal),0) as t FROM Pengeluaran WHERE TenantId=?",
        )
        .get(tid).t
    : db
        .prepare(
          "SELECT COALESCE(SUM(Nominal),0) as t FROM Pengeluaran WHERE TenantId=? AND strftime('%Y-%m',Tanggal)=?",
        )
        .get(tid, m).t;
  res.json({
    periode: all ? "Semua" : m,
    pemasukanAir: pa,
    pemasukanIuran: pi,
    totalPemasukan: pa + pi,
    pengeluaran: pe,
    saldo: pa + pi - pe,
  });
});

// ===== E-SURAT =====
function romanMonth(month) {
  return [
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
  ][month - 1];
}

api.get("/jenis-surat", auth, (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT * FROM JenisSurat WHERE TenantId=? AND IsAktif=1 ORDER BY NamaJenis",
      )
      .all(req.user.tenantId);
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/surat", auth, (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const jenisSuratId = String(req.query.jenisSuratId || "").trim();
    const sortByMap = {
      TanggalAjuan: "s.TanggalAjuan",
      NomorSurat: "s.NomorSurat",
      Perihal: "s.Perihal",
      Status: "s.Status",
      NamaWarga: "w.NamaKepalaKK",
    };
    const sortBy = sortByMap[req.query.sortBy] || "s.TanggalAjuan";
    const sortDir =
      String(req.query.sortDir || "desc").toLowerCase() === "asc"
        ? "ASC"
        : "DESC";
    const where = ["s.TenantId=?"];
    const params = [req.user.tenantId];

    if (req.user.role === "Warga") {
      where.push("(w.UserId=? OR s.CreatedBy=?)");
      params.push(req.user.userId, req.user.userId);
    }

    if (search) {
      where.push(
        "(s.NomorSurat LIKE ? OR s.Perihal LIKE ? OR s.Keperluan LIKE ? OR w.NamaKepalaKK LIKE ? OR js.NamaJenis LIKE ?)",
      );
      params.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
      );
    }

    if (status && status !== "Semua") {
      where.push("s.Status=?");
      params.push(status);
    }

    if (jenisSuratId) {
      where.push("s.JenisSuratId=?");
      params.push(jenisSuratId);
    }

    const whereSql = where.join(" AND ");
    const data = db
      .prepare(
        `SELECT s.*, js.NamaJenis, w.NamaKepalaKK AS NamaWarga, w.NIK, w.Alamat, w.RT, w.RW,
                handler.NamaLengkap AS NamaPenangan
         FROM Surat s
         JOIN JenisSurat js ON js.Id=s.JenisSuratId
         JOIN Warga w ON w.Id=s.WargaId
         LEFT JOIN Users handler ON handler.Id=s.DiprosesOleh
         WHERE ${whereSql}
         ORDER BY ${sortBy} ${sortDir}, s.Id ${sortDir}
         LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);
    const total = db
      .prepare(
        `SELECT COUNT(*) AS c
         FROM Surat s
         JOIN JenisSurat js ON js.Id=s.JenisSuratId
         JOIN Warga w ON w.Id=s.WargaId
         WHERE ${whereSql}`,
      )
      .get(...params).c;
    const stats = db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN strftime('%Y-%m', s.TanggalAjuan)=strftime('%Y-%m','now','localtime') THEN 1 ELSE 0 END) AS bulanIni,
          SUM(CASE WHEN s.Status IN ('Pending','Diproses') THEN 1 ELSE 0 END) AS proses,
          SUM(CASE WHEN s.Status='Selesai' THEN 1 ELSE 0 END) AS selesai,
          SUM(CASE WHEN strftime('%Y', s.TanggalAjuan)=strftime('%Y','now','localtime') THEN 1 ELSE 0 END) AS tahunIni
         FROM Surat s
         JOIN JenisSurat js ON js.Id=s.JenisSuratId
         JOIN Warga w ON w.Id=s.WargaId
         WHERE ${whereSql}`,
      )
      .get(...params);

    res.json({
      data,
      stats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.post("/surat", auth, (req, res) => {
  try {
    const { JenisSuratId, WargaId, Perihal, Keperluan } = req.body;
    if (!JenisSuratId || !WargaId || !Perihal) {
      return res
        .status(400)
        .json({ error: "Jenis surat, warga, dan perihal wajib" });
    }

    if (req.user.role === "Warga") {
      const linkedProfile = getLinkedWargaProfile(req.user);
      if (linkedProfile.error) {
        return res.status(400).json({ error: linkedProfile.error });
      }
    }

    const warga = db
      .prepare(
        "SELECT Id, UserId FROM Warga WHERE Id=? AND TenantId=? AND IsAktif=1",
      )
      .get(WargaId, req.user.tenantId);
    if (!warga) return res.status(404).json({ error: "Warga tidak ditemukan" });
    if (req.user.role === "Warga" && warga.UserId !== req.user.userId) {
      return res
        .status(403)
        .json({
          error: "Warga hanya bisa mengajukan surat untuk akun sendiri",
        });
    }

    const jenis = db
      .prepare(
        "SELECT Id FROM JenisSurat WHERE Id=? AND TenantId=? AND IsAktif=1",
      )
      .get(JenisSuratId, req.user.tenantId);
    if (!jenis)
      return res.status(404).json({ error: "Jenis surat tidak ditemukan" });

    const insert = db
      .prepare(
        `INSERT INTO Surat (TenantId,JenisSuratId,WargaId,Perihal,Keperluan,Status,CreatedBy)
         VALUES (?,?,?,?,?,'Pending',?)`,
      )
      .run(
        req.user.tenantId,
        JenisSuratId,
        WargaId,
        Perihal,
        Keperluan || null,
        req.user.userId,
      );

    const now = new Date();
    const nomorSurat = `SRT/${String(insert.lastInsertRowid).padStart(4, "0")}/${romanMonth(now.getMonth() + 1)}/${now.getFullYear()}`;
    db.prepare("UPDATE Surat SET NomorSurat=? WHERE Id=?").run(
      nomorSurat,
      insert.lastInsertRowid,
    );

    createNotification({
      tenantId: req.user.tenantId,
      judul: "Pengajuan E-Surat Baru",
      pesan: `${req.user.name || req.user.username} mengajukan surat "${Perihal}".`,
      tipe: "Surat",
      icon: "bi-file-earmark-text",
      createdBy: req.user.userId,
    });
    createNotification({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      judul: "Pengajuan E-Surat Terkirim",
      pesan: `Permohonan surat "${Perihal}" berhasil diajukan dengan nomor ${nomorSurat}.`,
      tipe: "Surat",
      icon: "bi-envelope-paper",
      createdBy: req.user.userId,
    });
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "CREATE",
      modul: "E-Surat",
      recordId: String(insert.lastInsertRowid),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Mengajukan surat ${nomorSurat}`,
      dataBaru: { JenisSuratId, WargaId, Perihal },
    });

    res.status(201).json({ id: insert.lastInsertRowid, nomorSurat });
  } catch (e) {
    res
      .status(e.message.includes("UNIQUE") ? 400 : 500)
      .json({ error: e.message });
  }
});

api.put("/surat/:id/status", auth, adminOnly, (req, res) => {
  try {
    const { Status, CatatanAdmin, FileUrl } = req.body;
    const allowed = ["Pending", "Diproses", "Selesai", "Ditolak"];
    if (!allowed.includes(Status))
      return res.status(400).json({ error: "Status surat tidak valid" });

    const existing = db
      .prepare(
        `SELECT s.Id, s.Perihal, s.NomorSurat, s.CreatedBy
         FROM Surat s
         WHERE s.Id=? AND s.TenantId=?`,
      )
      .get(req.params.id, req.user.tenantId);
    if (!existing)
      return res.status(404).json({ error: "Surat tidak ditemukan" });

    db.prepare(
      `UPDATE Surat
       SET Status=?,
           CatatanAdmin=?,
           FileUrl=?,
           DiprosesOleh=?,
           TanggalSelesai=CASE WHEN ?='Selesai' THEN datetime('now','localtime') ELSE TanggalSelesai END,
           UpdatedAt=datetime('now','localtime')
       WHERE Id=? AND TenantId=?`,
    ).run(
      Status,
      CatatanAdmin || null,
      FileUrl || null,
      req.user.userId,
      Status,
      req.params.id,
      req.user.tenantId,
    );

    if (existing.CreatedBy) {
      createNotification({
        tenantId: req.user.tenantId,
        userId: existing.CreatedBy,
        judul: `Status E-Surat: ${Status}`,
        pesan: `Surat ${existing.NomorSurat || existing.Perihal} sekarang berstatus ${Status}.`,
        tipe: "Surat",
        icon:
          Status === "Selesai"
            ? "bi-check-circle"
            : Status === "Ditolak"
              ? "bi-x-circle"
              : "bi-hourglass-split",
        createdBy: req.user.userId,
      });
    }
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "UPDATE",
      modul: "E-Surat",
      recordId: String(req.params.id),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Status surat diubah menjadi ${Status}`,
      dataBaru: { Status, CatatanAdmin: CatatanAdmin || null },
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.delete("/surat/:id", auth, adminOnly, (req, res) => {
  try {
    const result = db
      .prepare("DELETE FROM Surat WHERE Id=? AND TenantId=?")
      .run(req.params.id, req.user.tenantId);
    if (!result.changes)
      return res.status(404).json({ error: "Surat tidak ditemukan" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== PENGADUAN, NOTIFIKASI, USERS, AUDIT =====
api.get("/pengaduan", auth, (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const kategori = String(req.query.kategori || "").trim();
    const sortByMap = {
      CreatedAt: "p.CreatedAt",
      Judul: "p.Judul",
      Kategori: "p.Kategori",
      Status: "p.Status",
      NamaPengadu: "p.NamaPengadu",
    };
    const sortBy = sortByMap[req.query.sortBy] || "p.CreatedAt";
    const sortDir =
      String(req.query.sortDir || "desc").toLowerCase() === "asc"
        ? "ASC"
        : "DESC";
    const where = ["p.TenantId=?"];
    const params = [req.user.tenantId];

    if (req.user.role === "Warga") {
      where.push("p.CreatedBy=?");
      params.push(req.user.userId);
    }

    if (search) {
      where.push(
        "(p.Judul LIKE ? OR p.Isi LIKE ? OR p.NamaPengadu LIKE ? OR p.Kategori LIKE ?)",
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status && status !== "Semua") {
      where.push("p.Status=?");
      params.push(status);
    }

    if (kategori) {
      where.push("p.Kategori LIKE ?");
      params.push(`%${kategori}%`);
    }

    const whereSql = where.join(" AND ");
    const data = db
      .prepare(
        `SELECT p.*, u.Username, u.NamaLengkap AS NamaUser, handler.NamaLengkap AS NamaPenangan
         FROM Pengaduan p
         LEFT JOIN Users u ON u.Id=p.CreatedBy
         LEFT JOIN Users handler ON handler.Id=p.DitanganiOleh
         WHERE ${whereSql}
         ORDER BY ${sortBy} ${sortDir}, p.Id ${sortDir}
         LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);
    const total = db
      .prepare(`SELECT COUNT(*) AS c FROM Pengaduan p WHERE ${whereSql}`)
      .get(...params).c;
    const stats = db
      .prepare(
        `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN Status='Masuk' THEN 1 ELSE 0 END) AS masuk,
          SUM(CASE WHEN Status='Diproses' THEN 1 ELSE 0 END) AS diproses,
          SUM(CASE WHEN Status='Selesai' THEN 1 ELSE 0 END) AS selesai,
          SUM(CASE WHEN Status='Ditolak' THEN 1 ELSE 0 END) AS ditolak
         FROM Pengaduan p
         WHERE ${whereSql}`,
      )
      .get(...params);

    res.json({
      data,
      stats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.post("/pengaduan", auth, (req, res) => {
  try {
    const { Judul, Isi, Kategori, NoHpPengadu, WargaId, FotoUrl } = req.body;
    if (!Judul || !Isi) {
      return res.status(400).json({ error: "Judul dan isi pengaduan wajib" });
    }
    const namaPengadu = req.user.name || req.user.username || "Warga";
    let pengaduWargaId = WargaId || null;
    let pengaduNoHp = NoHpPengadu || null;

    if (req.user.role === "Warga") {
      const linkedProfile = getLinkedWargaProfile(req.user);
      if (linkedProfile.error) {
        return res.status(400).json({ error: linkedProfile.error });
      }
      pengaduWargaId = linkedProfile.warga.Id;
      pengaduNoHp = linkedProfile.noHp;
    } else if (WargaId) {
      const warga = db
        .prepare("SELECT Id FROM Warga WHERE Id=? AND TenantId=?")
        .get(WargaId, req.user.tenantId);
      if (!warga) return res.status(404).json({ error: "Warga tidak ditemukan" });
    }

    const insertedId = db
      .prepare(
        `INSERT INTO Pengaduan
         (TenantId,WargaId,NamaPengadu,NoHpPengadu,Judul,Isi,Kategori,FotoUrl,Status,CreatedBy)
         VALUES (?,?,?,?,?,?,?,?, 'Masuk', ?)`,
      )
      .run(
        req.user.tenantId,
        pengaduWargaId,
        namaPengadu,
        pengaduNoHp,
        Judul,
        Isi,
        Kategori || "Lainnya",
        FotoUrl || null,
        req.user.userId,
      ).lastInsertRowid;

    createNotification({
      tenantId: req.user.tenantId,
      judul: "Pengaduan Baru",
      pesan: `${namaPengadu} mengirim pengaduan "${Judul}".`,
      tipe: "Pengaduan",
      icon: "bi-megaphone",
      createdBy: req.user.userId,
    });
    createNotification({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      judul: "Pengaduan Terkirim",
      pesan: `Pengaduan "${Judul}" berhasil dikirim dan menunggu tindak lanjut.`,
      tipe: "Pengaduan",
      icon: "bi-chat-left-text",
      createdBy: req.user.userId,
    });
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "CREATE",
      modul: "Pengaduan",
      recordId: String(insertedId),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Mengirim pengaduan ${Judul}`,
      dataBaru: { Judul, Kategori: Kategori || "Lainnya" },
    });

    res.status(201).json({ id: insertedId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.put("/pengaduan/:id/status", auth, adminOnly, (req, res) => {
  try {
    const { Status, CatatanAdmin } = req.body;
    const allowed = ["Masuk", "Diproses", "Selesai", "Ditolak"];
    if (!allowed.includes(Status)) {
      return res.status(400).json({ error: "Status pengaduan tidak valid" });
    }

    const existing = db
      .prepare(
        `SELECT Id, Judul, CreatedBy
         FROM Pengaduan
         WHERE Id=? AND TenantId=?`,
      )
      .get(req.params.id, req.user.tenantId);
    if (!existing) {
      return res.status(404).json({ error: "Pengaduan tidak ditemukan" });
    }

    db.prepare(
      `UPDATE Pengaduan
       SET Status=?,
           CatatanAdmin=?,
           DitanganiOleh=?,
           TanggalSelesai=CASE WHEN ?='Selesai' THEN datetime('now','localtime') ELSE TanggalSelesai END,
           UpdatedAt=datetime('now','localtime')
       WHERE Id=? AND TenantId=?`,
    ).run(
      Status,
      CatatanAdmin || null,
      req.user.userId,
      Status,
      req.params.id,
      req.user.tenantId,
    );

    if (existing.CreatedBy) {
      createNotification({
        tenantId: req.user.tenantId,
        userId: existing.CreatedBy,
        judul: `Status Pengaduan: ${Status}`,
        pesan: `Pengaduan "${existing.Judul}" sekarang berstatus ${Status}.`,
        tipe: "Pengaduan",
        icon:
          Status === "Selesai"
            ? "bi-check-circle"
            : Status === "Ditolak"
              ? "bi-x-circle"
              : "bi-tools",
        createdBy: req.user.userId,
      });
    }
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "UPDATE",
      modul: "Pengaduan",
      recordId: String(req.params.id),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Status pengaduan diubah menjadi ${Status}`,
      dataBaru: { Status, CatatanAdmin: CatatanAdmin || null },
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/notifikasi", auth, (req, res) => {
  const rows = db
    .prepare(
      "SELECT * FROM Notifikasi WHERE TenantId=? AND (UserId IS NULL OR UserId=?) ORDER BY CreatedAt DESC LIMIT 30",
    )
    .all(req.user.tenantId, req.user.userId);
  res.json({ data: rows, unreadCount: rows.filter((n) => !n.IsRead).length });
});

api.put("/notifikasi/:id/read", auth, (req, res) => {
  try {
    const result = db
      .prepare(
        `UPDATE Notifikasi
         SET IsRead=1, ReadAt=datetime('now','localtime')
         WHERE Id=? AND TenantId=? AND (UserId IS NULL OR UserId=?)`,
      )
      .run(req.params.id, req.user.tenantId, req.user.userId);
    if (!result.changes) {
      return res.status(404).json({ error: "Notifikasi tidak ditemukan" });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/users", auth, adminOnly, (req, res) => {
  res.json({
    data: db
      .prepare(
        "SELECT u.*, r.NamaRole as Role FROM Users u JOIN UserInRoles ur ON u.Id=ur.UserId JOIN Roles r ON ur.RoleId=r.Id WHERE u.TenantId=? ORDER BY u.Id",
      )
      .all(req.user.tenantId),
  });
});

api.post("/users", auth, adminOnly, (req, res) => {
  try {
    const { Username, Email, NamaLengkap, Password, Role } = req.body;
    if (!Username || !Password || !NamaLengkap)
      return res
        .status(400)
        .json({ error: "Username, password, dan nama lengkap wajib" });
    const bcrypt = require("bcryptjs");
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(Password, salt);
    const r = db
      .prepare(
        "INSERT INTO Users (TenantId,Username,Email,NamaLengkap,PasswordHash,PasswordSalt,IsAktif,MustChangePassword) VALUES (?,?,?,?,?,?,1,0)",
      )
      .run(req.user.tenantId, Username, Email || null, NamaLengkap, hash, salt);
    const roleId = db
      .prepare("SELECT Id FROM Roles WHERE NamaRole=?")
      .get(Role || "Warga");
    if (roleId) {
      db.prepare("INSERT INTO UserInRoles (UserId,RoleId) VALUES (?,?)").run(
        r.lastInsertRowid,
        roleId.Id,
      );
    }
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(e.message.includes("UNIQUE") ? 400 : 500).json({
      error: e.message.includes("UNIQUE")
        ? "Username sudah digunakan"
        : e.message,
    });
  }
});

api.put("/users/:id", auth, adminOnly, (req, res) => {
  try {
    const { Email, NamaLengkap, Password, Role, IsAktif } = req.body;
    if (Password) {
      const bcrypt = require("bcryptjs");
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(Password, salt);
      db.prepare(
        "UPDATE Users SET Email=?,NamaLengkap=?,PasswordHash=?,PasswordSalt=?,IsAktif=? WHERE Id=? AND TenantId=?",
      ).run(
        Email,
        NamaLengkap,
        hash,
        salt,
        IsAktif !== undefined ? IsAktif : 1,
        req.params.id,
        req.user.tenantId,
      );
    } else {
      db.prepare(
        "UPDATE Users SET Email=?,NamaLengkap=?,IsAktif=? WHERE Id=? AND TenantId=?",
      ).run(
        Email,
        NamaLengkap,
        IsAktif !== undefined ? IsAktif : 1,
        req.params.id,
        req.user.tenantId,
      );
    }
    if (Role) {
      const roleId = db
        .prepare("SELECT Id FROM Roles WHERE NamaRole=?")
        .get(Role);
      if (roleId) {
        db.prepare("DELETE FROM UserInRoles WHERE UserId=?").run(req.params.id);
        db.prepare("INSERT INTO UserInRoles (UserId,RoleId) VALUES (?,?)").run(
          req.params.id,
          roleId.Id,
        );
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.delete("/users/:id", auth, adminOnly, (req, res) => {
  if (Number(req.params.id) === req.user.userId)
    return res
      .status(400)
      .json({ error: "Tidak dapat menghapus akun sendiri" });
  // Cek apakah SuperAdmin
  const user = db
    .prepare(
      "SELECT u.Username, r.NamaRole as Role FROM Users u JOIN UserInRoles ur ON u.Id=ur.UserId JOIN Roles r ON ur.RoleId=r.Id WHERE u.Id=?",
    )
    .get(req.params.id);
  if (user && user.Role === "SuperAdmin")
    return res
      .status(400)
      .json({ error: "Akun SuperAdmin tidak dapat dihapus" });
  db.prepare("DELETE FROM UserInRoles WHERE UserId=?").run(req.params.id);
  db.prepare("DELETE FROM Users WHERE Id=? AND TenantId=?").run(
    req.params.id,
    req.user.tenantId,
  );
  res.json({ success: true });
});

// ===== ROLES =====
api.get("/roles", auth, adminOnly, (req, res) => {
  const roles = db
    .prepare(
      "SELECT r.*, (SELECT COUNT(*) FROM UserInRoles ur JOIN Users u ON ur.UserId=u.Id WHERE ur.RoleId=r.Id AND u.TenantId=?) as UserCount FROM Roles r ORDER BY r.Id",
    )
    .all(req.user.tenantId);
  res.json({ data: roles });
});
api.post("/roles", auth, adminOnly, (req, res) => {
  try {
    const { NamaRole, Deskripsi } = req.body;
    if (!NamaRole) return res.status(400).json({ error: "Nama role wajib" });
    const r = db
      .prepare("INSERT INTO Roles (NamaRole, Deskripsi) VALUES (?,?)")
      .run(NamaRole, Deskripsi || null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
api.put("/roles/:id", auth, adminOnly, (req, res) => {
  const { NamaRole, Deskripsi } = req.body;
  db.prepare("UPDATE Roles SET NamaRole=?,Deskripsi=? WHERE Id=?").run(
    NamaRole,
    Deskripsi,
    req.params.id,
  );
  res.json({ success: true });
});
api.delete("/roles/:id", auth, adminOnly, (req, res) => {
  const role = db
    .prepare("SELECT NamaRole FROM Roles WHERE Id=?")
    .get(req.params.id);
  if (!role) return res.status(404).json({ error: "Role tidak ditemukan" });
  if (role.NamaRole === "SuperAdmin")
    return res
      .status(400)
      .json({ error: "Role SuperAdmin tidak dapat dihapus" });
  const count = db
    .prepare("SELECT COUNT(*) as c FROM UserInRoles WHERE RoleId=?")
    .get(req.params.id).c;
  if (count > 0)
    return res
      .status(400)
      .json({ error: `Role masih digunakan oleh ${count} pengguna` });
  db.prepare("DELETE FROM Roles WHERE Id=?").run(req.params.id);
  res.json({ success: true });
});

api.get("/audit", auth, adminOnly, (req, res) => {
  res.json({
    data: db
      .prepare(
        "SELECT * FROM AuditLogs WHERE TenantId=? ORDER BY CreatedAt DESC LIMIT 100",
      )
      .all(req.user.tenantId),
  });
});

// ===== TENANTS & SAAS =====
api.get("/tenants", auth, (req, res) => {
  res.json({
    data: db
      .prepare(
        "SELECT t.*, (SELECT COUNT(*) FROM Warga WHERE TenantId=t.Id) as TotalWarga FROM Tenants t ORDER BY t.Id",
      )
      .all(),
  });
});

api.post("/tenants", auth, superOnly, (req, res) => {
  try {
    const { NamaTenant, KodeTenant, Kota, Alamat } = req.body;
    if (!NamaTenant || !KodeTenant)
      return res.status(400).json({ error: "Nama dan Kode Tenant wajib" });
    const r = db
      .prepare(
        "INSERT INTO Tenants (NamaTenant,KodeTenant,Kota,Alamat,IsAktif) VALUES (?,?,?,?,1)",
      )
      .run(NamaTenant, KodeTenant, Kota || null, Alamat || null);
    const newTenantId = r.lastInsertRowid;
    const kode = KodeTenant || "T" + newTenantId;
    // Auto-seed sample RW, RT, Warga untuk tenant baru
    const rw1 = db
      .prepare(
        "INSERT INTO RW (TenantId,NomorRW,KetuaRW,NoHp,Keterangan) VALUES (?,?,?,?,?)",
      )
      .run(newTenantId, "001", `Ketua RW 001 - ${NamaTenant}`, "-", kode);
    const rw2 = db
      .prepare(
        "INSERT INTO RW (TenantId,NomorRW,KetuaRW,NoHp,Keterangan) VALUES (?,?,?,?,?)",
      )
      .run(newTenantId, "002", `Ketua RW 002 - ${NamaTenant}`, "-", kode);
    db.prepare(
      "INSERT INTO RT (TenantId,RW_Id,NomorRT,KetuaRT) VALUES (?,?,?,?)",
    ).run(
      newTenantId,
      rw1.lastInsertRowid,
      "01",
      `Ketua RT 01 - ${NamaTenant}`,
    );
    db.prepare(
      "INSERT INTO RT (TenantId,RW_Id,NomorRT,KetuaRT) VALUES (?,?,?,?)",
    ).run(
      newTenantId,
      rw1.lastInsertRowid,
      "02",
      `Ketua RT 02 - ${NamaTenant}`,
    );
    db.prepare(
      "INSERT INTO RT (TenantId,RW_Id,NomorRT,KetuaRT) VALUES (?,?,?,?)",
    ).run(
      newTenantId,
      rw2.lastInsertRowid,
      "01",
      `Ketua RT 01 - ${NamaTenant}`,
    );
    // Sample warga
    const wargaNames = [
      "Budi Santoso",
      "Siti Aminah",
      "Agus Prayogo",
      "Dewi Lestari",
      "Ahmad Fauzi",
    ];
    wargaNames.forEach((name, idx) => {
      db.prepare(
        "INSERT INTO Warga (TenantId,NIK,NamaKepalaKK,Alamat,NoRumah,RT,RW,StatusHuni) VALUES (?,?,?,?,?,?,?,?)",
      ).run(
        newTenantId,
        `32${String(newTenantId).padStart(2, "0")}01010${String(idx + 1).padStart(4, "0")}`,
        name,
        `Jl. Sample No. ${idx + 1} - ${NamaTenant}`,
        String(idx + 1),
        "01",
        "001",
        "Aktif",
      );
    });
    res.status(201).json({ id: newTenantId });
  } catch (e) {
    res.status(e.message.includes("UNIQUE") ? 400 : 500).json({
      error: e.message.includes("UNIQUE")
        ? "Kode tenant sudah digunakan"
        : e.message,
    });
  }
});

api.put("/tenants/:id", auth, superOnly, (req, res) => {
  const { NamaTenant, KodeTenant, Kota, Alamat, IsAktif } = req.body;
  db.prepare(
    "UPDATE Tenants SET NamaTenant=?,KodeTenant=?,Kota=?,Alamat=?,IsAktif=? WHERE Id=?",
  ).run(
    NamaTenant,
    KodeTenant,
    Kota,
    Alamat,
    IsAktif !== undefined ? IsAktif : 1,
    req.params.id,
  );
  res.json({ success: true });
});

api.delete("/tenants/:id", auth, superOnly, (req, res) => {
  const wargaCount = db
    .prepare("SELECT COUNT(*) as c FROM Warga WHERE TenantId=?")
    .get(req.params.id).c;
  if (wargaCount > 0)
    return res
      .status(400)
      .json({ error: `Tenant masih memiliki ${wargaCount} data warga` });
  db.prepare("DELETE FROM Tenants WHERE Id=?").run(req.params.id);
  res.json({ success: true });
});

api.get("/saas/dashboard", auth, superOnly, (req, res) => {
  const totalTenant = db.prepare("SELECT COUNT(*) as c FROM Tenants").get().c;
  const tenantAktif = db
    .prepare("SELECT COUNT(*) as c FROM Tenants WHERE IsAktif=1")
    .get().c;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().toISOString().slice(0, 4);
  const revenueMonth = db
    .prepare(
      "SELECT COALESCE(SUM(TotalTagihan),0) total FROM TagihanSistem WHERE StatusTagihan='Dibayar' AND substr(COALESCE(DibayarAt, CreatedAt),1,7)=?",
    )
    .get(currentMonth).total;
  const revenueYear = db
    .prepare(
      "SELECT COALESCE(SUM(TotalTagihan),0) total FROM TagihanSistem WHERE StatusTagihan='Dibayar' AND substr(COALESCE(DibayarAt, CreatedAt),1,4)=?",
    )
    .get(currentYear).total;
  const totalTagihan = db
    .prepare("SELECT COALESCE(SUM(TotalTagihan),0) total FROM TagihanSistem")
    .get().total;
  const tenantMenunggak = db
    .prepare(
      `SELECT COUNT(DISTINCT TenantId) c
       FROM TagihanSistem
       WHERE StatusTagihan IN ('Belum','Menunggu','Jatuh Tempo')`,
    )
    .get().c;
  const lisensiAktif = db
    .prepare(
      `SELECT COUNT(*) c FROM Lisensi
       WHERE IsAktif=1 AND (TanggalExpiry IS NULL OR date(TanggalExpiry) >= date('now','localtime'))`,
    )
    .get().c;
  const lisensiKadaluarsa = db
    .prepare(
      `SELECT COUNT(*) c FROM Lisensi
       WHERE TanggalExpiry IS NOT NULL AND date(TanggalExpiry) < date('now','localtime')`,
    )
    .get().c;

  res.json({
    totalTenant,
    tenantAktif,
    tenantMenunggak,
    pendapatanBulanIni: Number(revenueMonth || 0),
    pendapatanTahunIni: Number(revenueYear || 0),
    totalTagihan: Number(totalTagihan || 0),
    lisensiAktif,
    lisensiKadaluarsa,
  });
});

api.get("/saas/fee-settings", auth, superOnly, (req, res) => {
  const keyword = String(req.query.search || "").trim().toLowerCase();
  const filterJenis = String(req.query.jenis || "").trim();
  const rows = db
    .prepare("SELECT Id, NamaTenant, KodeTenant, IsAktif FROM Tenants ORDER BY NamaTenant")
    .all()
    .map((tenant) => {
      const fee = getTenantFeeSettings(tenant.Id);
      return {
        tenantId: tenant.Id,
        tenant: tenant.NamaTenant,
        kodeTenant: tenant.KodeTenant,
        tenantAktif: tenant.IsAktif === 1,
        jenis: fee.jenis,
        persentase: fee.persentase,
        minFee: fee.minFee,
        maxFee: fee.maxFee,
        nominalFlat: fee.nominalFlat,
        isAktif: fee.isAktif === 1,
      };
    })
    .filter((item) => {
      if (filterJenis && item.jenis !== filterJenis) return false;
      if (!keyword) return true;
      return [item.tenant, item.kodeTenant, item.jenis]
        .some((value) => String(value || "").toLowerCase().includes(keyword));
    });
  res.json({ data: rows });
});

api.put("/saas/fee-settings/:tenantId", auth, superOnly, (req, res) => {
  try {
    const tenantId = Number(req.params.tenantId);
    const tenant = db
      .prepare("SELECT Id, NamaTenant FROM Tenants WHERE Id=?")
      .get(tenantId);
    if (!tenant) return res.status(404).json({ error: "Tenant tidak ditemukan" });
    const fee = saveTenantFeeSettings(tenantId, req.body || {}, req.user.userId);
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "UPDATE",
      modul: "Pengaturan Fee",
      recordId: String(tenantId),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Memperbarui fee tenant ${tenant.NamaTenant}`,
      dataBaru: fee,
    });
    res.json({ success: true, data: fee });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/saas/system-billings", auth, superOnly, (req, res) => {
  const items = db
    .prepare(
      `SELECT ts.*, t.NamaTenant, t.KodeTenant
       FROM TagihanSistem ts
       JOIN Tenants t ON t.Id=ts.TenantId
       ORDER BY ts.Periode DESC, ts.Id DESC`,
    )
    .all();
  const stats = {
    totalTagihan: items.reduce((sum, item) => sum + Number(item.TotalTagihan || 0), 0),
    sudahDibayar: items
      .filter((item) => item.StatusTagihan === "Dibayar")
      .reduce((sum, item) => sum + Number(item.TotalTagihan || 0), 0),
    menungguBayar: items
      .filter((item) => item.StatusTagihan !== "Dibayar")
      .reduce((sum, item) => sum + Number(item.TotalTagihan || 0), 0),
    tenantDitagih: new Set(items.map((item) => item.TenantId)).size,
  };
  res.json({
    stats,
    data: items.map((item) => ({
      id: item.Id,
      periode: item.Periode,
      tenantId: item.TenantId,
      tenant: item.NamaTenant,
      kodeTenant: item.KodeTenant,
      jumlahWarga: item.JumlahWarga || 0,
      jumlahTransaksi: item.JumlahTransaksi || 0,
      dasarTagihan: Number(item.DasarTagihan || 0),
      totalTagihan: Number(item.TotalTagihan || 0),
      jenisFee: item.JenisFee || "Persentase",
      persentaseFee: Number(item.PersentaseFee || 0),
      minFee: Number(item.MinFee || 0),
      maxFee: Number(item.MaxFee || 0),
      nominalFlat: Number(item.NominalFlat || 0),
      jatuhTempo: item.JatuhTempo,
      dibayarAt: item.DibayarAt,
      createdAt: item.CreatedAt,
      status: item.StatusTagihan,
    })),
  });
});

api.post("/saas/generate-billings", auth, superOnly, (req, res) => {
  try {
    const period = String(req.body?.period || new Date().toISOString().slice(0, 7));
    const dueDate = req.body?.dueDate || `${period}-25`;
    const tenants = db
      .prepare("SELECT Id, NamaTenant FROM Tenants WHERE IsAktif=1 ORDER BY NamaTenant")
      .all();
    const inserted = [];
    for (const tenant of tenants) {
      const exists = db
        .prepare("SELECT Id FROM TagihanSistem WHERE TenantId=? AND Periode=?")
        .get(tenant.Id, period);
      if (exists) continue;
      const jumlahWarga = db
        .prepare("SELECT COUNT(*) c FROM Warga WHERE TenantId=? AND IsAktif=1")
        .get(tenant.Id).c;
      const jumlahTransaksi = countTenantTransactions(tenant.Id, period);
      const dasarTagihan = calculateTenantBaseBilling(tenant.Id, period);
      const fee = getTenantFeeSettings(tenant.Id);
      const totalTagihan = calculateSystemFeeFromSettings(fee, dasarTagihan);
      const result = db
        .prepare(
          `INSERT INTO TagihanSistem
           (TenantId, Periode, JumlahWarga, JumlahTransaksi, TotalTagihan, StatusTagihan, JatuhTempo, JenisFee, PersentaseFee, MinFee, MaxFee, NominalFlat, DasarTagihan)
           VALUES (?, ?, ?, ?, ?, 'Belum', ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          tenant.Id,
          period,
          jumlahWarga,
          jumlahTransaksi,
          totalTagihan,
          dueDate,
          fee.jenis,
          fee.persentase,
          fee.minFee,
          fee.maxFee,
          fee.nominalFlat,
          dasarTagihan,
        );
      inserted.push({ id: result.lastInsertRowid, tenant: tenant.NamaTenant });
    }
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "GENERATE",
      modul: "Tagihan Sistem",
      recordId: period,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Generate tagihan sistem periode ${period} untuk ${inserted.length} tenant`,
      dataBaru: { period, dueDate, totalTenant: inserted.length },
    });
    res.json({ success: true, generated: inserted.length, period, items: inserted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/saas/licenses", auth, superOnly, (req, res) => {
  const tenants = db
    .prepare("SELECT Id, NamaTenant, KodeTenant FROM Tenants ORDER BY NamaTenant")
    .all();
  const data = tenants.map((tenant) => {
    const license = db
      .prepare(
        `SELECT * FROM Lisensi
         WHERE TenantId=?
         ORDER BY date(COALESCE(TanggalExpiry, TanggalMulai)) DESC, Id DESC
         LIMIT 1`,
      )
      .get(tenant.Id);
    const pendingBill = db
      .prepare(
        `SELECT * FROM TagihanSistem
         WHERE TenantId=? AND StatusTagihan IN ('Belum','Menunggu','Jatuh Tempo')
         ORDER BY Periode DESC, Id DESC
         LIMIT 1`,
      )
      .get(tenant.Id);
    const isExpired =
      license?.TanggalExpiry &&
      new Date(license.TanggalExpiry).getTime() < new Date().setHours(0, 0, 0, 0);
    return {
      tenantId: tenant.Id,
      tenant: tenant.NamaTenant,
      kodeTenant: tenant.KodeTenant,
      lisensiId: license?.Id || null,
      kodeLisensi: license?.KodeLisensi || null,
      tipeLisensi: license?.TipeLisensi || "Basic",
      tanggalMulai: license?.TanggalMulai || null,
      tanggalExpiry: license?.TanggalExpiry || null,
      maksWarga: license?.MaksWarga || null,
      isAktif: license?.IsAktif === 1 && !isExpired,
      status: pendingBill
        ? "Menunggu Pembayaran"
        : license
          ? isExpired
            ? "Kadaluarsa"
            : license.IsAktif === 1
              ? "Aktif"
              : "Nonaktif"
          : "Belum Aktif",
      pendingBill: pendingBill
        ? {
            id: pendingBill.Id,
            periode: pendingBill.Periode,
            totalTagihan: Number(pendingBill.TotalTagihan || 0),
            status: pendingBill.StatusTagihan,
          }
        : null,
    };
  });
  res.json({ data });
});

api.post("/saas/licenses/activate", auth, superOnly, (req, res) => {
  try {
    const tenantId = Number(req.body?.tenantId);
    const durationMonths = Math.max(Number(req.body?.durationMonths) || 12, 1);
    const tipeLisensi = String(req.body?.tipeLisensi || "Basic").trim();
    const maksWarga = req.body?.maksWarga ? Number(req.body.maksWarga) : null;
    let kodeLisensi = String(req.body?.kodeLisensi || "").trim().toUpperCase();
    const tenant = db
      .prepare("SELECT Id, NamaTenant FROM Tenants WHERE Id=?")
      .get(tenantId);
    if (!tenant) return res.status(404).json({ error: "Tenant tidak ditemukan" });

    const pendingBill = db
      .prepare(
        `SELECT * FROM TagihanSistem
         WHERE TenantId=? AND StatusTagihan IN ('Belum','Menunggu','Jatuh Tempo')
         ORDER BY Periode DESC, Id DESC
         LIMIT 1`,
      )
      .get(tenantId);
    if (pendingBill) {
      db.prepare(
        "UPDATE TagihanSistem SET StatusTagihan='Dibayar', DibayarAt=datetime('now','localtime') WHERE Id=?",
      ).run(pendingBill.Id);
    }

    if (!kodeLisensi) {
      kodeLisensi = `SW-${tenantId}-${Date.now().toString().slice(-8)}`;
    }
    const now = new Date();
    const startDate = now.toISOString().slice(0, 10);
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + durationMonths);
    const expiryDate = expiry.toISOString().slice(0, 10);

    db.prepare("UPDATE Lisensi SET IsAktif=0 WHERE TenantId=?").run(tenantId);
    const result = db
      .prepare(
        `INSERT INTO Lisensi
         (TenantId, KodeLisensi, TipeLisensi, TanggalMulai, TanggalExpiry, IsAktif, MaksWarga, AktifkasiOleh, AktifkasiAt)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, datetime('now','localtime'))`,
      )
      .run(
        tenantId,
        kodeLisensi,
        tipeLisensi,
        startDate,
        expiryDate,
        maksWarga,
        req.user.userId,
      );
    db.prepare(
      `INSERT INTO RiwayatLisensi
       (TenantId, LisensiId, Aksi, KeteranganAksi, OlehUserId)
       VALUES (?, ?, 'AKTIVASI', ?, ?)`,
    ).run(
      tenantId,
      result.lastInsertRowid,
      `Lisensi ${tipeLisensi} aktif s/d ${formatTanggalIndonesia(expiryDate)}`,
      req.user.userId,
    );

    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "UPDATE",
      modul: "Aktivasi Lisensi",
      recordId: String(result.lastInsertRowid),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Aktivasi lisensi untuk tenant ${tenant.NamaTenant}`,
      dataBaru: { tenantId, kodeLisensi, tipeLisensi, expiryDate, maksWarga },
    });
    res.json({
      success: true,
      data: {
        tenant: tenant.NamaTenant,
        kodeLisensi,
        tipeLisensi,
        tanggalMulai: startDate,
        tanggalExpiry: expiryDate,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/saas/license-history", auth, superOnly, (req, res) => {
  const rows = db
    .prepare(
      `SELECT rl.Id, rl.Aksi, rl.KeteranganAksi, rl.CreatedAt, t.NamaTenant,
              l.KodeLisensi, l.TipeLisensi, l.TanggalMulai, l.TanggalExpiry,
              u.Username AS OlehUsername
       FROM RiwayatLisensi rl
       JOIN Tenants t ON t.Id=rl.TenantId
       LEFT JOIN Lisensi l ON l.Id=rl.LisensiId
       LEFT JOIN Users u ON u.Id=rl.OlehUserId
       ORDER BY rl.CreatedAt DESC, rl.Id DESC`,
    )
    .all();
  res.json({ data: rows });
});

api.get("/communication/whatsapp-gateway", auth, superOnly, (req, res) => {
  const config =
    db
      .prepare(
        `SELECT NomorPengirim, ApiKey, Provider, AutoReply, IsAktif, UpdatedAt
         FROM WhatsAppGatewaySettings
         ORDER BY Id DESC LIMIT 1`,
      )
      .get() || {};
  const today = new Date().toISOString().slice(0, 10);
  const sent = db.prepare("SELECT COUNT(*) c FROM WhatsAppMessageLogs").get().c;
  const failed = db
    .prepare("SELECT COUNT(*) c FROM WhatsAppMessageLogs WHERE StatusKirim='Gagal'")
    .get().c;
  const sentToday = db
    .prepare("SELECT COUNT(*) c FROM WhatsAppMessageLogs WHERE substr(CreatedAt,1,10)=?")
    .get(today).c;
  const stats = {
    pesanTerkirim: sent,
    gagal: failed,
    pesanHariIni: sentToday,
    successRate: sent > 0 ? Number((((sent - failed) / sent) * 100).toFixed(1)) : 0,
  };
  const history = db
    .prepare(
      `SELECT Id, NamaTujuan, NomorTujuan, Pesan, Sumber, StatusKirim, CreatedAt
       FROM WhatsAppMessageLogs
       ORDER BY CreatedAt DESC, Id DESC
       LIMIT 20`,
    )
    .all();
  res.json({
    config: {
      nomor: config.NomorPengirim || "",
      apiKey: config.ApiKey || "",
      provider: config.Provider || "WABLAS",
      autoReply: config.AutoReply || "",
      isAktif: config.IsAktif !== 0,
      updatedAt: config.UpdatedAt || null,
    },
    stats,
    history,
  });
});

api.put("/communication/whatsapp-gateway", auth, superOnly, (req, res) => {
  try {
    const { nomor, apiKey, provider, autoReply, isAktif } = req.body || {};
    const existing = db
      .prepare("SELECT Id FROM WhatsAppGatewaySettings ORDER BY Id DESC LIMIT 1")
      .get();
    if (existing) {
      db.prepare(
        `UPDATE WhatsAppGatewaySettings
         SET NomorPengirim=?, ApiKey=?, Provider=?, AutoReply=?, IsAktif=?, UpdatedAt=datetime('now','localtime'), UpdatedBy=?
         WHERE Id=?`,
      ).run(
        nomor || null,
        apiKey || null,
        provider || "WABLAS",
        autoReply || null,
        isAktif === false || isAktif === 0 ? 0 : 1,
        req.user.userId,
        existing.Id,
      );
    } else {
      db.prepare(
        `INSERT INTO WhatsAppGatewaySettings
         (NomorPengirim, ApiKey, Provider, AutoReply, IsAktif, UpdatedAt, UpdatedBy)
         VALUES (?, ?, ?, ?, ?, datetime('now','localtime'), ?)`,
      ).run(
        nomor || null,
        apiKey || null,
        provider || "WABLAS",
        autoReply || null,
        isAktif === false || isAktif === 0 ? 0 : 1,
        req.user.userId,
      );
    }
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "UPDATE",
      modul: "WhatsApp Gateway",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: "Memperbarui konfigurasi WhatsApp Gateway",
      dataBaru: { nomor, provider, isAktif },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.post("/communication/whatsapp-gateway/test", auth, superOnly, (req, res) => {
  const config = db
    .prepare("SELECT * FROM WhatsAppGatewaySettings ORDER BY Id DESC LIMIT 1")
    .get();
  if (!config?.NomorPengirim || !config?.ApiKey) {
    return res.status(400).json({ error: "Nomor pengirim dan API key harus diisi" });
  }
  res.json({ success: true, message: "Konfigurasi gateway siap digunakan" });
});

api.post("/communication/whatsapp-gateway/send", auth, superOnly, (req, res) => {
  try {
    const { nomorTujuan, pesan, namaTujuan } = req.body || {};
    if (!String(nomorTujuan || "").trim() || !String(pesan || "").trim()) {
      return res.status(400).json({ error: "Nomor tujuan dan pesan wajib diisi" });
    }
    const result = db
      .prepare(
        `INSERT INTO WhatsAppMessageLogs
         (NamaTujuan, NomorTujuan, Pesan, Sumber, StatusKirim, GatewayProvider, CreatedBy)
         VALUES (?, ?, ?, 'Manual', 'Terkirim', ?, ?)`,
      )
      .run(
        namaTujuan || null,
        nomorTujuan.trim(),
        pesan.trim(),
        db.prepare("SELECT Provider FROM WhatsAppGatewaySettings ORDER BY Id DESC LIMIT 1").get()?.Provider || "WABLAS",
        req.user.userId,
      );
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "CREATE",
      modul: "WhatsApp Gateway",
      recordId: String(result.lastInsertRowid),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Kirim pesan manual ke ${nomorTujuan}`,
      dataBaru: { nomorTujuan, namaTujuan: namaTujuan || null },
    });
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/communication/broadcast-center", auth, superOnly, (req, res) => {
  const stats = {
    penerima: db
      .prepare("SELECT COUNT(*) c FROM Warga WHERE IsAktif=1 AND COALESCE(NoHp,'')<>''")
      .get().c,
    terkirim: db
      .prepare("SELECT COALESCE(SUM(TotalTerkirim),0) total FROM BroadcastJobs")
      .get().total,
    sedangDikirim: db
      .prepare("SELECT COUNT(*) c FROM BroadcastJobs WHERE Status='Proses'")
      .get().c,
    broadcastBulanIni: db
      .prepare("SELECT COUNT(*) c FROM BroadcastJobs WHERE substr(CreatedAt,1,7)=?")
      .get(new Date().toISOString().slice(0, 7)).c,
  };
  const history = db
    .prepare(
      `SELECT Id, Judul, TargetType, TargetValue, TotalPenerima, TotalTerkirim, TotalGagal, Status, CreatedAt
       FROM BroadcastJobs
       ORDER BY CreatedAt DESC, Id DESC
       LIMIT 20`,
    )
    .all();
  const targets = [
    {
      value: "semua",
      label: `Semua Warga (${stats.penerima})`,
      count: stats.penerima,
    },
    ...db
      .prepare(
        `SELECT t.Id, t.NamaTenant,
                COUNT(w.Id) AS Total
         FROM Tenants t
         LEFT JOIN Warga w ON w.TenantId=t.Id AND w.IsAktif=1 AND COALESCE(w.NoHp,'')<>''
         GROUP BY t.Id, t.NamaTenant
         ORDER BY t.NamaTenant`,
      )
      .all()
      .map((item) => ({
        value: `tenant:${item.Id}`,
        label: `${item.NamaTenant} (${item.Total})`,
        count: item.Total,
      })),
  ];
  res.json({ stats, history, targets });
});

api.post("/communication/broadcast-center/send", auth, superOnly, (req, res) => {
  try {
    const { judul, pesan, target, scheduleAt } = req.body || {};
    if (!String(judul || "").trim() || !String(pesan || "").trim()) {
      return res.status(400).json({ error: "Judul dan pesan broadcast wajib diisi" });
    }
    const targetValue = String(target || "semua");
    let recipients = [];
    if (targetValue === "semua") {
      recipients = db
        .prepare(
          `SELECT w.Id AS WargaId, w.TenantId, w.NamaKepalaKK, w.NoHp
           FROM Warga w
           WHERE w.IsAktif=1 AND COALESCE(w.NoHp,'')<>''`,
        )
        .all();
    } else if (targetValue.startsWith("tenant:")) {
      const tenantId = Number(targetValue.split(":")[1]);
      recipients = db
        .prepare(
          `SELECT w.Id AS WargaId, w.TenantId, w.NamaKepalaKK, w.NoHp
           FROM Warga w
           WHERE w.TenantId=? AND w.IsAktif=1 AND COALESCE(w.NoHp,'')<>''`,
        )
        .all(tenantId);
    }
    const job = db
      .prepare(
        `INSERT INTO BroadcastJobs
         (Judul, Pesan, TargetType, TargetValue, ScheduleAt, Status, TotalPenerima, TotalTerkirim, TotalGagal, CreatedBy)
         VALUES (?, ?, ?, ?, ?, 'Selesai', ?, ?, 0, ?)`,
      )
      .run(
        judul.trim(),
        pesan.trim(),
        targetValue === "semua" ? "semua" : "tenant",
        targetValue,
        scheduleAt || null,
        recipients.length,
        recipients.length,
        req.user.userId,
      );
    for (const recipient of recipients) {
      db.prepare(
        `INSERT INTO BroadcastRecipients
         (BroadcastJobId, TenantId, WargaId, NamaTujuan, NomorTujuan, StatusKirim)
         VALUES (?, ?, ?, ?, ?, 'Terkirim')`,
      ).run(
        job.lastInsertRowid,
        recipient.TenantId,
        recipient.WargaId,
        recipient.NamaKepalaKK,
        recipient.NoHp,
      );
      db.prepare(
        `INSERT INTO WhatsAppMessageLogs
         (TenantId, WargaId, NamaTujuan, NomorTujuan, Pesan, Sumber, StatusKirim, GatewayProvider, CreatedBy)
         VALUES (?, ?, ?, ?, ?, 'Broadcast', 'Terkirim', ?, ?)`,
      ).run(
        recipient.TenantId,
        recipient.WargaId,
        recipient.NamaKepalaKK,
        recipient.NoHp,
        pesan.trim().replace(/\{nama\}/gi, recipient.NamaKepalaKK || "Warga"),
        db.prepare("SELECT Provider FROM WhatsAppGatewaySettings ORDER BY Id DESC LIMIT 1").get()?.Provider || "WABLAS",
        req.user.userId,
      );
    }
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "CREATE",
      modul: "Broadcast Center",
      recordId: String(job.lastInsertRowid),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Broadcast "${judul}" ke ${recipients.length} penerima`,
      dataBaru: { judul, target: targetValue, totalPenerima: recipients.length },
    });
    res.status(201).json({ success: true, id: job.lastInsertRowid, totalPenerima: recipients.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== PUBLIC =====
api.get("/public/stats", (req, res) => {
  res.json({
    totalWarga: db.prepare("SELECT COUNT(*) as c FROM Warga").get().c,
    totalComplaints: db.prepare("SELECT COUNT(*) as c FROM Pengaduan").get().c,
    activeComplaints: db
      .prepare(
        "SELECT COUNT(*) as c FROM Pengaduan WHERE Status NOT IN ('Selesai','Ditolak')",
      )
      .get().c,
    totalTenants: db.prepare("SELECT COUNT(*) as c FROM Tenants").get().c,
  });
});
api.get("/public/announcements", (req, res) => {
  const rows = db
    .prepare(
      `SELECT Id, Judul, Konten, Kategori, Status, CreatedAt, TanggalTampil
       FROM Pengumuman
       WHERE Status='Published'
       ORDER BY COALESCE(TanggalTampil, CreatedAt) DESC, Id DESC
       LIMIT 5`,
    )
    .all();

  res.json(rows);
});

// ===== PENGUMUMAN =====
api.get("/pengumuman", auth, (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const kategori = String(req.query.kategori || "").trim();
    const sortByMap = {
      Judul: "Judul",
      Kategori: "Kategori",
      Status: "Status",
      CreatedAt: "CreatedAt",
      TanggalTampil: "TanggalTampil",
    };
    const sortBy = sortByMap[req.query.sortBy] || "CreatedAt";
    const sortDir =
      String(req.query.sortDir || "desc").toLowerCase() === "asc"
        ? "ASC"
        : "DESC";
    const where = ["TenantId=?"];
    const params = [req.user.tenantId];

    if (req.user.role === "Warga") {
      where.push("Status='Published'");
      where.push("(TanggalTampil IS NULL OR date(TanggalTampil) <= date('now','localtime'))");
    }

    if (search) {
      where.push("(Judul LIKE ? OR Konten LIKE ? OR Kategori LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (req.user.role !== "Warga" && status && status !== "Semua") {
      where.push("Status=?");
      params.push(status);
    }

    if (kategori) {
      where.push("Kategori LIKE ?");
      params.push(`%${kategori}%`);
    }

    const whereSql = where.join(" AND ");

    const rows = db
      .prepare(
        `SELECT * FROM Pengumuman
         WHERE ${whereSql}
         ORDER BY ${sortBy} ${sortDir}, Id ${sortDir}
         LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    const total = db
      .prepare(`SELECT COUNT(*) as c FROM Pengumuman WHERE ${whereSql}`)
      .get(...params).c;

    res.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.post("/pengumuman", auth, adminOnly, (req, res) => {
  try {
    const { Judul, Konten, Kategori, Status, TanggalTampil } = req.body;
    if (!Judul || !Konten)
      return res.status(400).json({ error: "Judul dan Konten wajib" });

    const id = db
      .prepare(
        "INSERT INTO Pengumuman (TenantId, Judul, Konten, Kategori, Status, CreatedBy, TanggalTampil) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        req.user.tenantId,
        Judul,
        Konten,
        Kategori || null,
        Status || "Draft",
        req.user.userId,
        TanggalTampil || null,
      ).lastInsertRowid;

    if ((Status || "Draft") === "Published") {
      createNotification({
        tenantId: req.user.tenantId,
        judul: "Pengumuman Baru",
        pesan: `Pengumuman "${Judul}" telah dipublikasikan.`,
        tipe: "Pengumuman",
        icon: "bi-newspaper",
        createdBy: req.user.userId,
      });
    }
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "CREATE",
      modul: "Pengumuman",
      recordId: String(id),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Membuat pengumuman ${Judul}`,
      dataBaru: { Judul, Status: Status || "Draft", Kategori: Kategori || null },
    });

    res.status(201).json({ id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.put("/pengumuman/:id", auth, adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const { Judul, Konten, Kategori, Status, TanggalTampil } = req.body;

    const pengumuman = db
      .prepare("SELECT * FROM Pengumuman WHERE Id=? AND TenantId=?")
      .get(id, req.user.tenantId);

    if (!pengumuman)
      return res.status(404).json({ error: "Pengumuman tidak ditemukan" });

    db.prepare(
      "UPDATE Pengumuman SET Judul=?, Konten=?, Kategori=?, Status=?, TanggalTampil=?, UpdatedAt=datetime('now','localtime') WHERE Id=?",
    ).run(Judul, Konten, Kategori, Status, TanggalTampil, id);

    if (Status === "Published") {
      createNotification({
        tenantId: req.user.tenantId,
        judul: "Pengumuman Diperbarui",
        pesan: `Pengumuman "${Judul}" diperbarui dan tersedia untuk warga.`,
        tipe: "Pengumuman",
        icon: "bi-megaphone",
        createdBy: req.user.userId,
      });
    }
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "UPDATE",
      modul: "Pengumuman",
      recordId: String(id),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Memperbarui pengumuman ${Judul}`,
      dataBaru: { Judul, Status, Kategori },
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.delete("/pengumuman/:id", auth, adminOnly, (req, res) => {
  try {
    const { id } = req.params;

    const pengumuman = db
      .prepare("SELECT * FROM Pengumuman WHERE Id=? AND TenantId=?")
      .get(id, req.user.tenantId);

    if (!pengumuman)
      return res.status(404).json({ error: "Pengumuman tidak ditemukan" });

    db.prepare("DELETE FROM Pengumuman WHERE Id=?").run(id);
    writeAuditLog({
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      username: req.user.username,
      aksi: "DELETE",
      modul: "Pengumuman",
      recordId: String(id),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
      keterangan: `Menghapus pengumuman ${pengumuman.Judul}`,
      dataLama: { Judul: pengumuman.Judul, Status: pengumuman.Status },
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/public/pengumuman", (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 50);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const where = ["Status='Published'"];
    const params = [];

    if (search) {
      where.push("(Judul LIKE ? OR Konten LIKE ? OR Kategori LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = where.join(" AND ");

    const rows = db
      .prepare(
        `SELECT Id, TenantId, Judul, Konten, Kategori, Status, CreatedAt, TanggalTampil
         FROM Pengumuman
         WHERE ${whereSql}
         ORDER BY COALESCE(TanggalTampil, CreatedAt) DESC, Id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    const total = db
      .prepare(`SELECT COUNT(*) as c FROM Pengumuman WHERE ${whereSql}`)
      .get(...params).c;

    res.json({
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== KONTAK DARURAT =====
api.get("/kontak-darurat", auth, (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT * FROM KontakDarurat WHERE TenantId=? ORDER BY CreatedAt DESC",
      )
      .all(req.user.tenantId);

    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.post("/kontak-darurat", auth, adminOnly, (req, res) => {
  try {
    const { NamaKontak, Nomor, Deskripsi } = req.body;
    if (!NamaKontak || !Nomor)
      return res.status(400).json({ error: "NamaKontak dan Nomor wajib" });

    const id = db
      .prepare(
        "INSERT INTO KontakDarurat (TenantId, NamaKontak, Nomor, Deskripsi) VALUES (?, ?, ?, ?)",
      )
      .run(
        req.user.tenantId,
        NamaKontak,
        Nomor,
        Deskripsi || null,
      ).lastInsertRowid;

    res.status(201).json({ id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.put("/kontak-darurat/:id", auth, adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const { NamaKontak, Nomor, Deskripsi } = req.body;

    const kontak = db
      .prepare("SELECT * FROM KontakDarurat WHERE Id=? AND TenantId=?")
      .get(id, req.user.tenantId);

    if (!kontak)
      return res.status(404).json({ error: "Kontak tidak ditemukan" });

    db.prepare(
      "UPDATE KontakDarurat SET NamaKontak=?, Nomor=?, Deskripsi=?, UpdatedAt=datetime('now','localtime') WHERE Id=?",
    ).run(NamaKontak, Nomor, Deskripsi, id);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.delete("/kontak-darurat/:id", auth, adminOnly, (req, res) => {
  try {
    const { id } = req.params;

    const kontak = db
      .prepare("SELECT * FROM KontakDarurat WHERE Id=? AND TenantId=?")
      .get(id, req.user.tenantId);

    if (!kontak)
      return res.status(404).json({ error: "Kontak tidak ditemukan" });

    db.prepare("DELETE FROM KontakDarurat WHERE Id=?").run(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

api.get("/public/kontak-darurat", (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT Id, NamaKontak, Nomor, Deskripsi FROM KontakDarurat ORDER BY CreatedAt DESC",
      )
      .all();

    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== MOUNT API + SPA FALLBACK =====
app.use("/api", api);

const distDir = path.join(__dirname, "../../frontend/dist");
const idxPath = path.join(distDir, "index.html");

// Serve static assets with correct MIME types
app.use(express.static(distDir));

app.use((req, res) => {
  if (req.path.startsWith("/api"))
    return res.status(404).json({ error: "API route not found" });
  
  // SPA fallback for Vue Router
  if (fs.existsSync(idxPath)) return res.sendFile(idxPath);
  res.status(404).send("Not Found");
});

app.listen(PORT, () => {
  console.log(
    `\n  SimWarga v3.0 | Backend: http://localhost:${PORT} | Frontend: http://localhost:5173`,
  );
  console.log(
    `  Login: POST /api/auth/login | Gunakan username dan password yang sudah tersedia.`,
  );
  console.log(`  Domain: simwarga.itu.biz.id\n`);
});
