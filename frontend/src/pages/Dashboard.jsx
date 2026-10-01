import { ClipboardList } from "lucide-react";
import AssessmentCards from "../components/AssessmentCards.jsx";
export default function Dashboard() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR ASSESSMENT SPACE</p>
        <h1 tabIndex="-1">Start with what you know.</h1>
        <p>
          Choose an assessment and enter measurements from your health records.
        </p>
      </div>
      <AssessmentCards />
      <section className="empty-history">
        <ClipboardList size={32} />
        <h2>A fresh perspective, each time.</h2>
        <p>
          Saved assessment history is not available here. Your result stays on
          its assessment page until you edit, reset, leave, or reload the page.
        </p>
        <p className="small">
          Submitted measurements and results are saved by the backend. This
          browser does not store them.
        </p>
      </section>
    </>
  );
}
