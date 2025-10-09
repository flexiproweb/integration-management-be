const { checkConnection, callStoredProcedure } = require('../services/labelService');

async function executeProcedure(req, res) {
  try {
    const { 
      CompanyId, 
      ConfigId, 
      DbName, 
      procedureName, 
      parameters 
    } = req.body;

    if (!CompanyId || !ConfigId || !DbName || !procedureName) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: {
          CompanyId: 'number',
          ConfigId: 'number',
          DbName: 'string',
          procedureName: 'string',
          parameters: 'object (required for input params)'
        },
        example: {
          CompanyId: 1,
          ConfigId: 1,
          DbName: "ABC",
          procedureName: "xxflxi_label_fetch_module_data",
          parameters: {
            p_module: "order",
            p_key: "SO12345"
          }
        }
      });
    }

    const connectionPayload = {
      CompanyId,
      ConfigId,
      DbName
    };

    // Get or create cached connection
    const connectionResult = await checkConnection(connectionPayload);
    const sequelize = connectionResult.sequelize;

    console.log('✅ Connection established, executing procedure:', procedureName);

    // Execute the stored procedure
    const procedureResult = await callStoredProcedure(
      sequelize, 
      procedureName, 
      parameters || {}
    );

    res.status(200).json({
      message: 'Procedure executed successfully',
      procedureName: procedureName,
      rowCount: procedureResult.length,
      cached: connectionResult.cached,
      data: procedureResult
    });

  } catch (err) {
    console.error('❌ Error executing procedure:', err);
    res.status(500).json({
      message: 'Failed to execute procedure',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

module.exports = { executeProcedure };
