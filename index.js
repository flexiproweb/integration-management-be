// index.js - ABSOLUTELY FIRST LINES
const oracledb = require('oracledb');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Initialize Oracle Client IMMEDIATELY
let clientPath;

// Check if ORACLE_CLIENT_PATH is set and actually exists
if (process.env.ORACLE_CLIENT_PATH && fs.existsSync(process.env.ORACLE_CLIENT_PATH)) {
  // Use env variable (for local development only)
  clientPath = path.resolve(process.env.ORACLE_CLIENT_PATH);
  console.log('📍 Using ORACLE_CLIENT_PATH from .env');
} else {
  // Auto-detect based on platform (works for both server and Docker)
  const isWindows = process.platform === 'win32';
  clientPath = path.resolve(__dirname, isWindows 
    ? './instantclient/windows/instantclient_19_28'
    : './instantclient/linux/instantclient_21_12'
  );
  console.log('📍 Using project instantclient folder');
}

if (process.platform !== 'win32') {
  process.env.LD_LIBRARY_PATH = clientPath + ':' + (process.env.LD_LIBRARY_PATH || '');
}

console.log('🚀 Initializing Oracle Client in THICK mode...');
console.log(`📍 Path: ${clientPath}`);
console.log(`📍 LD_LIBRARY_PATH: ${process.env.LD_LIBRARY_PATH || 'Not set'}`);

// Verify path exists before initializing
if (!fs.existsSync(clientPath)) {
  console.error(`❌ Oracle Client path does not exist: ${clientPath}`);
  console.error(`Current directory: ${__dirname}`);
  process.exit(1);
}

try {
  oracledb.initOracleClient({ libDir: clientPath });
  console.log('✅ SUCCESS: Oracle Client initialized in THICK mode');
} catch (err) {
  console.error('❌ FAILED to initialize Oracle Client:', err.message);
  process.exit(1);
}

// Verify immediately
console.log('\n=== VERIFICATION ===');
console.log(`Mode: ${oracledb.thin ? '❌ THIN' : '✅ THICK'}`);
console.log(`Version: ${oracledb.oracleClientVersionString || 'N/A'}`);
console.log('====================\n');

// NOW load everything else
const express = require("express");
const labelRoutes = require("./routes/labelRoutes");
const { closeAllConnections } = require("./config/oracleDbConfig");

const app = express();
app.use(express.json());
app.use("/", labelRoutes);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Pool eviction runs every 1 minute`);
  console.log(`Connections idle for 10+ minutes will be closed automatically`);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  server.close(async () => {
    await closeAllConnections();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  server.close(async () => {
    await closeAllConnections();
    process.exit(0);
  });
});