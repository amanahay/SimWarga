# Code Examples: Database Migration Reference

## Current Implementation (Optimal)

### backend/src/db.js
```javascript
const path = require('path')
const { DatabaseSync } = require('node:sqlite')  // ✅ Built-in, no compilation
require('dotenv').config()

const dbPath = path.resolve(process.env.DB_PATH || './simwarga.db')
const rawDb = new DatabaseSync(dbPath)

// PRAGMAs for optimal performance and safety
rawDb.exec('PRAGMA foreign_keys = ON;')   // Enforce referential integrity
rawDb.exec('PRAGMA journal_mode = WAL;')  // Write-Ahead Logging for concurrency

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
```

**Status**: ✅ OPTIMAL - Keep as-is if Node.js 22+

---

## Alternative Implementation (If Forced to sql.js)

### ⚠️ NOT RECOMMENDED - For Reference Only

```javascript
// backend/src/db.js (Alternative with sql.js)

const path = require('path')
const fs = require('fs')
const initSqlJs = require('sql.js')
require('dotenv').config()

const dbPath = path.resolve(process.env.DB_PATH || './simwarga.db')

let DB = null
let SQL = null
let saveTimeout = null

// Initialize database (async - must be called before use)
async function initDB() {
  if (DB) return DB
  
  SQL = await initSqlJs()
  
  // Load existing database if it exists
  if (fs.existsSync(dbPath)) {
    const data = fs.readFileSync(dbPath)
    DB = new SQL.Database(data)
  } else {
    DB = new SQL.Database()
  }
  
  // Initialize schema
  initializeSchema()
  
  return DB
}

function initializeSchema() {
  // Note: sql.js doesn't support PRAGMA journal_mode = WAL
  // This is a CRITICAL limitation
  DB.run('PRAGMA foreign_keys = ON')
  // WAL mode not available - data loss risk on crash
}

// Auto-save to disk with debounce to reduce I/O
function scheduleDbSave() {
  if (saveTimeout) clearTimeout(saveTimeout)
  
  saveTimeout = setTimeout(() => {
    saveDB()
  }, 1000) // Save after 1 second of inactivity
}

function saveDB() {
  try {
    const data = DB.export()
    const buffer = Buffer.from(data)
    // ⚠️ PERFORMANCE ISSUE: Synchronous write blocks everything
    fs.writeFileSync(dbPath, buffer)
  } catch (err) {
    console.error('Failed to save database:', err)
  }
}

// Wrapper to mimic node:sqlite API
module.exports = {
  async init() {
    await initDB()
  },
  
  prepare(sql) {
    if (!DB) throw new Error('Database not initialized. Call db.init() first.')
    
    return {
      run(...params) {
        try {
          DB.run(sql, params)
          scheduleDbSave() // ⚠️ Every write triggers save schedule
          
          // sql.js doesn't provide lastInsertRowid directly
          const lastId = DB.exec('SELECT last_insert_rowid() as id')
          return {
            lastInsertRowid: lastId[0]?.values[0]?.[0] || null,
            changes: DB.getRowsModified(),
          }
        } catch (err) {
          console.error('SQL error:', sql, params, err)
          throw err
        }
      },
      
      get(...params) {
        try {
          const stmt = DB.prepare(sql)
          stmt.bind(params)
          
          if (stmt.step()) {
            const row = stmt.getAsObject()
            stmt.free()
            return row
          }
          
          stmt.free()
          return null
        } catch (err) {
          console.error('SQL error:', sql, params, err)
          throw err
        }
      },
      
      all(...params) {
        try {
          const stmt = DB.prepare(sql)
          stmt.bind(params)
          
          const rows = []
          while (stmt.step()) {
            rows.push(stmt.getAsObject())
          }
          
          stmt.free()
          return rows
        } catch (err) {
          console.error('SQL error:', sql, params, err)
          throw err
        }
      },
      
      iterate(...params) {
        // sql.js doesn't have true iteration
        // Would need to buffer all results
        return function* () {
          const rows = this.all(...params)
          for (const row of rows) {
            yield row
          }
        }
      },
      
      columns() {
        // Column metadata support
        try {
          const stmt = DB.prepare(sql)
          const cols = stmt.getColumnNames()
          stmt.free()
          return cols
        } catch {
          return []
        }
      },
    }
  },
  
  exec(sql) {
    if (!DB) throw new Error('Database not initialized. Call db.init() first.')
    
    try {
      DB.run(sql)
      scheduleDbSave() // Every exec triggers save
      return null
    } catch (err) {
      console.error('SQL error:', sql, err)
      throw err
    }
  },
  
  pragma(sql) {
    if (!DB) throw new Error('Database not initialized. Call db.init() first.')
    
    try {
      const result = DB.exec(`PRAGMA ${sql}`)
      return result
    } catch (err) {
      console.error('PRAGMA error:', sql, err)
      throw err
    }
  },
  
  transaction(fn) {
    if (!DB) throw new Error('Database not initialized. Call db.init() first.')
    
    return (...args) => {
      DB.run('BEGIN')
      try {
        const result = fn(...args)
        DB.run('COMMIT')
        scheduleDbSave() // Save after transaction
        return result
      } catch (error) {
        try {
          DB.run('ROLLBACK')
        } catch (_) {}
        throw error
      }
    }
  },
  
  // Force immediate save
  flush() {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
    saveDB()
  },
  
  // Graceful shutdown
  close() {
    this.flush()
    if (DB) DB.close()
  },
}
```

