const axios = require('axios');

// A simple wrapper that just calls the API and returns the response
async function getExtDbInfo(endpoint, params = {}) {
  try {
    const response = await axios.get(endpoint, { params });
    return response.data; // only return the raw data
  } catch (err) {
    console.error("API call failed:", err.message);
    throw err;
  }
}

module.exports = { getExtDbInfo };
