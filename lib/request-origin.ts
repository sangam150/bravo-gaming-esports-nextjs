const MUTATING_METHODS = new Set(["DELETE", "PATCH", "POST", "PUT"]);

type SameOriginValidationOptions = {
  includeSafeMethods?: boolean;
};

function getRequestOrigin(request: Request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export function validateSameOriginRequest(request: Request, options: SameOriginValidationOptions = {}) {
  const mutatingRequest = MUTATING_METHODS.has(request.method.toUpperCase());
  if (!mutatingRequest && !options.includeSafeMethods) {
    return null;
  }

  const expectedOrigin = getRequestOrigin(request);
  const suppliedOrigin = request.headers.get("origin")?.trim() ?? "";
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase() ?? "";
  if (!expectedOrigin) {
    return "A same-origin request is required.";
  }

  if (suppliedOrigin) {
    try {
      if (new URL(suppliedOrigin).origin !== expectedOrigin) {
        return "A same-origin request is required.";
      }
    } catch {
      return "A same-origin request is required.";
    }
  } else if (mutatingRequest || !fetchSite) {
    return "A same-origin request is required.";
  }

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return "A same-origin request is required.";
  }

  return null;
}

export function requireSameOrigin(request: Request, options: SameOriginValidationOptions = {}) {
  const error = validateSameOriginRequest(request, options);
  return error ? Response.json({ success: false, error, code: "invalid_origin" }, { status: 403 }) : null;
}
