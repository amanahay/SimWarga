const db = require('./src/db');
const bcrypt = require('bcryptjs');

// Check if user exists
let u = db.prepare("SELECT * FROM Users WHERE Username='superadmin'").get();
if (u) {
  console.log('User exists, updating password...');
  const hash = bcrypt.hashSync('admin123', bcrypt.genSaltSync(10));
  db.prepare("UPDATE Users SET PasswordHash=?, PasswordSalt=? WHERE Username='superadmin'").run(hash, hash.substring(0, 29));
} else {
  console.log('User does not exist, creating...');
  // Check if tenant exists
  let t = db.prepare("SELECT * FROM Tenants WHERE Id=1").get();
  if (!t) {
    db.prepare("INSERT INTO Tenants (Id,NamaTenant,KodeTenant,Kota) VALUES (1,'RT 03 RW 07','RT03RW07-DEFAULT','Bandung')").run();
  }
  // Check roles
  let r = db.prepare("SELECT * FROM Roles WHERE NamaRole='SuperAdmin'").get();
  if (!r) {
    for (const role of ['SuperAdmin','Admin','Bendahara','Kasir','Petugas','Warga']) {
      try { db.prepare("INSERT INTO Roles (NamaRole) VALUES (?)").run(role); } catch(e) {}
    }
  }
  const hash = bcrypt.hashSync('admin123', bcrypt.genSaltSync(10));
  db.prepare("INSERT INTO Users (Id,TenantId,Username,Email,NamaLengkap,PasswordHash,PasswordSalt,IsAktif) VALUES (1,1,'superadmin','admin@simwarga.id','Super Administrator',?,?,1)").run(hash, hash.substring(0, 29));
  try {
    db.prepare("INSERT INTO UserInRoles (UserId,RoleId) VALUES (1,(SELECT Id FROM Roles WHERE NamaRole='SuperAdmin'))").run();
  } catch(e) { console.log('Role assign (may already exist):', e.message); }
}

u = db.prepare("SELECT * FROM Users WHERE Username='superadmin'").get();
if (u) {
  console.log('Password admin123 match:', bcrypt.compareSync('admin123', u.PasswordHash));
} else {
  console.log('ERROR: User still not found');
}
