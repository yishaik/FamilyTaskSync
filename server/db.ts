import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Export the raw pool for tests to mock
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create a type for the database instance that includes all the drizzle methods
export type DrizzleDatabase = ReturnType<typeof drizzle>;

// Create and export the database instance
export const db = drizzle(pool, { schema }) as DrizzleDatabase & { $client: Pool };

// Re-export the sql helper
export { sql } from 'drizzle-orm';