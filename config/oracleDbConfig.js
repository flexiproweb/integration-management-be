
const { Sequelize } = require('sequelize');
const oracledb = require('oracledb');
require('dotenv').config();

// Enable Thick mode by initializing Oracle Client
oracledb.initOracleClient({ libDir: 'C:\\Windows\\instantclient_19_28' });

// Factory function to create dynamic Sequelize instances
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
      idle: 10000
    },
    logging: false // Set to console.log to see SQL queries
  });

  return sequelize;
}

module.exports = { createSequelizeConnection };
