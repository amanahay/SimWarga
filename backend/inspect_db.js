const db = require('./src/db');

console.log("=== PENGELUARAN ===");
try {
  const pengeluaran = db.prepare("SELECT * FROM Pengeluaran").all();
  console.log(pengeluaran);
} catch (e) {
  console.error("Error query Pengeluaran:", e);
}

console.log("=== PAM_TRANSAKSI ===");
try {
  const transaksi = db.prepare("SELECT * FROM PAM_Transaksi").all();
  console.log(transaksi);
} catch (e) {
  console.error("Error query PAM_Transaksi:", e);
}
