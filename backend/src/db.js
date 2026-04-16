import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for backend startup.");
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

export async function healthcheckDb() {
  const result = await pool.query("select now() as now");
  return result.rows[0];
}
