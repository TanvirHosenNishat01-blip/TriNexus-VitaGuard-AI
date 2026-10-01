import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App.jsx";

const cases = [
  {
    disease: "Diabetes",
    route: "/predict/diabetes",
    endpoint: "/api/predict",
    values: {
      Pregnancies: 2,
      Glucose: 120.5,
      BloodPressure: 80,
      SkinThickness: 20,
      Insulin: 85,
      BMI: 25.5,
      DiabetesPedigreeFunction: 0.5,
      Age: 35,
    },
    integerKeys: ["Pregnancies", "Age"],
  },
  {
    disease: "Cardiovascular",
    route: "/predict/cardio",
    endpoint: "/api/predict/cardio",
    values: {
      age: 45,
      sex: 0,
      cp: 3,
      trestbps: 120,
      chol: 180,
      fbs: 1,
      restecg: 2,
      thalach: 150,
      exang: 0,
      oldpeak: 1.2,
      slope: 2,
      ca: 3,
      thal: 2,
    },
    integerKeys: [
      "age",
      "sex",
      "cp",
      "trestbps",
      "chol",
      "fbs",
      "restecg",
      "thalach",
      "exang",
      "slope",
      "ca",
      "thal",
    ],
  },
];
const result = {
  prediction: 0,
  risk_probability_percentage: 27.36,
  risk_level: "Low Risk",
};
const reply = (data, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(data), { status }));
function mount(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}
function fill(values) {
  for (const [name, value] of Object.entries(values))
    fireEvent.change(document.getElementById(name), {
      target: { value: String(value) },
    });
}
function submit() {
  fireEvent.click(
    screen.getByRole("button", { name: /Get risk estimate|Retry assessment/ }),
  );
}
function mockService(prediction) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url, options) =>
      url === "/api/shap-importance"
        ? reply([{ error: "missing" }])
        : prediction(url, options),
    ),
  );
}

