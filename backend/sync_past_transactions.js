const db = require('./src/db');

console.log("=== SINKRONISASI TRANSAKSI LAMA KE JURNAL ===");

let count = 0;

// 1. Sync PembayaranAir
try {
  const pembayaranAir = db.prepare("SELECT * FROM PembayaranAir").all();
  console.log(`Menemukan ${pembayaranAir.length} data Pembayaran Air.`);
  for (const pa of pembayaranAir) {
    const exists = db.prepare(
      "SELECT Id FROM PAM_Transaksi WHERE SourceTable='PembayaranAir' AND SourceId=?"
    ).get(pa.Id);

    if (!exists) {
      db.prepare(
        "INSERT INTO PAM_Transaksi (TenantId, Pemasukan, Pengeluaran, Hutang, TanggalTransaksi, Deskripsi, TanggalJurnal, JenisTransaksi, JenisKeterangan, SourceTable, SourceId, CreatedBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
      ).run(
        pa.TenantId,
        pa.JumlahBayar,
        0,
        0,
        pa.TanggalBayar ? pa.TanggalBayar.slice(0, 10) : new Date().toISOString().slice(0, 10),
        `Pembayaran air otomatis - No: ${pa.NomorTransaksi}${pa.Keterangan ? ' - ' + pa.Keterangan : ''}`,
        pa.TanggalBayar ? pa.TanggalBayar.slice(0, 10) : new Date().toISOString().slice(0, 10),
        "Pemasukan",
        "Pembayaran Air",
        "PembayaranAir",
        pa.Id,
        pa.KasirId || 1
      );
      count++;
    }
  }
} catch (e) {
  console.error("Error sync PembayaranAir:", e);
}

// 2. Sync PembayaranIuran
try {
  const pembayaranIuran = db.prepare(`
    SELECT pi.*, ji.NamaIuran 
    FROM PembayaranIuran pi
    LEFT JOIN TagihanIuran ti ON pi.TagihanIuranId = ti.Id
    LEFT JOIN JenisIuran ji ON ti.JenisIuranId = ji.Id
  `).all();
  console.log(`Menemukan ${pembayaranIuran.length} data Pembayaran Iuran.`);
  for (const pi of pembayaranIuran) {
    const exists = db.prepare(
      "SELECT Id FROM PAM_Transaksi WHERE SourceTable='PembayaranIuran' AND SourceId=?"
    ).get(pi.Id);

    if (!exists) {
      db.prepare(
        "INSERT INTO PAM_Transaksi (TenantId, Pemasukan, Pengeluaran, Hutang, TanggalTransaksi, Deskripsi, TanggalJurnal, JenisTransaksi, JenisKeterangan, SourceTable, SourceId, CreatedBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
      ).run(
        pi.TenantId,
        pi.JumlahBayar,
        0,
        0,
        pi.TanggalBayar ? pi.TanggalBayar.slice(0, 10) : new Date().toISOString().slice(0, 10),
        `Pembayaran iuran otomatis (${pi.NamaIuran || 'Iuran'}) - No: ${pi.NomorTransaksi}`,
        pi.TanggalBayar ? pi.TanggalBayar.slice(0, 10) : new Date().toISOString().slice(0, 10),
        "Pemasukan",
        "Pembayaran Iuran",
        "PembayaranIuran",
        pi.Id,
        pi.KasirId || 1
      );
      count++;
    }
  }
} catch (e) {
  console.error("Error sync PembayaranIuran:", e);
}

// 3. Sync Pengeluaran
try {
  const pengeluaran = db.prepare("SELECT * FROM Pengeluaran").all();
  console.log(`Menemukan ${pengeluaran.length} data Pengeluaran Kas.`);
  for (const p of pengeluaran) {
    const exists = db.prepare(
      "SELECT Id FROM PAM_Transaksi WHERE SourceTable='Pengeluaran' AND SourceId=?"
    ).get(p.Id);

    if (!exists) {
      db.prepare(
        "INSERT INTO PAM_Transaksi (TenantId, Pemasukan, Pengeluaran, Hutang, TanggalTransaksi, Deskripsi, TanggalJurnal, JenisTransaksi, JenisKeterangan, SourceTable, SourceId, CreatedBy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
      ).run(
        p.TenantId,
        0,
        p.Nominal,
        0,
        p.Tanggal || new Date().toISOString().slice(0, 10),
        `Pengeluaran Kas otomatis - ${p.Keterangan}`,
        p.Tanggal || new Date().toISOString().slice(0, 10),
        "Pengeluaran",
        "Pengeluaran Kas",
        "Pengeluaran",
        p.Id,
        p.CreatedBy || 1
      );
      count++;
    }
  }
} catch (e) {
  console.error("Error sync Pengeluaran:", e);
}

console.log(`SINKRONISASI SELESAI. Berhasil menyinkronkan ${count} transaksi ke PAM_Transaksi.`);
db.exec("VACUUM;"); // optimize db
