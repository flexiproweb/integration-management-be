const express = require('express');
const router = express.Router();
const { executeProcedure } = require('../controllers/labelController');

console.log('🔧 [ROUTES] labelRoutes.js is being loaded');

// Add a middleware to the router itself to catch ALL requests
router.use((req, res, next) => {
  // console.log(`🔵 [ROUTER MIDDLEWARE] Request received: ${req.method} ${req.path}`);
  next();
});

// Simple test route
router.get('/health', (req, res) => {
  // console.log('✅ [ROUTES] /test route handler executing!');
  res.json({ 
    success: true,
    message: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Your actual route
router.post('/fetch-external-shipment-data', 
  (req, res, next) => {
    // console.log('🎯 [ROUTES] /fetch-external-shipment-data route hit!');
    // console.log('📦 Body:', req.body);
    next();
  },
  executeProcedure
);



module.exports = router;
