import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// envConfig loads dotenv - importing it here guarantees DATABASE_URL is
// populated no matter which module loads prisma first (a bare
// process.env.DATABASE_URL read silently falls back to localhost otherwise).
import { env } from "./envConfig";

const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const prisma = globalForPrisma.__prisma ?? new PrismaClient({ adapter });

globalForPrisma.__prisma = prisma;

export { prisma };
