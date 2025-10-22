// index.js - ABSOLUTELY FIRST LINES
const oracledb = require('oracledb');
const path = require('path');
const fs = require('fs');
require('dotenv').config();


// Initialize Oracle Client IMMEDIATELY
let clientPath;

// Check if ORACLE_CLIENT_PATH is set and actually exists
if (process.env.ORACLE_CLIENT_PATH && fs.existsSync(process.env.ORACLE_CLIENT_PATH)) {
  clientPath = path.resolve(process.env.ORACLE_CLIENT_PATH);
} else {
  const isWindows = process.platform === 'win32';
  clientPath = path.resolve(__dirname, isWindows 
    ? './instantclient/windows/instantclient_19_28'
    : './instantclient/linux/instantclient_21_12'
  );
}

if (process.platform !== 'win32') {
  process.env.LD_LIBRARY_PATH = clientPath + ':' + (process.env.LD_LIBRARY_PATH || '');
}

// Verify path exists before initializing
if (!fs.existsSync(clientPath)) {
  process.exit(1);
}

try {
  oracledb.initOracleClient({ libDir: clientPath });
} catch (err) {
  console.error('❌ FAILED to initialize Oracle Client:', err.message);
  process.exit(1);
}

// NOW load everything else
const express = require("express");

// console.log('🔥 Step 1: Loading routes file...');
const labelRoutes = require("./routes/labelRoutes");
// console.log('✅ Step 1 complete: Routes file loaded');

const { closeAllConnections } = require("./config/oracleDbConfig");

// console.log('🔥 Step 2: Creating Express app...');
const app = express();
// console.log('✅ Step 2 complete: App created');

// console.log('🔥 Step 3: Adding JSON middleware...');
app.use(express.json());
// console.log('✅ Step 3 complete: JSON middleware added');

// Add request logger
// console.log('🔥 Step 4: Adding request logger...');


// console.log('🔥 Step 5: Mounting routes at "/"...');
app.use("/", labelRoutes);
// console.log('✅ Step 5 complete: Routes mounted');

// 404 handler - MUST be after all routes
app.use((req, res) => {
  // console.log(`\n❌ 404 - No route matched: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    url: req.url,
    path: req.path,
    availableRoutes: [
      'GET /test',
      'POST /fetch-external-shipment-data'
    ]
  });
});

const PORT = process.env.PORT || 3000;
// console.log(`🔥 Step 6: Starting server on port ${PORT}...`);

const server = app.listen(PORT, () => {

  
  // List all registered routes
  // console.log('🗺️  Registered routes:');

  
  // console.log(`\n📊 Total routes registered: ${routeCount}\n`);
});
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  server.close(async () => {
    await closeAllConnections();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  // console.log("Shutting down...");
  server.close(async () => {
    await closeAllConnections();
    process.exit(0);
  });
});
