/** Turn a FastAPI `detail` payload into something a human can act on.
 *
 * The backend sends three shapes of `detail`:
 *
 *  1. A structured business error — `{code, params, message}`. `code` is a
 *     stable identifier we translate into the user's language (see
 *     {@link errorText}); `message` is the English fallback. Database failures
 *     use the reserved code `"db_error"` and carry a *detailed English
 *     diagnostic* in `message` that is shown verbatim, never translated.
 *  2. A plain string — a hand-written failure with no code.
 *  3. pydantic's list of `{loc, msg}` objects for a request-schema mismatch —
 *     feeding that list straight to `new Error()` stringified it to
 *     "[object Object]" and hid which field was rejected.
 */

/** Values next-intl accepts for `{placeholder}` interpolation. */
export type MessageParams = Record<string, string | number | Date>;

export interface ErrorDetail {
  code: string;
  params?: MessageParams;
  message?: string;
}

function isErrorDetail(v: unknown): v is ErrorDetail {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as ErrorDetail).code === "string"
  );
}

/** An error carrying the backend's translation `code` and `params` alongside
 * the English fallback `message`. Thrown by `api()` so callers can localize. */
export class ApiError extends Error {
  code?: string;
  params?: MessageParams;
  status?: number;

  constructor(
    message: string,
    opts: { code?: string; params?: MessageParams; status?: number } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.code = opts.code;
    this.params = opts.params;
    this.status = opts.status;
  }
}

/** Build an {@link ApiError} from a parsed `detail` payload. */
export function apiErrorFromDetail(
  detail: unknown,
  status: number,
  fallback = ""
): ApiError {
  if (isErrorDetail(detail)) {
    return new ApiError(detail.message || fallback || detail.code, {
      code: detail.code,
      params: detail.params,
      status,
    });
  }
  return new ApiError(formatApiError(detail, fallback), { status });
}

/** A minimal shape for a next-intl translator that also exposes `has`. */
type Translator = {
  (key: string, params?: MessageParams): string;
  has: (key: string) => boolean;
};

/** The user-facing text for an error, translated when possible.
 *
 * Pass a translator scoped to the `errors` namespace
 * (`useTranslations("errors")`). Business errors resolve to their `code` in the
 * active locale; database diagnostics (`db_error`) and anything without a known
 * code fall back to the English `message`, so no failure is ever swallowed.
 */
export function errorText(tErrors: Translator, err: unknown): string {
  if (err instanceof ApiError && err.code && err.code !== "db_error") {
    if (tErrors.has(err.code)) return tErrors(err.code, err.params ?? {});
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function formatApiError(detail: unknown, fallback = ""): string {
  if (typeof detail === "string") return detail;
  if (detail == null) return fallback;

  if (isErrorDetail(detail)) return detail.message || fallback || detail.code;

  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === "string") return item;
      const e = item as { loc?: unknown[]; msg?: string };
      const msg = e.msg ?? JSON.stringify(item);
      // loc is ["body", "rounds"] — drop the "body"/"query" prefix.
      const field = Array.isArray(e.loc) ? e.loc.slice(1).join(".") : "";
      return field ? `${field}: ${msg}` : msg;
    });
    const joined = parts.filter(Boolean).join("; ");
    return joined || fallback;
  }

  try {
    return JSON.stringify(detail);
  } catch {
    return fallback;
  }
}
