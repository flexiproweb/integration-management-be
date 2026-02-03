const { getConnection } = require('../config/oracleDbConfig');
const { getExtDbInfo } = require('../helper/api');
const AppError = require('../helper/appError'); 
const oracledb = require('oracledb');

async function checkConnection(payload) {
  try {
    const params = {
      CompanyId: payload.CompanyId,
      ConfigId: payload.ConfigId,
      DbName: payload.DbName
    };

    // console.log(payload, "*****");

    // Get database credentials from API
    const data = await getExtDbInfo(process.env.DB_INFO_ENDPOINT, params);

    if (!data || !data.items || data.items.length === 0) {
  throw new AppError("No Data Found");
}

    const dbInfo = data.items[0];

    // Decrypt password
    const decodedPassword = Buffer.from(dbInfo.db_password_enc, 'base64').toString('utf-8');
    // console.log(decodedPassword, "()()");

    const dbConfig = {
      user: dbInfo.db_user_name,
      password: decodedPassword,
      connectString: `${dbInfo.db_host}:${dbInfo.db_port}/${dbInfo.db_service_name}`
    };

    try {
      // Get cached Sequelize instance (or create new one)
      const sequelize = await getConnection(
        payload.CompanyId,
        payload.ConfigId,
        payload.DbName,
        dbConfig
      );
      return { sequelize };
    } catch (connErr) {
      throw new Error("Connection error to external DB: " + connErr.message);
    }

  } catch (err) {
    throw err;
  }
}

// Execute stored procedure with SYS_REFCURSOR
async function callStoredProcedure(sequelize, procedureName, parameters) {
  let connection;
  let cursor;
  
  try {
    console.log(`🔍 Calling procedure: ${procedureName}`);
    const startTime = Date.now();
    
    // Get connection from pool with timeout
    connection = await sequelize.connectionManager.getConnection({
      type: 'SELECT',
      useMaster: false
    });

    // Build bind parameters
    const bindParams = {};
    
    // Add input parameters
    for (const [key, value] of Object.entries(parameters)) {
      bindParams[key] = value;
    }

    // Add OUT parameter for SYS_REFCURSOR
    bindParams.o_data = { dir: oracledb.BIND_OUT, type: oracledb.CURSOR };

    // Build procedure call SQL
    const inputParamNames = Object.keys(parameters)
      .map(key => `${key} => :${key}`)
      .join(', ');

    // Construct SQL with proper comma handling
    const allParams = inputParamNames 
      ? `${inputParamNames}, o_data => :o_data`
      : 'o_data => :o_data';

    const sql = `BEGIN ${procedureName}(${allParams}); END;`;

    console.log('🔍 Executing SQL:', sql);
    console.log('🔍 Bind Params:', JSON.stringify(bindParams, null, 2));

    // Execute the procedure with explicit timeout
    const executeStartTime = Date.now();
    
    const result = await Promise.race([
      connection.execute(sql, bindParams, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        // Add execution options
        autoCommit: false,
        extendedMetaData: false,
        // Timeout handled by Promise.race below
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Procedure execution timeout after 5 minutes')), 300000) // 5 min timeout
      )
    ]);

    const executeTime = Date.now() - executeStartTime;
    console.log(`✅ Procedure executed in ${executeTime}ms`);

    // Fetch all rows from cursor
    cursor = result.outBinds.o_data;
    
    if (!cursor) {
      throw new Error('No cursor returned from procedure');
    }

    const fetchStartTime = Date.now();
    
    // Fetch rows with timeout
    const rows = await Promise.race([
      cursor.getRows(), // Get all rows at once
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cursor fetch timeout after 2 minutes')), 120000) // 2 min timeout
      )
    ]);

    const fetchTime = Date.now() - fetchStartTime;
    console.log(`✅ Fetched ${rows.length} rows in ${fetchTime}ms`);

    // Close cursor
    await cursor.close();
    cursor = null;

    const totalTime = Date.now() - startTime;
    console.log(`✅ Total procedure execution time: ${totalTime}ms`);

    return rows;

  } catch (err) {
    console.error('❌ Procedure Error:', err.message);
    console.error('❌ Error Code:', err.code);
    console.error('❌ Error Stack:', err.stack);

    // Provide more specific error messages
    let errorMessage = 'Procedure execution failed';
    
    if (err.message.includes('timeout') || err.message.includes('Timeout')) {
      errorMessage = 'Operation timeout - procedure took too long to execute';
    } else if (err.code === 'ETIMEDOUT') {
      errorMessage = 'Network timeout - unable to reach database';
    } else if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - database is not accepting connections';
    } else if (err.code === 'ENOTFOUND') {
      errorMessage = 'Database host not found - check connection string';
    } else if (err.message.includes('ORA-')) {
      errorMessage = `Database error: ${err.message}`;
    } else {
      errorMessage = err.message;
    }

    throw new Error(errorMessage);

  } finally {
    // Ensure cursor is closed
    if (cursor) {
      try {
        await cursor.close();
        console.log('✅ Cursor closed in finally block');
      } catch (closeErr) {
        console.error('❌ Error closing cursor:', closeErr.message);
      }
    }

    // IMPORTANT: Release connection back to pool
    if (connection) {
      try {
        await sequelize.connectionManager.releaseConnection(connection);
        console.log('✅ Connection released back to pool');
      } catch (releaseErr) {
        console.error('❌ Error releasing connection:', releaseErr.message);
      }
    }
  }
}

module.exports = { checkConnection, callStoredProcedure };
