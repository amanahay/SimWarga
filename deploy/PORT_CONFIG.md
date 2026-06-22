# SimWarga - Port Configuration Guide untuk smarterasp.net

Panduan konfigurasi port untuk shared hosting environments.

---

## 📌 Overview

Di shared hosting seperti smarterasp.net, port management berbeda dengan VPS/dedicated server:
- Port biasanya di-assign oleh hosting provider
- Multiple applications berbagi IIS/Apache server
- Direct port access terbatas
- Configuration melalui control panel

---

## 🔧 Port Configuration Strategy

### Default Port Usage

```
Development:     Port 3000 (localhost:3000)
Production:      Dynamic port assigned by hosting
                 OR static port (3000, 5000, 8080, etc.)
                 → Depends on hosting configuration
```

### How smarterasp.net Handles Ports

1. **IIS (Windows Server)**
   - Host header binding (domain-based routing)
   - Single port 80/443 shared by multiple apps
   - Routing via domain/subdomain
   - NO need to specify port in URL

2. **Apache/Nginx (Linux)**
   - Virtual host configuration
   - Each app may get different port
   - Reverse proxy handles routing
   - Domain automapping to app port

---

## 🚀 Configuration for smarterasp.net

### Step 1: Determine Available Port

**Ask hosting provider OR check control panel:**

```
Common smarterasp.net ports:
- Ports 3000-3999: Usually available for apps
- Ports 5000-5999: Alternative range
- Ports 8000-9000: Sometimes available
```

**Find your assigned port:**
1. Login to smarterasp.net control panel
2. Navigate to Node.js application settings
3. Look for "Port" or "Application Port" field
4. Note the assigned port (e.g., 3000, 5001, etc.)

### Step 2: Configure PORT Environment Variable

#### Option A: Via Control Panel

1. Open Node.js Application Settings
2. Set Environment Variable:
   ```
   PORT=3000    (or your assigned port)
   ```
3. Save changes

#### Option B: Via .env File

Edit `.env` on server:
```bash
PORT=3000
NODE_ENV=production
HOST=0.0.0.0
```

#### Option C: Fallback (Auto-Detection)

If port not configured, application defaults to:
```javascript
const PORT = process.env.PORT || 3000;
```

### Step 3: Verify Configuration

```bash
# On server, test if port is accessible
curl http://localhost:3000
curl http://localhost:3000/api

# Or via browser (if direct access allowed):
http://your-domain.com:3000
http://your-domain.com:3000/api
```

---

## 📝 PORT Configuration in Code

### Current Implementation (backend/src/index.js)

```javascript
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Features:**
- ✓ Respects PORT environment variable
- ✓ Fallback to 3000 if not set
- ✓ Listens on all interfaces (0.0.0.0)
- ✓ Compatible dengan shared hosting

### Recommended PORT Configuration

For maximum flexibility on shared hosting, add:

```javascript
// backend/src/index.js

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`
    ╔═══════════════════════════════════╗
    ║  SimWarga Server Started          ║
    ║  Port: ${PORT}                         ║
    ║  Host: ${HOST}                        ║
    ║  Env:  ${process.env.NODE_ENV}              ║
    ╚═══════════════════════════════════╝
  `);
});
```

---

## 🔒 Port Security

### Access Control

```
Public Access (via domain):
✓ https://your-domain.com/api
✓ https://your-domain.com

Direct Port Access:
? Depends on firewall configuration
? Usually blocked for security on shared hosting
? Contact support if needed
```

### Firewall Rules (smarterasp.net)

Typically managed by hosting provider:
- Inbound: Only HTTP/HTTPS (80, 443) allowed
- Outbound: Application ports may be restricted
- Database ports: SQLite (local only)
- SSH: May require whitelisting

---

## 🌐 Domain Routing Configuration

### IIS URL Rewriting (web.config)

Current configuration already handles:
```xml
<rule name="DynamicContent">
  <match url=".*" />
  <conditions>
    <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
  </conditions>
  <action type="Rewrite" url="server.js" />
