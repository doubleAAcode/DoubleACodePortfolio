import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Double A Connect is switched off, not deleted. Its route files (the /connect pages, the old
// /admin and /dashboard redirects, and the WhatsApp and dashboard APIs) are skipped when the route
// tree is built, so nothing of it is served. The code is untouched under src/features/connect.
// To switch it back on, remove the `router` option below and the Connect "exclude" lines in
// tsconfig.json, then run a dev or build once to regenerate src/routeTree.gen.ts.
const CONNECT_ROUTE_FILES = String.raw`^(connect(\.|$)|(admin|dashboard|dashboard-2)(\.|$)|logsWABot\.|api\.(connect|wa-admin|wa-dashboard|wa-dashboard-2|whatsapp)\.)`;

export default defineConfig({
  plugins: [
    tanstackStart({ router: { routeFileIgnorePattern: CONNECT_ROUTE_FILES } }),
    nitro(),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});