**USAGE (with sql.js)**:
```javascript
// index.js
const db = require('./db')

// MUST be async!
app.listen(PORT, async () => {
  await db.init()
  console.log('Database initialized')
})

// On shutdown
process.on('SIGTERM', () => {
  db.close()
  process.exit(0)
})
```

### ❌ Issues with sql.js Implementation:

1. **Requires async initialization** - Current code doesn't expect this
2. **Every write triggers file save** - Massive performance hit
3. **No WAL mode** - Crash = potential data loss
4. **In-memory overhead** - Entire DB loaded in RAM
5. **Concurrency unsafe** - No multi-instance support
6. **Debouncing introduces latency** - Delayed persistence

---

## Migration Code Patterns

### Pattern 1: Check Node Version at Startup

```javascript
// Defensive code to detect capabilities
const nodeVersion = process.version.match(/^v(\d+)/)[1]
const NODE_VERSION = parseInt(nodeVersion)

if (NODE_VERSION < 22) {
  console.warn('⚠️  Warning: Node.js 22+ recommended for optimal performance')
  console.warn(`    Current version: ${process.version}`)
  console.warn('    Consider upgrading hosting to Node 22+ LTS')
}
```

### Pattern 2: Graceful Fallback (Not Recommended but Possible)

```javascript
let db

async function initDatabase() {
  try {
    // Try node:sqlite first (Node 22+)
    const { DatabaseSync } = require('node:sqlite')
    db = require('./db-native')
    console.log('✅ Using native node:sqlite')
  } catch (e) {
    // Fallback to sql.js (NOT RECOMMENDED)
    console.warn('⚠️  node:sqlite not available')
    console.warn('    Falling back to sql.js (performance degraded)')
    db = require('./db-sqljs')
    await db.init()
  }
}
```

### Pattern 3: Performance Monitoring

```javascript
// Track database performance
const queryMetrics = {
  count: 0,
  totalTime: 0,
  avgTime: 0,
}

function monitoredPrepare(sql) {
  const start = process.hrtime.bigint()
  const stmt = db.prepare(sql)
  
  const originalRun = stmt.run
  stmt.run = function(...params) {
    const result = originalRun.call(this, ...params)
    
    const end = process.hrtime.bigint()
    const elapsed = Number(end - start) / 1000000 // Convert to ms
    
    queryMetrics.count++
    queryMetrics.totalTime += elapsed
    queryMetrics.avgTime = queryMetrics.totalTime / queryMetrics.count
    
    if (elapsed > 100) {
      console.warn(`⚠️  Slow query (${elapsed.toFixed(2)}ms): ${sql}`)
    }
    
    return result
  }
  
  return stmt
}
```

