import postgres from "postgres";

declare global {
  var __worldnewSql: ReturnType<typeof postgres> | undefined;
}

export function getSql() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  if (!global.__worldnewSql) {
    global.__worldnewSql = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: connectionString.includes("sslmode=require") ? "require" : undefined,
    });
  }

  return global.__worldnewSql;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function withDb<T>(callback: (sql: NonNullable<ReturnType<typeof getSql>>) => Promise<T>, fallback: T) {
  const sql = getSql();

  if (!sql) {
    return fallback;
  }

  try {
    return await callback(sql);
  } catch (error) {
    console.error("Database operation failed", error);
    return fallback;
  }
}
