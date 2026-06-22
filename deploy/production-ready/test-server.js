// Upload this as server.js temporarily to check Node version and capabilities
const http = require('http');

const info = {
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  cwd: process.cwd(),
  env: {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    HTTP_PLATFORM_PORT: process.env.HTTP_PLATFORM_PORT,
  },
  hasSqlite: false,
  sqliteError: null,
};

try {
  require('node:sqlite');
  info.hasSqlite = true;
} catch (e) {
  info.sqliteError = e.message;
}

const PORT = process.env.PORT || process.env.HTTP_PLATFORM_PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(info, null, 2));
});

server.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(JSON.stringify(info, null, 2));
});
