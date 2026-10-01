import { Eye, Database, MessagesSquare } from "lucide-react";
export default function AwarenessSection() {
  return (
    <div className="guidance-grid">
      {[
        [
          Eye,
          "An estimate, in context",
          "The risk label and model-estimated percentage come directly from the prediction service. They are not a diagnosis or a guarantee of a health outcome.",
        ],
        [
          MessagesSquare,
          "A conversation starter",
          "Interpret your estimate alongside your health records and a qualified healthcare professional. This tool does not provide treatment recommendations.",
        ],
        [
          Database,
          "Know where your data goes",
          "Submitting an assessment sends your measurements to the backend, which saves the input and result. The frontend does not save measurements in browser storage.",
        ],
      ].map(([Icon, title, description]) => (
        <article className="guidance-card" key={title}>
          <Icon size={25} />
          <h2>{title}</h2>
          <p>{description}</p>
        </article>
      ))}
    </div>
  );
}
