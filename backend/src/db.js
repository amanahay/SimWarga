const path = require('path')
const { DatabaseSync } = require('node:sqlite')
require('dotenv').config()

const dbPath = path.resolve(process.env.DB_PATH || './simwarga.db')
const rawDb = new DatabaseSync(dbPath)

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
