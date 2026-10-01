import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { getShapImportance } from "../services/api.js";
export default function ShapChart() {
  const [state, setState] = useState({ status: "loading", data: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: [] });
    getShapImportance({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: "success", data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error", data: [] });
      });
    return () => controller.abort();
  }, [attempt]);
  const max = Math.max(
    ...state.data.map((item) => Math.abs(item.importance)),
    0,
  );
  return (
    <section className="shap-card" aria-labelledby="shap-heading">
      <div className="shap-title">
        <BarChart3 size={22} />
        <h2 id="shap-heading">Global diabetes feature importance</h2>
      </div>
      <p>
        How features contribute across the diabetes model. This is not a
        personal explanation or a cardiovascular explanation. Values are SHAP
        importance scores, not risk percentages.
      </p>
      {state.status === "loading" && (
        <p role="status">Loading feature importance…</p>
      )}
      {state.status === "error" && (
        <div className="shap-unavailable" role="status">
          <p>
            Global diabetes feature importance is currently unavailable. Your
            prediction result is unaffected.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            <RefreshCw size={16} /> Retry feature importance
          </button>
        </div>
      )}
      {state.status === "success" && (
        <figure>
          <figcaption>
            SHAP importance · bar length shows absolute magnitude
          </figcaption>
          <ul className="shap-bars">
            {state.data.map((item, index) => (
              <li key={item.feature + index}>
                <div>
                  <span>{item.feature}</span>
                  <strong>{item.importance}</strong>
                </div>
                <div className="shap-track" aria-hidden="true">
                  <span
                    style={{
                      width:
                        (max ? (Math.abs(item.importance) / max) * 100 : 0) +
                        "%",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </figure>
      )}
    </section>
  );
}
