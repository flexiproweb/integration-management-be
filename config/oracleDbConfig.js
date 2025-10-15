const { Sequelize } = require('sequelize');
const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

// Get Oracle Client path dynamically handling nested folders
function getOracleClientPath() {
  if (process.env.ORACLE_CLIENT_PATH) {
    return path.resolve(__dirname, '..', process.env.ORACLE_CLIENT_PATH);
  }
  
  // Auto-detect based on platform with nested folder names
  const isWindows = process.platform === 'win32';
  const defaultPath = isWindows 
    ? './instantclient/windows/instantclient_19_28'   // Windows nested folder
    : './instantclient/linux/instantclient_21_12';    // Linux nested folder
  
  return path.resolve(__dirname, '..', defaultPath);
}

const clientPath = getOracleClientPath();

// Initialize Oracle Client in Thick mode
try {
  oracledb.initOracleClient({ libDir: clientPath });
  console.log(`✅ Oracle Instant Client initialized`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Path: ${clientPath}`);
} catch (err) {
  if (err.message.includes('DPI-1047')) {
    console.log('ℹ️ Oracle Client already initialized');
  } else {
    console.error('❌ Failed to initialize Oracle Client:', err.message);
    console.error(`   Attempted path: ${clientPath}`);
    throw err;
  }
}

// Map to cache Sequelize instances per customer
const connectionCache = new Map();

function createSequelizeConnection(dbConfig) {
  const sequelize = new Sequelize({
    dialect: 'oracle',
    username: dbConfig.user,
    password: dbConfig.password,
    dialectOptions: {
      connectString: dbConfig.connectString
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 600000,
      evict: 60000
    },
    logging: false
  });

  return sequelize;
}

async function getConnection(companyId, configId, dbName, dbConfig) {
  const cacheKey = `${companyId}-${configId}-${dbName}`;
  
  if (connectionCache.has(cacheKey)) {
    console.log(`✅ Reusing cached Sequelize instance: ${cacheKey}`);
    return connectionCache.get(cacheKey);
  }
  
  console.log(`🔧 Creating new Sequelize instance: ${cacheKey}`);
  const sequelize = createSequelizeConnection(dbConfig);
  
  await sequelize.authenticate();
  
  connectionCache.set(cacheKey, sequelize);
  
  console.log(`✅ Sequelize instance cached: ${cacheKey}`);
  return sequelize;
}

async function closeAllConnections() {
  console.log('🔒 Closing all Sequelize instances...');
  for (const [key, sequelize] of connectionCache.entries()) {
    await sequelize.close();
    console.log(`🔒 Closed: ${key}`);
  }
  connectionCache.clear();
}

module.exports = { 
  getConnection, 
  closeAllConnections 
};
