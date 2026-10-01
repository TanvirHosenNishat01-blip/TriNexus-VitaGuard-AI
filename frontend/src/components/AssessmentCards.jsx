import { ArrowUpRight, Droplets, Heart } from "lucide-react";
import { Link } from "react-router-dom";
export default function AssessmentCards() {
  return (
    <div className="assessment-grid">
      <Link to="/predict/diabetes" className="assessment-card diabetes-card">
        <span className="card-top">
          <span className="disease-icon">
            <Droplets size={25} />
          </span>
          <span className="feature-count">8 health inputs</span>
        </span>
        <h3>Diabetes assessment</h3>
        <p>
          Explore a diabetes risk estimate using your health measurements and
          background.
        </p>
        <span className="card-link">
          Start diabetes assessment <ArrowUpRight size={20} />
        </span>
      </Link>
      <Link to="/predict/cardio" className="assessment-card cardio-card">
        <span className="card-top">
          <span className="disease-icon">
            <Heart size={25} />
          </span>
          <span className="feature-count">13 health inputs</span>
        </span>
        <h3>Cardiovascular assessment</h3>
        <p>
          Explore a heart disease risk estimate using your clinical measurements
          and test results.
        </p>
        <span className="card-link">
          Start cardiovascular assessment <ArrowUpRight size={20} />
        </span>
      </Link>
    </div>
  );
}
