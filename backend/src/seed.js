const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('🌱 Seeding database...');

    // 1. Roles
    const roles = ['SuperAdmin', 'Admin', 'Bendahara', 'Kasir', 'Petugas', 'Warga'];
    const insertRole = db.prepare('INSERT OR IGNORE INTO Roles (NamaRole, Deskripsi) VALUES (?, ?)');
    roles.forEach(role => insertRole.run(role, `Role for ${role}`));

    // 2. Tenants
    const insertTenant = db.prepare('INSERT OR IGNORE INTO Tenants (Id, NamaTenant, KodeTenant, Kota) VALUES (?, ?, ?, ?)');
    insertTenant.run(1, "RT 03 RW 07", "RT03RW07-DEFAULT", "Bandung");

    // 3. SuperAdmin User
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('Admin@123', salt);
    
    const insertUser = db.prepare(`
        INSERT OR IGNORE INTO Users (Id, TenantId, Username, Email, NamaLengkap, PasswordHash, PasswordSalt, IsAktif, MustChangePassword)
        VALUES (1, 1, 'superadmin', 'admin@simwarga.id', 'Super Administrator', ?, ?, 1, 0)
    `);
    insertUser.run(hash, salt);

    // FIXED: Use parameter for role name
    const assignRole = db.prepare('INSERT OR IGNORE INTO UserInRoles (UserId, RoleId) VALUES (?, (SELECT Id FROM Roles WHERE NamaRole = ?))');
    assignRole.run(1, 'SuperAdmin');

    // 4. Sample Warga
    const wargaData = [
        [1, '3201010101010001', 'Budi Santoso', 'Jl. Mawar No. 1', 'Tetap'],
        [1, '3201010101010002', 'Siti Aminah', 'Jl. Melati No. 5', 'Tetap'],
        [1, '3201010101010003', 'Agus Prayogo', 'Jl. Anggrek No. 12', 'Kontrak'],
        [1, '3201010101010004', 'Larasati', 'Jl. Kenanga No. 3', 'Tetap']
    ];
    const insertWarga = db.prepare('INSERT OR IGNORE INTO Warga (TenantId, NIK, NamaKepalaKK, Alamat, StatusHuni) VALUES (?, ?, ?, ?, ?)');
    wargaData.forEach(w => insertWarga.run(...w));

    // 5. Sample Announcements
    const notifData = [
        [1, 'Kerja Bakti Rutin', 'Diharapkan kehadiran warga untuk kerja bakti pada hari Minggu, 21 Juni pukul 07:00 WIB.'],
        [1, 'Pembayaran Iuran', 'Batas akhir pembayaran iuran bulanan adalah tanggal 10 setiap bulannya.'],
        [1, 'Pemeliharaan Pipa Air', 'Akan ada gangguan aliran air sementara pada hari Rabu karena pemeliharaan pipa induk.'],
        [1, 'Penerimaan Bansos', 'Jadwal pengambilan bantuan sosial akan dilaksanakan di Balai RT hari Jumat besok.']
    ];
    const insertNotif = db.prepare('INSERT OR IGNORE INTO Notifikasi (TenantId, Judul, Pesan) VALUES (?, ?, ?)');
    notifData.forEach(n => insertNotif.run(...n));

    // 6. Sample Complaints (Pengaduan)
    const pengaduanData = [
        [1, 'Lampu Jalan Mati', 'Lampu jalan di depan rumah No. 4 sudah mati selama 3 hari.', 'Infrastruktur', 'Masuk'],
        [1, 'Sampah Belum Diangkut', 'Sudah 2 hari truk sampah tidak lewat.', 'Kebersihan', 'Diproses']
    ];
    const insertPengaduan = db.prepare('INSERT OR IGNORE INTO Pengaduan (TenantId, Judul, Isi, Kategori, Status) VALUES (?, ?, ?, ?, ?)');
    pengaduanData.forEach(p => insertPengaduan.run(...p));

    console.log('✅ Seeding completed!');
}

seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
