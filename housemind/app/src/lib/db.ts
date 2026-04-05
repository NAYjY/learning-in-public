import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/housemind",
});

export function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}

export default pool;
