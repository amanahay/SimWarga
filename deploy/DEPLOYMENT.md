# SimWarga - Deployment Guide untuk smarterasp.net

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Preparation Steps](#preparation-steps)
- [Upload ke smarterasp.net](#upload-ke-smarterasпnet)
- [Konfigurasi pada Server](#konfigurasi-pada-server)
- [Troubleshooting](#troubleshooting)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Lokal Development
- **Node.js**: v14.x atau lebih tinggi (direkomendasikan v16.x atau v18.x)
- **npm**: v6.x atau lebih tinggi
- Frontend sudah di-build (`npm run build` di folder `/frontend`)
- Database sudah initialized (`backend/simwarga.db` ada atau auto-generate)

### Di smarterasp.net
- **Node.js**: Support untuk minimal v14.x
- **Hosting Plan**: Plan yang support Node.js applications
- **Disk Space**: Minimal 500MB free space
- **RAM**: Minimal 512MB (direkomendasikan 1GB+)

---

## Preparation Steps

### Step 1: Install Dependencies Lokal

```bash
# Di root project
npm install

# Backend setup
cd backend
npm install
cd ..

# Frontend setup
cd frontend
npm install
npm run build
cd ..
```

### Step 2: Verify Dependencies Compatibility

```bash
# Jalankan script untuk verify semua dependencies
node deploy/scripts/verify-dependencies.js
```

**Expected Output**: 
- Semua backend dependencies harus "SAFE" atau "UNKNOWN"
- Tidak ada "RISKY" packages
- Frontend packages tidak termasuk dalam deployment

### Step 3: Prepare Deployment Package

```bash
# Jalankan script preparation
node deploy/scripts/deploy-prepare.js

# Atau dengan custom output directory:
# node deploy/scripts/deploy-prepare.js --output-dir ./my-deployment
```

**Script akan:**
1. ✓ Copy backend source code
2. ✓ Build dan copy frontend dist
3. ✓ Copy configuration files (web.config, .htaccess)
4. ✓ Generate production package.json
5. ✓ Generate MANIFEST.json
6. ✓ Report package size

### Step 4: Configure Environment Files

Di folder `deploy/production-ready/`:

```bash
# Copy template untuk reference
cp .env.example .env

# Edit .env dengan konfigurasi production Anda:
# - Ganti JWT_SECRET dengan value yang kuat dan random
# - Set ALLOWED_ORIGINS dengan domain production Anda
# - Konfigurasi SMTP/SMS jika diperlukan
```

**IMPORTANT**: Jangan commit `.env` ke repository!

### Step 5: Review Deployment Package

Struktur final `deploy/production-ready/`:
```
production-ready/
├── backend/
│   ├── src/               # Source code (Express API)
│   ├── simwarga.db        # SQLite database
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   └── dist/              # Static assets (pre-built)
├── server.js              # Entry point
├── web.config             # IIS configuration
├── .htaccess              # Apache configuration
├── package.json           # Root dependencies
├── .env.example           # Template (reference only)
└── MANIFEST.json          # Deployment info
```

---

## Upload ke smarterasp.net

### Step 1: Create ZIP Archive

Di command prompt:
```bash
# Navigate ke deployment folder
cd deploy/production-ready

# Create ZIP file
# Windows PowerShell:
Compress-Archive -Path * -DestinationPath ../simwarga-production.zip

# Atau gunakan 7-Zip / WinRAR:
# Klik kanan → Compress to ZIP → simwarga-production.zip
```

### Step 2: Upload to smarterasp.net

#### Via Control Panel:
1. Login ke account smarterasp.net
2. Buka **File Manager** atau **FTP Manager**
3. Navigate ke root folder aplikasi Node.js Anda
4. Upload `simwarga-production.zip`
5. Extract ZIP file (gunakan extract tool di control panel)

#### Via FTP:
1. Get FTP credentials dari control panel
2. Gunakan FTP client (Filezilla, WinSCP, dll)
3. Connect ke server
4. Upload `simwarga-production.zip` ke application root
5. Extract menggunakan server-side tools atau FTP client

### Step 3: Verify Upload

Pastikan struktur folder di server sesuai:
```
root/
├── backend/
├── frontend/
├── server.js
├── web.config
└── package.json
```

---

## Konfigurasi pada Server

### Step 1: Install Node Dependencies on Server

Di smarterasp.net control panel atau via terminal:

```bash
cd backend
npm install --production
cd ..
```

Atau jika menggunakan PM2 (jika tersedia):
```bash
npm install -g pm2
cd backend && npm install --production
```

### Step 2: Configure Environment Variables

**Via Control Panel:**
1. Buka Node.js application settings
2. Set environment variables:
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=<generated-strong-random-value>
   ALLOWED_ORIGINS=https://your-domain.com
   DATABASE_PATH=./backend/simwarga.db
   ```

**Via .env file (Alternative):**
1. Edit `.env` file yang sudah ada di server
2. Fill in semua required values
3. Save file

### Step 3: Set Startup File

Di smarterasp.net control panel:
1. Navigate ke Node.js application settings
2. Set **Startup file**: `server.js`
3. Set **Node version**: Sesuai dengan yang tersedia (recommend latest stable)

### Step 4: Configure Database Permissions

Ensure folder permissions:
```
/backend/       → Write permission (untuk simwarga.db)
/backend/src/   → Read permission
/frontend/dist/ → Read permission
/uploads/       → Write permission (jika digunakan)
```

Di control panel atau via SSH:
```bash
chmod 755 backend/
chmod 644 backend/simwarga.db
```

---

## Start Application

### Via Control Panel:
1. Buka Node.js application settings
2. Klik **Start Application**
3. Tunggu sampai status berubah ke "Running"

### Via Terminal (jika SSH available):
```bash
cd /path/to/application
npm start
```

### Verify Application:
- Browser: `https://your-domain.com`
- API: `https://your-domain.com/api`
- Check console logs di smarterasp.net control panel

---

## Troubleshooting

### Issue: Port Already in Use

**Solution:**
- Pastikan hanya satu instance aplikasi yang running
- Gunakan control panel untuk stop & restart
- Cek PORT variable di .env (default: 3000)

### Issue: Database File Permission Denied

**Solution:**
```bash
# Via SSH/Terminal:
chmod 666 backend/simwarga.db
chmod 755 backend/
```

### Issue: Cannot Find Module

**Solution:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install --production
cd ..
```

### Issue: CORS Error dari Frontend

**Solution:**
1. Check `.env` file: ALLOWED_ORIGINS
2. Pastikan domain production sudah ditambahkan:
   ```
   ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
   ```
3. Restart application

### Issue: SSL Certificate Error

**Solution:**
- smarterasp.net should provide SSL automatically
- If not, upload certificate via control panel
- Update `.env` untuk enforce HTTPS:
  ```
  # Uncomment ini di web.config:
  # <add name="Strict-Transport-Security" value="..." />
  ```

### Issue: 502 Bad Gateway

**Causes & Solutions:**
- Node.js crashed → Check logs, restart application
- High memory usage → Optimize queries, check database size
- Port not available → Check IIS configuration

---

## Monitoring & Maintenance

### Regular Checks

#### Weekly:
- ✓ Monitor application logs
- ✓ Check database size (`backend/simwarga.db`)
- ✓ Verify API response times

#### Monthly:
- ✓ Backup database file
- ✓ Review error logs
- ✓ Check disk usage

#### Quarterly:
- ✓ Update Node.js version (if available)
- ✓ Security audit of dependencies
- ✓ Performance optimization

### Backup Strategy

```bash
# Manual backup via SSH:
cp backend/simwarga.db backend/simwarga.db.backup.$(date +%Y%m%d)

# Or via control panel File Manager:
# Download simwarga.db regularly to local machine
```

### View Logs

Via smarterasp.net control panel:
- Application logs → Node.js app console
- IIS logs → detailed access logs
- Error logs → troubleshooting

### Restart Application

Via control panel:
1. Navigate ke Node.js application
2. Click **Stop**
3. Wait 5-10 seconds
4. Click **Start**

---

## Performance Optimization

### Database
- Monitor database size (ideally < 1GB)
- Implement data archival strategy untuk old records
- Regular VACUUM untuk optimize SQLite:
  ```bash
  # Manual VACUUM (on server or local):
  sqlite3 backend/simwarga.db "VACUUM;"
  ```

### Memory
- Monitor memory usage di control panel
- Limit concurrent connections
- Implement request timeout

### Caching
- Static frontend assets sudah cached via `.htaccess`/`web.config`
- Consider adding Redis caching layer (jika available)

---

## Security Checklist

- ✓ JWT_SECRET adalah random value 32+ characters
- ✓ ALLOWED_ORIGINS restricted ke domain(s) Anda
- ✓ .env file tidak di-commit ke repository
- ✓ Database file permissions: 644 (readable but not world-writable)
- ✓ SSL/HTTPS enabled
- ✓ Regular backups of database
- ✓ Monitor access logs untuk suspicious activity
- ✓ Keep Node.js updated dengan latest security patches

---

## Support & Resources

### smarterasp.net Specific
- Documentation: https://www.smarterasp.net/support
- Support: https://www.smarterasp.net/contact
- KB Articles: https://www.smarterasp.net/support/kb

### Node.js & Express
- Express docs: https://expressjs.com
- Node.js: https://nodejs.org
- SQLite: https://www.sqlite.org

### Troubleshooting Contacts
- Report issues dengan deployment package: [Project Repo]
- Support untuk hosting: smarterasp.net support

---

## FAQ

**Q: Apakah database akan auto-initialize?**
A: Ya, aplikasi akan create database schema pada first run jika tidak ditemukan.

**Q: Bisakah saya menggunakan MySQL instead of SQLite?**
A: Bisa, tapi perlu modify source code. SQLite direkomendasikan untuk shared hosting.

**Q: Bagaimana jika port 3000 sudah digunakan?**
A: Ubah PORT di .env atau configure di control panel.

**Q: Apakah node_modules wajib include?**
A: Tidak, jalankan `npm install --production` di server.

**Q: Berapa sering saya harus backup database?**
A: Minimal weekly, atau sesuai business requirements.

---

**Last Updated**: 2024
**Deployment Target**: smarterasp.net with Node.js
**Framework**: Express.js + Vue 3
**Database**: SQLite
