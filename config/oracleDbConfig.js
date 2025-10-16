const { Sequelize } = require('sequelize');
const oracledb = require('oracledb');
require('dotenv').config();

// Oracle Client already initialized in index.js
console.log('📌 oracleDbConfig loaded - Oracle mode:', oracledb.thin ? 'THIN' : 'THICK');

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
  
  try {
    await sequelize.authenticate();
    console.log(`✅ Database connection authenticated: ${cacheKey}`);
  } catch (error) {
    console.error(`❌ Database authentication failed: ${cacheKey}`, error.message);
    throw error;
  }
  
  connectionCache.set(cacheKey, sequelize);
  
  console.log(`✅ Sequelize instance cached: ${cacheKey}`);
  return sequelize;
}

async function closeAllConnections() {
  console.log('🔒 Closing all Sequelize instances...');
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