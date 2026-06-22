DEPLOY SMARTERASP - demo.itu.biz.id

Isi paket ini:
- server.js
- web.config
- backend/
- frontend/dist/

Cara pakai:
1. Upload seluruh isi ZIP ke root site Node.js di SmarterASP.
2. Startup file: server.js
3. Node version: gunakan Node.js >= 22.5.0.
4. Pastikan permissions tulis mengizinkan folder backend untuk SQLite.
5. Di folder backend, jalankan: npm ci --omit=dev

Catatan:
- Frontend dan backend jalan dari satu aplikasi Node.
- API tersedia di /api
- Frontend static diserve dari frontend/dist
- Database SQLite ada di backend/simwarga.db
- Paket ini tidak menyertakan node_modules dan tidak membawa file native .node/.dll.
- Backend memakai node:sqlite bawaan Node agar tidak ada dependency SQLite native npm seperti better-sqlite3/sqlite3.
