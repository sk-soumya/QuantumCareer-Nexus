import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
}

function decodeRole(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload))?.role || null;
  } catch {
    return null;
  }
}

const TOURS = {
  STUDENT: [
    { title: "Welcome to CampusLink", text: "This is your placement workspace. The Guide button can reopen this tour any time." },
    { title: "Complete your profile first", text: "Upload your resume, review AI extraction, add your photo and save the final profile." },
    { title: "Use the AI Command Center", text: "Resume Intelligence, Profile Extraction, Resume Studio and Job Match are all connected there." },
    { title: "Understand every job score", text: "AI Recommendations shows graphical match signals and lets you expand the reasoning instead of hiding it." },
    { title: "Follow the placement journey", text: "Explore a drive, apply, watch interviews and offers, and use notifications to stay current." },
  ],
  RECRUITER: [
    { title: "Welcome to the recruiter workspace", text: "Use the Guide button any time to reopen this walkthrough." },
    { title: "Start with Job Drives", text: "Your live drives feed applications, ranking and interview workflows." },
    { title: "Use AI Candidate Ranking", text: "Review transparent candidate signals before shortlisting instead of relying on a black-box score." },
    { title: "Move candidates forward", text: "Continue from shortlist to interviews and offers inside the same workspace." },
  ],
  PLACEMENT_OFFICER: [
    { title: "Welcome to Placement Intelligence", text: "CampusLink connects student, employer and placement operations in one command center." },
    { title: "Monitor the funnel", text: "Use analytics to see students, drives, applications, selection and offers at a glance." },
    { title: "Manage workflow", text: "Students, companies, drives, rounds, scheduling, offers and notifications are linked from the sidebar." },
  ],
  ADMIN: [
    { title: "Welcome to CampusLink", text: "Your admin workspace gives you platform-level visibility and control." },
    { title: "Use the AI Control Center", text: "See where AI-assisted workflows are exposed and open the relevant role workspace." },
    { title: "Use Guide anytime", text: "The Guide control in the top bar reopens this walkthrough without resetting your app." },
  ],
};

export default function CampusLinkTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const token = getToken();
  const role = token ? decodeRole(token) : null;
  const steps = useMemo(() => TOURS[role] || TOURS.STUDENT, [role]);

  useEffect(() => {
    if (!token || !role) return;
    if (location.pathname.includes("/onboarding")) return;
    const key = `campuslink_tour_seen_${role}_v3`;
    if (!localStorage.getItem(key)) {
      const timer = window.setTimeout(() => setOpen(true), 550);
      return () => window.clearTimeout(timer);
    }
  }, [location.pathname, role, token]);

  useEffect(() => {
    const handler = () => {
      if (!token || !role) return;
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("campuslink:open-tour", handler);
    return () => window.removeEventListener("campuslink:open-tour", handler);
  }, [role, token]);

  if (!open || !steps.length) return null;

  const finish = () => {
    if (role) localStorage.setItem(`campuslink_tour_seen_${role}_v3`, "1");
    setOpen(false);
    setStep(0);
  };

  const next = () => {
    if (step >= steps.length - 1) finish();
    else setStep((current) => current + 1);
  };

  return (
    <div className="cl-tour-backdrop">
      <div className="cl-tour-card" role="dialog" aria-modal="true" aria-label="CampusLink first-time tutorial">
        <button className="cl-tour-close" onClick={finish} aria-label="Close tutorial">×</button>
        <div className="cl-tour-art"><span>✦</span><i /><b /><em /></div>
        <div className="cl-tour-content">
          <span className="cl-tour-step">STEP {step + 1} / {steps.length}</span>
          <h2>{steps[step].title}</h2>
          <p>{steps[step].text}</p>
          <div className="cl-tour-progress">{steps.map((_, index) => <i key={index} className={index <= step ? "active" : ""} />)}</div>
          <div className="cl-tour-actions">
            <button className="cl-tour-skip" onClick={finish}>Skip tutorial</button>
            {step > 0 && <button className="cl-tour-secondary" onClick={() => setStep((current) => current - 1)}>← Back</button>}
            <button className="cl-tour-primary" onClick={next}>{step === steps.length - 1 ? "Finish & start" : "Next →"}</button>
          </div>
          {role === "STUDENT" && step === 1 && (
            <button className="cl-tour-link" onClick={() => { finish(); navigate("/student/onboarding"); }}>Open onboarding now</button>
          )}
        </div>
      </div>
    </div>
  );
}
