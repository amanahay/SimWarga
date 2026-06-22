# SimWarga - Pre-Deployment Hosting Checklist

Gunakan checklist ini sebelum deploy ke production untuk memastikan semua siap.

---

## 🔍 Pre-Deployment Verification

### Local Development Environment

- [ ] Node.js version: `node -v` (minimum v14.x, recommend v16.x+)
- [ ] npm version: `npm -v` (minimum v6.x)
- [ ] Git status clean: `git status` (no uncommitted changes)
- [ ] All tests passing: `npm test` (if applicable)
- [ ] Frontend built successfully: `npm run build`
- [ ] No console errors or warnings dalam development

### Code Quality

- [ ] No console.error() atau console.log() statements left
- [ ] No hardcoded secrets, passwords, atau API keys
- [ ] No TODO atau FIXME comments di production code
- [ ] Error handling implemented untuk semua API endpoints
- [ ] Input validation untuk semua form inputs
- [ ] SQL injection protection (using parameterized queries)
- [ ] No debug mode atau devtools enabled

### Dependencies Verification

- [ ] Run dependency check: `node deploy/scripts/verify-dependencies.js`
- [ ] All dependencies marked as "SAFE" atau "UNKNOWN"
- [ ] No deprecated packages dalam package.json
- [ ] All production dependencies included
- [ ] No dev dependencies akan deployed ke production
- [ ] Security audit passing: `npm audit` (if available)

---

## 📦 Deployment Package Preparation

### Package Generation

- [ ] Run deployment prepare script: `node deploy/scripts/deploy-prepare.js`
- [ ] Verify output folder: `deploy/production-ready/` exists
- [ ] Check folder structure:
  - [ ] `backend/src/` - source code
  - [ ] `backend/package.json` & `package-lock.json`
  - [ ] `frontend/dist/` - built static assets
  - [ ] `server.js` - entry point
  - [ ] `web.config` - IIS configuration
  - [ ] `.htaccess` - Apache fallback
  - [ ] `MANIFEST.json` - deployment metadata

### Package Size

- [ ] Total package size < 100MB (ideally < 50MB)
- [ ] Backend size reasonable (excluding node_modules)
- [ ] Frontend dist properly optimized
- [ ] No unnecessary files included (logs, caches, etc.)

### Configuration Files

- [ ] `.env.example` copied dan accessible
- [ ] `.env.example` contains all required variables
- [ ] `web.config` has correct IIS settings
- [ ] `server.js` correctly requires backend
- [ ] `package.json` startup scripts correct

---

## 🔐 Security Configuration

### Environment Variables

- [ ] `.env.production` created with production values
- [ ] `JWT_SECRET` is strong & random (32+ characters)
  - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] `ALLOWED_ORIGINS` set to actual production domain(s)
- [ ] `NODE_ENV=production` configured
- [ ] No sensitive values in .env.example
- [ ] `.env` file added to `.gitignore`

### Database Security

- [ ] Database file (simwarga.db) will be writable by app only
- [ ] Database backups planned
- [ ] No production data in test databases
- [ ] Database schema migrations tested

### API Security

- [ ] CORS properly configured untuk production domain
- [ ] JWT token expiration set appropriately
- [ ] Rate limiting implemented (if high traffic expected)
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] SQL injection prevention verified

### HTTPS/SSL

- [ ] Domain has valid SSL certificate
- [ ] HTTPS will be enforced on smarterasp.net
- [ ] web.config configured untuk HTTPS redirect
- [ ] Headers configured untuk security (X-Frame-Options, etc.)

---

## 🖥️ Hosting Account Setup

### smarterasp.net Account

- [ ] Node.js hosting plan activated
- [ ] FTP/SFTP credentials obtained
- [ ] Control panel access verified
- [ ] Node.js version confirmed (v14+ support)
- [ ] Disk space available: minimum 500MB
- [ ] RAM allocated: minimum 512MB (1GB+ recommended)

### Domain Configuration

- [ ] Domain registered and pointing to smarterasp.net
- [ ] DNS records configured:
  - [ ] A record pointing to smarterasp.net servers
  - [ ] CNAME records (if using subdomain)
  - [ ] MX records (if using email)
- [ ] SSL certificate provisioned
- [ ] Domain active and accessible

### File System Setup

- [ ] FTP root folder identified
- [ ] Write permissions checked for app folders
- [ ] Backup location available
- [ ] Temporary folder accessible (/tmp or equivalent)

---

## 📋 Deployment Execution

### Pre-Upload

