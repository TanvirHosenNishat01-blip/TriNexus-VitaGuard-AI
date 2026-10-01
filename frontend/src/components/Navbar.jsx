import {
  Activity,
  LayoutDashboard,
  Heart,
  Droplets,
  BookOpen,
  ArrowUpRight,
  ShieldCheck,
  PanelsTopLeft,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";
const items = [
  ["/", "Overview", LayoutDashboard],
  ["/dashboard", "Assessments", PanelsTopLeft],
  ["/predict/diabetes", "Diabetes", Droplets],
  ["/predict/cardio", "Cardiovascular", Heart],
  ["/awareness", "Understanding results", BookOpen],
];
export default function Navbar() {
  return (
    <aside className="sidebar">
      <Link to="/" className="brand" aria-label="VitaGuard AI home">
        <span className="brand-icon">
          <Activity size={25} />
        </span>
        <span>
          VitaGuard<span className="brand-ai"> AI</span>
          <small>BY TRINEXUS</small>
        </span>
      </Link>
      <p className="nav-label">YOUR HEALTH, IN FOCUS</p>
      <nav aria-label="Main navigation">
        {items.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === "/"}>
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-note">
        <ShieldCheck size={26} />
        <h3>Clarity starts with context.</h3>
        <p>Model estimates are one part of a bigger health conversation.</p>
        <Link to="/awareness">
          Know your results <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="sidebar-bottom">
        <span className="small-mark">T</span>
        <span>
          TriNexus <small>Thoughtful technology.</small>
        </span>
      </div>
    </aside>
  );
}
