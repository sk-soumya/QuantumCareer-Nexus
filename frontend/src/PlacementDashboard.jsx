import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
}

async function fetchJSON(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || `${response.status} ${response.statusText}`);
  }
  return data;
}

function asArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  for (const key of ["data", "results", "items", "records"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function firstValue(item, keys, fallback = "") {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], item);
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return fallback;
}

function normalizeStatus(value) {
  return String(value || "UNKNOWN")
    .trim()
    .replace(/[-\s]+/g, "_")
    .toUpperCase();
}

function formatStatus(value) {
  return normalizeStatus(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (x) => x.toUpperCase());
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function dateValue(item) {
  return firstValue(item, [
    "created_at",
    "updated_at",
    "application_date",
    "scheduled_at",
    "interview_date",
  ], null);
}

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function compactDate(value) {
  const date = safeDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getStatusTone(status) {
  const key = normalizeStatus(status);
  if (["SELECTED", "OFFERED", "ACCEPTED", "HIRED", "VERIFIED", "COMPLETED"].includes(key)) return "green";
  if (["SHORTLISTED", "INTERVIEW", "SCHEDULED", "REVIEWING", "IN_PROGRESS"].includes(key)) return "blue";
  if (["PENDING", "APPLIED", "NEW", "OPEN", "ACTIVE"].includes(key)) return "amber";
  if (["REJECTED", "CLOSED", "CANCELLED"].includes(key)) return "red";
  return "slate";
}

function Ring({ value, label, tone = "blue" }) {
  const safe = Math.max(0, Math.min(100, Math.round(value || 0)));
  const colors = {
    green: "#16a34a",
    blue: "#2563eb",
    violet: "#7c3aed",
    amber: "#f59e0b",
  };
  const color = colors[tone] || colors.blue;
  const degree = safe * 3.6;

  return (
    <div className="po-ring-wrap">
      <div
        className="po-ring"
        style={{
          background: `conic-gradient(${color} ${degree}deg, #e7edf5 0deg)`,
        }}
      >
        <div className="po-ring-core">
          <strong>{safe}%</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ value, tone = "blue" }) {
  return (
    <div className="po-mini-bar">
      <span className={tone} style={{ width: `${Math.max(3, Math.min(100, value || 0))}%` }} />
    </div>
  );
}

function StatCard({ icon, label, value, meta, tone }) {
  return (
    <div className={`po-stat ${tone}`}>
      <div className="po-stat-top">
        <span className="po-stat-icon">{icon}</span>
        <span className="po-stat-meta">{meta}</span>
      </div>
      <span className="po-stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyPanel({ title, message, action }) {
  return (
    <div className="po-empty">
      <div className="po-empty-icon">◇</div>
      <strong>{title}</strong>
      <p>{message}</p>
      {action || null}
    </div>
  );
}

export default function PlacementDashboard() {
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [offers, setOffers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [errors, setErrors] = useState([]);
  const [activeRange, setActiveRange] = useState("all");

  const loadPlacementData = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.allSettled([
      fetchJSON("/placement/students"),
      fetchJSON("/placement/companies"),
      fetchJSON("/placement/jobs"),
      fetchJSON("/placement/applications"),
      fetchJSON("/placement/offers"),
      fetchJSON("/placement/scheduling"),
      fetchJSON("/placement/notifications"),
    ]);

    const nextErrors = [];
    const [studentResult, companyResult, jobResult, applicationResult, offerResult, scheduleResult, notificationResult] = results;

    if (studentResult.status === "fulfilled") setStudents(asArray(studentResult.value, ["students"]));
    else nextErrors.push("Students");

    if (companyResult.status === "fulfilled") setCompanies(asArray(companyResult.value, ["companies"]));
    else nextErrors.push("Companies");

    if (jobResult.status === "fulfilled") setJobs(asArray(jobResult.value, ["jobs", "job_drives"]));
    else nextErrors.push("Job Drives");

    if (applicationResult.status === "fulfilled") setApplications(asArray(applicationResult.value, ["applications"]));
    else nextErrors.push("Applications");

    if (offerResult.status === "fulfilled") setOffers(asArray(offerResult.value, ["offers"]));
    else nextErrors.push("Offers");

    if (scheduleResult.status === "fulfilled") setSchedule(asArray(scheduleResult.value, ["schedules", "events", "interviews"]));
    else nextErrors.push("Scheduling");

    if (notificationResult.status === "fulfilled") setNotifications(asArray(notificationResult.value, ["notifications"]));
    else nextErrors.push("Notifications");

    setErrors(nextErrors);
    setLastSync(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadPlacementData();
  }, [loadPlacementData]);

  const filteredApplications = useMemo(() => {
    if (activeRange === "all") return applications;
    const days = activeRange === "7d" ? 7 : activeRange === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    return applications.filter((item) => {
      const date = safeDate(dateValue(item));
      return !date || date >= since;
    });
  }, [applications, activeRange]);

  const metrics = useMemo(() => {
    const totalStudents = students.length;
    const totalCompanies = companies.length;
    const activeJobs = jobs.filter((job) => {
      const status = normalizeStatus(firstValue(job, ["status", "drive_status", "state"]));
      return !["CLOSED", "CANCELLED", "EXPIRED"].includes(status);
    }).length;
    const totalApplications = filteredApplications.length;

    const selectedCount = applications.filter((app) => ["SELECTED", "HIRED", "OFFERED"].includes(normalizeStatus(firstValue(app, ["status", "application_status", "stage"])))) .length;
    const interviewCount = applications.filter((app) => ["INTERVIEW", "INTERVIEWED", "SCHEDULED", "SHORTLISTED"].includes(normalizeStatus(firstValue(app, ["status", "application_status", "stage"])))) .length;
    const offerCount = offers.length || selectedCount;
    const acceptedOffers = offers.filter((offer) => ["ACCEPTED", "JOINED", "APPROVED"].includes(normalizeStatus(firstValue(offer, ["status", "offer_status"])))).length;

    const placementRate = totalStudents ? Math.round((acceptedOffers / totalStudents) * 100) : 0;
    const conversionRate = totalApplications ? Math.round((acceptedOffers / totalApplications) * 100) : 0;
    const interviewRate = totalApplications ? Math.round((interviewCount / totalApplications) * 100) : 0;

    return {
      totalStudents,
      totalCompanies,
      activeJobs,
      totalApplications,
      offerCount,
      acceptedOffers,
      placementRate,
      conversionRate,
      interviewRate,
    };
  }, [students, companies, jobs, filteredApplications, applications, offers]);

  const applicationPipeline = useMemo(() => {
    const buckets = [
      ["APPLIED", "Applied"],
      ["SHORTLISTED", "Shortlisted"],
      ["INTERVIEW", "Interview"],
      ["SELECTED", "Selected"],
      ["OFFERED", "Offered"],
      ["ACCEPTED", "Accepted"],
    ];

    return buckets.map(([key, label]) => {
      const count = applications.filter((item) => {
        const status = normalizeStatus(firstValue(item, ["status", "application_status", "stage"]));
        if (key === "INTERVIEW") return ["INTERVIEW", "INTERVIEWED", "SCHEDULED"].includes(status);
        if (key === "OFFERED") return ["OFFERED", "OFFER", "SELECTED"].includes(status);
        if (key === "ACCEPTED") return ["ACCEPTED", "JOINED"].includes(status);
        return status === key;
      }).length;
      return { key, label, count };
    });
  }, [applications]);

  const statusMix = useMemo(() => {
    const map = new Map();
    for (const item of applications) {
      const status = formatStatus(firstValue(item, ["status", "application_status", "stage"], "Unknown"));
      map.set(status, (map.get(status) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [applications]);

  const driveMix = useMemo(() => {
    const map = new Map();
    for (const job of jobs) {
      const type = String(firstValue(job, ["job_type", "employment_type", "type"], "Other"));
      map.set(type, (map.get(type) || 0) + 1);
    }
    return Array.from(map.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [jobs]);

  const companyPerformance = useMemo(() => {
    const rows = new Map();
    for (const application of applications) {
      const company = firstValue(application, ["company_name", "company.name", "company", "employer"], "Unknown company");
      const status = normalizeStatus(firstValue(application, ["status", "application_status", "stage"]));
      const row = rows.get(company) || { company, applications: 0, selected: 0, offers: 0 };
      row.applications += 1;
      if (["SELECTED", "HIRED", "OFFERED"].includes(status)) row.selected += 1;
      if (["OFFERED", "ACCEPTED", "JOINED"].includes(status)) row.offers += 1;
      rows.set(company, row);
    }
    return Array.from(rows.values())
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 5)
      .map((row) => ({
        ...row,
        conversion: row.applications ? Math.round((row.offers / row.applications) * 100) : 0,
      }));
  }, [applications]);

  const recentActivity = useMemo(() => {
    const items = [];
    applications.forEach((item) => {
      const date = dateValue(item);
      items.push({
        date,
        title: firstValue(item, ["student_name", "student.name", "candidate_name"], "Student application"),
        meta: `${firstValue(item, ["company_name", "company.name", "company"], "Company")} · ${formatStatus(firstValue(item, ["status", "application_status", "stage"], "Updated"))}`,
        tone: getStatusTone(firstValue(item, ["status", "application_status", "stage"])),
      });
    });
    offers.forEach((item) => {
      const date = dateValue(item);
      items.push({
        date,
        title: firstValue(item, ["student_name", "student.name", "candidate_name"], "Offer activity"),
        meta: `Offer · ${formatStatus(firstValue(item, ["status", "offer_status"], "Created"))}`,
        tone: getStatusTone(firstValue(item, ["status", "offer_status"])),
      });
    });
    schedule.forEach((item) => {
      const date = dateValue(item);
      items.push({
        date,
        title: firstValue(item, ["title", "interview_title", "student_name"], "Interview schedule"),
        meta: `Schedule · ${compactDate(firstValue(item, ["start_time", "scheduled_at", "interview_date"]))}`,
        tone: "blue",
      });
    });
    return items
      .sort((a, b) => (safeDate(b.date)?.getTime() || 0) - (safeDate(a.date)?.getTime() || 0))
      .slice(0, 7);
  }, [applications, offers, schedule]);

  const intelligence = useMemo(() => {
    const insights = [];
    if (!metrics.totalStudents) insights.push({ tone: "amber", title: "Student dataset is empty", text: "Import or create student records to activate live placement KPIs." });
    else if (!metrics.acceptedOffers) insights.push({ tone: "blue", title: "Placement outcome not yet captured", text: "Your dashboard is receiving students and drives, but no accepted offer is visible yet." });
    else insights.push({ tone: "green", title: `${metrics.acceptedOffers} accepted offer${metrics.acceptedOffers === 1 ? "" : "s"}`, text: `${metrics.placementRate}% of the current student cohort has an accepted outcome in the loaded records.` });

    if (metrics.activeJobs) insights.push({ tone: "violet", title: `${metrics.activeJobs} live hiring drive${metrics.activeJobs === 1 ? "" : "s"}`, text: "Keep high-volume drives at the top of the operating queue and monitor their application conversion." });
    if (metrics.interviewRate >= 40) insights.push({ tone: "green", title: "Healthy interview progression", text: `${metrics.interviewRate}% of applications are at interview/shortlist stages in the current data.` });
    else if (metrics.totalApplications) insights.push({ tone: "amber", title: "Pipeline needs attention", text: `Only ${metrics.interviewRate}% of applications are at interview/shortlist stages; review screening and shortlist bottlenecks.` });

    const busiest = companyPerformance[0];
    if (busiest) insights.push({ tone: "blue", title: `${busiest.company} has the largest pipeline`, text: `${busiest.applications} applications are associated with this company; conversion to offer is ${busiest.conversion}%.` });

    return insights.slice(0, 4);
  }, [metrics, companyPerformance]);

  const maxPipeline = Math.max(1, ...applicationPipeline.map((item) => item.count));
  const maxStatus = Math.max(1, ...statusMix.map((item) => item.count));
  const maxDrive = Math.max(1, ...driveMix.map((item) => item.count));

  return (
    <div className="placement-dashboard-page">
      <style>{CSS}</style>

      <div className="po-hero">
        <div>
          <span className="po-kicker">PLACEMENT OPERATIONS · LIVE COMMAND CENTER</span>
          <h1>Placement Intelligence</h1>
          <p>Turn student, company, drive, application, interview and offer activity into decisions your placement team can act on.</p>
        </div>
        <div className="po-hero-actions">
          <div className="po-sync">
            <span className="po-live-dot" />
            {refreshing ? "Syncing live data…" : lastSync ? `Synced ${lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Live workspace"}
          </div>
          <button type="button" className="po-btn primary" onClick={loadPlacementData} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "↻ Refresh data"}
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="po-warning">
          <strong>Some modules did not return live data:</strong> {errors.join(", ")}. Other loaded modules remain visible.
        </div>
      )}

      <section className="po-stat-grid">
        <StatCard icon="◎" label="Students" value={metrics.totalStudents || "—"} meta="cohort" tone="blue" />
        <StatCard icon="▦" label="Companies" value={metrics.totalCompanies || "—"} meta="partners" tone="violet" />
        <StatCard icon="▣" label="Active drives" value={metrics.activeJobs || "—"} meta="currently live" tone="cyan" />
        <StatCard icon="≡" label="Applications" value={metrics.totalApplications || "—"} meta={activeRange === "all" ? "all time" : activeRange} tone="amber" />
        <StatCard icon="◆" label="Offers" value={metrics.offerCount || "—"} meta="issued / inferred" tone="green" />
      </section>

      <section className="po-command-grid">
        <div className="po-card po-outcome-card">
          <div className="po-card-head">
            <div>
              <span>OUTCOME HEALTH</span>
              <h2>Placement outcome</h2>
              <p>Accepted offers relative to the loaded student cohort.</p>
            </div>
            <Ring value={metrics.placementRate} label="placed" tone="green" />
          </div>

          <div className="po-outcome-metrics">
            <div><span>Accepted offers</span><strong>{metrics.acceptedOffers || 0}</strong></div>
            <div><span>Interview progression</span><strong>{metrics.interviewRate}%</strong></div>
            <div><span>Application → offer</span><strong>{metrics.conversionRate}%</strong></div>
          </div>

          <div className="po-funnel">
            {applicationPipeline.map((item) => (
              <div className="po-funnel-row" key={item.key}>
                <span>{item.label}</span>
                <div className="po-funnel-track"><span style={{ width: `${(item.count / maxPipeline) * 100}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="po-card po-intel-card">
          <div className="po-card-head">
            <div>
              <span>PLACEMENT AI READOUT</span>
              <h2>What needs attention?</h2>
              <p>Decision-oriented signals generated from the records currently loaded.</p>
            </div>
            <div className="po-ai-orb">✦</div>
          </div>

          <div className="po-insights">
            {intelligence.length ? intelligence.map((item, index) => (
              <div className={`po-insight ${item.tone}`} key={`${item.title}-${index}`}>
                <span>{item.tone === "green" ? "✓" : item.tone === "amber" ? "!" : "→"}</span>
                <div><strong>{item.title}</strong><p>{item.text}</p></div>
              </div>
            )) : <EmptyPanel title="Awaiting live signals" message="Load placement records to activate the operating insights." />}
          </div>
        </div>
      </section>

      <section className="po-chart-grid">
        <div className="po-card">
          <div className="po-card-head compact">
            <div><span>APPLICATION PIPELINE</span><h2>Conversion funnel</h2></div>
            <div className="po-range-toggle">
              {[['all','All'],['7d','7D'],['30d','30D'],['90d','90D']].map(([key, label]) => (
                <button type="button" className={activeRange === key ? "active" : ""} key={key} onClick={() => setActiveRange(key)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="po-funnel-chart">
            {applicationPipeline.map((item, index) => (
              <div className="po-funnel-column" key={item.key}>
                <div className="po-column-value">{item.count}</div>
                <div className="po-column-track"><span style={{ height: `${Math.max(4, (item.count / maxPipeline) * 100)}%` }} /></div>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="po-card">
          <div className="po-card-head compact"><div><span>STATUS DISTRIBUTION</span><h2>Pipeline mix</h2></div></div>
          {statusMix.length ? (
            <div className="po-list-chart">
              {statusMix.map((item, index) => {
                const percentage = Math.round((item.count / maxStatus) * 100);
                const tone = index === 0 ? "blue" : index === 1 ? "violet" : index === 2 ? "cyan" : "amber";
                return (
                  <div className="po-list-row" key={item.label}>
                    <div className="po-list-title"><span>{item.label}</span><strong>{item.count}</strong></div>
                    <MiniBar value={percentage} tone={tone} />
                  </div>
                );
              })}
            </div>
          ) : <EmptyPanel title="No application statuses" message="Create or load applications to see the pipeline distribution." />}
        </div>
      </section>

      <section className="po-visual-grid">
        <div className="po-card">
          <div className="po-card-head compact"><div><span>HIRING MIX</span><h2>Job drive composition</h2></div></div>
          {driveMix.length ? (
            <div className="po-drive-rings">
              {driveMix.slice(0, 4).map((item, index) => {
                const total = jobs.length || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div className="po-drive-item" key={item.label}>
                    <Ring value={pct} label="share" tone={index % 2 ? "violet" : "blue"} />
                    <strong>{item.label}</strong>
                    <span>{item.count} drive{item.count === 1 ? "" : "s"}</span>
                  </div>
                );
              })}
            </div>
          ) : <EmptyPanel title="No drives loaded" message="Create job drives to visualize the hiring mix." />}
        </div>

        <div className="po-card">
          <div className="po-card-head compact"><div><span>COMPANY PERFORMANCE</span><h2>Highest-volume pipelines</h2></div></div>
          {companyPerformance.length ? (
            <div className="po-company-table">
              <div className="po-company-header"><span>Company</span><span>Apps</span><span>Offer conversion</span></div>
              {companyPerformance.map((row) => (
                <div className="po-company-row" key={row.company}>
                  <div><strong>{row.company}</strong><small>{row.selected} selected</small></div>
                  <strong>{row.applications}</strong>
                  <div className="po-conversion"><span>{row.conversion}%</span><MiniBar value={row.conversion} tone="green" /></div>
                </div>
              ))}
            </div>
          ) : <EmptyPanel title="No company activity" message="Application records will populate this comparison automatically." />}
        </div>
      </section>

      <section className="po-bottom-grid">
        <div className="po-card">
          <div className="po-card-head compact"><div><span>RECENT ACTIVITY</span><h2>Placement operations feed</h2></div><span className="po-count-badge">{recentActivity.length} events</span></div>
          {recentActivity.length ? (
            <div className="po-activity">
              {recentActivity.map((item, index) => (
                <div className="po-activity-row" key={`${item.title}-${index}`}>
                  <span className={`po-activity-dot ${item.tone}`} />
                  <div><strong>{item.title}</strong><p>{item.meta}</p></div>
                  <small>{compactDate(item.date)}</small>
                </div>
              ))}
            </div>
          ) : <EmptyPanel title="No recent activity" message="Applications, schedules and offers will appear here as the system is used." />}
        </div>

        <div className="po-card po-action-card">
          <div className="po-card-head compact"><div><span>OFFICER ACTIONS</span><h2>Move the workflow forward</h2></div></div>
          <div className="po-action-grid">
            <a href="/placement/students" className="po-action blue"><span>◎</span><div><strong>Review students</strong><small>Track profile readiness</small></div><b>→</b></a>
            <a href="/placement/companies" className="po-action violet"><span>▦</span><div><strong>Manage companies</strong><small>Coordinate recruiters</small></div><b>→</b></a>
            <a href="/placement/jobs" className="po-action cyan"><span>▣</span><div><strong>Manage drives</strong><small>Keep hiring active</small></div><b>→</b></a>
            <a href="/placement/applications" className="po-action amber"><span>≡</span><div><strong>Application queue</strong><small>Review pipeline movement</small></div><b>→</b></a>
            <a href="/placement/scheduling" className="po-action green"><span>◷</span><div><strong>Schedule interviews</strong><small>Resolve bottlenecks</small></div><b>→</b></a>
            <a href="/placement/offers" className="po-action rose"><span>◆</span><div><strong>Offer management</strong><small>Monitor outcomes</small></div><b>→</b></a>
          </div>
          <div className="po-footer-note">Outcome target: move students from <b>profile-ready</b> → <b>eligible</b> → <b>interviewed</b> → <b>offered</b> → <b>placed</b>.</div>
        </div>
      </section>
    </div>
  );
}

const CSS = `
.placement-dashboard-page{min-height:100vh;background:radial-gradient(circle at 10% 0%,rgba(37,99,235,.07),transparent 30%),#f4f7fb;padding:24px 28px 48px;color:#0f172a;box-sizing:border-box}.po-hero{max-width:1480px;margin:0 auto 18px;display:flex;justify-content:space-between;gap:22px;align-items:flex-end}.po-kicker,.po-card-head>div>span{font-size:8px;letter-spacing:.16em;font-weight:900;color:#4f46e5}.po-hero h1{font-size:34px;letter-spacing:-.045em;margin:6px 0;color:#101b31}.po-hero p{font-size:12px;color:#64748b;margin:0;max-width:820px;line-height:1.6}.po-hero-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.po-sync{padding:10px 12px;border:1px solid #dfe7f0;background:#fff;border-radius:10px;font-size:9px;color:#607089;font-weight:800}.po-live-dot{display:inline-block;width:7px;height:7px;background:#22c55e;border-radius:50%;margin-right:6px;box-shadow:0 0 0 4px rgba(34,197,94,.10)}.po-btn{height:39px;padding:0 13px;border-radius:10px;border:1px solid #d4deeb;font-size:10px;font-weight:900;cursor:pointer}.po-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff;box-shadow:0 10px 22px rgba(37,99,235,.18)}.po-btn:disabled{opacity:.55;cursor:wait}.po-warning{max-width:1480px;margin:0 auto 14px;padding:10px 12px;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;border-radius:10px;font-size:9px}.po-stat-grid{max-width:1480px;margin:0 auto 16px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.po-stat{background:#fff;border:1px solid #e0e7f0;border-radius:16px;padding:14px 15px;box-shadow:0 12px 30px rgba(15,23,42,.05);position:relative;overflow:hidden}.po-stat:after{content:"";position:absolute;inset:auto -30px -30px auto;width:100px;height:100px;border-radius:50%;background:var(--po-glow);opacity:.28}.po-stat.blue{--po-glow:#60a5fa}.po-stat.violet{--po-glow:#c4b5fd}.po-stat.cyan{--po-glow:#67e8f9}.po-stat.amber{--po-glow:#fde68a}.po-stat.green{--po-glow:#86efac}.po-stat-top{display:flex;justify-content:space-between;align-items:center}.po-stat-icon{width:31px;height:31px;border-radius:9px;display:grid;place-items:center;background:#f1f5ff;color:#4f46e5;font-weight:900}.po-stat-meta{font-size:8px;color:#94a3b8;font-weight:800}.po-stat-label{display:block;margin-top:12px;font-size:9px;letter-spacing:.05em;color:#64748b;font-weight:900}.po-stat strong{display:block;font-size:24px;margin-top:2px;letter-spacing:-.03em}.po-command-grid,.po-chart-grid,.po-visual-grid,.po-bottom-grid{max-width:1480px;margin:0 auto 16px;display:grid;gap:16px}.po-command-grid{grid-template-columns:1.1fr .9fr}.po-chart-grid{grid-template-columns:1.2fr .8fr}.po-visual-grid,.po-bottom-grid{grid-template-columns:1fr 1fr}.po-card{background:#fff;border:1px solid #dfe7f0;border-radius:18px;box-shadow:0 14px 34px rgba(15,23,42,.055);padding:18px;min-width:0}.po-card-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:16px}.po-card-head.compact{align-items:center;margin-bottom:12px}.po-card-head h2{margin:5px 0 4px;font-size:18px;letter-spacing:-.025em}.po-card-head p{margin:0;color:#718197;font-size:10px;line-height:1.5}.po-ring-wrap{display:grid;place-items:center}.po-ring{width:118px;height:118px;border-radius:50%;display:grid;place-items:center}.po-ring-core{width:88px;height:88px;border-radius:50%;background:#fff;display:grid;place-items:center;align-content:center;box-shadow:inset 0 0 0 1px #e6edf4}.po-ring-core strong{font-size:25px;line-height:1}.po-ring-core span{font-size:8px;color:#8391a5;margin-top:4px}.po-outcome-card{background:linear-gradient(180deg,#ffffff,#fbfffd)}.po-outcome-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}.po-outcome-metrics>div{padding:11px;border:1px solid #e3ebe6;border-radius:11px;background:#f8fcf9}.po-outcome-metrics span{display:block;font-size:8px;color:#718197}.po-outcome-metrics strong{display:block;font-size:18px;margin-top:3px;color:#12351f}.po-funnel{display:grid;gap:9px}.po-funnel-row{display:grid;grid-template-columns:90px minmax(0,1fr) 35px;gap:9px;align-items:center;font-size:9px;color:#62718a;font-weight:800}.po-funnel-row>strong{text-align:right;color:#18263c}.po-funnel-track{height:8px;background:#edf1f6;border-radius:99px;overflow:hidden}.po-funnel-track>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#7c3aed)}.po-intel-card{background:radial-gradient(circle at 100% 0%,rgba(124,58,237,.08),transparent 35%),#fff}.po-ai-orb{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#eef2ff,#f3e8ff);color:#6d28d9;display:grid;place-items:center;font-size:18px;font-weight:900}.po-insights{display:grid;gap:9px}.po-insight{display:flex;gap:10px;padding:11px;border-radius:12px;border:1px solid #e2e8f0;background:#fbfcfe}.po-insight>span{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;font-weight:900;flex:0 0 auto}.po-insight strong{font-size:10px}.po-insight p{margin:3px 0 0;font-size:9px;color:#697991;line-height:1.45}.po-insight.green>span{background:#dcfce7;color:#15803d}.po-insight.blue>span{background:#dbeafe;color:#1d4ed8}.po-insight.amber>span{background:#fef3c7;color:#b45309}.po-insight.violet>span{background:#ede9fe;color:#6d28d9}.po-range-toggle{display:flex;gap:3px;padding:3px;background:#f2f5f9;border-radius:9px}.po-range-toggle button{border:0;background:transparent;border-radius:7px;padding:6px 8px;font-size:8px;font-weight:900;color:#708099;cursor:pointer}.po-range-toggle button.active{background:#fff;color:#1d4ed8;box-shadow:0 2px 5px rgba(15,23,42,.08)}.po-funnel-chart{height:215px;display:flex;gap:12px;align-items:stretch;padding:8px 0 0}.po-funnel-column{flex:1;min-width:0;display:grid;grid-template-rows:20px 1fr 22px;gap:6px;text-align:center}.po-column-value{font-size:11px;font-weight:900;color:#263754}.po-column-track{background:#f1f4f8;border-radius:10px 10px 5px 5px;display:flex;align-items:flex-end;overflow:hidden}.po-column-track span{width:100%;background:linear-gradient(180deg,#60a5fa,#4f46e5);border-radius:10px 10px 3px 3px;min-height:4px}.po-funnel-column small{font-size:8px;color:#7b8aa0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.po-list-chart{display:grid;gap:14px;padding-top:6px}.po-list-row{display:grid;gap:6px}.po-list-title{display:flex;justify-content:space-between;font-size:9px;color:#52647d;font-weight:800}.po-list-title strong{color:#1f2f48}.po-mini-bar{height:7px;background:#edf1f5;border-radius:999px;overflow:hidden}.po-mini-bar>span{display:block;height:100%;border-radius:999px}.po-mini-bar .blue{background:linear-gradient(90deg,#60a5fa,#2563eb)}.po-mini-bar .violet{background:linear-gradient(90deg,#c4b5fd,#7c3aed)}.po-mini-bar .cyan{background:linear-gradient(90deg,#67e8f9,#06b6d4)}.po-mini-bar .amber{background:linear-gradient(90deg,#fde68a,#f59e0b)}.po-mini-bar .green{background:linear-gradient(90deg,#86efac,#16a34a)}.po-drive-rings{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.po-drive-item{text-align:center;padding:8px}.po-drive-item .po-ring{margin:0 auto 8px;width:92px;height:92px}.po-drive-item .po-ring-core{width:69px;height:69px}.po-drive-item .po-ring-core strong{font-size:18px}.po-drive-item strong{display:block;font-size:9px;color:#2b3d57;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.po-drive-item>span{font-size:8px;color:#8b99ab}.po-company-table{display:grid}.po-company-header,.po-company-row{display:grid;grid-template-columns:minmax(0,1.4fr) 60px minmax(120px,1fr);gap:12px;align-items:center}.po-company-header{padding:0 0 7px;border-bottom:1px solid #edf1f5;font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#97a3b5;font-weight:900}.po-company-row{padding:11px 0;border-bottom:1px solid #f0f3f7;font-size:9px}.po-company-row:last-child{border-bottom:0}.po-company-row>div:first-child{min-width:0}.po-company-row strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.po-company-row small{display:block;color:#8a98aa;font-size:8px;margin-top:2px}.po-conversion{display:grid;gap:4px}.po-conversion>span{font-size:9px;font-weight:900;color:#166534;text-align:right}.po-count-badge{padding:6px 8px;background:#f5f7fb;color:#64748b;border:1px solid #e5eaf1;border-radius:8px;font-size:8px;font-weight:900}.po-activity{display:grid}.po-activity-row{display:grid;grid-template-columns:10px minmax(0,1fr) 48px;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #eef2f6}.po-activity-row:last-child{border-bottom:0}.po-activity-dot{width:7px;height:7px;border-radius:50%}.po-activity-dot.green{background:#22c55e}.po-activity-dot.blue{background:#3b82f6}.po-activity-dot.amber{background:#f59e0b}.po-activity-dot.red{background:#ef4444}.po-activity-dot.slate{background:#94a3b8}.po-activity-row strong{display:block;font-size:9px;color:#263752;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.po-activity-row p{margin:2px 0 0;color:#7a899e;font-size:8px}.po-activity-row>small{text-align:right;color:#9aa6b6;font-size:8px}.po-action-card{background:linear-gradient(135deg,#ffffff,#f9fbff)}.po-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.po-action{display:grid;grid-template-columns:30px minmax(0,1fr) 14px;gap:8px;align-items:center;padding:11px;border:1px solid #e4eaf2;border-radius:11px;background:#fff;text-decoration:none;color:#1d2c43;transition:.16s}.po-action:hover{transform:translateY(-2px);box-shadow:0 7px 16px rgba(15,23,42,.06)}.po-action>span{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-weight:900}.po-action strong{display:block;font-size:9px}.po-action small{display:block;font-size:8px;color:#8a98ab;margin-top:2px}.po-action>b{text-align:right;color:#8b99ab}.po-action.blue>span{background:#dbeafe;color:#1d4ed8}.po-action.violet>span{background:#ede9fe;color:#6d28d9}.po-action.cyan>span{background:#cffafe;color:#0e7490}.po-action.amber>span{background:#fef3c7;color:#b45309}.po-action.green>span{background:#dcfce7;color:#15803d}.po-action.rose>span{background:#ffe4e6;color:#be123c}.po-footer-note{margin-top:10px;padding:10px;border-radius:9px;background:#eef4ff;color:#5b6e88;font-size:8px;line-height:1.5}.po-empty{min-height:135px;border:1px dashed #d5deea;border-radius:12px;display:grid;place-items:center;align-content:center;text-align:center;padding:12px;color:#687a92}.po-empty-icon{font-size:20px;color:#94a3b8}.po-empty strong{font-size:10px;color:#40516b;margin-top:6px}.po-empty p{font-size:8px;line-height:1.5;max-width:260px;margin:4px 0 0}.po-outcome-card .po-card-head{align-items:center}
@media(max-width:1200px){.po-stat-grid{grid-template-columns:repeat(3,1fr)}.po-command-grid,.po-chart-grid,.po-visual-grid,.po-bottom-grid{grid-template-columns:1fr}.po-drive-rings{grid-template-columns:repeat(4,1fr)}}@media(max-width:750px){.placement-dashboard-page{padding:16px}.po-hero{display:block}.po-hero-actions{margin-top:12px}.po-stat-grid{grid-template-columns:1fr 1fr}.po-outcome-metrics{grid-template-columns:1fr}.po-drive-rings{grid-template-columns:1fr 1fr}.po-action-grid{grid-template-columns:1fr}.po-company-header,.po-company-row{grid-template-columns:minmax(0,1fr) 50px 105px}.po-funnel-row{grid-template-columns:78px minmax(0,1fr) 26px}}
`;
