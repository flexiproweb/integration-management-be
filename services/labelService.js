const { createSequelizeConnection } = require('../config/oracleDbConfig');
const { getExtDbInfo } = require('../helper/api');
const oracledb = require('oracledb');

// Cache for Sequelize connections
const connectionCache = new Map();

async function checkConnection(payload) {
  try {
    const params = {
      CompanyId: payload.CompanyId,
      ConfigId: payload.ConfigId,
      DbName: payload.DbName
    };
    
    // Create cache key
    const cacheKey = `${payload.CompanyId}-${payload.ConfigId}-${payload.DbName}`;
    
    // Check if connection already exists in cache
    if (connectionCache.has(cacheKey)) {
      console.log('✅ Reusing cached connection for:', cacheKey);
      const cachedSequelize = connectionCache.get(cacheKey);
      
      // Test if connection is still alive
      try {
        await cachedSequelize.authenticate();
        return { 
          message: "Connection reused from cache", 
          sequelize: cachedSequelize,
          cached: true
        };
      } catch (err) {
        // Connection is dead, remove from cache and create new one
        console.log('⚠️ Cached connection is dead, creating new one');
        connectionCache.delete(cacheKey);
        await cachedSequelize.close();
      }
    }
    
    const data = await getExtDbInfo(process.env.DB_INFO_ENDPOINT, params);
    const dbInfo = data.items[0];

    // 🔐 Decrypt password if needed
    const decodedPassword = Buffer.from(dbInfo.db_password_enc, 'base64').toString('utf-8');

    const dbConfig = {
      user: dbInfo.db_user_name,
      password: decodedPassword,
      connectString: `${dbInfo.db_host}:${dbInfo.db_port}/${dbInfo.db_service_name}`
    };

    // Create Sequelize connection
    const sequelize = createSequelizeConnection(dbConfig);

    // Test the connection
    await sequelize.authenticate();
    console.log('✅ New Sequelize connection established for:', cacheKey);
    
    // Store in cache
    connectionCache.set(cacheKey, sequelize);

    return { 
      message: "Connection successful", 
      sequelize,
      cached: false,
      connectionInfo: {
        host: dbInfo.db_host,
        port: dbInfo.db_port,
        serviceName: dbInfo.db_service_name,
        user: dbInfo.db_user_name
      }
    };

  } catch (err) {
    console.error("❌ Connection Error:", err.message);
    throw err;
  }
}

// Execute stored procedure with SYS_REFCURSOR
async function callStoredProcedure(sequelize, procedureName, parameters) {
  try {
    // Get raw connection from Sequelize pool
    const connection = await sequelize.connectionManager.getConnection();
    
    // Build bind parameters
    const bindParams = {};
    
    // Add IN parameters (p_module, p_key, etc.)
    for (const [key, value] of Object.entries(parameters)) {
      bindParams[key] = value;
    }
    
    // Add OUT parameter for SYS_REFCURSOR
    bindParams.o_data = { dir: oracledb.BIND_OUT, type: oracledb.CURSOR };
    
    // Build procedure call SQL
    const paramNames = Object.keys(parameters).map(key => `${key} => :${key}`).join(', ');
    const sql = `BEGIN ${procedureName}(${paramNames}${paramNames ? ', ' : ''}o_data => :o_data); END;`;
    
    console.log('📝 Executing SQL:', sql);
    console.log('📝 Bind parameters:', bindParams);
    
    // Execute the procedure
    const result = await connection.execute(sql, bindParams, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    
    console.log('✅ Procedure executed, fetching cursor data...');
    
    // Fetch all rows from the cursor
    const cursor = result.outBinds.o_data;
    const rows = await cursor.getRows();
    
    // Close the cursor
    await cursor.close();
    
    console.log(`✅ Fetched ${rows.length} rows from cursor`);
    
    return rows;

  } catch (err) {
    console.error("❌ Procedure execution error:", err.message);
    throw err;
  }
}

// Optional: Function to close all cached connections (call on app shutdown)
async function closeAllConnections() {
  console.log('🔒 Closing all cached connections...');
  for (const [key, sequelize] of connectionCache.entries()) {
    await sequelize.close();
    console.log(`🔒 Closed connection: ${key}`);
  }
  connectionCache.clear();
}

module.exports = { checkConnection, callStoredProcedure, closeAllConnections };
