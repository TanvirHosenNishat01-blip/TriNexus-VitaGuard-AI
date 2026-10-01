import { CircleCheck } from "lucide-react";
export default function ResultCard({ disease, result }) {
  return (
    <section
      className="result-card"
      aria-labelledby="result-heading"
      role="status"
    >
      <div className="result-top">
        <CircleCheck size={22} />
        <span>ASSESSMENT COMPLETE</span>
      </div>
      <h2 id="result-heading">{disease} result</h2>
      <span className="risk-label">{result.risk_level}</span>
      <div className="result-percentage">
        {result.risk_probability_percentage}
        <span>%</span>
      </div>
      <p className="estimate-label">Model-estimated risk probability</p>
      <div className="result-meter" aria-hidden="true">
        <span style={{ width: result.risk_probability_percentage + "%" }} />
      </div>
      <p className="result-note">
        This estimate is not a diagnosis. Discuss it with a qualified healthcare
        professional in the context of your health.
      </p>
    </section>
  );
}
