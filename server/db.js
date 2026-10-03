/**
 * Database connection shared by API functions and scripts.
 *
 * Uses the Neon serverless driver over HTTP: every query is a single request,
 * which suits short-lived serverless functions without connection pools.
 */
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

/** Tagged template for SQL queries: sql`SELECT ... WHERE id = ${id}` (values are passed as parameters). */
export const sql = neon(process.env.DATABASE_URL);
