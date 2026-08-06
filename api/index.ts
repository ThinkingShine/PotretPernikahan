/**
 * Vercel Function entry point for the whole API.
 *
 * vercel.json rewrites every /api/* request here, so the Hono router in
 * server/app.ts sees the original path and does the routing itself. Keeping the
 * app in server/ means the same routes also run as Vite middleware in
 * development (see vite.config.ts).
 *
 * The app object is exported as-is rather than wrapped in hono/vercel's
 * handle(). A Hono app already satisfies Vercel's `export default { fetch }`
 * web-standard signature, whereas handle() returns a bare function, which
 * Vercel reads as the Node `(req, res)` signature instead: Hono then gets a
 * Node IncomingMessage where it expects a Request, and the Response it returns
 * is ignored, so the request hangs until the function times out. handle() is
 * meant for a Next.js route file, where it is bound to a named method export.
 */

// The .js extension is required, here and throughout server/. Vercel compiles
// these files to ESM one-to-one without rewriting specifiers, so an
// extensionless import becomes an unresolvable one at runtime. TypeScript and
// Vite both map the .js back to the .ts on disk.
import app from "../server/app.js"

export default app
