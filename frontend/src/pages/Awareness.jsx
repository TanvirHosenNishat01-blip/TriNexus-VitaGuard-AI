import AwarenessSection from "../components/AwarenessSection.jsx";
import ShapChart from "../components/ShapChart.jsx";
export default function Awareness() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">UNDERSTANDING YOUR RESULTS</p>
        <h1 tabIndex="-1">A number needs context.</h1>
        <p>
          Understand what an assessment can tell you, and how its information is
          used.
        </p>
      </div>
      <AwarenessSection />
      <ShapChart />
    </>
  );
}
