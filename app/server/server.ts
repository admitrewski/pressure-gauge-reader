import { createApp, files, genie, lakebase, server } from '@databricks/appkit';
import { setupReadingRoutes } from './routes/readings';

createApp({
  plugins: [
    // Gauge images are served read-only from the raw UC volume, as the app's service principal.
    files({ volumes: { files: { policy: files.policy.publicRead() } } }),
    // Genie runs on behalf of the signed-in user (user_api_scopes: dashboards.genie).
    genie(),
    lakebase(),
    server(),
  ],
  onPluginsReady(appkit) {
    setupReadingRoutes(appkit);
  },
}).catch(console.error);
