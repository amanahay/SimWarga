const db = require('./src/db');
const bcrypt = require('bcryptjs');

const username = process.env.RESET_USERNAME || 'superadmin';
const password = process.env.RESET_PASSWORD || 'Admin@123';
const tenantId = Number(process.env.RESET_TENANT_ID || 1);

db.prepare(
  "INSERT OR IGNORE INTO Tenants (Id,NamaTenant,KodeTenant,Kota) VALUES (?,'RT 03 RW 07','RT03RW07-DEFAULT','Bandung')",
).run(tenantId);

for (const role of ['SuperAdmin','Admin','Bendahara','Kasir','Petugas','Warga']) {
  db.prepare(
    "INSERT OR IGNORE INTO Roles (NamaRole, Deskripsi) VALUES (?, ?)",
  ).run(role, `Role for ${role}`);
}

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);
let user = db.prepare("SELECT * FROM Users WHERE Username=?").get(username);

if (user) {
  console.log(`User ${username} exists, updating password and activating account...`);
  db.prepare(
    `UPDATE Users
     SET PasswordHash=?, PasswordSalt=?, TenantId=?, IsAktif=1, MustChangePassword=0
     WHERE Id=?`,
  ).run(hash, salt, tenantId, user.Id);
} else {
  console.log(`User ${username} does not exist, creating...`);
  const result = db.prepare(
    `INSERT INTO Users
     (TenantId,Username,Email,NamaLengkap,PasswordHash,PasswordSalt,IsAktif,MustChangePassword)
     VALUES (?,?,'admin@simwarga.id','Super Administrator',?,?,1,0)`,
  ).run(tenantId, username, hash, salt);
  user = { Id: result.lastInsertRowid };
}

const role = db.prepare("SELECT Id FROM Roles WHERE NamaRole='SuperAdmin'").get();
db.prepare("DELETE FROM UserInRoles WHERE UserId=?").run(user.Id);
db.prepare("INSERT INTO UserInRoles (UserId,RoleId) VALUES (?,?)").run(user.Id, role.Id);

user = db.prepare("SELECT * FROM Users WHERE Username=?").get(username);
if (user) {
  console.log(`Password ${password} match:`, bcrypt.compareSync(password, user.PasswordHash));
  console.log(`Login ready: ${username} / ${password}`);
} else {
  console.log('ERROR: User still not found');
}
