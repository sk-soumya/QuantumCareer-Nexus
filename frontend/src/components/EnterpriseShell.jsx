import { Link, useLocation, useNavigate } from "react-router-dom";

const navByRole = {
  RECRUITER: [
    ["Dashboard", "/recruiter", "⌂"],
    ["Company", "/recruiter/company", "▦"],
    ["Job Drives", "/recruiter/jobs", "▣"],
    ["Applications", "/recruiter/applications", "≡"],
    ["AI Candidates", "/recruiter/ai-candidates", "✦"],
    ["Interviews", "/recruiter/interviews", "◷"],
    ["Offers", "/recruiter/offers", "◆"],
    ["Notifications", "/recruiter/notifications", "◌"],
  ],
  PLACEMENT_OFFICER: [
    ["Dashboard", "/placement", "⌂"],
    ["Students", "/placement/students", "◉"],
    ["Companies", "/placement/companies", "▦"],
    ["Job Drives", "/placement/jobs", "▣"],
    ["Applications", "/placement/applications", "≡"],
    ["Selection Rounds", "/placement/selection-rounds", "◇"],
    ["Scheduling", "/placement/scheduling", "◷"],
    ["Offers", "/placement/offers", "◆"],
    ["Analytics", "/placement/analytics", "▥"],
    ["Documents", "/placement/documents", "▤"],
    ["Notifications", "/placement/notifications", "◌"],
  ],
  STUDENT: [
    ["Dashboard", "/student", "⌂"],
    ["Profile", "/student/profile", "◉"],
    ["Resume AI", "/student/resume-ai", "✦"],
    ["Job Drives", "/student/jobs", "▣"],
    ["Applications", "/student/applications", "≡"],
    ["Interviews", "/student/interviews", "◷"],
    ["Offers", "/student/offers", "◆"],
    ["Documents", "/student/documents", "▤"],
    ["Recommendations", "/student/recommendations", "✧"],
    ["Notifications", "/student/notifications", "◌"],
  ],
  ADMIN: [
    ["Dashboard", "/admin", "⌂"],
    ["Users", "/admin/users", "◉"],
    ["Students", "/admin/students", "◈"],
    ["Recruiters", "/admin/recruiters", "◍"],
    ["Companies", "/admin/companies", "▦"],
    ["Job Drives", "/admin/jobs", "▣"],
    ["Applications", "/admin/applications", "≡"],
    ["Scheduling", "/admin/scheduling", "◷"],
    ["Offers", "/admin/offers", "◆"],
    ["Notifications", "/admin/notifications", "◌"],
  ],
};

function dashboardFor(role) {
  if (role === "RECRUITER") return "/recruiter";
  if (role === "PLACEMENT_OFFICER") return "/placement";
  if (role === "STUDENT") return "/student";
  if (role === "ADMIN") return "/admin";
  return "/login";
}

export default function EnterpriseShell({
  role,
  title,
  subtitle,
  children,
  actions,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const nav = navByRole[role] || [];

  function logout() {
    localStorage.removeItem("campuslink_token");
    navigate("/login", { replace: true });
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate(dashboardFor(role));
  }

  return (
    <div className="enterprise-shell">
      <aside className="enterprise-sidebar">
        <Link to={dashboardFor(role)} className="enterprise-brand">
          <span className="enterprise-brand-mark">C</span>
          <span>
            <strong>CampusLink</strong>
            <small>Placement OS</small>
          </span>
        </Link>

        <div className="enterprise-role-block">
          <span>WORKSPACE</span>
          <strong>{String(role || "").replaceAll("_", " ")}</strong>
        </div>

        <nav className="enterprise-nav">
          {nav.map(([label, path, icon]) => {
            const active =
              location.pathname === path ||
              (path !== "/recruiter" &&
                path !== "/placement" &&
                path !== "/student" &&
                path !== "/admin" &&
                location.pathname.startsWith(`${path}/`));

            return (
              <Link
                key={path}
                to={path}
                className={active ? "active" : ""}
              >
                <span>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="enterprise-sidebar-footer">
          <div className="enterprise-connected">
            <i /> API connected
          </div>
          <button type="button" onClick={logout}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      <main className="enterprise-main">
        <header className="enterprise-topbar">
          <div className="enterprise-top-title">
            <button
              type="button"
              className="enterprise-back"
              onClick={goBack}
              title="Go back"
            >
              ←
            </button>
            <div>
              <span>CampusLink / {title}</span>
              <h1>{title}</h1>
            </div>
          </div>

          <div className="enterprise-top-actions">
            <button
              type="button"
              className="enterprise-icon-button"
              onClick={() => navigate(nav.find(([label]) => label === "Notifications")?.[1] || dashboardFor(role))}
              title="Notifications"
            >
              ◌
            </button>
            <div className="enterprise-avatar">{String(role || "").slice(0, 2)}</div>
          </div>
        </header>

        <section className="enterprise-content">
          <div className="enterprise-page-header">
            <div>
              <span className="enterprise-eyebrow">CAMPUS OPERATIONS</span>
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <div className="enterprise-header-actions">{actions}</div>
          </div>

          {children}
        </section>
      </main>
    </div>
  );
}
