import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for backend startup.");
}

const needsSsl =
  process.env.DB_SSL === "true" ||
  /neon\.tech|sslmode=require|ssl=true/i.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false
});

export async function healthcheckDb() {
  const result = await pool.query("select now() as now");
  return result.rows[0];
}
