import { NextResponse } from "next/server";

import { getSql, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CheckStatus = "ok" | "error";
type ServiceStatus = "ok" | "degraded";

type HealthPayload = {
  service: string;
  status: ServiceStatus;
  timestamp: string;
  uptime_seconds: number;
  checks: {
    database: {
      status: CheckStatus;
      latency_ms: number | null;
      detail: string;
    };
  };
};

function toErrorDetail(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Unknown database error";
  }

  const maybeError = error as {
    code?: string;
    message?: string;
    errors?: Array<{ code?: string; message?: string }>;
  };

  if (maybeError.code || maybeError.message) {
    return [maybeError.code, maybeError.message].filter(Boolean).join(": ");
  }

  if (Array.isArray(maybeError.errors) && maybeError.errors[0]) {
    const first = maybeError.errors[0];
    return [first.code, first.message].filter(Boolean).join(": ");
  }

  return "Unknown database error";
}

async function getHealth() {
  const startedAt = Date.now();
  const sql = getSql();

  if (!isDatabaseConfigured()) {
    return {
      payload: {
        service: "worldnew-community",
        status: "degraded",
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        checks: {
          database: {
            status: "error",
            latency_ms: null,
            detail: "DATABASE_URL is not configured",
          },
        },
      } satisfies HealthPayload,
      httpStatus: 503,
    };
  }

  if (!sql) {
    return {
      payload: {
        service: "worldnew-community",
        status: "degraded",
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        checks: {
          database: {
            status: "error",
            latency_ms: null,
            detail: "Database client unavailable",
          },
        },
      } satisfies HealthPayload,
      httpStatus: 503,
    };
  }

  try {
    await sql`select 1`;
    const latency = Date.now() - startedAt;

    return {
      payload: {
        service: "worldnew-community",
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        checks: {
          database: {
            status: "ok",
            latency_ms: latency,
            detail: "Database reachable",
          },
        },
      } satisfies HealthPayload,
      httpStatus: 200,
    };
  } catch (error) {
    const latency = Date.now() - startedAt;

    return {
      payload: {
        service: "worldnew-community",
        status: "degraded",
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        checks: {
          database: {
            status: "error",
            latency_ms: latency,
            detail: toErrorDetail(error),
          },
        },
      } satisfies HealthPayload,
      httpStatus: 503,
    };
  }
}

export async function GET() {
  const { payload, httpStatus } = await getHealth();

  return NextResponse.json(payload, {
    status: httpStatus,
    headers: {
      "cache-control": "no-store, max-age=0, must-revalidate",
    },
  });
}

export async function HEAD() {
  const { httpStatus } = await getHealth();

  return new NextResponse(null, {
    status: httpStatus,
    headers: {
      "cache-control": "no-store, max-age=0, must-revalidate",
    },
  });
}
