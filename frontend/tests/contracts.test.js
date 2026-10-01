import { describe, expect, it, vi } from "vitest";
import {
  diabetesFields,
  cardioFields,
  emptyValues,
  validateValues,
} from "../src/utils/validationSchemas.js";
import {
  getApiOrigin,
  getDiabetesPrediction,
  getCardioPrediction,
  getShapImportance,
  validatePrediction,
} from "../src/services/api.js";

const result = {
  prediction: 1,
  risk_probability_percentage: 63.25,
  risk_level: "High Risk",
};
function respond(data, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(data), { status }));
}

describe("input validation", () => {
  for (const fields of [diabetesFields, cardioFields]) {
    it(
      "rejects empty values without converting them to zero: " + fields.length,
      () => {
        const parsed = validateValues(fields, emptyValues(fields));
        expect(parsed.valid).toBe(false);
        expect(Object.keys(parsed.errors)).toHaveLength(fields.length);
        expect(parsed.data).toEqual({});
      },
    );
    it(
      "preserves explicit zero and rejects nonfinite, fractional integers and invalid codes: " +
        fields.length,
      () => {
        const values = Object.fromEntries(
          fields.map((field) => [field.name, "0"]),
        );
        expect(validateValues(fields, values).valid).toBe(true);
        const integer = fields.find((field) => field.integer);
        for (const bad of ["NaN", "Infinity", "-Infinity", "1.2", true]) {
          expect(
            validateValues(fields, { ...values, [integer.name]: bad }).errors[
              integer.name
            ],
          ).toBeTruthy();
        }
        for (const field of fields.filter((field) => field.codes)) {
          expect(
            validateValues(fields, { ...values, [field.name]: "9" }).errors[
              field.name
            ],
          ).toBeTruthy();
        }
      },
    );
  }
});

describe("API contract", () => {
  it("validates backend origins", () => {
    expect(getApiOrigin("")).toBe("");
    expect(getApiOrigin("https://api.example.com/")).toBe(
      "https://api.example.com",
    );
    for (const invalid of [
      "https://api.example.com/api",
      "/api",
      "not-url",
      "https://a.test?x=1",
      "https://user:pass@a.test",
    ])
      expect(() => getApiOrigin(invalid)).toThrow(/origin/);
  });
  for (const [name, fn, endpoint] of [
    ["diabetes", getDiabetesPrediction, "/api/predict"],
    ["cardio", getCardioPrediction, "/api/predict/cardio"],
  ]) {
    it(
      name + " posts raw JSON and preserves the percentage and label",
      async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(() => respond(result)),
        );
        expect(await fn({ example: 0 })).toEqual(result);
        expect(fetch).toHaveBeenCalledWith(
          endpoint,
          expect.objectContaining({ method: "POST", body: '{"example":0}' }),
        );
      },
    );
    it(name + " respects an explicit backend origin", async () => {
      vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:8000");
      vi.stubGlobal(
        "fetch",
        vi.fn(() => respond(result)),
      );
      await fn({});
      expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:8000" + endpoint);
    });
    it(
      name + " handles network, 422, non-JSON 500 and malformed JSON",
      async () => {
        const mock = vi
          .fn()
          .mockRejectedValueOnce(new TypeError("Failed to fetch"))
          .mockImplementationOnce(() =>
            respond(
              {
                detail: [
                  {
                    loc: ["body", "Age"],
                    msg: "Input should be a valid integer",
                    input: "private",
                  },
                ],
              },
              422,
            ),
          )
          .mockResolvedValueOnce(
            new Response("<h1>Internal server error</h1>", { status: 500 }),
          )
          .mockResolvedValueOnce(new Response("not JSON", { status: 200 }));
        vi.stubGlobal("fetch", mock);
        await expect(fn({})).rejects.toThrow(/Could not reach/);
        await expect(fn({})).rejects.toMatchObject({
          fieldErrors: { Age: "Input should be a valid integer" },
        });
        await expect(fn({})).rejects.toThrow(/server error \(500\)/);
        await expect(fn({})).rejects.toThrow(/unreadable response/);
      },
    );
    it(name + " times out and allows cancellation", async () => {
      vi.useFakeTimers();
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (url, { signal }) =>
            new Promise((resolve, reject) =>
              signal.addEventListener("abort", () =>
                reject(new DOMException("Aborted", "AbortError")),
              ),
            ),
        ),
      );
      const pending = expect(fn({})).rejects.toThrow(/timed out/);
      await vi.advanceTimersByTimeAsync(20000);
      await pending;
      const controller = new AbortController();
      const cancelled = expect(
        fn({}, { signal: controller.signal }),
      ).rejects.toMatchObject({ name: "AbortError" });
      controller.abort();
      await cancelled;
    });
  }
  it("rejects malformed prediction data and accepts valid boundaries without relabeling", () => {
    for (const bad of [
      null,
      [],
      {},
      { ...result, prediction: "1" },
      { ...result, prediction: 2 },
      { ...result, risk_probability_percentage: "63.25" },
      { ...result, risk_probability_percentage: Infinity },
      { ...result, risk_probability_percentage: NaN },
      { ...result, risk_probability_percentage: -1 },
      { ...result, risk_probability_percentage: 101 },
      { ...result, risk_level: "" },
    ])
      expect(() => validatePrediction(bad)).toThrow(/invalid prediction/);
    for (const percentage of [0, 100])
      expect(
        validatePrediction({
          ...result,
          risk_probability_percentage: percentage,
        }).risk_probability_percentage,
      ).toBe(percentage);
    expect(
      validatePrediction({ ...result, risk_level: "Backend label" }).risk_level,
    ).toBe("Backend label");
  });
  it("rejects error-in-array, empty, malformed and nonfinite SHAP data", async () => {
    for (const data of [
      [{ error: "unavailable" }],
      [],
      {},
      [{ feature: "Age", importance: "0.4" }],
      [{ feature: "", importance: 0.4 }],
    ]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => respond(data)),
      );
      await expect(getShapImportance()).rejects.toThrow(/unavailable/);
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(() => respond([{ feature: "Age", importance: -0.47 }])),
    );
    await expect(getShapImportance()).resolves.toEqual([
      { feature: "Age", importance: -0.47 },
    ]);
  });
});
