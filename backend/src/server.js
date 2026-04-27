/**
 * src/server.js — Entry point.
 *
 * Loads environment variables, runs DB migrations, starts the battery
 * monitor, then binds the Express app to the configured port.
 */

'use strict';

require('dotenv').config();

const { createApp }  = require('./app');
const { migrate }    = require('./db/migrate');
const monitor        = require('./services/monitor');

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function main() {
  // 1. Apply pending migrations
  await migrate();
  console.log('[server] Database ready');

  // 2. Start the polling monitor (takes an initial reading right away)
  await monitor.start();
  console.log('[server] Battery monitor started');

  // 3. Bind HTTP server
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[server] Solina backend listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] Startup failed:', err);
  process.exit(1);
});
