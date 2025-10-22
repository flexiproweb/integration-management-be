const { getConnection } = require('../config/oracleDbConfig');
const { getExtDbInfo } = require('../helper/api');
const AppError = require('../helper/appError'); 
const oracledb = require('oracledb');
// class AppError extends Error {
//   constructor(error, status = 400) {
//     super(error);
//     this.success = false;
//     this.error = error;
//     this.status = status;
//   }
// }
// Check DB connection
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
  try {
    const connection = await sequelize.connectionManager.getConnection();

    // Build bind parameters
    const bindParams = {};
    for (const [key, value] of Object.entries(parameters)) {
      bindParams[key] = value;
    }

    // Add OUT parameter for SYS_REFCURSOR
    bindParams.o_data = { dir: oracledb.BIND_OUT, type: oracledb.CURSOR };

    // Build procedure call SQL
    const paramNames = Object.keys(parameters)
      .map(key => `${key} => :${key}`)
      .join(', ');

    const sql = `BEGIN ${procedureName}(${paramNames}${paramNames ? ', ' : ''}o_data => :o_data); END;`;

    // Execute the procedure
    const result = await connection.execute(sql, bindParams, {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });

    // Fetch all rows from cursor
    const cursor = result.outBinds.o_data;
    const rows = await cursor.getRows();
    await cursor.close();

    return rows;
  } catch (err) {
    throw new Error("Procedure execution failed: " + err.message);
  }
}

module.exports = { checkConnection, callStoredProcedure };
