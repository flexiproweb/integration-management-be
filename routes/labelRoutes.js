
const express = require('express');
const router = express.Router();
const { executeProcedure } = require('../controllers/labelController');

router.post('/fetch-external-shipment-data', executeProcedure);

module.exports = router;