describe("complete frontend flows with mocked fetch (no real model inference)", () => {
  for (const scenario of cases) {
    it(
      scenario.disease + " is reachable from both overview and dashboard",
      () => {
        mount("/");
        fireEvent.click(
          screen.getByRole("link", {
            name: new RegExp(
              "Start " + scenario.disease.toLowerCase() + " assessment",
            ),
          }),
        );
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          scenario.disease + " assessment",
        );
        fireEvent.click(screen.getByRole("link", { name: "All assessments" }));
        fireEvent.click(
          screen.getByRole("link", {
            name: new RegExp(
              "Start " + scenario.disease.toLowerCase() + " assessment",
            ),
          }),
        );
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          scenario.disease,
        );
      },
    );
    it(
      scenario.disease +
        " sends exact fields and numeric types, renders actual response, clears stale result and resets",
      async () => {
        mockService(() => reply(result));
        mount(scenario.route);
        fill(scenario.values);
        submit();
        const card = await screen
          .findByRole("region", { name: scenario.disease + " result" })
          .catch(() =>
            screen.findByRole("status", { name: scenario.disease + " result" }),
          );
        expect(card).toHaveTextContent("27.36%");
        expect(card).toHaveTextContent("Low Risk");
        const [url, options] = fetch.mock.calls.find(
          ([url]) => url === scenario.endpoint,
        );
        expect(url).toBe(scenario.endpoint);
        const payload = JSON.parse(options.body);
        expect(payload).toEqual(scenario.values);
        expect(
          Object.values(payload).every((value) => typeof value === "number"),
        ).toBe(true);
        expect(
          scenario.integerKeys.every((key) => Number.isInteger(payload[key])),
        ).toBe(true);
        if (scenario.disease === "Diabetes") {
          await screen.findByText(
            /Global diabetes feature importance is currently unavailable/,
          );
          expect(card).toHaveTextContent("27.36%");
          fetch.mockImplementation((url) =>
            url === "/api/shap-importance"
              ? reply([{ feature: "Glucose", importance: 0.4321 }])
              : reply(result),
          );
          fireEvent.click(
            screen.getByRole("button", { name: "Retry feature importance" }),
          );
          await screen.findByText("0.4321");
          expect(screen.getByText(/not risk percentages/)).toBeInTheDocument();
        } else
          expect(
            fetch.mock.calls.some(([url]) => url === "/api/shap-importance"),
          ).toBe(false);
        const firstName = Object.keys(scenario.values)[0];
        fireEvent.change(document.getElementById(firstName), {
          target: { value: "4" },
        });
        expect(screen.queryByText("27.36")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Reset" }));
        expect(document.getElementById(firstName)).toHaveValue(null);
        expect(document.getElementById(firstName)).toHaveFocus();
      },
    );
    it(
      scenario.disease +
        " validates required fields and focuses the first error",
      () => {
        mockService(() => reply(result));
        mount(scenario.route);
        submit();
        expect(screen.getAllByText("This field is required.")).toHaveLength(
          Object.keys(scenario.values).length,
        );
        expect(fetch).not.toHaveBeenCalled();
        expect(document.querySelector('[aria-invalid="true"]')).toHaveFocus();
      },
    );
    for (const [label, response, message] of [
      [
        "network",
        () => Promise.reject(new TypeError("Failed to fetch")),
        /Could not reach/,
      ],
      [
        "422",
        () =>
          reply(
            {
              detail: [
                {
                  loc: ["body", Object.keys(scenario.values)[0]],
                  msg: "Invalid value",
                },
              ],
            },
            422,
          ),
        /could not validate/,
      ],
      [
        "500",
        () =>
          Promise.resolve(
            new Response("Internal server error", { status: 500 }),
          ),
        /server error \(500\)/,
      ],
      [
        "malformed",
        () =>
          reply({
            risk_level: "High Risk",
            prediction: 1,
            risk_probability_percentage: 103,
          }),
        /invalid prediction/,
      ],
    ]) {
      it(
        scenario.disease + " shows " + label + " failure and supports retry",
        async () => {
          mockService(response);
          mount(scenario.route);
          fill(scenario.values);
          submit();
          expect(await screen.findByRole("alert")).toHaveTextContent(message);
          expect(
            screen.queryByText("ASSESSMENT COMPLETE"),
          ).not.toBeInTheDocument();
          if (label === "422")
            expect(screen.getByText("Invalid value")).toBeInTheDocument();
          mockService(() => reply(result));
          submit();
          await screen.findByText("ASSESSMENT COMPLETE");
        },
      );
    }
    it(
      scenario.disease +
        " clears a previous success after a subsequent failure",
      async () => {
        mockService(() => reply(result));
        mount(scenario.route);
        fill(scenario.values);
        submit();
        await screen.findByText("ASSESSMENT COMPLETE");
        mockService(() =>
          Promise.resolve(new Response("Error", { status: 500 })),
        );
        submit();
        await screen.findByRole("alert");
        expect(
          screen.queryByText("ASSESSMENT COMPLETE"),
        ).not.toBeInTheDocument();
      },
    );
    it(
      scenario.disease +
        " prevents duplicate submissions and discards a cancelled response",
      async () => {
        let resolveRequest;
        mockService(
          () =>
            new Promise((resolve) => {
              resolveRequest = resolve;
            }),
        );
        mount(scenario.route);
        fill(scenario.values);
        submit();
        expect(
          screen.getByRole("button", { name: "Assessing…" }),
        ).toBeDisabled();
        fireEvent.submit(document.querySelector("form"));
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(document.querySelector("fieldset")).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: "Reset" }));
        await act(async () =>
          resolveRequest(new Response(JSON.stringify(result))),
        );
        expect(
          screen.queryByText("ASSESSMENT COMPLETE"),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Get risk estimate" }),
        ).toBeEnabled();
      },
    );
  }
});
