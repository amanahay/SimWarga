// SimWarga Production Entry Point
// Wraps the main app with error handling for easier debugging on hosting

console.log("[SimWarga] Starting production server...");
console.log("[SimWarga] Node version:", process.version);
console.log("[SimWarga] CWD:", process.cwd());
console.log("[SimWarga] PORT env:", process.env.PORT);
console.log("[SimWarga] NODE_ENV:", process.env.NODE_ENV);

try {
  require("./backend/src/index.js");
} catch (err) {
  console.error("[SimWarga] FATAL: Failed to start server");
  console.error("[SimWarga] Error:", err.message);
  console.error("[SimWarga] Stack:", err.stack);
  process.exit(1);
}