</rule>
```

This means:
- ✓ `https://your-domain.com/` → routed to app
- ✓ `https://your-domain.com/api` → routed to app
- ✓ Port transparent to user

### Apache Virtual Host (if applicable)

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
</VirtualHost>
```

---

## 🧪 Testing Port Configuration

### Test 1: Environment Variable

```bash
# SSH into server (if available)
echo $PORT
# Output: 3000 (or your configured port)
```

### Test 2: Application Startup

```bash
# View console output on control panel
# Should show: "Server running on port 3000"
```

### Test 3: API Connectivity

```bash
# Via browser
https://your-domain.com/api

# Via curl (if SSH available)
curl https://your-domain.com/api

# Expected response: JSON API response (not error)
```

### Test 4: Check Listening Ports

```bash
# SSH into server
netstat -tlnp | grep node
# Or
ps aux | grep "node server.js"
```

---

## 📊 Port Usage Matrix

| Environment | Port | Access | Configuration |
|------------|------|--------|-----------------|
| Local Dev | 3000 | localhost:3000 | PORT=3000 |
| Production | Assigned | domain.com | PORT={assigned} |
| Staging | 5000 | staging.domain.com | PORT=5000 |
| Fallback | 3000 | if ENV not set | default |

---

## ⚠️ Common Port Issues & Solutions

### Issue: Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
1. Only one Node.js instance should run
2. Stop existing process via control panel
3. Wait 30 seconds
4. Restart application
5. Check logs for confirmation

### Issue: Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Solution:**
1. Verify application is running (check control panel status)
2. Verify PORT environment variable set correctly
3. Check firewall/network permissions
4. Restart application from control panel

### Issue: Port Not Accessible

```
timeout connecting to application
```

**Possible Causes:**
- Application crashed (check logs)
- Port configuration mismatch
- Firewall blocking access
- Host not listening on 0.0.0.0

**Solution:**
1. Check control panel logs
2. Verify PORT in .env matches configured port
3. Check file permissions
4. Contact hosting support

### Issue: Multiple Instances Running

```
"port already in use"
```

**Solution:**
```bash
# Kill orphaned processes (via SSH if available)
pkill -f "node server.js"

# Then restart via control panel
```

---

## 🚀 Advanced Port Configuration

### Load Balancing (if supported)

If hosting supports cluster mode:

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  app.listen(PORT, HOST);
}
```

Note: Most shared hosting doesn't support this. Contact provider.

### Port Range Configuration

For flexibility on multiple environments:

```javascript
const getPort = () => {
  const env = process.env.NODE_ENV || 'development';
  const ports = {
    development: 3000,
    staging: 5000,
    production: parseInt(process.env.PORT) || 3000,
  };
  return ports[env];
};

const PORT = getPort();
```

---

## 📋 Configuration Checklist

Before deployment, verify:

- [ ] PORT environment variable set in control panel
- [ ] Startup file: `server.js`
- [ ] Node version compatible
- [ ] .env file has PORT config as backup
- [ ] web.config contains rewrite rules
- [ ] Application starts without "port in use" errors
- [ ] API accessible via domain (no direct port in URL)
- [ ] Logs show correct port in startup message

---

## 📞 Support

### If Port Issues Persist

1. **Check smarterasp.net Docs:**
   - https://www.smarterasp.net/support/kb

2. **Contact Support with:**
   - Application error logs
   - Exact PORT configuration
   - Error messages
   - Steps to reproduce

3. **Information to Provide:**
   - Node.js version
   - Application startup output
   - .env PORT setting
   - Control panel NODE_PORT setting

---

## Reference

- **Express.js Port Config**: https://expressjs.com/en/api/app.html#app.listen
- **Node.js Process Env**: https://nodejs.org/api/process.html#process_process_env
- **IIS URL Rewrite**: https://docs.microsoft.com/en-us/iis/extensions/url-rewrite-module/

---

**Last Updated**: 2024  
**Target Platform**: smarterasp.net  
**Default Port**: 3000  
**Production Port**: Auto-assigned by hosting
