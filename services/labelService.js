const { getConnection } = require('../config/oracleDbConfig');
const { getExtDbInfo } = require('../helper/api');
// Just require oracledb directly - it's already initialized in index.js
const oracledb = require('oracledb');

async function checkConnection(payload) {
  try {
    const params = {
      CompanyId: payload.CompanyId,
      ConfigId: payload.ConfigId,
      DbName: payload.DbName
    };
    
    // Get database credentials from API
    const data = await getExtDbInfo(process.env.DB_INFO_ENDPOINT, params);
    const dbInfo = data.items[0];

    // Decrypt password
    const decodedPassword = Buffer.from(dbInfo.db_password_enc, 'base64').toString('utf-8');

    const dbConfig = {
      user: dbInfo.db_user_name,
      password: decodedPassword,
      connectString: `${dbInfo.db_host}:${dbInfo.db_port}/${dbInfo.db_service_name}`
    };

    // Get cached Sequelize instance (or create new one)
    const sequelize = await getConnection(
      payload.CompanyId,
      payload.ConfigId,
      payload.DbName,
      dbConfig
    );

    return { sequelize };

  } catch (err) {
    console.error("❌ Connection Error:", err.message);
    throw err;
  }
}

// Execute stored procedure with SYS_REFCURSOR
async function callStoredProcedure(sequelize, procedureName, parameters) {
  try {
    // Get connection from pool (pool manages connections automatically)
    const connection = await sequelize.connectionManager.getConnection();
    
    // Build bind parameters
    const bindParams = {};
    
    // Add IN parameters
    for (const [key, value] of Object.entries(parameters)) {
      bindParams[key] = value;
    }
    
    // Add OUT parameter for SYS_REFCURSOR
    bindParams.o_data = { dir: oracledb.BIND_OUT, type: oracledb.CURSOR };
    
    // Build procedure call SQL
    const paramNames = Object.keys(parameters).map(key => `${key} => :${key}`).join(', ');
    const sql = `BEGIN ${procedureName}(${paramNames}${paramNames ? ', ' : ''}o_data => :o_data); END;`;
    
    console.log('📝 Executing:', procedureName);
    
    // Execute the procedure
    const result = await connection.execute(sql, bindParams, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    
    // Fetch all rows from cursor
    const cursor = result.outBinds.o_data;
    const rows = await cursor.getRows();
    await cursor.close();
    
    console.log(`✅ Fetched ${rows.length} rows`);
    
    // Connection automatically returned to pool
    return rows;

  } catch (err) {
    console.error("❌ Procedure error:", err.message);
    throw err;
  }
}

module.exports = { checkConnection, callStoredProcedure };