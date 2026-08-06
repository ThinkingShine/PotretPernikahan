/**
 * Vercel Function entry point for the whole API.
 *
 * vercel.json rewrites every /api/* request here, so the Hono router in
 * server/app.ts sees the original path and does the routing itself. Keeping the
 * app in server/ means the same routes also run as Vite middleware in
 * development (see vite.config.ts).
 */

import { handle } from "hono/vercel"
import app from "../server/app"

export default handle(app)