- [ ] ZIP archive created: `simwarga-production.zip`
- [ ] ZIP file size verified (shouldn't be huge)
- [ ] ZIP contents verified (extract locally and check)
- [ ] Upload method chosen (FTP / Control Panel / SFTP)

### Upload Process

- [ ] Archive uploaded successfully
- [ ] Upload integrity verified (checksum match if available)
- [ ] Archive extracted to correct location
- [ ] Folder permissions set correctly:
  - [ ] `/backend` - 755 (readable, writable)
  - [ ] `/frontend/dist` - 755
  - [ ] `server.js` - 644 (readable)
  - [ ] `web.config` - 644

### Installation on Server

- [ ] SSH/terminal access established (if needed)
- [ ] Navigated to application root: `cd /path/to/app`
- [ ] Dependencies installed: `cd backend && npm install --production`
- [ ] Installation completed without errors
- [ ] `node_modules` folder size verified

---

## ⚙️ Application Configuration

### startup File

- [ ] Control panel: Startup file set to `server.js`
- [ ] Node.js version selected: latest stable
- [ ] Environment variables set in control panel:
  - [ ] `NODE_ENV=production`
  - [ ] `JWT_SECRET=<value>`
  - [ ] `ALLOWED_ORIGINS=<domain>`
  - [ ] Other required variables

### Environment Variables (Alternative)

- [ ] `.env` file created on server
- [ ] All required variables filled in
- [ ] `.env` file permissions: 600 (readable by app only)
- [ ] `.env` file tested (app can read it)

### Application Start

- [ ] Application started via control panel
- [ ] Status checked: "Running" or "Active"
- [ ] Process confirmed running: check logs
- [ ] No startup errors in logs

---

## 🧪 Verification & Testing

### Application Health Check

- [ ] Browser access: `https://your-domain.com` - loads without errors
- [ ] API endpoint: `https://your-domain.com/api` - responds
- [ ] Static assets loaded: CSS, JS, images visible
- [ ] No 404 or 500 errors in browser console
- [ ] Application logs show normal startup

### Functional Testing

- [ ] User login works correctly
- [ ] Frontend features functional
- [ ] Database queries working
- [ ] File uploads (if implemented) working
- [ ] Email/SMS (if implemented) working

### Performance Testing

- [ ] Page load time acceptable (< 3 seconds)
- [ ] API response time acceptable (< 500ms for simple queries)
- [ ] No memory leak signs in control panel
- [ ] Database size reasonable

### Security Testing

- [ ] Attempting direct .env access → 403 Forbidden
- [ ] Attempting direct database access → blocked
- [ ] CORS headers correct for your domain only
- [ ] JWT validation working
- [ ] HTTPS enforced (http → https redirect)

---

## 📊 Monitoring Setup

### Logging

- [ ] Application logs accessible in control panel
- [ ] Error logs monitored regularly
- [ ] Log rotation configured (if available)
- [ ] Critical errors identified and documented

### Backup Strategy

- [ ] Database backup schedule defined (weekly minimum)
- [ ] First backup taken immediately after deploy
- [ ] Backup location secure and tested
- [ ] Restore procedure documented

### Monitoring

- [ ] Uptime monitoring configured (external service)
- [ ] Email alerts setup for downtime
- [ ] Performance metrics baseline established
- [ ] Regular monitoring schedule set

---

## 📝 Documentation

### Deployment Record

- [ ] Deployment date recorded
- [ ] Deployed version/commit recorded
- [ ] Configuration values documented (securely)
- [ ] Any custom setup steps documented
- [ ] Known issues documented

### Maintenance Plan

- [ ] Update schedule defined (security patches, etc.)
- [ ] Downtime notification process established
- [ ] Rollback procedure documented
- [ ] Contact points for support identified

### Team Communication

- [ ] Team notified of deployment
- [ ] Access credentials shared securely
- [ ] Maintenance window communicated
- [ ] Change log updated

---

## ✅ Post-Deployment

### 24-Hour Monitoring

- [ ] Application running stable for 24 hours
- [ ] No errors in logs
- [ ] Performance metrics normal
- [ ] Users accessing without issues
- [ ] Database file growing at expected rate

### Week 1 Monitoring

- [ ] Application stable throughout week
- [ ] No recurring errors
- [ ] Performance under various loads
- [ ] Any issues immediately addressed
- [ ] First backup completed successfully

### Go-Live Confirmation

- [ ] All checklist items complete
- [ ] No critical issues identified
- [ ] Performance acceptable
- [ ] Team trained on operations
- [ ] Documentation complete

---

## 🚨 Emergency Procedures

### If Something Goes Wrong

1. **Immediate Actions:**
   - [ ] Stop application in control panel
   - [ ] Check error logs for specific error
   - [ ] Note exact time and symptoms
   - [ ] Review recent changes/configuration

2. **Diagnosis:**
   - [ ] Check `.env` file configuration
   - [ ] Verify database file exists and accessible
   - [ ] Check file permissions on critical folders
   - [ ] Verify Node.js version compatibility
   - [ ] Check available disk space and RAM

3. **Resolution:**
   - [ ] Fix identified issue
   - [ ] Test locally if possible
   - [ ] Restart application
   - [ ] Monitor logs for success
   - [ ] Run verification tests again

4. **Rollback (if needed):**
   - [ ] Stop current application
   - [ ] Restore previous backup (if available)
   - [ ] Verify restored version works
   - [ ] Document incident and resolution

---

## 📞 Support Contacts

- **smarterasp.net Support**: https://www.smarterasp.net/support
- **Node.js Issues**: https://nodejs.org/en/docs/
- **Express.js Help**: https://expressjs.com
- **Database (SQLite)**: https://www.sqlite.org

---

## Notes

```
Add any project-specific notes here:
- Custom setup steps
- Known limitations
- Special configuration
- Performance tuning
```

---

**Checklist Version**: 1.0  
**Last Updated**: 2024  
**Project**: SimWarga  
**Hosting**: smarterasp.net
