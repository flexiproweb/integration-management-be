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

// Oracle Client already initialized in index.js
// console.log('📌 oracleDbConfig loaded - Oracle mode:', oracledb.thin ? 'THIN' : 'THICK');

// Map to cache Sequelize instances per customer
const connectionCache = new Map();

function createSequelizeConnection(dbConfig) {
  const sequelize = new Sequelize({
    dialect: 'oracle',
    username: dbConfig.user,
    password: dbConfig.password,
    dialectOptions: {
      connectString: dbConfig.connectString,
      // Oracle oracledb module specific timeouts
      connectTimeout: 60,           // Connection timeout in seconds
      callTimeout: 300000,          // Query/procedure timeout in ms (5 minutes)
      queueTimeout: 60000,          // Time to wait for connection from pool
      // Additional Oracle settings
      stmtCacheSize: 30,            // Statement cache size
      fetchArraySize: 100,          // Rows to fetch at once
    },
    pool: {
      max: 20,
      min: 2,                       // Changed from 0 - keep some connections warm
      acquire: 90000,               // Increased from 30000 (90 seconds to acquire)
      idle: 600000,                 // 10 minutes idle timeout
      evict: 60000,                 // Check for idle connections every minute
    },
    // Query-level timeout
    dialectOptions: {
      connectString: dbConfig.connectString,
      connectTimeout: 60,
      callTimeout: 300000,          // 5 minutes for stored procedures
      queueTimeout: 60000,
    },
    logging: false,
    // Retry failed connections
    retry: {
      max: 3,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /timeout/i,
        /ETIMEDOUT/,
      ],
    },
  });

  return sequelize;
}

async function getConnection(companyId, configId, dbName, dbConfig) {
  const cacheKey = `${companyId}-${configId}-${dbName}`;
  
  if (connectionCache.has(cacheKey)) {
    // console.log(`✅ Reusing cached Sequelize instance: ${cacheKey}`);
    return connectionCache.get(cacheKey);
  }
  
  // console.log(`🔧 Creating new Sequelize instance: ${cacheKey}`);
  const sequelize = createSequelizeConnection(dbConfig);
  
  try {
    await sequelize.authenticate();
    // console.log(`✅ Database connection authenticated: ${cacheKey}`);
  } catch (error) {
    // console.error(`❌ Database authentication failed: ${cacheKey}`, error.message);
    throw error;
  }
  
  connectionCache.set(cacheKey, sequelize);
  
  // console.log(`✅ Sequelize instance cached: ${cacheKey}`);
  return sequelize;
}

async function closeAllConnections() {
  // console.log('🔒 Closing all Sequelize instances...');
  for (const [key, sequelize] of connectionCache.entries()) {
    try {
      await sequelize.close();
      console.log(`🔒 Closed: ${key}`);
    } catch (error) {
      console.error(`❌ Error closing connection ${key}:`, error.message);
    }
  }
  connectionCache.clear();
  console.log('✅ All connections closed');
}

module.exports = { 
  getConnection, 
  closeAllConnections 
};