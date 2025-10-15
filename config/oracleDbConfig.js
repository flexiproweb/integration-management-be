const { Sequelize } = require('sequelize');
const oracledb = require('oracledb');
require('dotenv').config();

// Initialize Oracle Client in Thick mode
oracledb.initOracleClient({ libDir: 'C:\\Windows\\instantclient_19_28' });

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
      max: 5,              // Maximum 5 connections in pool
      min: 0,              // Minimum 0 connections (can shrink to zero)
      acquire: 30000,      // Maximum time (ms) to get connection before timeout
      idle: 600000,        // Connection idle for 10 minutes = eligible for eviction
      evict: 60000         // Check every 1 minute for idle connections to evict
    },
    logging: false
  });

  return sequelize;
}

// Get or create cached Sequelize instance
async function getConnection(companyId, configId, dbName, dbConfig) {
  const cacheKey = `${companyId}-${configId}-${dbName}`;
  
  // Check if Sequelize instance exists in cache
  if (connectionCache.has(cacheKey)) {
    console.log(`✅ Reusing cached Sequelize instance: ${cacheKey}`);
    return connectionCache.get(cacheKey);
  }
  
  // Create new Sequelize instance
  console.log(`🔧 Creating new Sequelize instance: ${cacheKey}`);
  const sequelize = createSequelizeConnection(dbConfig);
  
  // Test connection (this will create first connection in pool)
  await sequelize.authenticate();
  
  // Store Sequelize instance in cache (NOT the connection)
  connectionCache.set(cacheKey, sequelize);
  
  console.log(`✅ Sequelize instance cached: ${cacheKey}`);
  return sequelize;
}

// Close all Sequelize instances
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
