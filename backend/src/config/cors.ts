
import { env } from "@/utils/envConfig";

const allowedOrigins = [...new Set([env.CORS_ORIGIN
].filter(Boolean))];

export const corsConfig = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
};