---

## Deployment Checklist

### ✅ If Node 22+ Available

```bash
# 1. Update deployment config (e.g., docker, Procfile, etc.)
node: 22                    # or 22.x, 22.11.0, etc.

# 2. No code changes needed
# 3. Full test suite
npm test

# 4. Deploy to staging
npm run build
npm start

# 5. Monitor logs for errors
# 6. Rollout to production
```

### ⚠️ If Stuck with Old Node

```bash
# 1. Install sql.js
npm install sql.js

# 2. Update backend/src/db.js (use alternative implementation above)

# 3. Update index.js to initialize async
// Add initialization
app.listen(PORT, async () => {
  await db.init()
  // ... rest of initialization
})

# 4. EXTENSIVE testing needed
npm test              # Unit tests
npm run load-test     # Performance test
npm run crash-test    # Data integrity

# 5. Expect complaints about slowness
# 6. Start planning migration to Node 22+
```

---

## Performance Benchmark Script

```javascript
// backend/benchmark.js - Test database performance

const db = require('./src/db')

async function runBenchmarks() {
  console.log('Database Performance Benchmark\n')
  
  // Test 1: Single SELECT
  const selectStart = process.hrtime.bigint()
  for (let i = 0; i < 1000; i++) {
    db.prepare('SELECT * FROM Users WHERE Id=?').get(1)
  }
  const selectTime = Number(process.hrtime.bigint() - selectStart) / 1000000
  console.log(`1000 SELECT queries: ${selectTime.toFixed(2)}ms`)
  console.log(`  Per query: ${(selectTime/1000).toFixed(3)}ms`)
  
  // Test 2: INSERT
  const insertStart = process.hrtime.bigint()
  const tx = db.transaction(() => {
    for (let i = 0; i < 100; i++) {
      db.prepare('INSERT INTO TestTable (name) VALUES (?)').run(`Test ${i}`)
    }
  })
  tx()
  const insertTime = Number(process.hrtime.bigint() - insertStart) / 1000000
  console.log(`\n100 INSERT in transaction: ${insertTime.toFixed(2)}ms`)
  console.log(`  Per insert: ${(insertTime/100).toFixed(3)}ms`)
  
  // Test 3: JOIN
  const joinStart = process.hrtime.bigint()
  for (let i = 0; i < 100; i++) {
    db.prepare(`
      SELECT u.*, r.NamaRole 
      FROM Users u 
      JOIN UserInRoles ur ON u.Id=ur.UserId 
      JOIN Roles r ON ur.RoleId=r.Id 
      WHERE u.TenantId=?
    `).all(1)
  }
  const joinTime = Number(process.hrtime.bigint() - joinStart) / 1000000
  console.log(`\n100 JOIN queries: ${joinTime.toFixed(2)}ms`)
  console.log(`  Per query: ${(joinTime/100).toFixed(3)}ms`)
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('If values are <10ms: ✅ Excellent (node:sqlite)')
  console.log('If values are 10-100ms: ⚠️  Degraded (sql.js)')
  console.log('If values are >100ms: 🔴 Unacceptable')
}

if (require.main === module) {
  runBenchmarks().catch(console.error)
}
```

**Run**: `npm run benchmark` (after adding to package.json scripts)

---

## Summary

| Scenario | Implementation | File | Status |
|----------|----------------|------|--------|
| Node 22+ | native sqlite | `db.js` | ✅ CURRENT |
| Old Node | sql.js wrapper | Alternative above | ⚠️ IF FORCED |
| Upgrade | Version bump | Deployment config | 🚀 RECOMMENDED |

**Recommendation**: Keep current `db.js` and upgrade Node.js version in hosting.
