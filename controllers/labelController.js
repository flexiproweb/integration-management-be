const { checkConnection, callStoredProcedure } = require('../services/labelService');
const AppError = require('../helper/appError'); 
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
        required: ['CompanyId', 'ConfigId', 'DbName', 'procedureName', 'parameters']
      });
    }

    // Get Sequelize instance (cached)
    const { sequelize } = await checkConnection({
      CompanyId,
      ConfigId,
      DbName
    });

    // Execute procedure (pool manages connections)
    const data = await callStoredProcedure(
      sequelize, 
      procedureName, 
      parameters || {}
    );

    res.status(200).json({
      success: true,
      procedureName,
      rowCount: data.length,
      data
    });

  } catch (err) {
    console.error('❌ Error:', err);
     if (err instanceof AppError) {
      return res.status(err.status).json({ success: false, error: err.error });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to execute procedure',
      error: err.message
    });
  }
  // Connection automatically returned to pool - no manual close needed
}

module.exports = { executeProcedure };
