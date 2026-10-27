import pg from "pg";
import { env } from "./env.js";
const { Pool } = pg;

const url = new URL(env.DATABASE_URL);
const mode = url.searchParams.get("sslmode");
if (
  env.NODE_ENV === "production" &&
  mode !== "require" &&
  mode !== "verify-full" &&
  env.DATABASE_SSL !== true
)
  throw new Error("DATABASE_URL must require TLS in production");

const useTls = env.DATABASE_SSL === true || ["require", "verify-full"].includes(mode);
url.searchParams.delete("sslmode"); // stop pg from overriding the ssl option below

const pool = new Pool({
  connectionString: url.toString(),
  ssl: useTls ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
pool.on("error", (e) => console.error("[PG POOL]", e.code, e.message));
export default pool;