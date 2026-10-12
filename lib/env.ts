import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().optional().default("3000"),
  DATABASE_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  PISTON_API_URL: z.string().url().optional().default("https://emkc.org/api/v2/piston"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  PISTON_API_URL: process.env.PISTON_API_URL,
});
