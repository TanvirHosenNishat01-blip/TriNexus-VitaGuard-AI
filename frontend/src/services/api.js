const TIMEOUT_MS = 20000;

export class ApiError extends Error {
  constructor(message, fieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

export function getApiOrigin(value = import.meta.env?.VITE_API_BASE_URL ?? "") {
  const origin = value.trim().replace(/\/+$/, "");
  if (!origin) return "";
  try {
    const url = new URL(origin);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new ApiError(
      "API configuration is invalid. VITE_API_BASE_URL must be a backend origin without /api.",
    );
  }
}

async function request(path, { body, signal } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  try {
    const response = await fetch(getApiOrigin() + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
      cache: "no-store",
    });
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      /* HTTP failures may contain plain text or HTML. */
    }
    if (!response.ok) {
      if (response.status === 422) {
        const fieldErrors = {};
        if (Array.isArray(data?.detail)) {
          for (const item of data.detail) {
            const field = Array.isArray(item.loc) ? item.loc.at(-1) : undefined;
            if (typeof field === "string" && typeof item.msg === "string")
              fieldErrors[field] = item.msg;
          }
        }
        throw new ApiError(
          "The server could not validate these values. Review the highlighted fields and try again.",
          fieldErrors,
        );
      }
      if (response.status >= 500)
        throw new ApiError(
          "The prediction service encountered a server error (" +
            response.status +
            "). Please try again or contact the backend team.",
        );
      throw new ApiError(
        "The request could not be completed (HTTP " +
          response.status +
          "). Please try again.",
      );
    }
    if (data === undefined)
      throw new ApiError(
        "The service returned an unreadable response. Please try again.",
      );
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut)
      throw new ApiError(
        "The request timed out after 20 seconds. Its outcome is unknown; retrying may save another record.",
      );
    if (signal?.aborted) throw error;
    throw new ApiError(
      "Could not reach the prediction service. Check your connection and that the backend is running, then try again.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export function validatePrediction(data) {
  if (
    !data ||
    ![0, 1].includes(data.prediction) ||
    typeof data.risk_probability_percentage !== "number" ||
    !Number.isFinite(data.risk_probability_percentage) ||
    data.risk_probability_percentage < 0 ||
    data.risk_probability_percentage > 100 ||
    typeof data.risk_level !== "string" ||
    !data.risk_level.trim()
  ) {
    throw new ApiError(
      "The service returned an invalid prediction. No result can be displayed. Please try again.",
    );
  }
  return data;
}

export async function getDiabetesPrediction(patientData, options = {}) {
  return validatePrediction(
    await request("/api/predict", { ...options, body: patientData }),
  );
}
export async function getCardioPrediction(cardioData, options = {}) {
  return validatePrediction(
    await request("/api/predict/cardio", { ...options, body: cardioData }),
  );
}
export async function getShapImportance(options = {}) {
  const data = await request("/api/shap-importance", options);
  if (
    !Array.isArray(data) ||
    !data.length ||
    data.some(
      (item) =>
        !item ||
        "error" in item ||
        typeof item.feature !== "string" ||
        !item.feature.trim() ||
        typeof item.importance !== "number" ||
        !Number.isFinite(item.importance),
    )
  ) {
    throw new ApiError(
      "Global diabetes feature importance is currently unavailable.",
    );
  }
  return data;
}
