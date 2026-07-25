function readFirstHeaderValue(headers: Headers, name: string) {
  const raw = headers.get(name);

  if (!raw) {
    return "";
  }

  return raw.split(",")[0]?.trim() ?? "";
}

function buildUrlFromHost(host: string, protocol: string) {
  if (!host) {
    return null;
  }

  try {
    return new URL(`${protocol}://${host}/`);
  } catch {
    return null;
  }
}

function isHostDisallowed(hostname: string) {
  const normalized = hostname.toLowerCase();

  if (normalized === "0.0.0.0") {
    return true;
  }

  if (process.env.NODE_ENV === "production") {
    return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
  }

  return false;
}

function normalizeConfiguredBaseUrl(rawBase: string | undefined) {
  if (!rawBase) {
    return null;
  }

  const normalized = rawBase.includes("://") ? rawBase : `https://${rawBase}`;

  try {
    const url = new URL(normalized);
    if (isHostDisallowed(url.hostname)) {
      return null;
    }

    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function getPublicBaseUrlFromRequest(request: Request) {
  const forwardedProto = readFirstHeaderValue(request.headers, "x-forwarded-proto") || "https";
  const forwardedHost = readFirstHeaderValue(request.headers, "x-forwarded-host");
  const forwarded = buildUrlFromHost(forwardedHost, forwardedProto);

  if (forwarded && !isHostDisallowed(forwarded.hostname)) {
    return forwarded;
  }

  const host = readFirstHeaderValue(request.headers, "host");
  const hostUrl = buildUrlFromHost(host, forwardedProto);
  if (hostUrl && !isHostDisallowed(hostUrl.hostname)) {
    return hostUrl;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (!isHostDisallowed(refererUrl.hostname)) {
        refererUrl.pathname = "/";
        refererUrl.search = "";
        refererUrl.hash = "";
        return refererUrl;
      }
    } catch {
      // Ignore malformed referer values.
    }
  }

  const configuredCandidates = [
    process.env.PUBLIC_APP_URL,
    process.env.LOGOUT_REDIRECT_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
  ];

  for (const candidate of configuredCandidates) {
    const normalized = normalizeConfiguredBaseUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  const fallback = new URL("/", request.url);

  if (fallback.hostname === "0.0.0.0") {
    fallback.hostname = "localhost";
    fallback.protocol = "http:";
  }

  return fallback;
}

export function buildPublicUrl(request: Request, path: string) {
  return new URL(path, getPublicBaseUrlFromRequest(request));
}
