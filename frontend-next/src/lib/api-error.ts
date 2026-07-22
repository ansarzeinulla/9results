/** Turn a FastAPI `detail` payload into something a human can act on.
 *
 * Hand-written failures in the backend send a plain string. A schema mismatch,
 * though, comes back as pydantic's list of error objects — feeding that list
 * straight to `new Error()` stringified it to "[object Object]" and hid the
 * one thing worth knowing: which field the backend rejected.
 */
export function formatApiError(detail: unknown, fallback = ""): string {
  if (typeof detail === "string") return detail;
  if (detail == null) return fallback;

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
