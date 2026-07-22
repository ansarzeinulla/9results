import { describe, expect, it } from "vitest";
import { formatApiError } from "./api-error";

describe("formatApiError", () => {
  it("passes a plain string detail through unchanged", () => {
    expect(formatApiError("A tournament with this slug already exists")).toBe(
      "A tournament with this slug already exists"
    );
  });

  // FastAPI answers a schema mismatch with a list of error objects. Rendering
  // that list straight into `new Error()` is what produced "[object Object]".
  it("names the offending field for a FastAPI validation error", () => {
    const detail = [
      {
        type: "missing",
        loc: ["body", "rounds"],
        msg: "Field required",
        input: {},
      },
    ];
    expect(formatApiError(detail)).toBe("rounds: Field required");
  });

  it("joins several validation errors", () => {
    const detail = [
      { type: "missing", loc: ["body", "rounds"], msg: "Field required" },
      {
        type: "string_type",
        loc: ["body", "name"],
        msg: "Input should be a valid string",
      },
    ];
    expect(formatApiError(detail)).toBe(
      "rounds: Field required; name: Input should be a valid string"
    );
  });

  it("falls back to JSON for an unrecognised object detail", () => {
    expect(formatApiError({ oops: 1 })).toBe('{"oops":1}');
  });

  it("keeps the fallback text when there is no detail at all", () => {
    expect(formatApiError(undefined, "Unprocessable Entity")).toBe(
      "Unprocessable Entity"
    );
  });
});
