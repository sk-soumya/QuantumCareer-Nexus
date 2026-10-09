import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import StudentDocuments from "./StudentDocuments";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const EMPTY = {
  phone: "", degree: "", department: "", graduation_year: "", cgpa: "",
  skills: "", projects: "", experience: "", certifications: "",
  linkedin: "", github: "", preferred_roles: "", preferred_locations: "",
  career_objective: "", resume_text: "",
};

function getToken() { return localStorage.getItem("campuslink_token") || ""; }
function apiUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE_URL}${String(value).startsWith("/") ? "" : "/"}${value}`;
}
function readableDetail(data, fallback) {
  const detail = data?.detail ?? data?.message;
  if (Array.isArray(detail)) return detail.map((item) => { const loc = Array.isArray(item?.loc) ? item.loc.filter((part) => part !== "body" && part !== "query").join(".") : ""; return `${loc ? `${loc}: ` : ""}${item?.msg || item?.message || String(item)}`; }).join(" · ");
  if (typeof detail === "string") return detail;
  return fallback;
}
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(readableDetail(data, `Request failed (${response.status})`));
  return data;
}
function fieldValue(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(fieldValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    for (const key of ["value", "text", "title", "name", "label", "description", "details"]) {
      if (value[key] != null && value[key] !== "") return fieldValue(value[key]);
    }
    return "";
  }
  return String(value).trim();
}
function profileDraftKey(account) { return `campuslink_profile_draft_${account?.id ?? account?.user_id ?? account?.email ?? "current"}`; }
function readProfileDraft(account) { try { const raw = localStorage.getItem(profileDraftKey(account)); return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
function writeProfileDraft(account, value) { try { localStorage.setItem(profileDraftKey(account), JSON.stringify(value)); } catch { /* Keep editing usable if storage is unavailable. */ } }

const RESUME_SECTION_GROUPS = [
  { key: "education", aliases: ["education", "academic background", "academic qualifications", "qualifications", "educational background", "academic details"] },
  { key: "skills", aliases: ["skills", "technical skills", "core skills", "key skills", "technologies", "technical expertise", "skills and technologies", "tools and technologies"] },
  { key: "projects", aliases: ["projects", "academic projects", "personal projects", "key projects", "project experience", "project work", "selected projects"] },
  { key: "experience", aliases: ["experience", "work experience", "professional experience", "employment history", "internship", "internships", "work history"] },
  { key: "certifications", aliases: ["certifications", "certificates", "licenses and certifications", "licenses certifications", "courses and certifications", "training"] },
  { key: "summary", aliases: ["summary", "profile", "career objective", "objective", "professional summary", "about me", "about"] },
  { key: "achievements", aliases: ["achievements", "awards", "leadership", "positions of responsibility", "accomplishments"] },
];
function normalizeHeading(value) {
  return String(value || "")
    .replace(/^\s*(?:#{1,6}\s*)?(?:\d+[.)]\s*)?/, "")
    .replace(/\s+/g, " ")
    .replace(/[\s:|–—-]+$/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+& ]/g, "")
    .replace(/\s+/g, " ");
}
function findSectionHeader(line) {
  const trimmed = String(line || "").replace(/^\s*(?:#{1,6}\s*)?(?:\d+[.)]\s*)?/, "").trim();
  const inline = trimmed.match(/^(.+?)\s*[:|–—-]\s*(.*?)\s*$/);
  const candidate = inline ? inline[1] : trimmed;
  const normalized = normalizeHeading(candidate);
  for (const group of RESUME_SECTION_GROUPS) {
    if (group.aliases.some((alias) => normalizeHeading(alias) === normalized)) {
      return { key: group.key, content: inline ? inline[2].trim() : "" };
    }
  }
  return null;
}
function sectionFromText(text, aliases) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const wanted = new Set(aliases.map(normalizeHeading));
  let start = -1;
  let inlineContent = "";
  for (let i = 0; i < lines.length; i += 1) {
    const header = findSectionHeader(lines[i]);
    if (header && wanted.has(normalizeHeading(header.key))) {
      start = i;
      inlineContent = header.content;
      break;
    }
    // Also accept exact section names where the heading's display text differs from the key.
    const norm = normalizeHeading(lines[i]);
    if (wanted.has(norm)) { start = i; inlineContent = ""; break; }
  }
  if (start < 0) return "";
  const result = [];
  if (inlineContent) result.push(inlineContent);
  for (let i = start + 1; i < lines.length; i += 1) {
    if (findSectionHeader(lines[i])) break;
    const normalized = normalizeHeading(lines[i]);
    if (RESUME_SECTION_GROUPS.some((group) => group.aliases.some((alias) => normalizeHeading(alias) === normalized))) break;
    if (lines[i].trim()) result.push(lines[i].trim());
  }
  return result.join("\n").trim();
}
function stringifySection(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item).trim();
      if (!item || typeof item !== "object") return "";
      return [item.title, item.name, item.role, item.company, item.organization, item.degree,
        item.institution, item.description, item.details, item.technologies, item.tools,
        item.achievements, item.dates, item.year]
        .map(fieldValue).filter(Boolean).join(" — ");
    }).filter(Boolean).join("\n\n");
  }
  return fieldValue(value);
}
function firstValue(...values) {
  for (const value of values) {
    const normalized = fieldValue(value);
    if (normalized) return normalized;
  }
  return "";
}
function unwrapResumeResponse(response) {
  const layers = [];
  const seen = new Set();
  let current = response;
  for (let i = 0; i < 5 && current && typeof current === "object" && !Array.isArray(current) && !seen.has(current); i += 1) {
    seen.add(current);
    layers.push(current);
    const nested = ["profile", "student_profile", "extracted_profile", "resume_profile", "result", "data", "student"]
      .map((key) => current[key])
      .find((value) => value && typeof value === "object" && !Array.isArray(value));
    if (!nested) break;
    current = nested;
  }
  return Object.assign({}, ...layers);
}
function textMatch(text, regex, group = 1) {
  const match = String(text || "").match(regex);
  return match ? String(match[group] ?? match[0]).trim().replace(/[;,|]+$/, "") : "";
}
function profileFromResume(rawData) {
  const data = unwrapResumeResponse(rawData);
  const text = firstValue(data?.resume_text, data?.extracted_text, data?.text, rawData?.resume_text, rawData?.extracted_text, rawData?.text);
  const educationRaw = data?.education ?? data?.education_details ?? data?.academic_details ?? data?.academics;
  const educationRows = Array.isArray(educationRaw) ? educationRaw : educationRaw && typeof educationRaw === "object" ? [educationRaw] : [];
  const education = [...educationRows].reverse().find((row) => row && typeof row === "object" && Object.values(row).some((value) => value != null && value !== "")) || {};
  const skills = stringifySection(data?.skills ?? data?.technical_skills ?? data?.skill_set)
    || sectionFromText(text, ["skills", "technical skills", "core skills", "key skills", "technologies", "technical expertise", "skills and technologies", "tools and technologies"]);
  const projects = stringifySection(data?.projects ?? data?.project_experience ?? data?.project_work)
    || sectionFromText(text, ["projects", "academic projects", "personal projects", "key projects", "project experience", "project work", "selected projects"]);
  const experience = stringifySection(data?.experience ?? data?.work_experience ?? data?.internships)
    || sectionFromText(text, ["experience", "work experience", "professional experience", "employment history", "internship", "internships", "work history"]);
  const certifications = stringifySection(data?.certifications ?? data?.certificates ?? data?.training)
    || sectionFromText(text, ["certifications", "certificates", "licenses and certifications", "licenses certifications", "courses and certifications", "training"]);
  const summary = firstValue(data?.career_objective, data?.professional_summary, data?.summary, data?.objective, data?.profile_summary)
    || sectionFromText(text, ["summary", "profile", "career objective", "objective", "professional summary", "about me", "about"]);
  const degreeFromText = textMatch(text, /(^|\n)\s*((?:B\.?\s?Tech|B\.?\s?E\.?|B\.?\s?Sc\.?|BCA|MCA|M\.?\s?Tech|M\.?\s?E\.?|MBA|BBA|Bachelor(?:'s)?|Master(?:'s)?|Diploma)[^\n]{0,150})/i, 2);
  const branchFromText = textMatch(text, /(?:department|branch|major|speciali[sz]ation|stream)\s*[:\-]\s*([^\n|]{2,100})/i, 1)
    || textMatch(text, /(?:B\.?\s?Tech|B\.?\s?E\.?|Bachelor(?:'s)?)[^\n]{0,60}\b(?:in|of)\s+([^,;|\n]{3,70})/i, 1);
  const cgpaFromText = textMatch(text, /(?:C\.?\s?G\.?\s?P\.?\s?A|GPA|grade point average)\s*[:=\-]?\s*(\d(?:\.\d{1,2})?)(?:\s*\/\s*10)?/i, 1);
  const yearFromText = textMatch(text, /(?:graduat(?:ion|ed)?\s*(?:year)?|passing\s*year|expected\s*(?:graduation|completion)|class\s+of)\D{0,25}(20\d{2})/i, 1);
  const phoneFromText = textMatch(text, /(?:phone|mobile|contact(?:\s+number)?)\s*[:\-]?\s*(\+?[\d][\d\s().-]{7,}\d)/i, 1)
    || textMatch(text, /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)/, 0);
  const emailFromText = textMatch(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, 0);
  const linkedinFromText = textMatch(text, /https?:\/\/(?:www\.)?linkedin\.com\/(?:in|pub)\/[^\s,|)]+/i, 0);
  const githubFromText = textMatch(text, /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/?/i, 0);
  const branch = firstValue(data?.department, data?.branch, data?.major, data?.discipline, education?.branch, education?.department, education?.major, education?.specialization, branchFromText);
  const degree = firstValue(data?.degree, data?.qualification, education?.degree, education?.qualification, degreeFromText);
  const graduationYear = firstValue(data?.graduation_year, data?.graduationYear, data?.passing_year, education?.graduation_year, education?.graduationYear, education?.passing_year, yearFromText);
  const cgpa = firstValue(data?.cgpa, data?.gpa, education?.cgpa, education?.gpa, cgpaFromText);
  return {
    phone: firstValue(data?.phone, data?.mobile, data?.phone_number, data?.contact_number, phoneFromText),
    degree,
    department: branch,
    graduation_year: graduationYear,
    cgpa,
    skills,
    projects,
    experience,
    certifications,
    linkedin: firstValue(data?.linkedin, data?.linkedin_url, linkedinFromText),
    github: firstValue(data?.github, data?.github_url, githubFromText),
    preferred_roles: firstValue(data?.preferred_roles, data?.target_role, data?.preferred_role),
    preferred_locations: firstValue(data?.preferred_locations, data?.preferred_location),
    career_objective: summary,
    resume_text: text,
  };
}
async function extractResume(file) {
  let lastError = null;
  let best = null;
  let bestCount = -1;
  // Try the fast Member 4 endpoint first, then the profile-aware extraction routes
  // when the fast endpoint only returns source text and very few mapped fields.
  for (const path of ["/ai/member4/resume/extract", "/resume/extract-profile", "/resume/analyze"]) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${getToken()}` },
        body: fd,
        signal: AbortSignal.timeout ? AbortSignal.timeout(path === "/resume/extract-profile" ? 85000 : 35000) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readableDetail(data, `Resume extraction failed (${response.status})`));
      const mapped = profileFromResume(data);
      const mappedCount = Object.keys(EMPTY).filter((key) => key !== "resume_text" && String(mapped[key] || "").trim()).length;
      if (mapped.resume_text && mappedCount > bestCount) { best = mapped; bestCount = mappedCount; }
      // Three or more meaningful profile fields is enough to use the fast result.
      if (mapped.resume_text && mappedCount >= 3) return mapped;
    } catch (error) { lastError = error; }
  }
  if (best?.resume_text) return best;
  throw new Error(lastError?.message || "Unable to extract this PDF. Try a text-based resume under 10 MB.");
}
function Field({ label, value, onChange, type = "text", placeholder = "", hint = "" }) {
  return <label className="pf-field"><span>{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />{hint && <small>{hint}</small>}</label>;
}
function Area({ label, value, onChange, placeholder = "", rows = 4, hint = "" }) {
  return <label className="pf-field pf-field-full"><span>{label}</span><textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />{hint && <small>{hint}</small>}</label>;
}

export default function StudentProfile() {
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filling, setFilling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showResumeText, setShowResumeText] = useState(false);
  const photoInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  const photoObjectRef = useRef("");

  const loadPhoto = useCallback(async (url) => {
    if (!url) {
      if (photoObjectRef.current) URL.revokeObjectURL(photoObjectRef.current);
      photoObjectRef.current = "";
      setPhotoUrl("");
      return;
    }
    const response = await fetch(apiUrl(url), { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!response.ok) throw new Error(`The photo is saved but could not be displayed (${response.status}).`);
    const blob = await response.blob();
    if (photoObjectRef.current) URL.revokeObjectURL(photoObjectRef.current);
    photoObjectRef.current = URL.createObjectURL(blob);
    setPhotoUrl(photoObjectRef.current);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const accountData = await api("/auth/me");
      const profileData = await api("/student-profile/me").catch(() => ({}));
      const draft = readProfileDraft(accountData);
      const combined = { ...(profileData || {}), ...(draft || {}) };
      setAccount(accountData);
      setProfile(combined);
      setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, fieldValue(combined?.[key])])) });
      try { await loadPhoto(combined?.profile_photo_url); } catch (photoError) { setError(photoError.message); }
    } catch (err) {
      setError(err.message || "Unable to load the student profile. Please sign in again if your session expired.");
    } finally { setLoading(false); }
  }, [loadPhoto]);

  useEffect(() => {
    load();
    return () => { if (photoObjectRef.current) URL.revokeObjectURL(photoObjectRef.current); };
  }, [load]);

  const skills = useMemo(() => String(form.skills || "").split(/[;,\n|]+/).map((x) => x.trim()).filter(Boolean), [form.skills]);
  const completion = useMemo(() => {
    const checks = [account?.full_name, account?.email, form.phone, form.degree, form.department, form.graduation_year, form.cgpa, skills.length, form.projects, form.experience, form.certifications, form.career_objective, form.resume_text];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [account, form, skills]);
  const initials = (account?.full_name || "Student").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

  function update(key, value) { setForm((current) => { const next = { ...current, [key]: value }; writeProfileDraft(account, payloadFor(next)); return next; }); setMessage(""); setError(""); }
  function payloadFor(values = form, photo = profile?.profile_photo_url || null) {
    const cgpa = String(values.cgpa || "").trim() === "" ? null : Number(values.cgpa);
    const graduationYear = String(values.graduation_year || "").trim() === "" ? null : Number(values.graduation_year);
    return {
      ...values,
      cgpa: Number.isFinite(cgpa) ? cgpa : null,
      graduation_year: Number.isInteger(graduationYear) ? graduationYear : null,
      phone: values.phone || null, degree: values.degree || null, department: values.department || null,
      skills: values.skills || null, projects: values.projects || null, experience: values.experience || null,
      certifications: values.certifications || null, linkedin: values.linkedin || null, github: values.github || null,
      preferred_roles: values.preferred_roles || null, preferred_locations: values.preferred_locations || null,
      career_objective: values.career_objective || null, resume_text: values.resume_text || null,
      profile_photo_url: photo,
    };
  }
  async function save(event) {
    event?.preventDefault?.();
    const cgpa = String(form.cgpa || "").trim() === "" ? null : Number(form.cgpa);
    const year = String(form.graduation_year || "").trim() === "" ? null : Number(form.graduation_year);
    if (cgpa !== null && (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)) { setError("CGPA must be between 0 and 10."); return; }
    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100)) { setError("Graduation year must be a valid year."); return; }
    try {
      setSaving(true); setError(""); setMessage("");
      const payload = payloadFor(form);
      writeProfileDraft(account, payload);
      const saved = await api("/student-profile/me", { method: "PUT", body: JSON.stringify(payload) });
      const combined = { ...payload, ...(saved || {}) };
      setProfile(combined);
      writeProfileDraft(account, combined);
      setMessage("Your profile details have been saved to CampusLink.");
    } catch (err) {
      // Never discard typed changes just because the API rejected a save.
      writeProfileDraft(account, payloadFor(form));
      setError(`${err.message || "Unable to save profile."} Your latest edits are kept in this browser; restart the backend/profile router to save them to your account.`);
    }
    finally { setSaving(false); }
  }
  async function uploadPhoto(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose a JPG, PNG or WEBP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Profile photo must be smaller than 5 MB."); return; }
    try {
      setUploading(true); setError(""); setMessage("Uploading your photo…");
      const fd = new FormData(); fd.append("file", file);
      const result = await api("/student-profile/photo", { method: "POST", body: fd });
      const photoPath = result?.profile_photo_url || result?.url || result?.photo_url;
      if (!photoPath) throw new Error("The server accepted the photo but did not return its saved URL. Check the backend photo endpoint response.");
      const saved = await api("/student-profile/me", { method: "PUT", body: JSON.stringify(payloadFor(form, photoPath)) });
      setProfile(saved || { ...profile, profile_photo_url: photoPath });
      await loadPhoto(saved?.profile_photo_url || photoPath);
      localStorage.setItem("campuslink_profile_photo_url", photoPath);
      setMessage("Profile photo uploaded and linked to your saved profile.");
    } catch (err) { setError(err.message || "Unable to upload profile photo."); }
    finally { setUploading(false); if (photoInputRef.current) photoInputRef.current.value = ""; }
  }
  async function autofillFromResume(file) {
    if (!file) return;
    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) { setError("Choose a PDF resume."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Resume must be smaller than 10 MB."); return; }
    try {
      setFilling(true); setError(""); setMessage("Reading your PDF and mapping the profile fields…");
      const mapped = await extractResume(file);
      // Only overwrite fields that the uploaded resume actually supplied. This
      // prevents blank extraction results from clearing details already entered.
      const next = { ...form };
      for (const key of Object.keys(EMPTY)) {
        const detected = fieldValue(mapped[key]);
        if (detected) next[key] = detected;
      }
      if (mapped.resume_text) next.resume_text = mapped.resume_text;
      const detectedCount = Object.keys(EMPTY).filter((key) => key !== "resume_text" && String(mapped[key] || "").trim()).length;
      const payload = payloadFor(next, profile?.profile_photo_url || null);
      setForm(next);
      setProfile((current) => ({ ...(current || {}), ...payload }));
      setShowResumeText(true);
      writeProfileDraft(account, payload);
      setMessage(detectedCount
        ? `Resume text extracted. ${detectedCount} profile field${detectedCount === 1 ? "" : "s"} auto-filled; review the detected values below. Saving…`
        : "Resume text extracted and displayed below, but no structured fields could be matched. Your existing profile details were kept; please review the PDF headings and fill any missed fields.");
      try {
        const saved = await api("/student-profile/me", { method: "PUT", body: JSON.stringify(payload) });
        // Avoid null values in an API response wiping a detected local field.
        const combined = { ...payload };
        for (const [key, value] of Object.entries(saved || {})) {
          if (value !== null && value !== undefined && key in payload) combined[key] = value;
        }
        setProfile(combined);
        writeProfileDraft(account, combined);
        if (detectedCount) setMessage(`Resume imported and saved. ${detectedCount} profile field${detectedCount === 1 ? " was" : "s were"} auto-filled. Review the fields below before continuing.`);
        else setMessage("Resume text was extracted and saved. No structured fields were confidently detected, so existing profile values were preserved.");
      } catch (saveError) {
        setError(`The resume was extracted and mapped into the form, but saving failed: ${saveError.message}. The filled fields are kept in this browser; use Save profile after the backend issue is fixed.`);
      }
    } catch (err) { setError(err.message || "Resume import failed."); }
    finally { setFilling(false); if (resumeInputRef.current) resumeInputRef.current.value = ""; }
  }

  if (loading) return <div className="pf-loading">Loading your CampusLink profile…</div>;

  return (
    <div className="pf-page">
      <style>{PROFILE_CSS}</style>
      <header className="pf-pagehead">
        <div><span className="pf-eyebrow">STUDENT WORKSPACE / PROFILE</span><h1>Your professional profile</h1><p>Keep your information accurate, show your evidence and let CampusLink do the repetitive setup work.</p></div>
        <div className="pf-head-actions"><Link to="/student/resume" className="pf-btn pf-btn-soft">Open Resume Studio ↗</Link><button className="pf-btn pf-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div>
      </header>

      <section className="pf-hero">
        <div className="pf-avatar-col"><div className="pf-avatar">{photoUrl ? <img src={photoUrl} alt="Your profile" /> : <span>{initials || "S"}</span>}</div><button className="pf-btn pf-btn-light" onClick={() => photoInputRef.current?.click()} disabled={uploading}>{uploading ? "Uploading photo…" : photoUrl ? "Change photo" : "Upload profile photo"}</button><input ref={photoInputRef} className="pf-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadPhoto(e.target.files?.[0])} /><small>JPG, PNG or WEBP · Max 5 MB</small></div>
        <div className="pf-hero-copy"><span className="pf-tag">STUDENT PROFILE</span><h2>{account?.full_name || "Student"}</h2><p>{account?.email || ""}</p><div className="pf-hero-meta"><span>{form.degree || "Add your degree"}</span><span>{form.department || "Add your department"}</span><span>{form.graduation_year || "Graduation year"}</span></div><p className="pf-hero-tip">Your photo is uploaded to CampusLink and linked to your saved profile—not just previewed in this browser.</p></div>
        <div className="pf-completion"><div className="pf-completion-ring" style={{ "--pf-progress": `${completion * 3.6}deg` }}><div><strong>{completion}%</strong><small>complete</small></div></div><span>Profile completeness</span><small>More verified detail helps recruiters understand your fit.</small></div>
      </section>

      {error && <div className="pf-alert pf-alert-error" role="alert"><strong>Needs attention</strong><span>{error}</span></div>}
      {message && <div className="pf-alert pf-alert-success" role="status"><strong>{message.startsWith("Resume") ? "Resume import" : message.startsWith("Profile photo") ? "Photo saved" : "Update complete"}</strong><span>{message}</span></div>}

      <section className="pf-autofill-card">
        <div className="pf-autofill-icon">✦</div><div className="pf-autofill-copy"><span className="pf-eyebrow">SMART PROFILE IMPORT</span><h2>Fill your profile from one resume</h2><p>Upload a text-based PDF. CampusLink extracts contact details, branch, CGPA, skills, projects, experience, certificates and resume text, then saves the detected fields for you to review.</p><div className="pf-autofill-tags"><span>PDF extraction</span><span>Field mapping</span><span>Save to profile</span></div></div><div className="pf-autofill-actions"><input ref={resumeInputRef} className="pf-hidden" type="file" accept="application/pdf,.pdf" onChange={(e) => autofillFromResume(e.target.files?.[0])} /><button className="pf-btn pf-btn-primary" onClick={() => resumeInputRef.current?.click()} disabled={filling}>{filling ? "Reading resume…" : "↑ Auto-fill from PDF"}</button><small>Up to 10 MB · Detected values fill matching fields; blank results will not erase your existing information.</small></div>
      </section>

      <form onSubmit={save} className="pf-form-layout">
        <section className="pf-panel"><div className="pf-panel-head"><div><span className="pf-eyebrow">01 / PERSONAL + ACADEMIC</span><h2>Core information</h2><p>Confirm your branch, graduation details and contact information.</p></div><span className="pf-panel-count">01</span></div><div className="pf-grid">
          <Field label="Phone number" value={form.phone} onChange={(v) => update("phone", v)} placeholder="+91 98765 43210" />
          <Field label="Degree" value={form.degree} onChange={(v) => update("degree", v)} placeholder="B.Tech, B.E., B.Sc…" />
          <Field label="Department / branch" value={form.department} onChange={(v) => update("department", v)} placeholder="Electrical Engineering" />
          <Field label="Graduation year" type="number" value={form.graduation_year} onChange={(v) => update("graduation_year", v)} placeholder="2027" />
          <Field label="CGPA (out of 10)" type="number" value={form.cgpa} onChange={(v) => update("cgpa", v)} placeholder="8.50" />
          <Field label="Target roles" value={form.preferred_roles} onChange={(v) => update("preferred_roles", v)} placeholder="Graduate Engineer Trainee, Analyst…" />
          <Field label="Preferred locations" value={form.preferred_locations} onChange={(v) => update("preferred_locations", v)} placeholder="Bhubaneswar, Bengaluru, Pune…" />
          <Field label="LinkedIn profile" value={form.linkedin} onChange={(v) => update("linkedin", v)} placeholder="https://linkedin.com/in/your-name" />
          <Field label="GitHub / portfolio" value={form.github} onChange={(v) => update("github", v)} placeholder="https://github.com/your-name" />
        </div></section>

        <section className="pf-panel"><div className="pf-panel-head"><div><span className="pf-eyebrow">02 / PROFESSIONAL EVIDENCE</span><h2>Skills and experience</h2><p>These fields help produce more useful job matching and recruiter views.</p></div><span className="pf-panel-count">02</span></div><div className="pf-grid"><Area label="Skills" value={form.skills} onChange={(v) => update("skills", v)} placeholder="Paste skills or separate them with commas. Example: PLC, MATLAB, Power Systems…" rows={4} hint={`${skills.length} skills currently listed`} /><Area label="Projects" value={form.projects} onChange={(v) => update("projects", v)} placeholder="Project title — what you built, tools used and outcome…" rows={5} /><Area label="Internship / work experience" value={form.experience} onChange={(v) => update("experience", v)} placeholder="Role, company, duration and verified responsibilities…" rows={5} /><Area label="Certifications" value={form.certifications} onChange={(v) => update("certifications", v)} placeholder="Certification name — issuing organisation — year…" rows={4} /><Area label="Career summary / objective" value={form.career_objective} onChange={(v) => update("career_objective", v)} placeholder="A short summary of your actual background and target role. Auto-fill from resume to draft this for you." rows={4} /></div></section>

        <section className="pf-panel pf-resume-source"><div className="pf-panel-head"><div><span className="pf-eyebrow">03 / SOURCE EVIDENCE</span><h2>Resume text</h2><p>Keep the source text available so you can verify what was extracted.</p></div><button type="button" className="pf-btn pf-btn-soft" onClick={() => setShowResumeText((v) => !v)}>{showResumeText ? "Hide extracted text" : "Review extracted text"}</button></div>{showResumeText && <Area label="Extracted resume text" value={form.resume_text} onChange={(v) => update("resume_text", v)} placeholder="Your PDF's extracted text appears here after import." rows={12} hint="This is evidence from the PDF, not a generated resume." />}</section>
        <div className="pf-bottom-save"><div><strong>Ready to save your changes?</strong><span>Your details remain editable after importing a resume.</span></div><button className="pf-btn pf-btn-primary" type="submit" disabled={saving}>{saving ? "Saving profile…" : "Save all profile details"}</button></div>
      </form>

      <section className="pf-panel pf-documents-panel"><div className="pf-panel-head"><div><span className="pf-eyebrow">04 / DOCUMENT VAULT</span><h2>Your documents</h2><p>Upload and manage the supporting files used across your CampusLink journey.</p></div><span className="pf-panel-count">04</span></div><StudentDocuments embedded /></section>
    </div>
  );
}

