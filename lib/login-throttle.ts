import { randomUUID } from "crypto";

import postgres from "postgres";
import { getSql } from "@/lib/db";

type LoginThrottleIdentity = {
  type: "account" | "device";
  key: string;
};

type LoginThrottleRow = {
  identity_type: "account" | "device";
  failed_attempts: number;
  locked_until: string | null;
};

type LoginThrottleRowWithLock = LoginThrottleRow & {
  lockedUntilMs: number | null;
};

export type LoginThrottleStatus = {
  blocked: boolean;
  attemptsLeft: number;
  message: string;
  retryAfterMinutes?: number;
};

const MAX_ATTEMPTS = 3;
type SqlClient = NonNullable<ReturnType<typeof getSql>>;
type SqlExecutor = SqlClient | postgres.TransactionSql<Record<string, never>>;

function normalizeAccountKey(email: string) {
  return email.trim().toLowerCase();
}

function normalizeDeviceKey(deviceId: string) {
  return deviceId.trim().toLowerCase();
}

function toLockedUntil(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function getLockMinutes(failedAttempts: number) {
  if (failedAttempts >= 9) {
    return 24 * 60;
  }

  if (failedAttempts >= 6) {
    return 60;
  }

  if (failedAttempts >= 3) {
    return 30;
  }

  return 0;
}

function buildMessage(input: {
  blocked: boolean;
  attemptsLeft: number;
  retryAfterMinutes?: number;
}) {
  if (input.blocked && input.retryAfterMinutes) {
    const hours = Math.floor(input.retryAfterMinutes / 60);
    const minutes = input.retryAfterMinutes % 60;
    const label =
      hours > 0
        ? minutes > 0
          ? `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`
          : `${hours} hour${hours === 1 ? "" : "s"}`
        : `${minutes} minute${minutes === 1 ? "" : "s"}`;
    return `Too many failed sign-ins. Please try again in ${label}.`;
  }

  if (input.attemptsLeft === 0) {
    return "Too many failed sign-ins. Please try again in 30 minutes.";
  }

  return `${input.attemptsLeft} sign-in attempt${input.attemptsLeft === 1 ? "" : "s"} left before a temporary lockout.`;
}

async function upsertIdentity(
  sql: SqlExecutor,
  identity: LoginThrottleIdentity,
  failedAttempts: number,
  lockedUntil: Date | null
) {
  await sql`
    insert into login_throttle_states (
      identity_type,
      identity_key,
      failed_attempts,
      locked_until,
      last_failed_at,
      updated_at
    )
    values (
      ${identity.type},
      ${identity.key},
      ${failedAttempts},
      ${lockedUntil ? lockedUntil.toISOString() : null},
      now(),
      now()
    )
    on conflict (identity_type, identity_key) do update
    set
      failed_attempts = excluded.failed_attempts,
      locked_until = excluded.locked_until,
      last_failed_at = excluded.last_failed_at,
      updated_at = now()
  `;
}

function getIdentityKeys(email: string, deviceId: string): LoginThrottleIdentity[] {
  return [
    { type: "account", key: normalizeAccountKey(email) },
    { type: "device", key: normalizeDeviceKey(deviceId) || randomUUID() },
  ];
}

export async function getLoginThrottleStatus(
  sql: SqlClient,
  input: { email: string; deviceId: string }
): Promise<LoginThrottleStatus | null> {
  const identities = getIdentityKeys(input.email, input.deviceId);
  const rows: LoginThrottleRow[] = await sql<LoginThrottleRow[]>`
    select
      identity_type,
      failed_attempts,
      locked_until::text
    from login_throttle_states
    where (identity_type = ${identities[0].type} and identity_key = ${identities[0].key})
       or (identity_type = ${identities[1].type} and identity_key = ${identities[1].key})
  `;

  const now = Date.now();
  const activeLocks: LoginThrottleRowWithLock[] = rows
    .map((row: LoginThrottleRow) => ({
      ...row,
      lockedUntilMs: row.locked_until ? new Date(row.locked_until).getTime() : null,
    }))
    .filter(
      (row: LoginThrottleRowWithLock) => row.lockedUntilMs !== null && row.lockedUntilMs > now
    );

  if (activeLocks.length === 0) {
    return null;
  }

  const strongest = activeLocks.reduce((current: LoginThrottleRowWithLock, row: LoginThrottleRowWithLock) =>
    (row.lockedUntilMs ?? 0) > (current.lockedUntilMs ?? 0) ? row : current
  );
  const retryAfterMinutes = Math.max(
    1,
    Math.ceil(((strongest.lockedUntilMs ?? now) - now) / (60 * 1000))
  );
  const attemptsLeft = Math.max(
    0,
    MAX_ATTEMPTS - Math.max(...rows.map((row) => row.failed_attempts), 0)
  );

  return {
    blocked: true,
    attemptsLeft,
    retryAfterMinutes,
    message: buildMessage({ blocked: true, attemptsLeft, retryAfterMinutes }),
  };
}

export async function recordLoginFailure(
  sql: SqlClient,
  input: { email: string; deviceId: string }
): Promise<LoginThrottleStatus> {
  const identities = getIdentityKeys(input.email, input.deviceId);
  const rows: LoginThrottleRow[] = await sql.begin(async (tx) => {
    const currentRows: LoginThrottleRow[] = await tx<LoginThrottleRow[]>`
      select
        identity_type,
        failed_attempts,
        locked_until::text
      from login_throttle_states
      where (identity_type = ${identities[0].type} and identity_key = ${identities[0].key})
         or (identity_type = ${identities[1].type} and identity_key = ${identities[1].key})
    `;

    const currentMap = new Map(currentRows.map((row) => [row.identity_type, row]));

    for (const identity of identities) {
      const current = currentMap.get(identity.type);
      const nextAttempts = (current?.failed_attempts ?? 0) + 1;
      const lockMinutes = getLockMinutes(nextAttempts);
      await upsertIdentity(
        tx,
        identity,
        nextAttempts,
        lockMinutes > 0 ? toLockedUntil(lockMinutes) : null
      );
    }

    return tx<LoginThrottleRow[]>`
      select
        identity_type,
        failed_attempts,
        locked_until::text
      from login_throttle_states
      where (identity_type = ${identities[0].type} and identity_key = ${identities[0].key})
         or (identity_type = ${identities[1].type} and identity_key = ${identities[1].key})
    `;
  });

  const maxAttempts = Math.max(...rows.map((row: LoginThrottleRow) => row.failed_attempts), 0);
  const blockedRow = rows.find(
    (row: LoginThrottleRow) => row.locked_until && new Date(row.locked_until).getTime() > Date.now()
  );
  const retryAfterMinutes = blockedRow?.locked_until
    ? Math.max(1, Math.ceil((new Date(blockedRow.locked_until).getTime() - Date.now()) / (60 * 1000)))
    : undefined;
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - maxAttempts);

  return {
    blocked: Boolean(blockedRow),
    attemptsLeft,
    retryAfterMinutes,
    message: blockedRow
      ? buildMessage({ blocked: true, attemptsLeft, retryAfterMinutes })
      : buildMessage({ blocked: false, attemptsLeft }),
  };
}

export async function clearLoginThrottle(
  sql: SqlClient,
  input: { email: string; deviceId: string }
) {
  const identities = getIdentityKeys(input.email, input.deviceId);

  await sql`
    delete from login_throttle_states
    where (identity_type = ${identities[0].type} and identity_key = ${identities[0].key})
       or (identity_type = ${identities[1].type} and identity_key = ${identities[1].key})
  `;
}

export function ensureLoginDeviceId(existingValue: string | undefined) {
  const value = existingValue?.trim();
  return value || randomUUID();
}

export function getLoginThrottleMessage(status: LoginThrottleStatus) {
  return status.message;
}
