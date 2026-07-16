import { logger } from "@/server";
import { prisma } from "@/utils/prisma";


export const connectToDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    // Never log the connection string - it carries credentials.
    logger.info('Connected to the database.');
  } catch (err) {
    logger.fatal({ err }, 'Database connection failed.');
    process.exit(1);
  }
};

export { prisma };
