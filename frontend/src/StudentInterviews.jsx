import { useCallback, useEffect, useMemo, useState } from "react";

const API_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  "http://127.0.0.1:8000",
  "http://localhost:8000",
].filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
}

function parseResponseText(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function describeError(data, status) {
  const detail = data?.detail ?? data?.message;
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      const loc = Array.isArray(item?.loc) ? item.loc.filter((part) => part !== "body").join(" → ") : "";
      return [loc, item?.msg || item?.message].filter(Boolean).join(": ");
    }).filter(Boolean).join(" · ") || `Request failed (${status})`;
  }
  if (typeof detail === "string") return detail;
  if (typeof data === "string" && data.trim()) return data;
  return `Request failed (${status})`;
}

async function api(path) {
  let lastNetworkError = null;
  for (const base of API_CANDIDATES) {
    try {
      const response = await fetch(`${base}${path}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = parseResponseText(await response.text());
      if (!response.ok) throw new Error(describeError(data, response.status));
      return data;
    } catch (error) {
      const networkFailure = error instanceof TypeError || /failed to fetch|networkerror|fetch failed/i.test(String(error?.message || ""));
      if (networkFailure) {
        lastNetworkError = error;
        continue;
      }
      throw error;
    }
  }
  throw new Error(`CampusLink backend is unreachable. Tried: ${API_CANDIDATES.join(", ")}. ${lastNetworkError?.message || ""}`.trim());
}

function listOf(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function mapById(rows) {
  return new Map((Array.isArray(rows) ? rows : []).filter((row) => row?.id != null).map((row) => [String(row.id), row]));
}

function firstText(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text && text !== "null" && text !== "undefined") return text;
  }
  return "";
}

function getDateValue(slot, schedule) {
  return firstText(
    slot?.slot_date, slot?.date, slot?.scheduled_date, slot?.start_datetime,
    schedule?.scheduled_at, schedule?.interview_date, schedule?.date
  );
}

function getStartValue(slot, schedule) {
  return firstText(slot?.start_time, slot?.start, slot?.time, slot?.start_datetime, schedule?.start_time, schedule?.scheduled_time);
}

function getEndValue(slot, schedule) {
  return firstText(slot?.end_time, slot?.end, schedule?.end_time);
}

function toDateTime(dateValue, timeValue) {
  if (!dateValue) return null;
  const dateText = String(dateValue).trim();
  if (dateText.includes("T") && !timeValue) {
    const date = new Date(dateText);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const dateOnly = dateText.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const date = new Date(dateText);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const time = String(timeValue || "00:00").trim();
  const match = time.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return new Date(`${dateOnly}T00:00:00`);
  const hour = String(match[1]).padStart(2, "0");
  const minute = match[2];
  const second = match[3] || "00";
  const parsed = new Date(`${dateOnly}T${hour}:${minute}:${second}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value, options = {}) {
  if (!value) return "Date not yet provided";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    weekday: options.weekday || undefined,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(options.long ? { weekday: "long", month: "long" } : {}),
  }).format(date);
}

function formatTime(date) {
  if (!date || Number.isNaN(date.getTime())) return "Time not yet provided";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatTimeRange(start, endValue, slot, schedule) {
  if (!start) return "Time not yet provided";
  const startLabel = formatTime(start);
  const endDate = endValue ? toDateTime(getDateValue(slot, schedule) || start.toISOString().slice(0, 10), endValue) : null;
  return endDate ? `${startLabel} – ${formatTime(endDate)}` : startLabel;
}

function statusInfo(status) {
  const value = String(status || "SCHEDULED").toUpperCase();
  if (["CANCELLED", "CANCELED", "REJECTED"].includes(value)) return { label: "Cancelled", kind: "cancelled", terminal: true };
  if (["COMPLETED", "DONE", "FINISHED"].includes(value)) return { label: "Completed", kind: "completed", terminal: true };
  if (["NO_SHOW", "MISSED"].includes(value)) return { label: "Missed", kind: "missed", terminal: true };
  if (["RESCHEDULED", "RESCHEDULE_REQUESTED"].includes(value)) return { label: "Rescheduled", kind: "rescheduled", terminal: false };
  if (["CONFIRMED", "SCHEDULED", "ACCEPTED"].includes(value)) return { label: value === "CONFIRMED" ? "Confirmed" : "Scheduled", kind: "scheduled", terminal: false };
  return { label: value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()), kind: "neutral", terminal: false };
}

function roundTitle(round) {
  return firstText(
    round?.name, round?.round_name, round?.title, round?.round_type, round?.stage_name,
    round?.round_number != null ? `Round ${round.round_number}` : "",
    round?.sequence != null ? `Round ${round.sequence}` : "",
    "Interview round"
  );
}

function safeNotes(raw) {
  const note = String(raw || "").trim();
  if (!note) return "";
  if (/automatically generated by campuslink|manual timestamp verification|timestamp verification test|manual scheduling timestamp test|schedule test|debug/i.test(note)) return "";
  return note;
}

function makeInterviewView(schedule, maps) {
  const round = maps.rounds.get(String(schedule.selection_round_id));
  const interviewer = maps.interviewers.get(String(schedule.interviewer_id));
  const room = maps.rooms.get(String(schedule.room_id));
  const slot = maps.slots.get(String(schedule.time_slot_id));
  const applicationId = firstText(round?.application_id, schedule?.application_id);
  const application = maps.applications.get(String(applicationId));
  const jobId = firstText(application?.job_drive_id, application?.job_id, round?.job_drive_id);
  const job = maps.jobs.get(String(jobId));
  const companyId = firstText(job?.company_id, application?.company_id);
  const company = maps.companies.get(String(companyId));
  const dateValue = getDateValue(slot, schedule);
  const timeValue = getStartValue(slot, schedule);
  const start = toDateTime(dateValue, timeValue);
  const endValue = getEndValue(slot, schedule);
  const end = endValue ? toDateTime(dateValue || start?.toISOString().slice(0, 10), endValue) : null;
  const createdValue = firstText(schedule.created_at, schedule.created_on);
  return {
    ...schedule,
    start,
    end,
    dateLabel: start ? formatDate(start, { weekday: "long" }) : "Date to be confirmed",
    compactDate: start ? formatDate(start) : "Date pending",
    timeLabel: start ? formatTimeRange(start, endValue, slot, schedule) : "Time to be confirmed",
    roundLabel: roundTitle(round),
    interviewerName: firstText(interviewer?.name, interviewer?.full_name, interviewer?.display_name, interviewer?.email, "Interviewer details pending"),
    interviewerEmail: firstText(interviewer?.email),
    roomName: firstText(room?.name, room?.room_name, room?.label, "Room details pending"),
    roomLocation: firstText(room?.location, room?.building, room?.floor, room?.description),
    jobTitle: firstText(job?.title, job?.job_title, application?.job_title, application?.position, "Placement interview"),
    companyName: firstText(company?.name, job?.company_name, application?.company_name, "Company details pending"),
    applicationLabel: applicationId ? `Application ${applicationId}` : "Application linked",
    notes: safeNotes(schedule.notes),
    createdLabel: createdValue ? formatDate(createdValue) : "",
    status: statusInfo(schedule.status),
    hasAppointmentTime: Boolean(start),
  };
}

function icsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsEscape(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function saveCalendarFile(events, filename = "campuslink-interviews.ics") {
  const valid = events.filter((event) => event.start);
  if (!valid.length) return false;
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CampusLink//Student Interviews//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    ...valid.flatMap((event) => {
      const start = event.start;
      const end = event.end && event.end > start ? event.end : new Date(start.getTime() + 30 * 60 * 1000);
      const description = [event.roundLabel, `Company: ${event.companyName}`, `Interviewer: ${event.interviewerName}`, `Room: ${event.roomName}`, event.notes].filter(Boolean).join("\\n");
      return [
        "BEGIN:VEVENT", `UID:campuslink-interview-${event.id || start.getTime()}@campuslink`, `DTSTAMP:${icsDate(new Date())}`,
        `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${icsEscape(`${event.jobTitle} · ${event.roundLabel}`)}`,
        `LOCATION:${icsEscape([event.roomName, event.roomLocation].filter(Boolean).join(", "))}`,
        `DESCRIPTION:${icsEscape(description)}`, "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.3"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21c.3-4 2.7-6 7-6s6.7 2 7 6"/></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-5h4v5"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v4h14v-4"/></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></>,
  };
  return <svg {...common}>{paths[name] || paths.calendar}</svg>;
}

export default function StudentInterviews() {
  const [schedules, setSchedules] = useState([]);
  const [lookupData, setLookupData] = useState({ rounds: [], interviewers: [], rooms: [], slots: [], applications: [], jobs: [], companies: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lookupWarning, setLookupWarning] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("UPCOMING");
  const [sortMode, setSortMode] = useState("DATE");

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!getToken()) {
      setError("Your session has expired. Sign in again to view your personal interview schedule.");
      setLoading(false);
      return;
    }
    quiet ? setRefreshing(true) : setLoading(true);
    setError(""); setLookupWarning(""); setNotice("");
    try {
      const schedulesResult = await api("/schedules/my");
      setSchedules(listOf(schedulesResult));
      const endpoints = [
        ["rounds", "/selection-rounds/"],
        ["interviewers", "/interviewers/"],
        ["rooms", "/rooms/"],
        ["slots", "/time-slots/"],
        ["applications", "/applications/my"],
        ["jobs", "/job-drives/"],
        ["companies", "/companies/"],
      ];
      const results = await Promise.allSettled(endpoints.map(([, path]) => api(path)));
      const next = {};
      const failed = [];
      results.forEach((result, index) => {
        const [key, path] = endpoints[index];
        if (result.status === "fulfilled") next[key] = listOf(result.value);
        else { next[key] = []; failed.push(path); }
      });
      setLookupData((current) => ({ ...current, ...next }));
      if (failed.length) setLookupWarning("Some interview details could not be resolved from CampusLink. The schedule itself loaded, but names or company information may be incomplete until the related records are available.");
    } catch (err) {
      setError(err?.message || "Unable to load your interviews. Try refreshing the page.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const maps = useMemo(() => ({
    rounds: mapById(lookupData.rounds),
    interviewers: mapById(lookupData.interviewers),
    rooms: mapById(lookupData.rooms),
    slots: mapById(lookupData.slots),
    applications: mapById(lookupData.applications),
    jobs: mapById(lookupData.jobs),
    companies: mapById(lookupData.companies),
  }), [lookupData]);

  const interviews = useMemo(() => schedules.map((schedule) => makeInterviewView(schedule, maps)), [schedules, maps]);
  const now = Date.now();
  const counts = useMemo(() => ({
    total: interviews.length,
    upcoming: interviews.filter((item) => !item.status.terminal && (!item.start || item.start.getTime() >= Date.now())).length,
    completed: interviews.filter((item) => item.status.kind === "completed" || (item.start && item.start.getTime() < Date.now() && !item.status.terminal)).length,
    cancelled: interviews.filter((item) => item.status.kind === "cancelled" || item.status.kind === "missed").length,
  }), [interviews]);

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let result = interviews.filter((item) => {
      const status = item.status.kind;
      const inUpcoming = !item.status.terminal && (!item.start || item.start.getTime() >= now);
      const inPast = Boolean(item.start && item.start.getTime() < now) || status === "completed" || status === "missed";
      let matchesFilter = filter === "ALL" || (filter === "UPCOMING" && inUpcoming) || (filter === "PAST" && inPast) || (filter === "CANCELLED" && status === "cancelled");
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;
      const haystack = [item.jobTitle, item.companyName, item.roundLabel, item.interviewerName, item.roomName, item.roomLocation, item.notes, item.status.label].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
    if (sortMode === "DATE") {
      result = result.slice().sort((a, b) => {
        const at = a.start?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bt = b.start?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (filter === "PAST") return bt - at;
        return at - bt;
      });
    } else {
      result = result.slice().sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return result;
  }, [interviews, query, filter, sortMode, now]);

  const nextInterview = useMemo(() => interviews
    .filter((item) => !item.status.terminal && item.start && item.start.getTime() >= Date.now())
    .sort((a, b) => a.start - b.start)[0] || null, [interviews]);

  async function copyDetails(item) {
    const lines = [
      `CampusLink interview — ${item.jobTitle}`,
      `Company: ${item.companyName}`,
      `Round: ${item.roundLabel}`,
      `Date: ${item.start ? formatDate(item.start, { weekday: "long" }) : "To be confirmed"}`,
      `Time: ${item.timeLabel}`,
      `Interviewer: ${item.interviewerName}`,
      `Location: ${[item.roomName, item.roomLocation].filter(Boolean).join(" · ") || "To be confirmed"}`,
      item.notes ? `Notes: ${item.notes}` : "",
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setNotice("Interview details copied.");
    } catch {
      setNotice("Clipboard access is blocked by this browser. Use Add to calendar to save these details instead.");
    }
  }

  function addToCalendar(item) {
    if (!saveCalendarFile([item], `campuslink-interview-${item.id || "event"}.ics`)) {
      setNotice("The interviewer has not provided a confirmed date and time yet, so this interview cannot be added to a calendar.");
      return;
    }
    setNotice("Calendar file downloaded. Open it to add the interview to your calendar.");
  }

  function exportUpcoming() {
    const events = interviews.filter((item) => !item.status.terminal && item.start && item.start.getTime() >= Date.now());
    if (!events.length) {
      setNotice("There are no upcoming interviews with confirmed dates to export.");
      return;
    }
    saveCalendarFile(events);
    setNotice(`${events.length} upcoming interview${events.length === 1 ? "" : "s"} exported to a calendar file.`);
  }

  if (loading) {
    return <div className="si-page"><style>{CSS}</style><div className="si-loading"><span className="si-spinner"/><strong>Loading your interview schedule</strong><span>Resolving dates, rounds and interview details…</span></div></div>;
  }

  return (
    <div className="si-page">
      <style>{CSS}</style>
      <header className="si-header">
        <div><span className="si-eyebrow">STUDENT WORKSPACE / CAREER JOURNEY</span><h1>My interviews</h1><p>Your confirmed interview schedule, round details and preparation notes—in one place.</p></div>
        <div className="si-header-actions"><button type="button" className="si-button si-button-soft" onClick={() => load({ quiet: true })} disabled={refreshing}><Icon name="refresh"/>{refreshing ? "Refreshing…" : "Refresh schedule"}</button><button type="button" className="si-button si-button-primary" onClick={exportUpcoming}><Icon name="download"/>Export calendar</button></div>
      </header>

      {error && <div className="si-alert si-alert-error" role="alert"><span className="si-alert-symbol">!</span><div><strong>Could not load interview schedule</strong><p>{error}</p><button type="button" onClick={() => load()}>Try again</button></div></div>}
      {lookupWarning && !error && <div className="si-alert si-alert-warning" role="status"><span className="si-alert-symbol">i</span><div><strong>Some details are still loading</strong><p>{lookupWarning}</p></div></div>}
      {notice && <div className="si-alert si-alert-success" role="status"><span className="si-alert-symbol">✓</span><div><p>{notice}</p></div><button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}

      <section className="si-summary-grid">
        <div className="si-summary-card si-summary-total"><div className="si-summary-icon"><Icon name="calendar"/></div><div><span>All interviews</span><strong>{counts.total}</strong><small>Assigned to your account</small></div></div>
        <div className="si-summary-card"><div className="si-summary-icon blue"><Icon name="clock"/></div><div><span>Upcoming</span><strong>{counts.upcoming}</strong><small>Scheduled or awaiting a time</small></div></div>
        <div className="si-summary-card"><div className="si-summary-icon green"><Icon name="video"/></div><div><span>Completed</span><strong>{counts.completed}</strong><small>Past or completed rounds</small></div></div>
        <div className="si-summary-card"><div className="si-summary-icon gray"><Icon name="calendar"/></div><div><span>Cancelled / missed</span><strong>{counts.cancelled}</strong><small>Keep track of changes</small></div></div>
      </section>

      {nextInterview && (
        <section className="si-next-card">
          <div className="si-next-accent"/><div className="si-next-main"><span className="si-eyebrow">YOUR NEXT INTERVIEW</span><h2>{nextInterview.jobTitle}</h2><p>{nextInterview.companyName} <span>·</span> {nextInterview.roundLabel}</p><div className="si-next-meta"><span><Icon name="calendar"/>{nextInterview.dateLabel}</span><span><Icon name="clock"/>{nextInterview.timeLabel}</span><span><Icon name="pin"/>{nextInterview.roomName}{nextInterview.roomLocation ? ` · ${nextInterview.roomLocation}` : ""}</span></div></div><div className="si-next-date"><strong>{nextInterview.start.getDate()}</strong><span>{new Intl.DateTimeFormat(undefined,{month:"short"}).format(nextInterview.start)}</span></div>
        </section>
      )}

      <section className="si-content-card">
        <div className="si-list-header"><div><span className="si-eyebrow">INTERVIEW TRACKER</span><h2>Schedule & round details</h2><p>Use the filters to find an interview or review previous rounds.</p></div><label className="si-search"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search role, company, interviewer…" aria-label="Search interviews"/></label></div>
        <div className="si-toolbar"><div className="si-filters" role="group" aria-label="Interview filters">{[{id:"UPCOMING",label:"Upcoming"},{id:"ALL",label:"All interviews"},{id:"PAST",label:"Past interviews"},{id:"CANCELLED",label:"Cancelled"}].map((item) => <button type="button" key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}<span>{item.id === "ALL" ? interviews.length : item.id === "UPCOMING" ? counts.upcoming : item.id === "PAST" ? interviews.filter((x) => (x.start && x.start.getTime() < Date.now()) || x.status.kind === "completed" || x.status.kind === "missed").length : counts.cancelled}</span></button>)}</div><label className="si-sort">Sort<select value={sortMode} onChange={(event) => setSortMode(event.target.value)}><option value="DATE">By date</option><option value="NEWEST">Recently added</option></select></label></div>

        {error ? null : visible.length === 0 ? <div className="si-empty"><div className="si-empty-icon"><Icon name="calendar"/></div><h3>{interviews.length === 0 ? "No interviews scheduled yet" : "No interviews match this view"}</h3><p>{interviews.length === 0 ? "When your placement team schedules a round, it will appear here with the date, time, interviewer and location." : "Try another filter or clear your search to see other interview records."}</p>{(query || filter !== "UPCOMING") && <button type="button" className="si-button si-button-soft" onClick={() => { setQuery(""); setFilter("ALL"); }}>Show all interviews</button>}</div> : (
          <div className="si-interview-list">
            {visible.map((item) => (
              <article key={item.id} className="si-interview-card">
                <div className="si-date-rail"><div className="si-date-tile"><span>{item.start ? new Intl.DateTimeFormat(undefined,{month:"short"}).format(item.start).toUpperCase() : "TBD"}</span><strong>{item.start ? item.start.getDate() : "—"}</strong>{item.start && <small>{new Intl.DateTimeFormat(undefined,{weekday:"short"}).format(item.start)}</small>}</div></div>
                <div className="si-interview-body">
                  <div className="si-interview-top"><div className="si-card-title"><div className="si-round-label">{item.roundLabel}</div><h3>{item.jobTitle}</h3><p>{item.companyName}</p></div><span className={`si-status si-status-${item.status.kind}`}><i/>{item.status.label}</span></div>
                  <div className="si-detail-grid">
                    <div className="si-detail"><span className="si-detail-icon"><Icon name="clock"/></span><div><small>Date & time</small><strong>{item.start ? item.dateLabel : "Date to be confirmed"}</strong><span>{item.timeLabel}</span></div></div>
                    <div className="si-detail"><span className="si-detail-icon"><Icon name="user"/></span><div><small>Interviewer</small><strong>{item.interviewerName}</strong>{item.interviewerEmail && item.interviewerEmail !== item.interviewerName && <span>{item.interviewerEmail}</span>}</div></div>
                    <div className="si-detail"><span className="si-detail-icon"><Icon name="pin"/></span><div><small>Interview location</small><strong>{item.roomName}</strong>{item.roomLocation && <span>{item.roomLocation}</span>}</div></div>
                    <div className="si-detail"><span className="si-detail-icon"><Icon name="briefcase"/></span><div><small>Application</small><strong>{item.applicationLabel}</strong><span>{item.createdLabel ? `Added ${item.createdLabel}` : "Scheduled in CampusLink"}</span></div></div>
                  </div>
                  {item.notes && <div className="si-notes"><strong>Notes from the placement team</strong><p>{item.notes}</p></div>}
                  <div className="si-card-actions"><button type="button" className="si-action-secondary" onClick={() => copyDetails(item)}><Icon name="copy"/>Copy details</button><button type="button" className="si-action-primary" onClick={() => addToCalendar(item)} disabled={!item.hasAppointmentTime}><Icon name="calendar"/>Add to calendar</button></div>
                  {!item.hasAppointmentTime && !item.status.terminal && <div className="si-pending-note">The schedule exists, but the exact interview date/time has not been returned by the time-slot record yet.</div>}
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="si-list-footer"><span>Showing {visible.length} of {interviews.length} interview records</span><button type="button" onClick={() => load({ quiet: true })} disabled={refreshing}><Icon name="refresh"/>{refreshing ? "Refreshing…" : "Sync schedule"}</button></div>
      </section>

      <section className="si-prep-grid">
        <div className="si-prep-card"><div className="si-prep-symbol">✓</div><div><h3>Before the interview</h3><p>Keep your preparation simple and focused.</p><ul><li>Review the job description and the round type.</li><li>Prepare two real project examples and your own contribution.</li><li>Keep your resume and supporting documents ready.</li><li>Check your route or meeting setup before the scheduled time.</li></ul></div></div>
        <div className="si-help-card"><span className="si-eyebrow">NEED TO CHANGE SOMETHING?</span><h3>Schedule details look wrong?</h3><p>If the interviewer, room, date or time is missing or incorrect, contact your placement office. The student view is read-only so it cannot accidentally change an official schedule.</p></div>
      </section>
    </div>
  );
}

const CSS = `
.si-page{--si-ink:#121e33;--si-muted:#64748b;--si-line:#e3e9f2;--si-accent:#315cf4;min-height:100vh;background:radial-gradient(850px circle at 100% 0%,rgba(49,92,244,.075),transparent 52%),#f4f7fb;color:var(--si-ink);padding:28px clamp(14px,2.5vw,34px) 48px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}.si-page *{box-sizing:border-box}.si-header{max-width:1450px;margin:0 auto 22px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px}.si-eyebrow{display:block;font-size:10px;font-weight:900;letter-spacing:.14em;color:#526be8}.si-header h1{font-size:clamp(29px,3vw,38px);letter-spacing:-.055em;margin:7px 0 6px;line-height:1.05}.si-header p{color:var(--si-muted);font-size:13px;line-height:1.65;margin:0;max-width:700px}.si-header-actions{display:flex;gap:9px;flex-wrap:wrap}.si-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 14px;min-height:41px;border:1px solid transparent;border-radius:11px;font:800 11px Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer;text-decoration:none;transition:transform .16s,box-shadow .16s,border-color .16s}.si-button:hover:not(:disabled){transform:translateY(-1px)}.si-button:disabled{opacity:.55;cursor:not-allowed}.si-button svg,.si-header-actions svg{width:15px;height:15px}.si-button-soft{background:#fff;color:#33425a;border-color:#dbe3ef}.si-button-primary{background:linear-gradient(115deg,#315cf4,#674de8);color:#fff;box-shadow:0 8px 20px rgba(49,92,244,.18)}.si-alert{max-width:1450px;margin:0 auto 14px;padding:12px 14px;border:1px solid;border-radius:13px;display:flex;gap:10px;align-items:flex-start;font-size:11px;line-height:1.6}.si-alert-symbol{width:24px;height:24px;display:grid;place-items:center;flex:none;border-radius:8px;background:rgba(255,255,255,.65);font-weight:900}.si-alert strong{font-size:11px}.si-alert p{margin:3px 0 0}.si-alert button{margin-top:7px;background:transparent;border:0;color:inherit;text-decoration:underline;font:inherit;font-weight:800;cursor:pointer}.si-alert>button{margin-left:auto;font-size:19px;text-decoration:none;margin-top:-4px}.si-alert-error{color:#a1293c;border-color:#fecdd3;background:#fff4f5}.si-alert-warning{color:#8a5a0b;border-color:#f7df9e;background:#fffbeb}.si-alert-success{color:#076a4c;border-color:#a7f3d0;background:#effcf6}.si-loading{max-width:1450px;min-height:55vh;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#334155}.si-loading strong{font-size:14px}.si-loading>span:last-child{font-size:11px;color:#8190a4}.si-spinner{width:28px;height:28px;border:3px solid #dce6ff;border-top-color:#315cf4;border-radius:50%;animation:si-spin .8s linear infinite}@keyframes si-spin{to{transform:rotate(360deg)}}.si-summary-grid{max-width:1450px;margin:0 auto 17px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.si-summary-card{display:flex;align-items:center;gap:13px;padding:16px;border:1px solid #e2e8f1;border-radius:15px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.025);min-width:0}.si-summary-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex:none;background:#f0edff;color:#7654eb}.si-summary-icon svg{width:20px;height:20px}.si-summary-icon.blue{background:#eef3ff;color:#315cf4}.si-summary-icon.green{background:#e9faf2;color:#11875e}.si-summary-icon.gray{background:#f1f4f8;color:#66758b}.si-summary-card>div:last-child{display:grid;gap:3px;min-width:0}.si-summary-card span{font-size:10px;color:#687890;font-weight:750}.si-summary-card strong{font-size:25px;letter-spacing:-.045em;line-height:1.05}.si-summary-card small{font-size:9px;color:#95a1b2;line-height:1.4}.si-next-card{max-width:1450px;margin:0 auto 17px;position:relative;overflow:hidden;padding:22px 24px;display:flex;align-items:center;gap:21px;border:1px solid #1e3470;border-radius:18px;background:radial-gradient(circle at 85% 0%,rgba(105,127,255,.3),transparent 40%),linear-gradient(116deg,#101b37,#172d5a 70%,#25366c);color:#fff;box-shadow:0 16px 35px rgba(14,28,59,.14)}.si-next-accent{position:absolute;top:0;left:0;bottom:0;width:4px;background:linear-gradient(#6fc9f8,#a79bff)}.si-next-main{flex:1;min-width:0}.si-next-card .si-eyebrow{color:#aebeff}.si-next-card h2{font-size:22px;letter-spacing:-.04em;margin:6px 0 4px}.si-next-card p{margin:0;font-size:11px;color:#c7d5ef}.si-next-card p span{margin:0 5px;color:#7891c6}.si-next-meta{display:flex;gap:13px;flex-wrap:wrap;margin-top:16px}.si-next-meta span{display:flex;align-items:center;gap:7px;color:#e2eaff;font-size:10px}.si-next-meta svg{width:15px;height:15px;color:#9fb8ff}.si-next-date{width:75px;height:82px;border:1px solid rgba(255,255,255,.2);border-radius:14px;background:rgba(255,255,255,.07);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none}.si-next-date strong{font-size:30px;line-height:1;letter-spacing:-.05em}.si-next-date span{font-size:11px;font-weight:850;text-transform:uppercase;color:#b9caff;margin-top:4px}.si-content-card{max-width:1450px;margin:0 auto;background:#fff;border:1px solid #e1e7f0;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(15,23,42,.035)}.si-list-header{padding:22px 23px 18px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;border-bottom:1px solid #edf1f6}.si-list-header h2{font-size:19px;letter-spacing:-.035em;margin:6px 0 5px}.si-list-header p{margin:0;font-size:11px;color:#7b899d;line-height:1.5}.si-search{display:flex;align-items:center;gap:8px;min-width:260px;width:34%;padding:10px 12px;border:1px solid #dfe6f0;background:#fbfcff;border-radius:10px;color:#8996a9}.si-search svg{width:16px;height:16px;flex:none}.si-search input{min-width:0;width:100%;border:0;outline:0;background:transparent;color:#1b2940;font:500 11px Inter,system-ui,sans-serif}.si-search input::placeholder{color:#8794a6;opacity:1}.si-toolbar{padding:12px 23px;display:flex;justify-content:space-between;align-items:center;gap:15px;border-bottom:1px solid #edf1f6;background:#fcfdff}.si-filters{display:flex;flex-wrap:wrap;gap:5px}.si-filters button{display:flex;align-items:center;gap:7px;border:1px solid transparent;border-radius:8px;background:transparent;padding:8px 10px;color:#65748a;font:750 10px Inter,system-ui,sans-serif;cursor:pointer}.si-filters button span{font-size:9px;color:#8a97aa;background:#eff2f7;border-radius:999px;padding:3px 5px;min-width:18px;text-align:center}.si-filters button:hover{background:#f3f6fb}.si-filters button.active{border-color:#dbe5ff;background:#edf3ff;color:#2450d3}.si-filters button.active span{background:#dce7ff;color:#2450d3}.si-sort{display:flex;align-items:center;gap:7px;font-size:10px;color:#8792a3;white-space:nowrap}.si-sort select{border:1px solid #dfe6f0;border-radius:8px;background:#fff;color:#35445d;padding:7px 9px;font:700 10px Inter,system-ui,sans-serif;outline:none}.si-interview-list{padding:16px 20px 2px;display:grid;gap:12px}.si-interview-card{display:grid;grid-template-columns:68px minmax(0,1fr);gap:17px;border:1px solid #e5eaf2;border-radius:15px;padding:17px;transition:border-color .16s,box-shadow .16s;background:#fff}.si-interview-card:hover{border-color:#c7d6ff;box-shadow:0 7px 20px rgba(31,64,141,.055)}.si-date-rail{padding-top:2px}.si-date-tile{width:63px;min-height:75px;border:1px solid #dfe7fa;border-radius:12px;background:linear-gradient(180deg,#f0f5ff,#fff);display:flex;align-items:center;flex-direction:column;justify-content:center;gap:1px}.si-date-tile>span{font-size:9px;letter-spacing:.1em;color:#315cf4;font-weight:950}.si-date-tile strong{font-size:24px;line-height:1.15;color:#1c2f5d;letter-spacing:-.05em}.si-date-tile small{font-size:9px;color:#7c8aa3}.si-interview-body{min-width:0}.si-interview-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.si-card-title{min-width:0}.si-round-label{font-size:9px;color:#315cf4;letter-spacing:.09em;text-transform:uppercase;font-weight:950}.si-card-title h3{font-size:17px;letter-spacing:-.035em;margin:5px 0 3px;overflow-wrap:anywhere}.si-card-title p{font-size:11px;color:#697a92;margin:0}.si-status{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;border:1px solid transparent;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:900}.si-status i{width:6px;height:6px;border-radius:50%;background:currentColor}.si-status-scheduled{background:#edf4ff;border-color:#dbe7ff;color:#2554d9}.si-status-completed{background:#ebfbf3;border-color:#c7f2dc;color:#117951}.si-status-cancelled,.si-status-missed{background:#fff0f0;border-color:#ffdada;color:#b52d42}.si-status-rescheduled{background:#fff8e8;border-color:#fce3b1;color:#9a6105}.si-status-neutral{background:#f1f4f8;border-color:#e2e7ef;color:#526176}.si-detail-grid{margin-top:16px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px 20px}.si-detail{display:flex;gap:10px;min-width:0;align-items:flex-start}.si-detail-icon{width:30px;height:30px;display:grid;place-items:center;flex:none;border-radius:9px;color:#586fe2;background:#f1f3ff}.si-detail-icon svg{width:15px;height:15px}.si-detail>div{min-width:0;display:grid;gap:3px}.si-detail small{font-size:9px;color:#8995a7;font-weight:750}.si-detail strong{font-size:11px;color:#273750;line-height:1.45;overflow-wrap:anywhere}.si-detail span:not(.si-detail-icon){font-size:10px;line-height:1.4;color:#7c899d;overflow-wrap:anywhere}.si-notes{margin-top:14px;padding:11px 12px;border-radius:10px;background:#f8faff;border:1px solid #e8eefb}.si-notes strong{font-size:9px;color:#4c5f80;text-transform:uppercase;letter-spacing:.06em}.si-notes p{font-size:10px;color:#66758b;line-height:1.6;margin:4px 0 0;white-space:pre-wrap}.si-card-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px;padding-top:12px;border-top:1px solid #edf1f6}.si-card-actions button{display:inline-flex;align-items:center;gap:7px;border:1px solid #dfe6f0;border-radius:8px;background:#fff;color:#40506a;padding:8px 10px;font:800 10px Inter,system-ui,sans-serif;cursor:pointer}.si-card-actions svg{width:14px;height:14px}.si-card-actions .si-action-primary{background:#f0f4ff;color:#2855d8;border-color:#dce5ff}.si-card-actions button:disabled{opacity:.45;cursor:not-allowed}.si-pending-note{margin-top:9px;color:#96630a;background:#fff9ec;border:1px solid #f9e5b5;border-radius:8px;padding:8px 10px;font-size:9px;line-height:1.5}.si-empty{padding:47px 24px 50px;text-align:center}.si-empty-icon{width:49px;height:49px;display:grid;place-items:center;margin:0 auto 14px;border-radius:15px;background:#eff4ff;color:#315cf4}.si-empty-icon svg{width:24px;height:24px}.si-empty h3{font-size:16px;letter-spacing:-.02em;margin:0 0 7px}.si-empty p{font-size:11px;line-height:1.65;max-width:430px;color:#7b899d;margin:0 auto 17px}.si-list-footer{padding:12px 22px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid #edf1f6;color:#8a97a9;font-size:9px}.si-list-footer button{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:#315cf4;font:800 10px Inter,system-ui,sans-serif;cursor:pointer}.si-list-footer button:disabled{opacity:.5}.si-list-footer svg{width:14px;height:14px}.si-prep-grid{max-width:1450px;margin:17px auto 0;display:grid;grid-template-columns:1.2fr .8fr;gap:13px}.si-prep-card,.si-help-card{display:flex;gap:13px;align-items:flex-start;padding:18px;border:1px solid #e2e8f1;border-radius:15px;background:#fff}.si-prep-symbol{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;background:#eafaf2;color:#0b8a5a;font-weight:950;flex:none}.si-prep-card h3,.si-help-card h3{font-size:13px;margin:1px 0 5px;letter-spacing:-.02em}.si-prep-card p,.si-help-card p{font-size:10px;color:#7b899d;line-height:1.6;margin:0}.si-prep-card ul{padding-left:16px;margin:10px 0 0;color:#53627a;font-size:10px;line-height:1.8}.si-help-card{display:block;background:linear-gradient(120deg,#f7f9ff,#f4f5ff);border-color:#dfe5ff}.si-help-card h3{font-size:15px;margin-top:7px}.si-help-card p{margin-top:7px}.si-page button:focus-visible,.si-page input:focus-visible,.si-page select:focus-visible{outline:3px solid rgba(49,92,244,.25);outline-offset:2px}@media(max-width:1000px){.si-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.si-header{align-items:flex-start;flex-direction:column}.si-next-card{align-items:flex-start}.si-prep-grid{grid-template-columns:1fr}}@media(max-width:700px){.si-page{padding:18px 11px 32px}.si-header-actions{width:100%}.si-header-actions .si-button{flex:1}.si-summary-card{padding:12px;gap:9px}.si-summary-icon{width:36px;height:36px}.si-summary-card strong{font-size:22px}.si-next-card{padding:19px 16px;gap:12px}.si-next-date{width:60px;height:68px}.si-next-date strong{font-size:25px}.si-next-meta{gap:10px}.si-list-header{align-items:stretch;flex-direction:column;padding:18px 15px}.si-search{min-width:0;width:100%}.si-toolbar{align-items:flex-start;flex-direction:column;padding:11px 13px}.si-filters{width:100%}.si-filters button{padding:7px 8px}.si-sort{align-self:flex-end}.si-interview-list{padding:10px 10px 1px}.si-interview-card{grid-template-columns:49px minmax(0,1fr);gap:10px;padding:12px}.si-date-tile{width:47px;min-height:65px}.si-date-tile strong{font-size:20px}.si-interview-top{flex-direction:column;align-items:flex-start}.si-card-title h3{font-size:15px}.si-detail-grid{grid-template-columns:1fr;gap:12px;margin-top:14px}.si-card-actions button{flex:1}.si-list-footer{padding:11px 13px}.si-prep-card,.si-help-card{padding:15px}}@media(max-width:410px){.si-summary-grid{grid-template-columns:1fr}.si-filters button{font-size:9px}.si-next-card{flex-wrap:wrap}.si-next-main{flex:1 1 100%}.si-next-date{position:absolute;right:15px;top:16px}.si-next-card h2{padding-right:62px}}
`;
