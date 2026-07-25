import postgres from "postgres";

declare global {
  var __worldnewSql: ReturnType<typeof postgres> | undefined;
  var __worldnewDbWarningShown: boolean | undefined;
}

export function getSql() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  if (!global.__worldnewSql) {
    global.__worldnewSql = postgres(connectionString, {
      max: 10,
      idle_timeout: 30,
      max_lifetime: 60 * 30,
      connect_timeout: 10,
      ssl: connectionString.includes("sslmode=require") ? "require" : undefined,
      connection: {
        application_name: "worldnew-community",
      },
    });
  }

  return global.__worldnewSql;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function isConnectionLikeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeErr = error as {
    code?: string;
    message?: string;
    errors?: Array<{ code?: string; message?: string }>;
  };

  const connectionCodes = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "EHOSTUNREACH",
    "EAI_AGAIN",
    "ETIMEDOUT",
    "EPERM",
  ]);

  if (maybeErr.code && connectionCodes.has(maybeErr.code)) {
    return true;
  }

  const message = (maybeErr.message ?? "").toLowerCase();
  if (
    message.includes("connect") ||
    message.includes("timeout") ||
    message.includes("network")
  ) {
    return true;
  }

  if (Array.isArray(maybeErr.errors)) {
    return maybeErr.errors.some(
      (inner) =>
        (inner.code && connectionCodes.has(inner.code)) ||
        (inner.message ?? "").toLowerCase().includes("connect")
    );
  }

  return false;
}

function logFallbackDatabaseError(error: unknown) {
  if (isConnectionLikeError(error)) {
    if (!global.__worldnewDbWarningShown) {
      global.__worldnewDbWarningShown = true;
      console.warn(
        "Database unavailable; serving fallback data. Check DATABASE_URL and database availability."
      );
    }
    return;
  }

  console.error("Database operation failed", error);
}

export async function withDb<T>(callback: (sql: NonNullable<ReturnType<typeof getSql>>) => Promise<T>, fallback: T) {
  const sql = getSql();

  if (!sql) {
    return fallback;
  }

  try {
    return await callback(sql);
  } catch (error) {
    logFallbackDatabaseError(error);
    return fallback;
  }
}
