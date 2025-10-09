const express = require('express');
const labelRoutes = require('./routes/labelRoutes');
const { closeAllConnections } = require('./services/labelService');

const app = express();

app.use(express.json());
app.use('/', labelRoutes);

const PORT = process.env.PORT || 5500;
const server = app.listen(PORT, () => {
  console.log(`Integration Label Management Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await closeAllConnections();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    await closeAllConnections();
    process.exit(0);
  });
});
