import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Info,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { emptyValues, validateValues } from "../utils/validationSchemas.js";
import ResultCard from "./ResultCard.jsx";
import ShapChart from "./ShapChart.jsx";

export default function PredictionForm({ disease, kind, fields, predict }) {
  const [values, setValues] = useState(() => emptyValues(fields));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("initial");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const active = useRef(null);
  const formRef = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  function change(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setResult(null);
    setStatus("initial");
    setMessage("");
  }
  function reset() {
    active.current?.abort();
    active.current = null;
    setValues(emptyValues(fields));
    setErrors({});
    setResult(null);
    setStatus("initial");
    setMessage("");
    formRef.current?.querySelector("input,select")?.focus();
  }
  async function submit(event) {
    event.preventDefault();
    if (active.current) return;
    const checked = validateValues(fields, values);
    setResult(null);
    setErrors(checked.errors);
    if (!checked.valid) {
      setStatus("error");
      setMessage("Please review the highlighted fields.");
      formRef.current?.elements
        .namedItem(Object.keys(checked.errors)[0])
        ?.focus();
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setStatus("loading");
    setMessage("");
    try {
      const response = await predict(checked.data, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setResult(response);
        setStatus("success");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setResult(null);
        setErrors(error.fieldErrors ?? {});
        setMessage(error.message || "The request failed. Please try again.");
        setStatus("error");
      }
    } finally {
      if (active.current === controller) active.current = null;
    }
  }
  const filled = fields.filter(
    (field) => values[field.name].trim() !== "",
  ).length;
  return (
    <>
      <Link to="/dashboard" className="back-link">
        <ArrowLeft size={16} /> All assessments
      </Link>
      <div className="page-heading form-heading">
        <p className="eyebrow">
          {kind === "diabetes" ? "METABOLIC HEALTH" : "HEART HEALTH"} ·{" "}
          {fields.length} INPUTS
        </p>
        <h1 tabIndex="-1">{disease} assessment</h1>
        <p>Your measurements. A model estimate. A more informed next step.</p>
      </div>
      <div className="form-layout">
        <section className="form-card" aria-labelledby="measurements-title">
          <div className="form-card-heading">
            <div>
              <h2 id="measurements-title">Your health measurements</h2>
              <p>All fields are required.</p>
            </div>
            <span className="completion">
              {filled} / {fields.length} entered
            </span>
          </div>
          <div className="input-guidance">
            <Info size={19} />
            <p>
              {kind === "diabetes"
                ? "Enter raw measurements. An explicit 0 in glucose, blood pressure, skin thickness, insulin or BMI is treated as missing by the backend. Leave no field blank."
                : "Category meanings have not been confirmed in the supplied training documentation. Select only the numeric code from your source record; do not guess a code."}
            </p>
          </div>
          <form
            ref={formRef}
            noValidate
            onSubmit={submit}
            aria-busy={status === "loading"}
          >
            <fieldset disabled={status === "loading"}>
              <legend className="sr-only">{disease} measurements</legend>
              <div className="fields-grid">
                {fields.map((field) => (
                  <div className="field" key={field.name}>
                    <label htmlFor={field.name}>
                      {field.label}
                      {field.codes && (
                        <span className="field-code"> ({field.name})</span>
                      )}
                    </label>
                    <div className="input-wrap">
                      {field.codes ? (
                        <select
                          id={field.name}
                          name={field.name}
                          value={values[field.name]}
                          onChange={(event) =>
                            change(field.name, event.target.value)
                          }
                          required
                          aria-invalid={!!errors[field.name]}
                          aria-describedby={
                            field.name +
                            "-help" +
                            (errors[field.name]
                              ? " " + field.name + "-error"
                              : "")
                          }
                        >
                          <option value="">Select a code</option>
                          {field.codes.map((code) => (
                            <option value={code} key={code}>
                              Code {code}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <input
                            id={field.name}
                            name={field.name}
                            type="number"
                            inputMode={field.integer ? "numeric" : "decimal"}
                            step={field.integer ? "1" : "any"}
                            min={field.name === "oldpeak" ? undefined : "0"}
                            value={values[field.name]}
                            placeholder="Enter value"
                            onChange={(event) =>
                              change(field.name, event.target.value)
                            }
                            required
                            autoComplete="off"
                            aria-invalid={!!errors[field.name]}
                            aria-describedby={
                              field.name +
                              "-help" +
                              (errors[field.name]
                                ? " " + field.name + "-error"
                                : "")
                            }
                          />
                          <span className="input-unit" aria-hidden="true">
                            {field.unit}
                          </span>
                        </>
                      )}
                    </div>
                    <span
                      id={field.name + "-help"}
                      className={field.hint ? "field-hint" : "sr-only"}
                    >
                      {field.hint ||
                        field.unit +
                          (field.integer
                            ? ". Whole number required."
                            : ". Numeric value required.")}
                    </span>
                    {errors[field.name] && (
                      <span id={field.name + "-error"} className="field-error">
                        {errors[field.name]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </fieldset>
            {status === "error" && (
              <div role="alert" className="error-banner">
                {message}
              </div>
            )}
            <div className="submit-area">
              <p>
                <ShieldCheck size={16} /> Submission sends your measurements to
                the backend, where inputs and results are saved.
              </p>
              <div className="form-actions">
                <button
                  className="button primary"
                  type="submit"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <>
                      <LoaderCircle className="spin" size={18} /> Assessing…
                    </>
                  ) : (
                    <>
                      {status === "error"
                        ? "Retry assessment"
                        : "Get risk estimate"}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                <button className="button quiet" type="button" onClick={reset}>
                  <RotateCcw size={16} /> Reset
                </button>
              </div>
            </div>
          </form>
        </section>
        <aside className="result-column">
          {result ? (
            <ResultCard disease={disease} result={result} />
          ) : (
            <section className="result-placeholder" aria-live="polite">
              <span className="placeholder-icon">
                <ClipboardList size={30} />
              </span>
              <p className="eyebrow">YOUR PERSONAL SNAPSHOT</p>
              <h2>
                {status === "loading"
                  ? "Preparing your estimate…"
                  : "Your results will appear here."}
              </h2>
              <p>
                {status === "loading"
                  ? "Waiting for the prediction service to respond."
                  : "Complete the assessment to see the model’s risk label and estimated probability."}
              </p>
              <div className="placeholder-divider" />
              <p className="small">
                An estimate is not a diagnosis. Your full health picture
                matters.
              </p>
            </section>
          )}
          <div className="result-context">
            <Info size={18} />
            <p>
              {kind === "diabetes"
                ? "Looking for context? After a successful result, you can explore global diabetes feature importance below."
                : "This assessment needs a genuine cardiovascular model and matching scaler on the backend. Service errors will appear without a prediction."}
            </p>
          </div>
        </aside>
      </div>
      {kind === "diabetes" && result && <ShapChart />}
    </>
  );
}
