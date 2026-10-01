import {
  ArrowUpRight,
  Activity,
  ClipboardList,
  ScanLine,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import AssessmentCards from "../components/AssessmentCards.jsx";
export default function Home() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">A LITTLE CLARITY. A BETTER CONVERSATION.</p>
        <h1 tabIndex="-1">Your health, better understood.</h1>
        <p>
          A thoughtful starting point for understanding your health with AI.
        </p>
      </div>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="pill">
            <span /> TWO ASSESSMENTS. ONE CLEARER PICTURE.
          </span>
          <h2 id="hero-title">
            Make room for
            <br />
            <em>healthier possibilities.</em>
          </h2>
          <p>
            Bring your health measurements. Get a model-based risk estimate.
            Turn information into a more informed conversation.
          </p>
          <Link className="button light" to="/dashboard">
            Explore assessments <ArrowUpRight size={18} />
          </Link>
          <div className="hero-footnote">
            <ShieldCheck size={16} /> Clear results. No account needed.
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="art-core">
            <Activity strokeWidth={1.1} size={106} />
          </div>
          <span className="art-dot dot-one" />
          <span className="art-dot dot-two" />
          <span className="art-dot dot-three" />
          <div className="art-label label-one">
            <span className="tiny-pulse" /> Health in perspective
          </div>
          <div className="art-label label-two">
            <ShieldCheck size={17} /> Built around understanding
          </div>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">CHOOSE YOUR STARTING POINT</p>
          <h2>Two paths to more insight.</h2>
        </div>
        <span className="muted">Use measurements from your health records</span>
      </div>
      <AssessmentCards />
      <section className="process-section" aria-labelledby="process-title">
        <div className="process-intro">
          <p className="eyebrow">SIMPLE BY DESIGN</p>
          <h2 id="process-title">
            From numbers
            <br />
            to understanding.
          </h2>
          <Link to="/awareness" className="text-link">
            How to read your results <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="steps">
          {[
            [
              ClipboardList,
              "01",
              "Enter your measurements",
              "Use your own recorded health values.",
            ],
            [
              ScanLine,
              "02",
              "Review the estimate",
              "See the risk label and percentage returned by the model.",
            ],
            [
              MessageCircle,
              "03",
              "Keep the conversation going",
              "Discuss the result in the context of your health.",
            ],
          ].map(([Icon, n, title, description]) => (
            <div className="step" key={n}>
              <span className="step-icon">
                <Icon size={20} />
              </span>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
