import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DiabetesPredict from "./pages/DiabetesPredict.jsx";
import CardioPredict from "./pages/CardioPredict.jsx";
import Awareness from "./pages/Awareness.jsx";

export default function App() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector("main h1")?.focus();
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <div className="workspace">
        <header className="topbar">
          <span>PERSONAL HEALTH INSIGHTS</span>
          <span className="topbar-note">
            <i /> Understand. Reflect. Take the next step.
          </span>
        </header>
        <main id="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/predict/diabetes" element={<DiabetesPredict />} />
            <Route path="/predict/cardio" element={<CardioPredict />} />
            <Route path="/awareness" element={<Awareness />} />
            <Route
              path="*"
              element={
                <div className="page-heading">
                  <p className="eyebrow">PAGE NOT FOUND</p>
                  <h1 tabIndex="-1">Let’s get you back.</h1>
                  <Link className="button primary" to="/">
                    Go to overview
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
}
