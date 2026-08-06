/**
 * Vercel Function entry point for the whole API.
 *
 * vercel.json rewrites every /api/* request here, so the Hono router in
 * server/app.ts sees the original path and does the routing itself. Keeping the
 * app in server/ means the same routes also run as Vite middleware in
 * development (see vite.config.ts).
 */

import { handle } from "hono/vercel"
// The .js extension is required, here and throughout server/. Vercel compiles
// these files to ESM one-to-one without rewriting specifiers, so an
// extensionless import becomes an unresolvable one at runtime. TypeScript and
// Vite both map the .js back to the .ts on disk.
import app from "../server/app.js"

export default handle(app)
