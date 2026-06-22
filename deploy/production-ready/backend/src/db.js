const path = require('path')
const { DatabaseSync } = require('node:sqlite')
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') })

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
