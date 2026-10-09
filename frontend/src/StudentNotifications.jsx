import { useCallback, useEffect, useMemo, useState } from "react";

const API_CANDIDATES = [
  import.meta.env.VITE_API_BASE_URL,
  "http://127.0.0.1:8000",
  "http://localhost:8000",
].filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);

function getToken() {
  return localStorage.getItem("campuslink_token") || localStorage.getItem("access_token") || "";
}

function readResponse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function errorText(data, status) {
  const detail = data?.detail ?? data?.message;
  if (Array.isArray(detail)) {
    const items = detail.map((item) => {
      const location = Array.isArray(item?.loc) ? item.loc.filter((part) => part !== "body").join(" → ") : "";
      return [location, item?.msg || item?.message].filter(Boolean).join(": ");
    }).filter(Boolean);
    if (items.length) return items.join(" · ");
  }
  if (typeof detail === "string" && detail.trim()) return detail;
  if (typeof data === "string" && data.trim()) return data;
  return `Request failed (${status})`;
}

async function api(path, options = {}) {
  let lastNetworkError = null;
  for (const base of API_CANDIDATES) {
    try {
      const response = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${getToken()}`,
          ...(options.headers || {}),
        },
      });
      const data = readResponse(await response.text());
      if (!response.ok) throw new Error(errorText(data, response.status));
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
  throw new Error(`CampusLink backend is unreachable. ${lastNetworkError?.message || "Check that the backend is running."}`);
}

function rowsFrom(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatDate(value) {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(date);
}

function formatRelative(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diff = date.getTime() - Date.now();
  const absolute = Math.abs(diff);
  if (absolute < 60_000) return "Just now";
  if (absolute < 3_600_000) {
    const minutes = Math.round(absolute / 60_000);
    return diff > 0 ? `In ${minutes} min` : `${minutes} min ago`;
  }
  if (absolute < 86_400_000) {
    const hours = Math.round(absolute / 3_600_000);
    return diff > 0 ? `In ${hours} hr` : `${hours} hr ago`;
  }
  const days = Math.round(absolute / 86_400_000);
  if (days < 7) return diff > 0 ? `In ${days} day${days === 1 ? "" : "s"}` : `${days} day${days === 1 ? "" : "s"} ago`;
  return "";
}

function notificationStyle(type = "GENERAL") {
  const normalized = String(type).toUpperCase();
  if (normalized.includes("OFFER")) return { icon: "offer", label: "Offer", className: "sn-type-offer" };
  if (normalized.includes("APPLICATION") || normalized.includes("SHORTLIST")) return { icon: "application", label: "Application", className: "sn-type-application" };
  if (normalized.includes("INTERVIEW") || normalized.includes("SCHEDULE") || normalized.includes("ROUND")) return { icon: "calendar", label: "Interview & rounds", className: "sn-type-interview" };
  if (normalized.includes("DOCUMENT")) return { icon: "document", label: "Documents", className: "sn-type-document" };
  return { icon: "bell", label: normalized === "GENERAL" ? "Update" : normalized.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()), className: "sn-type-general" };
}

function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "bell") return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
  if (name === "offer") return <svg {...common}><path d="m12 3 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9L12 3Z"/></svg>;
  if (name === "application") return <svg {...common}><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>;
  if (name === "calendar") return <svg {...common}><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h2M14 13h2M8 16.5h2"/></svg>;
  if (name === "document") return <svg {...common}><path d="M7 3.5h7l4 4v13H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"/><path d="M14 3.5v5h4M8.5 13h7M8.5 16.5h7"/></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12.5 4.3 4.3L19 7"/></svg>;
  if (name === "refresh") return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 11.6-2L20 12M4 12l2.9 5a7 7 0 0 0 11.6-2"/></svg>;
  if (name === "search") return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg>;
  if (name === "inbox") return <svg {...common}><path d="M4 4.5h16l1.5 10v4a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18.5v-4L4 4.5Z"/><path d="M2.5 14h5l1.4 2h6.2l1.4-2h5"/></svg>;
  if (name === "arrow") return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8"/><path d="M12 8v4M12 16h.01"/></svg>;
}

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("NEWEST");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!getToken()) {
      setNotifications([]);
      setError("Your login session was not found. Sign in again to see your notifications.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [listResult, countResult] = await Promise.allSettled([
        api("/notifications/"),
        api("/notifications/unread-count"),
      ]);
      if (listResult.status === "rejected") throw listResult.reason;
      const list = rowsFrom(listResult.value).map((item) => ({ ...item, is_read: Boolean(item?.is_read) }));
      setNotifications(list);
      if (countResult.status === "rejected") {
        setNotice("Notifications loaded. The unread-count endpoint did not respond, so the count is based on the loaded list.");
      } else {
        const serverCount = Number(countResult.value?.unread_count);
        if (Number.isFinite(serverCount) && serverCount !== list.filter((item) => !item.is_read).length) {
          // The list is the source of truth for the visible inbox; server count is refreshed on every load.
        }
      }
    } catch (err) {
      setError(err?.message || "Unable to load your notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
  const readCount = notifications.length - unreadCount;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = notifications.filter((item) => {
      if (filter === "UNREAD" && item.is_read) return false;
      if (filter === "READ" && !item.is_read) return false;
      if (!needle) return true;
      const type = notificationStyle(item.notification_type).label;
      return [item.title, item.message, type, item.notification_type, formatDate(item.created_at)]
        .filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
    result.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime() || 0;
      const bTime = new Date(b.created_at || 0).getTime() || 0;
      if (sort === "OLDEST") return aTime - bTime;
      if (sort === "UNREAD_FIRST") return Number(Boolean(a.is_read)) - Number(Boolean(b.is_read)) || bTime - aTime;
      return bTime - aTime;
    });
    return result;
  }, [notifications, filter, query, sort]);

  async function markAsRead(notification) {
    if (notification.is_read || actionId !== null || markingAll) return;
    setActionId(String(notification.id));
    setError("");
    setNotice("");
    try {
      const updated = await api(`/notifications/${notification.id}/read`, { method: "PATCH" });
      setNotifications((current) => current.map((item) => String(item.id) === String(notification.id)
        ? { ...item, ...(updated && typeof updated === "object" ? updated : {}), is_read: true }
        : item));
      setNotice("Notification marked as read.");
    } catch (err) {
      setError(err?.message || "Unable to mark this notification as read.");
    } finally {
      setActionId(null);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0 || markingAll || actionId !== null) return;
    setMarkingAll(true);
    setError("");
    setNotice("");
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setNotice("All notifications are marked as read.");
    } catch (err) {
      setError(err?.message || "Unable to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading) {
    return <div className="sn-page"><style>{CSS}</style><div className="sn-loading"><span className="sn-spinner"/><strong>Loading your notifications</strong><span>Checking the latest placement updates…</span></div></div>;
  }

  return (
    <div className="sn-page">
      <style>{CSS}</style>
      <header className="sn-header">
        <div className="sn-heading">
          <span className="sn-eyebrow"><Icon name="bell" size={13}/> STUDENT WORKSPACE / UPDATES</span>
          <h1>Notifications<span className="sn-title-dot">.</span></h1>
          <p>Important placement activity, all in one place. Stay up to date with applications, interviews and offers.</p>
        </div>
        <div className="sn-header-actions">
          <button type="button" className="sn-button sn-button-soft" onClick={() => load({ quiet: true })} disabled={refreshing || markingAll || actionId !== null}><Icon name="refresh" size={16}/>{refreshing ? "Refreshing…" : "Refresh"}</button>
          <button type="button" className="sn-button sn-button-primary" onClick={markAllAsRead} disabled={unreadCount === 0 || markingAll || actionId !== null}><Icon name="check" size={16}/>{markingAll ? "Updating…" : "Mark all as read"}</button>
        </div>
      </header>

      {error && <div className="sn-alert sn-alert-error" role="alert"><span className="sn-alert-icon">!</span><div><strong>Something needs attention</strong><p>{error}</p>{!getToken() ? null : <button type="button" onClick={() => load()}>Try again</button>}</div></div>}
      {notice && <div className="sn-alert sn-alert-success" role="status"><span className="sn-alert-icon"><Icon name="check" size={15}/></span><div><p>{notice}</p></div><button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}

      <section className="sn-stats" aria-label="Notification summary">
        <article className="sn-stat sn-stat-total"><div className="sn-stat-icon"><Icon name="inbox" size={20}/></div><div><span>Total notifications</span><strong>{notifications.length}</strong><small>Across your placement journey</small></div></article>
        <article className="sn-stat sn-stat-unread"><div className="sn-stat-icon"><Icon name="bell" size={20}/></div><div><span>Unread</span><strong>{unreadCount}</strong><small>{unreadCount ? "Needs your attention" : "You're all caught up"}</small></div><span className={`sn-stat-indicator ${unreadCount ? "is-active" : ""}`}/></article>
        <article className="sn-stat sn-stat-read"><div className="sn-stat-icon"><Icon name="check" size={20}/></div><div><span>Read</span><strong>{readCount}</strong><small>Already reviewed</small></div></article>
      </section>

      <section className="sn-inbox">
        <div className="sn-inbox-heading">
          <div><span className="sn-eyebrow">YOUR INBOX</span><h2>Placement updates <span>{visible.length}</span></h2><p>New items are highlighted. Mark notifications as read after reviewing them.</p></div>
          <label className="sn-search"><Icon name="search" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notifications…" aria-label="Search notifications"/><kbd>⌕</kbd></label>
        </div>
        <div className="sn-toolbar">
          <div className="sn-tabs" role="group" aria-label="Filter notifications">
            {[{id:"ALL", label:"All", count:notifications.length},{id:"UNREAD",label:"Unread",count:unreadCount},{id:"READ",label:"Read",count:readCount}].map((item) => <button key={item.id} type="button" className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}<span>{item.count}</span></button>)}
          </div>
          <label className="sn-sort">Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option><option value="UNREAD_FIRST">Unread first</option></select></label>
        </div>

        {error && notifications.length === 0 ? null : visible.length === 0 ? (
          <div className="sn-empty"><div className="sn-empty-icon"><Icon name="inbox" size={24}/></div><h3>{notifications.length === 0 ? "Your inbox is clear" : "No notifications found"}</h3><p>{notifications.length === 0 ? "When there is an update about your application, interview or offer, it will show up here." : filter === "UNREAD" ? "You're all caught up for now. There are no unread notifications." : "Try another filter or search term to find the update you're looking for."}</p>{(query || filter !== "ALL") && <button type="button" className="sn-button sn-button-soft" onClick={() => { setQuery(""); setFilter("ALL"); }}>Show all notifications</button>}</div>
        ) : (
          <div className="sn-list">
            {visible.map((notification) => {
              const style = notificationStyle(notification.notification_type);
              const unread = !notification.is_read;
              const busy = actionId !== null || markingAll;
              const relative = formatRelative(notification.created_at);
              return (
                <article key={notification.id} className={`sn-notification ${unread ? "is-unread" : "is-read"}`}>
                  <div className={`sn-notification-icon ${style.className}`}><Icon name={style.icon} size={21}/>{unread && <span className="sn-unread-dot"/>}</div>
                  <div className="sn-notification-content">
                    <div className="sn-notification-top"><div className="sn-title-line"><h3>{notification.title || "Placement update"}</h3>{unread && <span className="sn-new-badge">NEW</span>}</div><span className={`sn-read-label ${unread ? "unread" : "read"}`}>{unread ? "Unread" : "Read"}</span></div>
                    <p className="sn-message">{notification.message || "There are no further details for this update."}</p>
                    <div className="sn-meta"><span className={`sn-type-label ${style.className}`}>{style.label}</span><span className="sn-meta-separator">·</span><span>{formatDate(notification.created_at)}</span>{relative && <><span className="sn-meta-separator">·</span><span className="sn-relative">{relative}</span></>}</div>
                    <div className="sn-card-footer">{unread ? <span className="sn-attention-note"><span/>Waiting for you to review</span> : <span className="sn-reviewed-note"><Icon name="check" size={13}/> Reviewed</span>}{unread && <button type="button" className="sn-mark-button" onClick={() => markAsRead(notification)} disabled={busy}><Icon name="check" size={15}/>{actionId === String(notification.id) ? "Saving…" : "Mark as read"}</button>}</div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <footer className="sn-list-footer"><span>Showing <strong>{visible.length}</strong> of <strong>{notifications.length}</strong> notifications</span><button type="button" onClick={() => load({ quiet: true })} disabled={refreshing || markingAll || actionId !== null}><Icon name="refresh" size={14}/>{refreshing ? "Syncing…" : "Sync inbox"}</button></footer>
      </section>

      <section className="sn-tip"><div className="sn-tip-icon"><Icon name="bell" size={19}/></div><div><strong>Stay ahead of your placement journey</strong><p>Check unread updates for shortlist decisions, interview schedules and offers. Your notification state is saved to your CampusLink account.</p></div></section>
    </div>
  );
}

const CSS = `
.sn-page{--sn-ink:#17243a;--sn-muted:#718096;--sn-line:#e4eaf3;--sn-blue:#365cf5;box-sizing:border-box;min-height:100vh;padding:28px clamp(14px,2.6vw,36px) 48px;background:radial-gradient(900px circle at 92% -8%,rgba(77,112,255,.10),transparent 53%),#f4f7fc;color:var(--sn-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.sn-page *{box-sizing:border-box}.sn-header,.sn-stats,.sn-inbox,.sn-tip,.sn-alert{max-width:1440px;margin-left:auto;margin-right:auto}.sn-header{display:flex;align-items:flex-end;justify-content:space-between;gap:22px;margin-bottom:22px}.sn-heading{max-width:750px;min-width:0}.sn-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#536be0;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.sn-heading h1{font-size:clamp(28px,3.3vw,42px);line-height:1.09;letter-spacing:-.055em;margin:11px 0 8px;font-weight:850}.sn-title-dot{color:#4e6df8}.sn-heading p{font-size:13px;line-height:1.65;margin:0;color:#77859b;max-width:690px}.sn-header-actions{display:flex;gap:9px;flex-wrap:wrap}.sn-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:10px;padding:11px 14px;font:800 11px Inter,system-ui,sans-serif;cursor:pointer;transition:transform .16s,border-color .16s,background .16s;white-space:nowrap}.sn-button:hover:not(:disabled){transform:translateY(-1px)}.sn-button:disabled{opacity:.48;cursor:not-allowed}.sn-button-primary{background:#3158f3;color:#fff;box-shadow:0 6px 16px rgba(49,88,243,.18)}.sn-button-primary:hover:not(:disabled){background:#2449dc}.sn-button-soft{background:#fff;color:#33435d;border-color:#dce4f0}.sn-button-soft:hover:not(:disabled){background:#f9fbff;border-color:#c6d3ec}.sn-alert{display:flex;align-items:flex-start;gap:11px;margin-bottom:16px;padding:13px 15px;border-radius:12px;border:1px solid}.sn-alert-error{background:#fff6f6;border-color:#ffd6d6;color:#8f2434}.sn-alert-success{background:#f0fbf5;border-color:#c8f0d8;color:#176947}.sn-alert-icon{width:27px;height:27px;display:grid;place-items:center;flex:none;border-radius:8px;background:rgba(255,255,255,.8);font-weight:950}.sn-alert>div{flex:1;min-width:0}.sn-alert strong{font-size:11px}.sn-alert p{font-size:11px;line-height:1.55;margin:3px 0 0;overflow-wrap:anywhere}.sn-alert button{border:0;background:transparent;color:inherit;font:800 11px Inter,system-ui,sans-serif;cursor:pointer;margin-top:4px}.sn-alert>button{font-size:18px;line-height:1;margin:0}.sn-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-bottom:18px}.sn-stat{position:relative;display:flex;align-items:center;gap:14px;padding:18px 19px;min-width:0;background:#fff;border:1px solid var(--sn-line);border-radius:15px;box-shadow:0 5px 20px rgba(22,39,73,.025)}.sn-stat-icon{display:grid;place-items:center;width:45px;height:45px;flex:none;border-radius:13px;color:#4d65e8;background:#edf1ff}.sn-stat-unread .sn-stat-icon{background:#fff3df;color:#bf7b13}.sn-stat-read .sn-stat-icon{background:#e9f9f1;color:#148458}.sn-stat>div:last-of-type{min-width:0;display:grid;gap:3px}.sn-stat span:not(.sn-stat-indicator){font-size:11px;font-weight:750;color:#75839a}.sn-stat strong{font-size:29px;line-height:1.1;letter-spacing:-.045em;font-weight:850;color:#1c2b42}.sn-stat small{font-size:10px;line-height:1.4;color:#9aa5b5}.sn-stat-indicator{position:absolute;top:18px;right:18px;width:7px;height:7px;background:#e1e6ed;border-radius:50%}.sn-stat-indicator.is-active{background:#e99a29;box-shadow:0 0 0 4px rgba(233,154,41,.12)}.sn-inbox{overflow:hidden;background:#fff;border:1px solid #e0e7f1;border-radius:18px;box-shadow:0 8px 26px rgba(18,36,70,.035)}.sn-inbox-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:23px 24px 19px;border-bottom:1px solid #edf1f6}.sn-inbox-heading h2{display:flex;align-items:center;gap:9px;font-size:20px;letter-spacing:-.04em;margin:7px 0 5px}.sn-inbox-heading h2>span{display:inline-grid;place-items:center;min-width:23px;height:23px;padding:0 6px;border-radius:7px;background:#eef2ff;color:#405de4;font-size:10px;letter-spacing:0}.sn-inbox-heading p{margin:0;font-size:11px;line-height:1.55;color:#8793a6}.sn-search{width:min(330px,42%);min-width:210px;display:flex;align-items:center;gap:9px;padding:10px 11px;background:#fbfcff;border:1px solid #dfe6f0;border-radius:10px;color:#8592a7}.sn-search:focus-within{border-color:#aabaff;box-shadow:0 0 0 3px rgba(57,89,239,.08)}.sn-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:#24334b;font:500 11px Inter,system-ui,sans-serif}.sn-search input::placeholder{color:#9aa5b5}.sn-search kbd{display:inline-grid;place-items:center;width:21px;height:21px;border:1px solid #e2e8f1;border-radius:5px;background:white;color:#8b97a9;font:12px Inter,system-ui,sans-serif}.sn-toolbar{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:12px 24px;background:#fbfcff;border-bottom:1px solid #edf1f6}.sn-tabs{display:flex;align-items:center;gap:5px;flex-wrap:wrap}.sn-tabs button{display:inline-flex;align-items:center;gap:8px;border:1px solid transparent;border-radius:9px;background:transparent;padding:8px 11px;color:#718096;font:800 10px Inter,system-ui,sans-serif;cursor:pointer}.sn-tabs button:hover{background:#f0f3fa}.sn-tabs button span{display:inline-grid;place-items:center;min-width:20px;height:19px;padding:0 5px;background:#edf0f6;color:#758198;border-radius:6px;font-size:9px}.sn-tabs button.active{background:#edf2ff;border-color:#dae3ff;color:#3354d8}.sn-tabs button.active span{background:#dbe5ff;color:#3156e7}.sn-sort{display:flex;align-items:center;gap:8px;color:#8894a6;font-size:10px;white-space:nowrap}.sn-sort select{max-width:150px;padding:8px 9px;border:1px solid #dfe6f0;border-radius:8px;background:#fff;color:#41506a;font:750 10px Inter,system-ui,sans-serif;outline:0}.sn-list{display:grid;gap:0}.sn-notification{position:relative;display:grid;grid-template-columns:46px minmax(0,1fr);gap:15px;padding:20px 24px;border-bottom:1px solid #edf1f6;transition:background .18s}.sn-notification:last-child{border-bottom:0}.sn-notification:hover{background:#fcfdff}.sn-notification.is-unread{background:linear-gradient(90deg,#f7f9ff 0%,#fff 35%)}.sn-notification.is-unread:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#4262f5}.sn-notification-icon{position:relative;display:grid;place-items:center;width:45px;height:45px;flex:none;border-radius:13px;background:#eff2ff;color:#5267e8}.sn-type-offer.sn-notification-icon,.sn-notification-icon.sn-type-offer{background:#fff3e0;color:#b97712}.sn-notification-icon.sn-type-application{background:#eaf3ff;color:#3375d5}.sn-notification-icon.sn-type-interview{background:#f3edff;color:#8058cb}.sn-notification-icon.sn-type-document{background:#e7f8f0;color:#18875e}.sn-notification-icon.sn-type-general{background:#eef1f6;color:#6d7a91}.sn-unread-dot{position:absolute;right:-2px;top:-2px;width:10px;height:10px;border:2px solid #fff;border-radius:50%;background:#4162f5}.sn-notification-content{min-width:0}.sn-notification-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.sn-title-line{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}.sn-title-line h3{font-size:14px;line-height:1.4;letter-spacing:-.025em;font-weight:850;margin:0;color:#26354c;overflow-wrap:anywhere}.sn-new-badge{display:inline-flex;align-items:center;border:1px solid #dbe4ff;border-radius:5px;background:#edf2ff;color:#3658df;padding:3px 6px;font-size:8px;line-height:1;font-weight:950;letter-spacing:.08em}.sn-read-label{flex:none;display:inline-flex;align-items:center;gap:5px;border:1px solid transparent;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:850;white-space:nowrap}.sn-read-label.unread{background:#fff5e6;color:#a5650b;border-color:#fbe5bf}.sn-read-label.unread:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.sn-read-label.read{background:#effaf4;border-color:#d5f2e1;color:#24835b}.sn-message{font-size:12px;line-height:1.75;color:#6e7d93;margin:7px 0 12px;max-width:920px;overflow-wrap:anywhere;white-space:pre-wrap}.sn-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:#929daf;font-size:10px;line-height:1.4}.sn-meta-separator{color:#cad1dd}.sn-type-label{display:inline-flex;align-items:center;border:1px solid transparent;border-radius:6px;padding:4px 7px;font-size:9px;line-height:1;font-weight:850}.sn-type-label.sn-type-offer{color:#a66b14;background:#fff7e9;border-color:#fae8c7}.sn-type-label.sn-type-application{color:#316ab9;background:#edf5ff;border-color:#dceaff}.sn-type-label.sn-type-interview{color:#7b51bd;background:#f5efff;border-color:#e9ddff}.sn-type-label.sn-type-document{color:#138158;background:#eafaf2;border-color:#d3f4e3}.sn-type-label.sn-type-general{color:#64748b;background:#f3f5f8;border-color:#e6eaf0}.sn-relative{color:#6d7c93;font-weight:750}.sn-card-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid #edf1f6}.sn-attention-note,.sn-reviewed-note{display:inline-flex;align-items:center;gap:7px;color:#8995a7;font-size:10px}.sn-attention-note>span{width:6px;height:6px;border-radius:50%;background:#e3a03d}.sn-reviewed-note{color:#26805d}.sn-mark-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid #dbe4ff;border-radius:8px;background:#f3f6ff;color:#3157de;padding:8px 11px;font:850 10px Inter,system-ui,sans-serif;cursor:pointer;transition:background .15s,border-color .15s}.sn-mark-button:hover:not(:disabled){background:#e8eeff;border-color:#bfcfff}.sn-mark-button:disabled{opacity:.55;cursor:wait}.sn-empty{padding:52px 22px 56px;text-align:center}.sn-empty-icon{display:grid;place-items:center;width:55px;height:55px;margin:0 auto 14px;border-radius:17px;background:#eff3ff;color:#5266e7}.sn-empty h3{margin:0 0 7px;font-size:16px;letter-spacing:-.03em}.sn-empty p{max-width:430px;margin:0 auto 17px;font-size:11px;line-height:1.7;color:#7e8ba0}.sn-list-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 24px;border-top:1px solid #edf1f6;background:#fcfdff;color:#8b97a9;font-size:10px}.sn-list-footer strong{color:#55647b}.sn-list-footer button{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:#4260e5;font:850 10px Inter,system-ui,sans-serif;cursor:pointer}.sn-list-footer button:disabled{opacity:.5;cursor:wait}.sn-tip{display:flex;align-items:flex-start;gap:12px;margin-top:15px;padding:17px 19px;border:1px solid #dfe7ff;border-radius:14px;background:linear-gradient(110deg,#f7f9ff,#fff)}.sn-tip-icon{width:35px;height:35px;display:grid;place-items:center;flex:none;border-radius:11px;background:#e9eeff;color:#4a63e6}.sn-tip strong{font-size:11px}.sn-tip p{font-size:10px;line-height:1.65;color:#7c89a0;margin:4px 0 0}.sn-loading{min-height:65vh;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;color:#74829a;text-align:center}.sn-loading strong{font-size:14px;color:#293952}.sn-loading>span:last-child{font-size:11px}.sn-spinner{width:30px;height:30px;border:3px solid #e2e8ff;border-top-color:#4260f5;border-radius:50%;animation:sn-spin .8s linear infinite}@keyframes sn-spin{to{transform:rotate(360deg)}}.sn-page button:focus-visible,.sn-page input:focus-visible,.sn-page select:focus-visible{outline:3px solid rgba(57,89,239,.25);outline-offset:2px}@media(max-width:920px){.sn-header{align-items:flex-start;flex-direction:column}.sn-header-actions{width:100%}.sn-inbox-heading{align-items:stretch;flex-direction:column}.sn-search{width:100%;min-width:0}.sn-stats{gap:10px}.sn-stat{padding:15px;gap:10px}.sn-stat-icon{width:39px;height:39px}.sn-stat strong{font-size:25px}}@media(max-width:650px){.sn-page{padding:18px 10px 30px}.sn-heading h1{font-size:30px}.sn-heading p{font-size:12px}.sn-header-actions .sn-button{flex:1;padding:10px 9px;font-size:10px}.sn-stats{grid-template-columns:1fr;gap:8px}.sn-stat{padding:13px 15px}.sn-stat-icon{width:38px;height:38px}.sn-stat strong{font-size:23px}.sn-inbox-heading{padding:18px 14px 15px}.sn-inbox-heading h2{font-size:18px}.sn-toolbar{padding:10px 13px;align-items:flex-start;flex-direction:column}.sn-tabs{width:100%}.sn-tabs button{flex:1;justify-content:center;padding:8px 7px}.sn-sort{align-self:flex-end}.sn-notification{grid-template-columns:36px minmax(0,1fr);gap:10px;padding:15px 12px}.sn-notification-icon{width:36px;height:36px;border-radius:11px}.sn-notification-icon svg{width:18px;height:18px}.sn-notification-top{flex-direction:column;align-items:flex-start;gap:7px}.sn-title-line h3{font-size:13px}.sn-message{font-size:11px;margin-top:7px}.sn-meta{gap:6px;font-size:9px}.sn-card-footer{align-items:flex-start;flex-direction:column;gap:10px}.sn-mark-button{width:100%}.sn-list-footer{padding:12px 14px;font-size:9px}.sn-tip{padding:14px}.sn-search kbd{display:none}}@media(prefers-reduced-motion:reduce){.sn-page *{animation:none!important;transition:none!important}}
`;
