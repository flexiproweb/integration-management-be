const express = require("express");
const labelRoutes = require("./routes/labelRoutes");
const { closeAllConnections } = require("./config/oracleDbConfig");

const app = express();

app.use(express.json());
app.use("/", labelRoutes);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Pool eviction runs every 1 minute`);
  console.log(`Connections idle for 10+ minutes will be closed automatically`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  server.close(async () => {
    await closeAllConnections();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  server.close(async () => {
    await closeAllConnections();
    process.exit(0);
  });
});