const PROFILE_CSS = `
.pf-page{--pf-ink:#101a31;--pf-muted:#65738c;--pf-line:#e0e7f1;--pf-blue:#315cf4;--pf-violet:#7856f6;min-height:100%;padding:28px clamp(16px,3vw,38px) 50px;background:radial-gradient(700px circle at 90% 0%,rgba(49,92,244,.07),transparent 54%),#f5f7fc;color:var(--pf-ink);font-family:Inter,ui-sans-serif,system-ui,sans-serif;box-sizing:border-box}.pf-page *{box-sizing:border-box}.pf-pagehead{max-width:1320px;margin:0 auto 22px;display:flex;align-items:flex-end;justify-content:space-between;gap:20px}.pf-pagehead h1{margin:7px 0;font-size:clamp(28px,3vw,38px);letter-spacing:-.05em;line-height:1.1}.pf-pagehead p{max-width:680px;color:var(--pf-muted);font-size:13px;line-height:1.65;margin:0}.pf-eyebrow{display:block;color:#536ce3;font-size:10px;font-weight:900;letter-spacing:.14em}.pf-head-actions{display:flex;gap:9px;flex-wrap:wrap}.pf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:11px;padding:11px 15px;font:inherit;font-size:12px;font-weight:850;cursor:pointer;text-decoration:none;transition:transform .18s,box-shadow .18s,border-color .18s}.pf-btn:hover{transform:translateY(-1px)}.pf-btn:disabled{opacity:.65;cursor:wait;transform:none}.pf-btn-primary{background:linear-gradient(110deg,#315cf4,#7153ee);color:#fff;box-shadow:0 9px 20px rgba(49,92,244,.18)}.pf-btn-soft{background:#fff;color:#24324a;border-color:#dfe6f1}.pf-btn-light{background:rgba(255,255,255,.11);border-color:rgba(255,255,255,.24);color:#fff}.pf-hero{max-width:1320px;margin:0 auto 18px;background:radial-gradient(500px circle at 85% 20%,rgba(99,102,241,.32),transparent 65%),linear-gradient(125deg,#0e1730,#172b53 65%,#17234a);color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:25px;display:grid;grid-template-columns:150px minmax(0,1fr) 165px;gap:24px;align-items:center;box-shadow:0 18px 42px rgba(15,23,42,.12)}.pf-avatar-col{display:flex;align-items:center;flex-direction:column;gap:8px}.pf-avatar{width:112px;height:112px;border-radius:25px;border:2px solid rgba(255,255,255,.24);background:linear-gradient(145deg,#4b68fd,#8856f3);display:grid;place-items:center;overflow:hidden;box-shadow:0 12px 24px rgba(0,0,0,.22)}.pf-avatar img{width:100%;height:100%;object-fit:cover}.pf-avatar span{font-size:32px;font-weight:900}.pf-avatar-col>small{color:#b9c8e5;font-size:9px;text-align:center}.pf-hidden{display:none!important}.pf-hero-copy h2{font-size:clamp(24px,3vw,34px);margin:11px 0 4px;letter-spacing:-.04em}.pf-hero-copy>p{color:#cbd6ed;font-size:12px;margin:0}.pf-tag{display:inline-flex;border:1px solid rgba(148,163,255,.35);background:rgba(99,102,241,.14);color:#cbd5ff;font-size:9px;font-weight:900;letter-spacing:.12em;border-radius:999px;padding:6px 9px}.pf-hero-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}.pf-hero-meta span{padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.09);color:#dce6fb;font-size:10px}.pf-hero-tip{margin-top:14px!important;max-width:720px;font-size:10px!important;color:#9fb3dc!important}.pf-completion{display:flex;align-items:center;flex-direction:column;gap:8px;text-align:center}.pf-completion-ring{width:112px;height:112px;display:grid;place-items:center;border-radius:50%;background:conic-gradient(#61e4ce var(--pf-progress),rgba(255,255,255,.15) 0)}.pf-completion-ring>div{width:88px;height:88px;border-radius:50%;background:#152548;display:flex;flex-direction:column;justify-content:center;align-items:center}.pf-completion-ring strong{font-size:23px}.pf-completion-ring small{font-size:9px;color:#aebee0}.pf-completion>span{font-size:10px;font-weight:850}.pf-completion>small{font-size:9px;line-height:1.5;color:#aebee0;max-width:150px}.pf-alert{max-width:1320px;margin:0 auto 14px;border-radius:12px;padding:12px 15px;display:flex;gap:10px;align-items:flex-start;font-size:12px;line-height:1.55}.pf-alert strong{white-space:nowrap}.pf-alert-error{border:1px solid #fecaca;background:#fff1f2;color:#a81f3d}.pf-alert-success{border:1px solid #a7f3d0;background:#ecfdf5;color:#066849}.pf-autofill-card{max-width:1320px;margin:0 auto 18px;padding:20px;display:grid;grid-template-columns:49px minmax(0,1fr) minmax(210px,280px);gap:17px;align-items:center;background:linear-gradient(115deg,#fff,#f8faff);border:1px solid #dfe7f3;border-radius:19px;box-shadow:0 9px 24px rgba(30,46,88,.035)}.pf-autofill-icon{width:47px;height:47px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(140deg,#315cf4,#8256f1);color:#fff;font-size:23px;box-shadow:0 8px 18px rgba(49,92,244,.2)}.pf-autofill-copy h2{font-size:19px;letter-spacing:-.035em;margin:5px 0}.pf-autofill-copy p{font-size:11px;line-height:1.6;color:var(--pf-muted);margin:0;max-width:760px}.pf-autofill-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.pf-autofill-tags span{background:#eef2ff;color:#4358ba;font-size:9px;font-weight:800;padding:5px 8px;border-radius:999px}.pf-autofill-actions{display:grid;gap:8px}.pf-autofill-actions>small{font-size:9px;color:var(--pf-muted);line-height:1.5}.pf-form-layout{max-width:1320px;margin:auto;display:grid;gap:16px}.pf-panel{background:#fff;border:1px solid var(--pf-line);border-radius:19px;padding:22px;box-shadow:0 8px 24px rgba(23,39,74,.035);min-width:0}.pf-panel-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;margin-bottom:20px}.pf-panel-head h2{font-size:20px;letter-spacing:-.035em;margin:5px 0}.pf-panel-head p{color:var(--pf-muted);font-size:11px;margin:0;line-height:1.55}.pf-panel-count{width:34px;height:34px;display:grid;place-items:center;border:1px solid #e2e8f4;border-radius:11px;color:#71809b;font-size:11px;font-weight:900;flex-shrink:0}.pf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.pf-field{display:grid;gap:7px;min-width:0;font-size:11px;color:#33425c;font-weight:850}.pf-field-full{grid-column:1/-1}.pf-field input,.pf-field textarea{width:100%;min-width:0;box-sizing:border-box;border:1px solid #d6dfed;border-radius:11px;background:#fbfcff;color:#14213b;padding:12px 13px;font:500 12px/1.5 Inter,ui-sans-serif,system-ui,sans-serif;outline:none;transition:border-color .17s,box-shadow .17s,background .17s}.pf-field input::placeholder,.pf-field textarea::placeholder{color:#75839a;opacity:1;font-weight:450}.pf-field input:focus,.pf-field textarea:focus{background:#fff;border-color:#5277fa;box-shadow:0 0 0 4px rgba(82,119,250,.12)}.pf-field textarea{resize:vertical;min-height:100px}.pf-field small{color:#7c899e;font-size:9px;font-weight:500}.pf-resume-source{max-width:1320px;margin:16px auto 0}.pf-resume-source .pf-field{margin-top:6px}.pf-bottom-save{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#eef3ff;border:1px solid #d9e3ff;border-radius:16px;padding:15px 18px}.pf-bottom-save>div{display:grid;gap:4px}.pf-bottom-save strong{font-size:12px}.pf-bottom-save span{font-size:10px;color:#64748b}.pf-documents-panel{max-width:1320px;margin:16px auto 0}.pf-loading{padding:50px;color:#53627a;font:600 14px Inter,system-ui,sans-serif;background:#f5f7fc;min-height:50vh}.pf-documents-panel .sd-page{min-height:0;padding:0;background:transparent}.pf-documents-panel .sd-heading{display:none}.pf-documents-panel .sd-card{box-shadow:none;padding:0;border:0}.pf-documents-panel .sd-shell{margin:0;max-width:none}@media(max-width:950px){.pf-hero{grid-template-columns:130px minmax(0,1fr);}.pf-completion{grid-column:1/-1;flex-direction:row;justify-content:flex-start;text-align:left}.pf-completion-ring{width:70px;height:70px}.pf-completion-ring>div{width:54px;height:54px}.pf-completion-ring strong{font-size:16px}.pf-completion>small{max-width:none}.pf-autofill-card{grid-template-columns:45px minmax(0,1fr)}.pf-autofill-actions{grid-column:1/-1;display:flex;align-items:center;flex-wrap:wrap}.pf-autofill-actions>small{max-width:340px}}@media(max-width:650px){.pf-page{padding:18px 12px 35px}.pf-pagehead{align-items:flex-start;flex-direction:column}.pf-head-actions{width:100%}.pf-hero{grid-template-columns:1fr;text-align:center;padding:21px}.pf-avatar-col{justify-self:center}.pf-hero-meta{justify-content:center}.pf-completion{justify-content:center;text-align:left}.pf-autofill-card{grid-template-columns:1fr;padding:17px}.pf-autofill-icon{width:42px;height:42px}.pf-autofill-actions{display:grid;grid-column:auto}.pf-grid{grid-template-columns:1fr}.pf-field-full{grid-column:auto}.pf-panel{padding:17px}.pf-bottom-save{align-items:stretch;flex-direction:column}.pf-bottom-save .pf-btn{width:100%}}
`;
