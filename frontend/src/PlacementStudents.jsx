import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
}

async function api(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || `Request failed (${response.status})`);
  }
  return data;
}

function statusClass(value) {
  const text = String(value || "").toUpperCase();
  if (text.includes("PLACED") || text.includes("OFFER")) return "green";
  if (text.includes("INTERVIEW")) return "purple";
  if (text.includes("SHORTLIST")) return "blue";
  if (text.includes("APPLIED")) return "amber";
  return "slate";
}

function strengthTone(value) {
  if (value >= 80) return "green";
  if (value >= 60) return "blue";
  if (value >= 40) return "amber";
  return "red";
}

function dateLabel(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
}

function MetricCard({ label, value, caption, icon, tone }) {
  return (
    <div className="ps-metric-card">
      <div className={`ps-metric-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </div>
  );
}

export default function PlacementStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);

  async function loadStudents(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true);
      setRefreshing(!showSpinner);
      setError("");
      const data = await api("/students/");
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setStudents([]);
      setError(err.message || "Unable to load students.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadStudents(true);
  }, []);

  const metrics = useMemo(() => {
    const total = students.length;
    const active = students.filter((student) => student.is_active).length;
    const inactive = total - active;
    const profileReady = students.filter((student) => student.profile_strength >= 60).length;
    const avgStrength = total
      ? Math.round(students.reduce((sum, student) => sum + Number(student.profile_strength || 0), 0) / total)
      : 0;
    const avgCgpaStudents = students.filter((student) => student.cgpa !== null && student.cgpa !== undefined);
    const avgCgpa = avgCgpaStudents.length
      ? (avgCgpaStudents.reduce((sum, student) => sum + Number(student.cgpa), 0) / avgCgpaStudents.length).toFixed(2)
      : "—";
    const applications = students.reduce((sum, student) => sum + Number(student.application_count || 0), 0);
    const placed = students.filter((student) => String(student.placement_stage).includes("PLACED")).length;

    return { total, active, inactive, profileReady, avgStrength, avgCgpa, applications, placed };
  }, [students]);

  const stageCounts = useMemo(() => {
    const map = {
      "PROFILE READY": 0,
      APPLIED: 0,
      SHORTLISTED: 0,
      INTERVIEW: 0,
      "PLACED / OFFER": 0,
    };
    students.forEach((student) => {
      const stage = student.placement_stage || "PROFILE READY";
      map[stage] = (map[stage] || 0) + 1;
    });
    return Object.entries(map);
  }, [students]);

  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      const haystack = [
        student.full_name,
        student.email,
        student.degree,
        student.department,
        student.preferred_roles,
        ...(student.skills || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchQuery = !q || haystack.includes(q);
      const matchStatus =
        statusFilter === "ALL" || student.placement_stage === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [students, query, statusFilter]);

  function exportCsv() {
    const headers = [
      "Name",
      "Email",
      "Degree",
      "Department",
      "CGPA",
      "Skills",
      "Profile Strength",
      "Applications",
      "Placement Stage",
      "Active",
    ];

    const rows = visibleStudents.map((student) => [
      student.full_name,
      student.email,
      student.degree || "",
      student.department || "",
      student.cgpa ?? "",
      (student.skills || []).join(" | "),
      `${student.profile_strength}%`,
      student.application_count,
      student.placement_stage,
      student.is_active ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "campuslink-student-directory.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ps-page">
      <style>{CSS}</style>

      <header className="ps-hero">
        <div>
          <div className="ps-kicker">PLACEMENT OPERATIONS</div>
          <h1>Student Directory</h1>
          <p>Live student intelligence, academic readiness and placement progress in one view.</p>
        </div>
        <div className="ps-hero-actions">
          <button type="button" className="ps-secondary" onClick={exportCsv} disabled={!visibleStudents.length}>
            ⇩ Export CSV
          </button>
          <button type="button" className="ps-primary" onClick={() => loadStudents(false)} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "↻ Refresh data"}
          </button>
        </div>
      </header>

      {error && (
        <div className="ps-error">
          <strong>Student data could not be loaded</strong>
          <span>{error}</span>
          <button type="button" onClick={() => loadStudents(true)}>Try Again</button>
        </div>
      )}

      <section className="ps-metrics">
        <MetricCard label="Total Students" value={metrics.total} caption="Registered student accounts" icon="◎" tone="blue" />
        <MetricCard label="Active Accounts" value={metrics.active} caption={`${metrics.total ? Math.round((metrics.active / metrics.total) * 100) : 0}% active`} icon="✓" tone="green" />
        <MetricCard label="Profile Ready" value={metrics.profileReady} caption="60%+ profile strength" icon="✦" tone="purple" />
        <MetricCard label="Avg. Readiness" value={`${metrics.avgStrength}%`} caption={`Average CGPA ${metrics.avgCgpa}`} icon="◈" tone="amber" />
      </section>

      <section className="ps-insights-grid">
        <div className="ps-panel">
          <div className="ps-panel-head">
            <div>
              <span>PLACEMENT PIPELINE</span>
              <h2>Student movement</h2>
            </div>
            <div className="ps-panel-note">{metrics.applications} applications</div>
          </div>
          <div className="ps-stage-chart">
            {stageCounts.map(([stage, value]) => {
              const max = Math.max(1, ...stageCounts.map(([, count]) => count));
              return (
                <div className="ps-stage" key={stage}>
                  <div className="ps-stage-top"><span>{stage}</span><strong>{value}</strong></div>
                  <div className="ps-bar"><span style={{ width: `${(value / max) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ps-panel ps-outcome">
          <div className="ps-panel-head">
            <div>
              <span>PLACEMENT OUTCOME</span>
              <h2>{metrics.placed} students placed / offered</h2>
            </div>
            <div className="ps-outcome-ring" style={{ background: `conic-gradient(#10b981 ${(metrics.total ? (metrics.placed / metrics.total) * 360 : 0)}deg, #e8eef6 0deg)` }}>
              <div>{metrics.total ? Math.round((metrics.placed / metrics.total) * 100) : 0}%</div>
            </div>
          </div>
          <p>Use the directory to identify students who need profile completion, interview preparation or application follow-up.</p>
          <div className="ps-outcome-row"><span>Avg. profile strength</span><strong>{metrics.avgStrength}%</strong></div>
          <div className="ps-outcome-row"><span>Students with applications</span><strong>{students.filter((student) => student.application_count > 0).length}</strong></div>
        </div>
      </section>

      <section className="ps-directory">
        <div className="ps-directory-head">
          <div>
            <span>STUDENT RECORDS</span>
            <h2>Directory</h2>
            <small>{visibleStudents.length} students displayed</small>
          </div>
          <div className="ps-filters">
            <div className="ps-search">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, email, skill or degree…" /></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All stages</option>
              <option value="PROFILE READY">Profile ready</option>
              <option value="APPLIED">Applied</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="INTERVIEW">Interview</option>
              <option value="PLACED / OFFER">Placed / Offer</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="ps-loading"><div className="ps-loader" /><strong>Loading student intelligence…</strong><span>Syncing accounts, profiles and placement activity.</span></div>
        ) : visibleStudents.length === 0 ? (
          <div className="ps-empty"><div>◎</div><strong>{students.length ? "No students match these filters" : "No student records found"}</strong><p>{students.length ? "Change the search or stage filter." : "Create a student account, then refresh this directory."}</p><button type="button" className="ps-secondary" onClick={() => loadStudents(true)}>Refresh</button></div>
        ) : (
          <div className="ps-table-wrap">
            <table className="ps-table">
              <thead>
                <tr><th>Student</th><th>Academic</th><th>Skills</th><th>Profile</th><th>Applications</th><th>Stage</th><th>Account</th></tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => {
                  const tone = strengthTone(Number(student.profile_strength || 0));
                  return (
                    <tr key={student.id} onClick={() => setSelected(student)}>
                      <td>
                        <div className="ps-student-cell"><div className="ps-avatar">{String(student.full_name || "S").slice(0, 1).toUpperCase()}</div><div><strong>{student.full_name}</strong><small>{student.email}</small></div></div>
                      </td>
                      <td><strong>{student.cgpa ?? "—"}</strong><small>{student.degree || "Degree pending"}</small></td>
                      <td><div className="ps-skill-count">{student.skill_count} skills</div><div className="ps-skill-preview">{(student.skills || []).slice(0, 3).join(" · ") || "Not added"}</div></td>
                      <td><div className={`ps-strength ${tone}`}><span>{student.profile_strength}%</span><i><b style={{ width: `${student.profile_strength}%` }} /></i></div></td>
                      <td><strong>{student.application_count}</strong><small>applications</small></td>
                      <td><span className={`ps-pill ${statusClass(student.placement_stage)}`}>{student.placement_stage}</span></td>
                      <td><span className={`ps-account-dot ${student.is_active ? "active" : "inactive"}`}>{student.is_active ? "Active" : "Inactive"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div className="ps-overlay" onClick={() => setSelected(null)}>
          <aside className="ps-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="ps-drawer-head">
              <div><div className="ps-avatar large">{String(selected.full_name || "S").slice(0, 1).toUpperCase()}</div><div><span>STUDENT PROFILE</span><h2>{selected.full_name}</h2><small>{selected.email}</small></div></div>
              <button type="button" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="ps-drawer-stage"><span className={`ps-pill ${statusClass(selected.placement_stage)}`}>{selected.placement_stage}</span><strong>{selected.profile_strength}% profile strength</strong></div>
            <div className="ps-detail-grid">
              <div><span>CGPA</span><strong>{selected.cgpa ?? "—"}</strong></div>
              <div><span>Graduation</span><strong>{selected.graduation_year || "—"}</strong></div>
              <div><span>Applications</span><strong>{selected.application_count}</strong></div>
              <div><span>Skills</span><strong>{selected.skill_count}</strong></div>
            </div>
            <div className="ps-detail-block"><span>EDUCATION</span><strong>{selected.degree || "Not added"}</strong><p>{selected.department || "Department not added"}</p></div>
            <div className="ps-detail-block"><span>SKILLS</span><div className="ps-detail-chips">{(selected.skills || []).map((skill) => <i key={skill}>{skill}</i>)}</div></div>
            <div className="ps-detail-block"><span>PREFERENCES</span><strong>{selected.preferred_roles || "No target role"}</strong><p>{selected.preferred_locations || "No preferred location"}</p></div>
            <div className="ps-detail-actions"><button type="button" className="ps-secondary" onClick={() => setSelected(null)}>Close</button></div>
          </aside>
        </div>
      )}
    </div>
  );
}

const CSS = `
.ps-page{min-height:100%;padding:28px 30px 44px;background:radial-gradient(circle at 10% 0%,rgba(99,102,241,.10),transparent 27%),radial-gradient(circle at 100% 20%,rgba(14,165,233,.08),transparent 26%),#f4f7fb;color:#13213a}.ps-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:18px}.ps-kicker{font-size:9px;letter-spacing:.16em;font-weight:900;color:#607391}.ps-hero h1{margin:6px 0 6px;font-size:40px;letter-spacing:-.045em}.ps-hero p{margin:0;color:#71809a;font-size:12px}.ps-hero-actions{display:flex;gap:9px}.ps-primary,.ps-secondary{border:1px solid #d7e1ee;background:#fff;color:#24405f;border-radius:11px;padding:10px 13px;font-size:10px;font-weight:900;cursor:pointer}.ps-primary{background:linear-gradient(135deg,#2563eb,#4f46e5);border-color:transparent;color:#fff;box-shadow:0 10px 22px rgba(37,99,235,.20)}.ps-primary:disabled,.ps-secondary:disabled{opacity:.55;cursor:not-allowed}.ps-error{display:flex;align-items:center;gap:12px;background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;border-radius:14px;padding:12px 14px;margin-bottom:14px}.ps-error strong{font-size:11px}.ps-error span{font-size:10px;flex:1}.ps-error button{border:1px solid #fda4af;background:#fff;border-radius:9px;padding:8px 10px;color:#be123c;font-size:9px;font-weight:900}.ps-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:15px}.ps-metric-card{background:rgba(255,255,255,.92);border:1px solid #e1e8f1;border-radius:18px;padding:17px;display:flex;gap:12px;align-items:center;box-shadow:0 12px 28px rgba(31,47,72,.05)}.ps-metric-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-weight:900;font-size:18px}.ps-metric-icon.blue{background:#eef4ff;color:#3168dd}.ps-metric-icon.green{background:#e9fbf3;color:#10a66b}.ps-metric-icon.purple{background:#f1edff;color:#7657db}.ps-metric-icon.amber{background:#fff6e8;color:#d88a17}.ps-metric-card span{display:block;font-size:9px;color:#74839a;font-weight:900}.ps-metric-card strong{display:block;font-size:25px;margin-top:3px}.ps-metric-card small{display:block;font-size:8px;color:#96a2b3;margin-top:3px}.ps-insights-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:14px;margin-bottom:15px}.ps-panel,.ps-directory{background:rgba(255,255,255,.94);border:1px solid #e1e8f1;border-radius:18px;box-shadow:0 12px 28px rgba(31,47,72,.05)}.ps-panel{padding:17px}.ps-panel-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.ps-panel-head>div>span,.ps-directory-head>div>span{display:block;font-size:9px;letter-spacing:.13em;color:#71839c;font-weight:900}.ps-panel-head h2,.ps-directory-head h2{margin:5px 0 3px;font-size:17px}.ps-panel-note{font-size:9px;color:#7890ad;background:#f5f8fc;border:1px solid #e3eaf2;padding:7px 9px;border-radius:999px}.ps-stage-chart{display:grid;gap:12px;margin-top:15px}.ps-stage-top{display:flex;justify-content:space-between;font-size:9px;color:#64748b}.ps-stage-top strong{color:#1e3351}.ps-bar{height:9px;background:#edf2f7;border-radius:99px;overflow:hidden}.ps-bar span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#4f46e5,#06b6d4)}.ps-outcome{background:linear-gradient(145deg,#fbfeff,#eff8ff)}.ps-outcome .ps-panel-head{align-items:center}.ps-outcome-ring{width:82px;height:82px;border-radius:50%;display:grid;place-items:center;flex:none}.ps-outcome-ring div{width:60px;height:60px;border-radius:50%;background:#fff;display:grid;place-items:center;font-weight:900;font-size:14px}.ps-outcome p{font-size:10px;line-height:1.55;color:#667991;margin:13px 0}.ps-outcome-row{display:flex;justify-content:space-between;border-top:1px solid #e1eaf3;padding-top:9px;margin-top:8px;font-size:9px;color:#72829a}.ps-outcome-row strong{color:#17385f}.ps-directory{overflow:hidden}.ps-directory-head{padding:17px 18px;border-bottom:1px solid #e5ebf2;display:flex;justify-content:space-between;gap:16px;align-items:flex-end}.ps-directory-head small{font-size:9px;color:#98a4b4}.ps-filters{display:flex;gap:9px;align-items:center}.ps-search{display:flex;align-items:center;gap:7px;background:#fbfdff;border:1px solid #d8e1eb;border-radius:10px;padding:0 10px;color:#8594a8}.ps-search input{border:0;outline:0;background:transparent;padding:10px 0;width:250px;font-size:10px;color:#20324d}.ps-filters select{height:38px;border:1px solid #d8e1eb;background:#fff;border-radius:10px;padding:0 11px;font-size:10px;color:#3c516d}.ps-table-wrap{overflow:auto}.ps-table{width:100%;border-collapse:collapse;min-width:980px}.ps-table th{font-size:8px;letter-spacing:.10em;color:#8391a6;text-transform:uppercase;text-align:left;padding:12px 14px;background:#fbfcfe;border-bottom:1px solid #e5ebf2}.ps-table td{padding:13px 14px;border-bottom:1px solid #edf1f5;vertical-align:middle;font-size:10px;cursor:pointer}.ps-table tbody tr:hover{background:#f8fbff}.ps-table td strong{display:block;color:#19304f;font-size:11px}.ps-table td small{display:block;color:#91a0b2;font-size:8px;margin-top:3px}.ps-student-cell{display:flex;gap:9px;align-items:center}.ps-avatar{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#dbeafe,#e0e7ff);color:#3157ae;display:grid;place-items:center;font-weight:900}.ps-avatar.large{width:46px;height:46px;border-radius:14px;font-size:18px}.ps-skill-count{font-weight:900;color:#28517f}.ps-skill-preview{font-size:8px;color:#8797aa;max-width:190px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}.ps-strength span{display:block;font-size:10px;font-weight:900;margin-bottom:5px}.ps-strength i{display:block;width:80px;height:6px;border-radius:99px;background:#edf1f6;overflow:hidden}.ps-strength b{display:block;height:100%;border-radius:inherit}.ps-strength.green span{color:#0c8c5b}.ps-strength.green b{background:#10b981}.ps-strength.blue span{color:#2563eb}.ps-strength.blue b{background:#3b82f6}.ps-strength.amber span{color:#b7791f}.ps-strength.amber b{background:#f59e0b}.ps-strength.red span{color:#dc2626}.ps-strength.red b{background:#ef4444}.ps-pill{display:inline-flex;padding:6px 8px;border-radius:999px;font-size:8px;font-weight:900}.ps-pill.green{background:#eafaf2;color:#0b8a58}.ps-pill.blue{background:#edf4ff;color:#2563eb}.ps-pill.purple{background:#f0ecff;color:#6842d8}.ps-pill.amber{background:#fff5df;color:#ad6c0e}.ps-pill.slate{background:#eef2f6;color:#64748b}.ps-account-dot{font-size:8px;font-weight:900;padding-left:9px;position:relative}.ps-account-dot:before{content:"";position:absolute;left:0;top:50%;transform:translateY(-50%);width:5px;height:5px;border-radius:50%;background:#94a3b8}.ps-account-dot.active{color:#14835a}.ps-account-dot.active:before{background:#10b981}.ps-loading,.ps-empty{min-height:300px;display:grid;place-content:center;justify-items:center;gap:7px;color:#718096}.ps-loader{width:27px;height:27px;border:3px solid #dbe5ef;border-top-color:#2563eb;border-radius:50%;animation:psspin .8s linear infinite}.ps-empty>div{width:50px;height:50px;border-radius:16px;background:#edf4ff;display:grid;place-items:center;color:#2563eb;font-size:20px}.ps-empty strong{font-size:14px;color:#2a3e5d}.ps-empty p{margin:0 0 8px;font-size:10px}@keyframes psspin{to{transform:rotate(360deg)}}.ps-overlay{position:fixed;inset:0;background:rgba(15,23,42,.34);backdrop-filter:blur(4px);display:flex;justify-content:flex-end;z-index:999}.ps-drawer{height:100%;width:min(470px,94vw);background:#fff;box-shadow:-22px 0 60px rgba(15,23,42,.18);padding:22px;overflow:auto}.ps-drawer-head{display:flex;justify-content:space-between;gap:10px}.ps-drawer-head>div{display:flex;gap:11px;align-items:center}.ps-drawer-head span,.ps-detail-block>span{display:block;font-size:8px;letter-spacing:.13em;color:#7888a0;font-weight:900}.ps-drawer-head h2{margin:4px 0 2px;font-size:19px}.ps-drawer-head small{font-size:9px;color:#8d9bad}.ps-drawer-head>button{border:0;background:#f1f4f8;width:34px;height:34px;border-radius:10px;font-size:20px;color:#56687f;cursor:pointer}.ps-drawer-stage{margin:18px 0;padding:13px;border:1px solid #e4ebf2;border-radius:13px;display:flex;justify-content:space-between;align-items:center;gap:10px}.ps-drawer-stage strong{font-size:10px;color:#1e3a5f}.ps-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.ps-detail-grid>div{padding:12px;border-radius:12px;background:#f8fafc;border:1px solid #e8eef4}.ps-detail-grid span{display:block;font-size:8px;color:#8090a4;font-weight:900}.ps-detail-grid strong{display:block;font-size:18px;margin-top:4px}.ps-detail-block{padding:14px 0;border-bottom:1px solid #ebeff4}.ps-detail-block strong{display:block;margin-top:6px;font-size:11px}.ps-detail-block p{font-size:9px;color:#7d8da1;margin:4px 0 0}.ps-detail-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.ps-detail-chips i{font-style:normal;font-size:8px;padding:6px 8px;background:#edf4ff;color:#2457a6;border-radius:999px}.ps-detail-actions{margin-top:18px}@media(max-width:950px){.ps-metrics{grid-template-columns:repeat(2,1fr)}.ps-insights-grid{grid-template-columns:1fr}.ps-directory-head{display:block}.ps-filters{margin-top:12px}.ps-search input{width:100%}}@media(max-width:640px){.ps-page{padding:18px 14px}.ps-hero{display:block}.ps-hero-actions{margin-top:12px}.ps-metrics{grid-template-columns:1fr}.ps-filters{display:block}.ps-search{margin-bottom:8px}.ps-filters select{width:100%}}
`;
