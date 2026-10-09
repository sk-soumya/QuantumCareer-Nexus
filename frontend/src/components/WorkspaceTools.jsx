import { useLocation, useNavigate } from "react-router-dom";

function getRole() {
  try {
    const token = localStorage.getItem("campuslink_token") || "";
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role || "";
  } catch {
    return "";
  }
}

function dashboardPath(role) {
  if (role === "STUDENT") return "/student";
  if (role === "RECRUITER") return "/recruiter";
  if (role === "PLACEMENT_OFFICER") return "/placement";
  if (role === "ADMIN") return "/admin";
  return "/";
}

export default function WorkspaceTools() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = getRole();

  if (location.pathname === "/login" || location.pathname === "/") return null;

  const dashboard = dashboardPath(role);
  const canGoBack = window.history.length > 1;

  return (
    <div className="cxl-workspace-tools" aria-label="Page navigation">
      <button
        type="button"
        className="cxl-back"
        onClick={() => (canGoBack ? navigate(-1) : navigate(dashboard))}
        title="Go back"
      >
        <span>←</span>
        <b>Back</b>
      </button>
      <button
        type="button"
        className="cxl-home"
        onClick={() => navigate(dashboard)}
        title="Open dashboard"
      >
        <span>⌂</span>
        <b>Dashboard</b>
      </button>
      <style>{`
        .cxl-workspace-tools{position:fixed;left:18px;bottom:18px;z-index:9997;display:flex;gap:7px;padding:7px;border:1px solid rgba(148,163,184,.24);border-radius:15px;background:rgba(255,255,255,.88);backdrop-filter:blur(16px);box-shadow:0 14px 38px rgba(15,23,42,.13);animation:cxlToolsIn .45s ease both}
        .cxl-workspace-tools button{border:1px solid #dce4ef;border-radius:10px;background:#fff;color:#23324d;padding:9px 11px;display:flex;align-items:center;gap:6px;font-size:9px;font-weight:900;cursor:pointer;transition:.18s;box-shadow:0 3px 12px rgba(15,23,42,.04)}
        .cxl-workspace-tools button span{font-size:15px;line-height:1}
        .cxl-workspace-tools .cxl-back:hover{color:#4338ca;border-color:#a5b4fc;transform:translateX(-2px)}
        .cxl-workspace-tools .cxl-home{background:linear-gradient(135deg,#eef2ff,#ecfeff);border-color:#c7d2fe;color:#3730a3}
        .cxl-workspace-tools .cxl-home:hover{transform:translateY(-2px);border-color:#818cf8}
        @keyframes cxlToolsIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @media(max-width:600px){.cxl-workspace-tools{left:10px;bottom:10px}.cxl-workspace-tools button b{display:none}.cxl-workspace-tools button{width:38px;height:38px;padding:0;justify-content:center}}
      `}</style>
    </div>
  );
}
