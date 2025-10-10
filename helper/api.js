const axios = require('axios');

async function getExtDbInfo(endpoint, params = {}) {
  try {
    const response = await axios.get(endpoint, { params });
    return response.data;
  } catch (err) {
    console.error("API call failed:", err.message);
    throw err;
  }
}

module.exports = { getExtDbInfo };
