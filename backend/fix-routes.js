const fs = require("fs");
const path = require("path");

let content = fs.readFileSync(path.join(__dirname, "src/index.js"), "utf8");

// Replace app.get('/api/xxx' with apiRouter.get('/xxx'
content = content.replace(
  /app\.(get|post|put|delete|all)\((["'])\/api\//g,
  "apiRouter.$1($2/",
);

// Find app.listen position and insert SPA fallback before it
const listenIdx = content.indexOf("app.listen(PORT");

const spaBlock = `
// ===== MOUNT API ROUTER =====
app.use('/api', apiRouter);

// ===== SPA FALLBACK =====
const staticDir = path.join(__dirname, '../../frontend/dist');
const indexPath = path.join(staticDir, 'index.html');

// API 404 for unmatched routes
apiRouter.use((req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Serve static files and SPA
app.use((req, res) => {
  const fp = path.join(staticDir, req.path === '/' ? 'index.html' : req.path);
  try { if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return res.sendFile(fp); } catch (e) {}
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send('Not Found');
});

`;

content =
  content.substring(0, listenIdx) + spaBlock + content.substring(listenIdx);

// Remove the debug log
content = content.replace(
  'console.log(">>> LOGIN ROUTE HIT <<<", req.body);\n  ',
  "",
);

fs.writeFileSync(path.join(__dirname, "src/index.js"), content);
console.log("Backend restructured with Router pattern");
