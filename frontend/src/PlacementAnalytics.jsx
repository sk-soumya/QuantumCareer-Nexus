import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const API_BASE_URL = "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("access_token") || localStorage.getItem("token") || "";
}

async function apiGet(path) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `${response.status} ${response.statusText}`);
  }
  return response.json();
}

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
};

const formatNumber = (value) => new Intl.NumberFormat("en-IN").format(num(value));
const percent = (value) => `${Math.round(num(value))}%`;

const statusKey = (value) => String(value || "").trim().toUpperCase();

function StatCard({ label, value, detail, icon }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.92)",
        border: "1px solid #e6eaf0",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800, letterSpacing: 0.7, textTransform: "uppercase" }}>
            {label}
          </div>
          <div style={{ color: "#0f172a", fontSize: 30, lineHeight: 1.1, fontWeight: 900, marginTop: 8 }}>
            {value}
          </div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>{detail}</div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: "#eff6ff",
            color: "#2563eb",
            fontSize: 20,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ minHeight: 220, display: "grid", placeItems: "center", color: "#64748b", fontSize: 13 }}>
      {text}
    </div>
  );
}

export default function PlacementAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    students: [],
    companies: [],
    drives: [],
    applications: [],
    rounds: [],
    schedules: [],
    offers: [],
  });

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const paths = [
        ["students", "/students/"],
        ["companies", "/companies/"],
        ["drives", "/job-drives/"],
        ["applications", "/applications/"],
        ["rounds", "/selection-rounds/"],
        ["schedules", "/schedules/"],
        ["offers", "/offers/"],
      ];

      const results = await Promise.allSettled(paths.map(([, path]) => apiGet(path)));
      const next = { ...data };
      const failures = [];

      results.forEach((result, index) => {
        const [key] = paths[index];
        if (result.status === "fulfilled") {
          next[key] = asArray(result.value);
        } else {
          next[key] = [];
          failures.push(paths[index][1]);
        }
      });

      setData(next);
      if (failures.length === paths.length) {
        setError("Analytics could not load. Check that the FastAPI backend is running and your placement-officer token is valid.");
      } else if (failures.length) {
        setError(`Some analytics endpoints were unavailable: ${failures.join(", ")}`);
      }
    } catch (err) {
      setError(err?.message || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const metrics = useMemo(() => {
    const students = data.students.length;
    const companies = data.companies.length;
    const drives = data.drives.length;
    const openDrives = data.drives.filter((d) => statusKey(d.drive_status || d.status) === "OPEN").length;
    const applications = data.applications.length;
    const selected = data.applications.filter((a) => ["SELECTED", "OFFERED", "ACCEPTED"].includes(statusKey(a.status))).length;
    const offers = data.offers.length;
    const acceptedOffers = data.offers.filter((o) => statusKey(o.status) === "ACCEPTED").length;
    const placementRate = students ? (selected / students) * 100 : 0;
    const offerAcceptance = offers ? (acceptedOffers / offers) * 100 : 0;

    return { students, companies, drives, openDrives, applications, selected, offers, acceptedOffers, placementRate, offerAcceptance };
  }, [data]);

  const applicationFunnel = useMemo(() => {
    const counts = {};
    data.applications.forEach((a) => {
      const s = statusKey(a.status) || "APPLIED";
      counts[s] = (counts[s] || 0) + 1;
    });
    const stages = ["APPLIED", "SHORTLISTED", "INTERVIEW", "SELECTED", "OFFERED", "ACCEPTED"];
    return stages.map((stage) => ({ stage: stage.replace("SHORTLISTED", "SHORTLIST"), count: counts[stage] || 0 }));
  }, [data.applications]);

  const driveStatus = useMemo(() => {
    const buckets = { OPEN: 0, PAUSED: 0, CLOSED: 0, OTHER: 0 };
    data.drives.forEach((d) => {
      const s = statusKey(d.drive_status || d.status);
      if (buckets[s] !== undefined) buckets[s] += 1;
      else buckets.OTHER += 1;
    });
    return Object.entries(buckets)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [data.drives]);

  const driveCompanyData = useMemo(() => {
    const map = new Map();
    data.drives.forEach((d) => {
      const company = d.company_name || d.company?.name || d.company || d.company_id || "Unknown";
      const key = String(company);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([company, drives]) => ({ company: company.length > 18 ? `${company.slice(0, 18)}…` : company, drives }))
      .sort((a, b) => b.drives - a.drives)
      .slice(0, 8);
  }, [data.drives]);

  const recentActivity = useMemo(() => {
    const rows = [];
    data.applications.slice(-5).reverse().forEach((a) => {
      rows.push({
        type: "Application",
        title: a.job_title || a.job_drive_title || `Application #${a.id ?? "—"}`,
        status: a.status || "APPLIED",
      });
    });
    data.offers.slice(-3).reverse().forEach((o) => {
      rows.push({
        type: "Offer",
        title: o.job_title || `Offer #${o.id ?? "—"}`,
        status: o.status || "PENDING",
      });
    });
    return rows.slice(0, 8);
  }, [data.applications, data.offers]);

  return (
    <div
      style={{
        minHeight: "100%",
        background: "linear-gradient(180deg,#f8fbff 0%,#f8fafc 55%,#eef4fb 100%)",
        padding: "26px 28px 36px",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#2563eb", fontSize: 12, fontWeight: 900, letterSpacing: 1.2, textTransform: "uppercase" }}>
              Placement Intelligence
            </div>
            <h1 style={{ margin: "8px 0 6px", fontSize: 32, fontWeight: 950, letterSpacing: -0.8 }}>
              Analytics & Insights
            </h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14, maxWidth: 760 }}>
              Live placement metrics built from students, companies, job drives, applications, interviews, rounds, and offers in your CampusLink backend.
            </p>
          </div>
          <button
            onClick={loadAnalytics}
            disabled={loading}
            style={{
              border: "1px solid #dbe4ef",
              background: "white",
              color: "#0f172a",
              borderRadius: 12,
              padding: "11px 16px",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
            gap: 14,
          }}
        >
          <StatCard label="Students" value={formatNumber(metrics.students)} detail="Registered learners" icon="◉" />
          <StatCard label="Companies" value={formatNumber(metrics.companies)} detail="Hiring partners" icon="▣" />
          <StatCard label="Open Drives" value={formatNumber(metrics.openDrives)} detail={`${formatNumber(metrics.drives)} total drives`} icon="↗" />
          <StatCard label="Applications" value={formatNumber(metrics.applications)} detail="Across all drives" icon="⌁" />
          <StatCard label="Placement Rate" value={percent(metrics.placementRate)} detail={`${formatNumber(metrics.selected)} selected / offered`} icon="✓" />
          <StatCard label="Offer Acceptance" value={percent(metrics.offerAcceptance)} detail={`${formatNumber(metrics.acceptedOffers)} accepted`} icon="★" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(320px,0.9fr)", gap: 18, marginTop: 18 }}>
          <section style={{ background: "white", border: "1px solid #e6eaf0", borderRadius: 18, padding: 20, boxShadow: "0 10px 28px rgba(15,23,42,0.04)" }}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Application funnel</h2>
              <p style={{ margin: "5px 0 0", fontSize: 12, color: "#64748b" }}>See how candidates progress from application to acceptance.</p>
            </div>
            {applicationFunnel.some((item) => item.count > 0) ? (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={applicationFunnel} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Applications" radius={[7, 7, 0, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState text="No application data available yet." />}
          </section>

          <section style={{ background: "white", border: "1px solid #e6eaf0", borderRadius: 18, padding: 20, boxShadow: "0 10px 28px rgba(15,23,42,0.04)" }}>
            <div style={{ marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Drive status</h2>
              <p style={{ margin: "5px 0 0", fontSize: 12, color: "#64748b" }}>Current job-drive mix.</p>
            </div>
            {driveStatus.length ? (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={driveStatus} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>
                      {driveStatus.map((entry, index) => (
                        <Cell key={entry.name} fill={["#2563eb", "#f59e0b", "#10b981", "#94a3b8"][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState text="No job-drive data available yet." />}
          </section>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(300px,0.9fr)", gap: 18, marginTop: 18 }}>
          <section style={{ background: "white", border: "1px solid #e6eaf0", borderRadius: 18, padding: 20, boxShadow: "0 10px 28px rgba(15,23,42,0.04)" }}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Hiring activity by company</h2>
              <p style={{ margin: "5px 0 0", fontSize: 12, color: "#64748b" }}>Top organizations by number of job drives.</p>
            </div>
            {driveCompanyData.length ? (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <AreaChart data={driveCompanyData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <defs>
                      <linearGradient id="driveArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="company" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={62} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="drives" name="Drives" stroke="#2563eb" fill="url(#driveArea)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState text="Company / drive data will appear here after job drives are created." />}
          </section>

          <section style={{ background: "white", border: "1px solid #e6eaf0", borderRadius: 18, padding: 20, boxShadow: "0 10px 28px rgba(15,23,42,0.04)" }}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>Recent placement activity</h2>
              <p style={{ margin: "5px 0 0", fontSize: 12, color: "#64748b" }}>A quick view of recent applications and offers.</p>
            </div>
            {recentActivity.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {recentActivity.map((item, index) => (
                  <div key={`${item.type}-${index}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 12px", border: "1px solid #edf1f6", borderRadius: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: "#2563eb", textTransform: "uppercase", letterSpacing: 0.6 }}>{item.type}</div>
                      <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 900, padding: "6px 9px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8" }}>{item.status}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState text="No recent activity yet." />}
          </section>
        </div>

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>
          <div style={{ background: "#0f172a", color: "white", borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>Selection Rounds</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 7 }}>{formatNumber(data.rounds.length)}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 5 }}>Configured in the placement cycle</div>
          </div>
          <div style={{ background: "white", border: "1px solid #e6eaf0", borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>Schedules</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 7 }}>{formatNumber(data.schedules.length)}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 5 }}>Interviews / rounds scheduled</div>
          </div>
          <div style={{ background: "white", border: "1px solid #e6eaf0", borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>Offers</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 7 }}>{formatNumber(metrics.offers)}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 5 }}>Offers issued to candidates</div>
          </div>
          <div style={{ background: "white", border: "1px solid #e6eaf0", borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8 }}>Conversion</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 7 }}>{metrics.applications ? `${Math.round((metrics.selected / metrics.applications) * 100)}%` : "0%"}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 5 }}>Application → selected / offered</div>
          </div>
        </div>
      </div>
    </div>
  );
}
