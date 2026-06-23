const path = require('path')
const { DatabaseSync } = require('node:sqlite')
require('dotenv').config()

const fs = require('fs')

const dbPath = path.resolve(process.env.DB_PATH || './simwarga.db')
const rawDb = new DatabaseSync(dbPath)

rawDb.exec('PRAGMA foreign_keys = ON;')
rawDb.exec('PRAGMA journal_mode = WAL;')

// Auto-initialize schema if the database is new/empty
try {
  // Check if the core table exists
  const checkTable = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='Tenants'")
  const tableExists = checkTable.get()
  
  if (!tableExists) {
    console.log('[DB] New database detected. Initializing schema...')
    const schemaPath = path.resolve(__dirname, '../../simwarga_schema.sql')
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8')
      rawDb.exec(schemaSql)
      console.log('[DB] Schema initialized successfully.')
    } else {
      console.warn('[DB] WARNING: simwarga_schema.sql not found at', schemaPath)
    }
  }

  // Ensure PAM_Transaksi and its indexes exist (migration check)
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS PAM_Transaksi (
        Id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        TenantId            INTEGER NOT NULL REFERENCES Tenants(Id) ON DELETE CASCADE,
        Pemasukan           REAL DEFAULT 0,
        Pengeluaran         REAL DEFAULT 0,
        Hutang              REAL DEFAULT 0,
        TanggalTransaksi    TEXT NOT NULL,
        Deskripsi           TEXT,
        TanggalJurnal       TEXT,
        JenisTransaksi      TEXT,
        JenisKeterangan     TEXT,
        SourceTable         TEXT,
        SourceId            INTEGER,
        CreatedAt           TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        CreatedBy           INTEGER REFERENCES Users(Id)
    );
    CREATE INDEX IF NOT EXISTS idx_pam_transaksi_tenant ON PAM_Transaksi(TenantId);
    CREATE INDEX IF NOT EXISTS idx_pam_transaksi_tanggal ON PAM_Transaksi(TanggalTransaksi);
  `);

  // Alter existing table to add columns if they don't exist
  try {
    rawDb.exec("ALTER TABLE PAM_Transaksi ADD COLUMN SourceTable TEXT;");
  } catch (e) {}
  try {
    rawDb.exec("ALTER TABLE PAM_Transaksi ADD COLUMN SourceId INTEGER;");
  } catch (e) {}
} catch (err) {
  console.error('[DB] Error during auto-initialization:', err)
}

function wrapStatement(stmt) {
  return {
    run(...params) {
      return stmt.run(...params)
    },
    get(...params) {
      return stmt.get(...params)
    },
    all(...params) {
      return stmt.all(...params)
    },
    iterate(...params) {
      return stmt.iterate(...params)
    },
    columns() {
      return stmt.columns()
    },
  }
}

function transaction(fn) {
  return (...args) => {
    rawDb.exec('BEGIN')
    try {
      const result = fn(...args)
      rawDb.exec('COMMIT')
      return result
    } catch (error) {
      try {
        rawDb.exec('ROLLBACK')
      } catch (_) {}
      throw error
    }
  }
}

module.exports = {
  prepare(sql) {
    return wrapStatement(rawDb.prepare(sql))
  },
  exec(sql) {
    return rawDb.exec(sql)
  },
  pragma(sql) {
    return rawDb.exec(`PRAGMA ${sql}`)
  },
  transaction,
}
