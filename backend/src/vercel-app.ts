import { app } from "./server";

/**
 * Vercel serverless entry. The Express app itself is the request handler -
 * Vercel invokes the DEFAULT export per request, so no app.listen() here.
 * Bundled by `pnpm build:vercel` into api/index.mjs (see vercel.json).
 *
 * Prisma connects lazily on first query; src/index.ts's connectToDatabase
 * is only for the long-lived local server process.
 */
export default app;
export { app };
