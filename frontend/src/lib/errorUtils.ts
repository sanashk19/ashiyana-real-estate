/**
 * Universal API error message extractor.
 * Safely parses any server error response (including Pydantic validation error lists/objects)
 * into a clean, human-readable string.
 * Guarantees that objects/arrays are NEVER returned or rendered directly into React JSX.
 */
export function getApiErrorMessage(error: unknown, fallbackMessage = "An unexpected error occurred. Please try again."): string {
  if (!error) return fallbackMessage;

  if (typeof error === "string") return error;

  // Axios or HTTP client error
  const err = error as any;

  if (err.response && err.response.data) {
    const data = err.response.data;

    // FastAPI detail field
    if (data.detail) {
      // 1. Array of Pydantic validation errors: [{ loc: [...], msg: "...", type: "..." }]
      if (Array.isArray(data.detail)) {
        const messages = data.detail.map((d: any) => {
          if (typeof d === "string") return d;
          if (typeof d === "object" && d !== null) {
            const field = Array.isArray(d.loc) ? d.loc.filter((part: any) => part !== "body").join(" -> ") : "";
            const msg = d.msg || "Invalid value";
            return field ? `${field}: ${msg}` : msg;
          }
          return String(d);
        });
        return messages.filter(Boolean).join(" | ") || fallbackMessage;
      }

      // 2. String detail
      if (typeof data.detail === "string") {
        return data.detail;
      }

      // 3. Object detail
      if (typeof data.detail === "object") {
        try {
          return JSON.stringify(data.detail);
        } catch {
          return fallbackMessage;
        }
      }
    }

    // Message field
    if (typeof data.message === "string") {
      return data.message;
    }
  }

  // Standard Error object
  if (err.message && typeof err.message === "string") {
    if (err.message.includes("Network Error")) {
      return "Network error: Unable to connect to server. Please check your connection.";
    }
    return err.message;
  }

  return fallbackMessage;
}
