const path = require('path')
const { DatabaseSync } = require('node:sqlite')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') })

const fs = require('fs')

// Resolve DB path relative to this file's directory (backend/src/), not CWD
const defaultDbPath = path.join(__dirname, '..', 'simwarga.db')
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : defaultDbPath

console.log('[DB] Opening database at:', dbPath)

let rawDb
try {
  rawDb = new DatabaseSync(dbPath)
} catch (err) {
  console.error('[DB] Failed to open database:', err.message)
  console.error('[DB] Attempted path:', dbPath)
  console.error('[DB] CWD:', process.cwd())
  console.error('[DB] __dirname:', __dirname)
  throw err
}

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
