import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

function getToken() {
  return localStorage.getItem("campuslink_token") || "";
}

function resolveApiUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(
      `Unable to reach CampusLink backend at ${API_BASE_URL}${path}. Make sure the FastAPI server is running.`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      Array.isArray(data?.detail)
        ? data.detail.map((item) => item.msg).join(", ")
        : data?.detail || `Request failed (${response.status})`
    );
  }

  return data;
}

const DEFAULT_FORM = {
  cgpa: "",
  skills: "",
  resume_text: "",
  phone: "",
  degree: "",
  department: "",
  graduation_year: "",
  projects: "",
  experience: "",
  certifications: "",
  linkedin: "",
  github: "",
  preferred_roles: "",
  preferred_locations: "",
  career_objective: "",
};

function splitList(value) {
  return String(value || "")
    .split(/[;,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  full = false,
}) {
  return (
    <label className={`onboard-field ${full ? "full" : ""}`}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
  full = true,
}) {
  return (
    <label className={`onboard-field ${full ? "full" : ""}`}>
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [user, setUser] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadInitialProfile();
    return () => stopCamera();
  }, []);

  async function loadInitialProfile() {
    try {
      const [account, profile] = await Promise.all([
        api("/auth/me"),
        api("/student-profile/me").catch(() => null),
      ]);

      setUser(account);

      if (profile) {
        setForm((current) => ({
          ...current,
          cgpa:
            profile.cgpa != null
              ? String(profile.cgpa)
              : current.cgpa,
          skills: profile.skills || current.skills,
          resume_text:
            profile.resume_text || current.resume_text,
          phone: profile.phone || current.phone,
          degree: profile.degree || current.degree,
          department:
            profile.department || current.department,
          graduation_year:
            profile.graduation_year != null
              ? String(profile.graduation_year)
              : current.graduation_year,
          projects: profile.projects || current.projects,
          experience: profile.experience || current.experience,
          certifications:
            profile.certifications || current.certifications,
          linkedin: profile.linkedin || current.linkedin,
          github: profile.github || current.github,
          preferred_roles:
            profile.preferred_roles || current.preferred_roles,
          preferred_locations:
            profile.preferred_locations ||
            current.preferred_locations,
          career_objective:
            profile.career_objective || current.career_objective,
        }));

        if (profile.profile_photo_url) {
          const photoUrl = resolveApiUrl(profile.profile_photo_url);
          setExistingPhotoUrl(photoUrl);
          setPhotoPreview(photoUrl);
        }
      }
    } catch (err) {
      setError(err.message || "Unable to load your account.");
    }
  }

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  function chooseMode(nextMode) {
    setMode(nextMode);
    setStep(2);
    setMessage("");
    setError("");
  }

  async function analyzeResume(file) {
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Please select a PDF resume.");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setError("Resume must be smaller than 12 MB.");
      return;
    }

    setResumeFile(file);
    setResumeLoading(true);
    setError("");
    setMessage("Reading every page of your resume and mapping the details…");

    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      // This endpoint performs real PDF text extraction first, then uses
      // local Qwen structured extraction without requiring the browser to
      // understand PDF internals itself.
      const data = await api("/resume/extract-profile", {
        method: "POST",
        body: formData,
      });

      const toText = (value) =>
        Array.isArray(value)
          ? value.filter(Boolean).join(", ")
          : value == null
          ? ""
          : String(value);

      setForm((current) => ({
        ...current,
        cgpa:
          data?.cgpa != null ? String(data.cgpa) : current.cgpa,
        skills: toText(data?.skills) || current.skills,
        resume_text:
          data?.resume_text ||
          data?.extracted_text ||
          current.resume_text,
        phone: toText(data?.phone) || current.phone,
        degree: toText(data?.degree) || current.degree,
        department: toText(data?.department) || current.department,
        graduation_year:
          data?.graduation_year != null
            ? String(data.graduation_year)
            : current.graduation_year,
        projects: toText(data?.projects) || current.projects,
        experience: toText(data?.experience) || current.experience,
        certifications:
          toText(data?.certifications) || current.certifications,
        linkedin: toText(data?.linkedin) || current.linkedin,
        github: toText(data?.github) || current.github,
        preferred_roles:
          toText(data?.preferred_roles) || current.preferred_roles,
        preferred_locations:
          toText(data?.preferred_locations) || current.preferred_locations,
        career_objective:
          toText(data?.career_objective) || current.career_objective,
      }));

      const warningText = Array.isArray(data?.warnings) && data.warnings.length
        ? ` ${data.warnings[0]}`
        : "";

      setMessage(
        `${data?.message || "Resume extraction complete."}${warningText}`
      );
      setStep(3);
    } catch (err) {
      setError(
        err.message ||
          "Resume extraction failed. Start the CampusLink backend and try again."
      );
    } finally {
      setResumeLoading(false);
    }
  }

  async function openCamera() {
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera access is not supported in this browser."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play?.().catch(() => {});
        }
      });
    } catch (err) {
      setError(
        err.message ||
          "Camera permission was denied. You can upload a photo instead."
      );
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, width, height);

    const image = canvas.toDataURL("image/jpeg", 0.9);
    const base64 = image.split(",")[1] || "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    const capturedFile = new File([bytes], "profile-photo.jpg", {
      type: "image/jpeg",
    });

    setPhotoFile(capturedFile);
    setPhotoPreview(image);
    setExistingPhotoUrl("");
    setPhotoRemoved(false);
    stopCamera();
    setError("");
    setMessage("Profile photo captured. Review it before saving.");
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be smaller than 5 MB.");
      return;
    }

    setPhotoFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(String(reader.result || ""));
      setExistingPhotoUrl("");
      setPhotoRemoved(false);
      setError("");
      setMessage("Photo selected. Click Save student profile to upload it.");
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    stopCamera();
    setPhotoPreview("");
    setPhotoFile(null);
    setPhotoRemoved(true);
    setError("");
    setMessage("Photo removed from the onboarding preview.");
  }

  function validate() {
    const cgpa = form.cgpa.trim();

    if (
      cgpa &&
      (!Number.isFinite(Number(cgpa)) ||
        Number(cgpa) < 0 ||
        Number(cgpa) > 10)
    ) {
      setError("CGPA must be between 0 and 10.");
      return false;
    }

    const graduationYear = form.graduation_year.trim();

    if (
      graduationYear &&
      (!Number.isInteger(Number(graduationYear)) ||
        Number(graduationYear) < 2000 ||
        Number(graduationYear) > 2100)
    ) {
      setError("Graduation year must be between 2000 and 2100.");
      return false;
    }

    if (!form.skills.trim()) {
      setError(
        "Add at least one skill so CampusLink can match jobs for you."
      );
      return false;
    }

    if (!form.degree.trim() && !form.resume_text.trim()) {
      setError(
        "Add your degree or provide your resume details before saving."
      );
      return false;
    }

    return true;
  }

  async function uploadPhoto() {
    if (photoRemoved || !photoFile) return null;

    if (photoFile.size > 5 * 1024 * 1024) {
      throw new Error("Profile photo must be smaller than 5 MB.");
    }

    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    if (!allowed.has(photoFile.type)) {
      throw new Error("Please select a JPG, PNG or WEBP profile photo.");
    }

    const formData = new FormData();
    formData.append("file", photoFile, photoFile.name || "profile-photo.jpg");

    try {
      const photoResult = await api("/student-profile/photo", {
        method: "POST",
        body: formData,
      });

      return photoResult?.profile_photo_url || null;
    } catch (error) {
      throw new Error(
        error?.message ||
          "Profile photo upload failed. Check that the CampusLink backend is running."
      );
    }
  }

  async function saveProfile() {
    if (!validate()) return;

    try {
      setSaving(true);
      setError("");
      setMessage("Saving your complete student profile…");

      const cgpa =
        form.cgpa.trim() === ""
          ? null
          : Number(form.cgpa);

      const graduationYear =
        form.graduation_year.trim() === ""
          ? null
          : Number(form.graduation_year);

      const profileData = {
        cgpa,
        skills: form.skills || null,
        resume_text: form.resume_text || null,
        phone: form.phone || null,
        degree: form.degree || null,
        department: form.department || null,
        graduation_year: graduationYear,
        projects: form.projects || null,
        experience: form.experience || null,
        certifications: form.certifications || null,
        linkedin: form.linkedin || null,
        github: form.github || null,
        preferred_roles: form.preferred_roles || null,
        preferred_locations: form.preferred_locations || null,
        career_objective: form.career_objective || null,
        profile_photo_url:
          photoRemoved
            ? null
            : existingPhotoUrl
            ? existingPhotoUrl.replace(API_BASE_URL, "")
            : null,
      };

      const saved = await api("/student-profile/me", {
        method: "PUT",
        body: JSON.stringify(profileData),
      });

      let storedPhotoUrl = saved?.profile_photo_url || null;

      if (photoPreview && !photoRemoved) {
        setMessage("Profile saved. Uploading your profile photo…");
        storedPhotoUrl = await uploadPhoto();
      }

      if (storedPhotoUrl) {
        const absolutePhotoUrl = resolveApiUrl(storedPhotoUrl);
        setExistingPhotoUrl(absolutePhotoUrl);
        setPhotoPreview(absolutePhotoUrl);
        setPhotoRemoved(false);
        setPhotoFile(null);

        localStorage.setItem(
          "campuslink_profile_photo_url",
          storedPhotoUrl
        );
      } else if (photoRemoved) {
        setExistingPhotoUrl("");
        setPhotoPreview("");
        setPhotoFile(null);
        localStorage.removeItem("campuslink_profile_photo_url");
      }

      localStorage.setItem(
        "campuslink_onboarding_draft",
        JSON.stringify(form)
      );

      console.log(
        "CampusLink student profile saved:",
        saved
      );

      setMessage(
        storedPhotoUrl
          ? "Complete student profile and profile photo saved successfully."
          : "Complete student profile saved successfully."
      );

      setStep(5);
    } catch (err) {
      setError(
        err.message ||
          "Unable to save your student profile."
      );
    } finally {
      setSaving(false);
    }
  }

  const skillList = splitList(form.skills);

  return (
    <div className="onboarding-page">
      <style>{CSS}</style>

      <header className="onboarding-topbar">
        <div className="onboarding-brand">
          <div className="onboarding-logo">C</div>
          <div>
            <strong>CampusLink</strong>
            <small>Student onboarding</small>
          </div>
        </div>

        <div className="onboarding-account">
          <span>{user?.full_name || "Student"}</span>
          <button
            type="button"
            onClick={() => navigate("/student")}
          >
            Exit setup
          </button>
        </div>
      </header>

      <main className="onboarding-container">
        <div className="onboarding-heading">
          <span>SMART STUDENT ONBOARDING</span>
          <h1>
            Build a profile that recruiters can actually understand.
          </h1>
          <p>
            Fill it manually or let Resume AI extract the information first.
            You review every field before anything is saved.
          </p>
        </div>

        <div className="onboarding-steps">
          {[
            [1, "Choose path"],
            [2, mode === "resume" ? "AI extraction" : "Profile details"],
            [3, "Review"],
            [4, "Photo"],
            [5, "Complete"],
          ].map(([number, label]) => (
            <div
              className={step >= number ? "step done" : "step"}
              key={number}
            >
              <span>{number}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>

        {error && (
          <div className="onboard-message error">
            ! {error}
          </div>
        )}

        {message && (
          <div className="onboard-message success">
            ✓ {message}
          </div>
        )}

        {step === 1 && (
          <section className="choice-grid">
            <button
              type="button"
              className="choice-card"
              onClick={() => chooseMode("resume")}
            >
              <div className="choice-icon">PDF</div>
              <span>OPTION A</span>
              <h2>I have a resume</h2>
              <p>
                Upload your PDF and let Resume AI extract skills, CGPA and
                resume text automatically.
              </p>
              <strong>Upload & extract →</strong>
            </button>

            <button
              type="button"
              className="choice-card featured"
              onClick={() => chooseMode("manual")}
            >
              <div className="choice-icon">✎</div>
              <span>OPTION B</span>
              <h2>I don't have a resume</h2>
              <p>
                Enter your education, skills, projects and experience
                manually, then review everything before saving.
              </p>
              <strong>Build profile manually →</strong>
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="onboard-card">
            <div className="card-head">
              <div>
                <span>
                  {mode === "resume"
                    ? "RESUME AI"
                    : "MANUAL PROFILE"}
                </span>
                <h2>
                  {mode === "resume"
                    ? "Upload your resume"
                    : "Tell CampusLink about yourself"}
                </h2>
              </div>

              <button
                className="ghost"
                type="button"
                onClick={() => setStep(1)}
              >
                ← Change path
              </button>
            </div>

            {mode === "resume" ? (
              <div className="upload-panel">
                <label className="resume-drop">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) =>
                      setResumeFile(e.target.files?.[0] || null)
                    }
                  />
                  <div className="big-icon">↑</div>
                  <strong>
                    {resumeFile
                      ? resumeFile.name
                      : "Drop your PDF resume here"}
                  </strong>
                  <small>
                    PDF only · CampusLink will extract your profile fields
                  </small>
                </label>

                <div className="button-row">
                  <button
                    className="primary-btn"
                    type="button"
                    disabled={!resumeFile || resumeLoading}
                    onClick={() => analyzeResume(resumeFile)}
                  >
                    {resumeLoading
                      ? "Extracting with AI…"
                      : "Extract profile with AI →"}
                  </button>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setStep(3)}
                  >
                    Continue manually
                  </button>
                </div>
              </div>
            ) : (
              <div className="onboard-form-grid">
                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(value) => update("phone", value)}
                  placeholder="+91 98765 43210"
                />
                <Field
                  label="Degree"
                  value={form.degree}
                  onChange={(value) => update("degree", value)}
                  placeholder="B.Tech Computer Science"
                />
                <Field
                  label="Department"
                  value={form.department}
                  onChange={(value) => update("department", value)}
                  placeholder="Computer Science & Engineering"
                />
                <Field
                  label="Graduation year"
                  type="number"
                  value={form.graduation_year}
                  onChange={(value) => update("graduation_year", value)}
                  placeholder="2027"
                />
                <Field
                  label="CGPA"
                  type="number"
                  value={form.cgpa}
                  onChange={(value) => update("cgpa", value)}
                  placeholder="8.5"
                />
                <Field
                  label="Skills"
                  value={form.skills}
                  onChange={(value) => update("skills", value)}
                  placeholder="Python, React, SQL, FastAPI"
                  full
                />
                <TextField
                  label="Projects"
                  value={form.projects}
                  onChange={(value) => update("projects", value)}
                  placeholder="Project name, what you built, technologies and outcome…"
                />
                <TextField
                  label="Experience"
                  value={form.experience}
                  onChange={(value) => update("experience", value)}
                  placeholder="Internships, work experience, responsibilities…"
                />
                <TextField
                  label="Certifications"
                  value={form.certifications}
                  onChange={(value) => update("certifications", value)}
                  placeholder="AWS, NPTEL, Google certificates…"
                />
                <TextField
                  label="Career objective"
                  value={form.career_objective}
                  onChange={(value) => update("career_objective", value)}
                  placeholder="What roles are you targeting and what value do you want to create?"
                />
                <Field
                  label="LinkedIn"
                  value={form.linkedin}
                  onChange={(value) => update("linkedin", value)}
                  placeholder="https://linkedin.com/in/your-name"
                />
                <Field
                  label="GitHub"
                  value={form.github}
                  onChange={(value) => update("github", value)}
                  placeholder="https://github.com/your-name"
                />
                <Field
                  label="Preferred roles"
                  value={form.preferred_roles}
                  onChange={(value) => update("preferred_roles", value)}
                  placeholder="Software Engineer, Data Analyst"
                />
                <Field
                  label="Preferred locations"
                  value={form.preferred_locations}
                  onChange={(value) =>
                    update("preferred_locations", value)
                  }
                  placeholder="Bhubaneswar, Bengaluru, Remote"
                />

                <div className="form-actions full">
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={() => {
                      if (validate()) setStep(3);
                    }}
                  >
                    Review profile →
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="onboard-card">
            <div className="card-head">
              <div>
                <span>HUMAN REVIEW</span>
                <h2>Review and correct your extracted details</h2>
                <p>
                  AI is only a first pass. You remain in control of the final
                  profile.
                </p>
              </div>
            </div>

            <div className="review-grid">
              <div className="review-main">
                <div className="onboard-form-grid">
                  <Field
                    label="Phone"
                    value={form.phone}
                    onChange={(value) => update("phone", value)}
                    placeholder="Phone"
                  />
                  <Field
                    label="Degree"
                    value={form.degree}
                    onChange={(value) => update("degree", value)}
                    placeholder="Degree"
                  />
                  <Field
                    label="Department"
                    value={form.department}
                    onChange={(value) => update("department", value)}
                    placeholder="Department"
                  />
                  <Field
                    label="Graduation year"
                    value={form.graduation_year}
                    onChange={(value) => update("graduation_year", value)}
                    placeholder="2027"
                  />
                  <Field
                    label="CGPA"
                    value={form.cgpa}
                    onChange={(value) => update("cgpa", value)}
                    placeholder="8.5"
                  />
                  <Field
                    label="Skills"
                    value={form.skills}
                    onChange={(value) => update("skills", value)}
                    placeholder="Python, React, SQL"
                    full
                  />
                  <TextField
                    label="Projects"
                    value={form.projects}
                    onChange={(value) => update("projects", value)}
                    placeholder="Projects…"
                  />
                  <TextField
                    label="Experience"
                    value={form.experience}
                    onChange={(value) => update("experience", value)}
                    placeholder="Experience…"
                  />
                  <TextField
                    label="Certifications"
                    value={form.certifications}
                    onChange={(value) => update("certifications", value)}
                    placeholder="Certifications…"
                  />
                  <TextField
                    label="Career objective"
                    value={form.career_objective}
                    onChange={(value) => update("career_objective", value)}
                    placeholder="Career objective…"
                  />
                  <Field
                    label="LinkedIn"
                    value={form.linkedin}
                    onChange={(value) => update("linkedin", value)}
                    placeholder="LinkedIn URL"
                  />
                  <Field
                    label="GitHub"
                    value={form.github}
                    onChange={(value) => update("github", value)}
                    placeholder="GitHub URL"
                  />
                  <Field
                    label="Preferred roles"
                    value={form.preferred_roles}
                    onChange={(value) => update("preferred_roles", value)}
                    placeholder="Target roles"
                  />
                  <Field
                    label="Preferred locations"
                    value={form.preferred_locations}
                    onChange={(value) =>
                      update("preferred_locations", value)
                    }
                    placeholder="Locations"
                  />
                  <TextField
                    label="Extracted resume text"
                    value={form.resume_text}
                    onChange={(value) => update("resume_text", value)}
                    placeholder="Full extracted resume text…"
                    rows={9}
                  />
                </div>
              </div>

              <aside className="review-side">
                <div className="review-metric">
                  <span>SKILLS</span>
                  <strong>{skillList.length}</strong>
                  <small>Recognized / entered</small>
                </div>
                <div className="review-metric">
                  <span>CGPA</span>
                  <strong>{form.cgpa || "—"}</strong>
                  <small>Academic signal</small>
                </div>
                <div className="review-metric">
                  <span>RESUME TEXT</span>
                  <strong>
                    {form.resume_text.length.toLocaleString()}
                  </strong>
                  <small>Characters</small>
                </div>
                <div className="review-skill-list">
                  {skillList.length ? (
                    skillList
                      .slice(0, 12)
                      .map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))
                  ) : (
                    <small>No skills added yet.</small>
                  )}
                </div>
              </aside>
            </div>

            <div className="button-row review-actions">
              <button
                className="secondary-btn"
                type="button"
                onClick={() => {
                  if (validate()) setStep(4);
                }}
              >
                Continue to photo →
              </button>
              <button
                className="primary-btn"
                type="button"
                onClick={() => {
                  if (validate()) setStep(4);
                }}
              >
                Review looks correct →
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="onboard-card photo-card">
            <div className="card-head">
              <div>
                <span>PROFILE PHOTO</span>
                <h2>Add a professional profile photo</h2>
                <p>
                  The photo is uploaded to the CampusLink backend when you
                  save the profile.
                </p>
              </div>
            </div>

            <div className="photo-workspace">
              <div className="photo-preview">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Student profile preview"
                  />
                ) : (
                  <div>
                    <strong>
                      {user?.full_name
                        ?.slice(0, 1)
                        ?.toUpperCase() || "S"}
                    </strong>
                    <span>No photo yet</span>
                  </div>
                )}
              </div>

              <div className="photo-actions">
                <label className="secondary-btn photo-upload">
                  Upload photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhoto}
                  />
                </label>

                <button
                  className="secondary-btn"
                  type="button"
                  onClick={openCamera}
                >
                  Take photo with camera
                </button>

                {photoPreview && (
                  <button
                    className="ghost"
                    type="button"
                    onClick={removePhoto}
                  >
                    Remove photo
                  </button>
                )}

                <p>
                  JPG, PNG or WEBP · Maximum 5 MB.
                </p>
              </div>
            </div>

            {cameraOpen && (
              <div className="camera-box">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                />
                <div className="button-row">
                  <button
                    className="primary-btn"
                    type="button"
                    onClick={capturePhoto}
                  >
                    Capture photo
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={stopCamera}
                  >
                    Cancel camera
                  </button>
                </div>
              </div>
            )}

            <div className="button-row review-actions">
              <button
                className="secondary-btn"
                type="button"
                onClick={() => setStep(3)}
              >
                ← Back to review
              </button>
              <button
                className="primary-btn"
                type="button"
                onClick={saveProfile}
                disabled={saving}
              >
                {saving
                  ? "Saving profile…"
                  : "Save student profile →"}
              </button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="complete-panel">
            <div className="complete-icon">✓</div>
            <span>PROFILE READY</span>
            <h2>
              {user?.full_name || "Student"}, your CampusLink profile is
              ready.
            </h2>
            <p>
              Your reviewed profile details are saved in PostgreSQL and your
              profile photo is stored in the CampusLink backend.
            </p>
            <div className="complete-actions">
              <button
                className="primary-btn"
                type="button"
                onClick={() => navigate("/student")}
              >
                Go to Student Dashboard →
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => navigate("/student/resume-ai")}
              >
                Open Resume AI
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const CSS = `
.onboarding-page{min-height:100vh;background:radial-gradient(circle at 5% 0%,rgba(37,99,235,.09),transparent 32%),#f6f8fc;color:#0f172a}.onboarding-topbar{height:72px;background:rgba(255,255,255,.9);backdrop-filter:blur(16px);border-bottom:1px solid #e4eaf1;padding:0 30px;display:flex;align-items:center;justify-content:space-between}.onboarding-brand{display:flex;align-items:center;gap:10px}.onboarding-logo{width:36px;height:36px;border-radius:11px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;display:grid;place-items:center;font-weight:900}.onboarding-brand strong{display:block;font-size:15px}.onboarding-brand small{display:block;color:#94a3b8;font-size:9px;margin-top:2px}.onboarding-account{display:flex;gap:12px;align-items:center;font-size:11px;font-weight:800}.onboarding-account button{border:1px solid #dbe3ee;background:#fff;border-radius:9px;padding:8px 11px;cursor:pointer}.onboarding-container{max-width:1240px;margin:0 auto;padding:42px 26px 60px}.onboarding-heading{max-width:800px}.onboarding-heading>span,.card-head>div>span,.complete-panel>span{font-size:10px;letter-spacing:.14em;color:#2563eb;font-weight:900}.onboarding-heading h1{margin:8px 0 9px;font-size:36px;letter-spacing:-.045em;line-height:1.08}.onboarding-heading p{margin:0;color:#64748b;font-size:13px;line-height:1.65}.onboarding-steps{display:flex;align-items:center;gap:10px;margin:28px 0 18px;overflow:auto;padding-bottom:4px}.step{display:flex;align-items:center;gap:7px;white-space:nowrap;color:#94a3b8;font-size:10px;font-weight:800}.step span{width:27px;height:27px;border-radius:50%;background:#e2e8f0;color:#64748b;display:grid;place-items:center}.step.done{color:#0f172a}.step.done span{background:#2563eb;color:#fff}.onboard-message{padding:11px 13px;border-radius:10px;font-size:11px;margin-bottom:15px}.onboard-message.error{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}.onboard-message.success{background:#ecfdf5;border:1px solid #a7f3d0;color:#047857}.choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.choice-card{border:1px solid #e1e8f0;background:#fff;border-radius:18px;padding:24px;text-align:left;cursor:pointer;transition:.18s;box-shadow:0 10px 28px rgba(15,23,42,.04)}.choice-card:hover{transform:translateY(-3px);border-color:#93c5fd;box-shadow:0 18px 40px rgba(15,23,42,.08)}.choice-card.featured{background:linear-gradient(145deg,#eff6ff,#fff)}.choice-icon{width:46px;height:46px;border-radius:13px;background:#eef2ff;color:#4338ca;display:grid;place-items:center;font-weight:900}.choice-card>span{display:block;font-size:9px;color:#2563eb;letter-spacing:.13em;font-weight:900;margin-top:20px}.choice-card h2{font-size:21px;margin:6px 0}.choice-card p{font-size:12px;color:#64748b;line-height:1.65;min-height:62px}.choice-card strong{font-size:11px;color:#2563eb}.onboard-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:22px;box-shadow:0 10px 30px rgba(15,23,42,.05)}.card-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:18px}.card-head h2{font-size:20px;margin:5px 0}.card-head p{font-size:11px;color:#64748b;margin:5px 0;line-height:1.5}.ghost{border:0;background:transparent;color:#2563eb;font-weight:800;cursor:pointer;padding:8px}.upload-panel{display:grid;gap:16px}.resume-drop{min-height:240px;border:1.5px dashed #bfdbfe;border-radius:16px;background:linear-gradient(135deg,#f8fbff,#eff6ff);display:grid;place-items:center;text-align:center;padding:22px;cursor:pointer}.resume-drop input{display:none}.resume-drop .big-icon{width:58px;height:58px;border-radius:16px;background:#fff;border:1px solid #dbeafe;display:grid;place-items:center;color:#2563eb;font-size:24px;font-weight:900}.resume-drop strong{font-size:14px;margin-top:9px}.resume-drop small{font-size:10px;color:#64748b}.button-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.onboard-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.onboard-field{display:grid;gap:6px;font-size:10px;font-weight:800;color:#475569}.onboard-field.full{grid-column:1/-1}.onboard-field input,.onboard-field textarea{box-sizing:border-box;width:100%;border:1px solid #dbe3ee;border-radius:10px;background:#fbfdff;padding:11px 12px;font:inherit;color:#0f172a;outline:none}.onboard-field textarea{resize:vertical}.onboard-field input:focus,.onboard-field textarea:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}.form-actions.full{grid-column:1/-1;display:flex;justify-content:flex-end}.review-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:18px}.review-side{display:grid;gap:10px}.review-metric{padding:13px;border:1px solid #e8edf4;border-radius:11px;background:#f8fafc}.review-metric span{font-size:9px;letter-spacing:.11em;color:#64748b;font-weight:900}.review-metric strong{display:block;font-size:22px;margin-top:5px}.review-metric small{font-size:9px;color:#94a3b8}.review-skill-list{display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start}.review-skill-list span{padding:6px 8px;border-radius:7px;background:#ecfdf5;color:#047857;font-size:9px;font-weight:800}.photo-card{max-width:960px;margin:auto}.photo-workspace{display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:center}.photo-preview{width:220px;height:220px;border-radius:22px;background:#f1f5f9;border:1px solid #e2e8f0;display:grid;place-items:center;overflow:hidden}.photo-preview img{width:100%;height:100%;object-fit:cover}.photo-preview div{text-align:center;color:#94a3b8}.photo-preview strong{display:grid;place-items:center;width:72px;height:72px;border-radius:50%;background:#dbeafe;color:#2563eb;font-size:26px;margin:auto}.photo-preview span{display:block;font-size:10px;margin-top:8px}.photo-actions{display:grid;gap:10px}.photo-actions p{font-size:10px;color:#64748b;line-height:1.5}.photo-upload{display:inline-flex!important;width:max-content!important;cursor:pointer}.photo-upload input{display:none}.camera-box{margin-top:20px;padding:15px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:14px}.camera-box video{width:min(100%,500px);display:block;margin:0 auto;border-radius:12px;background:#0f172a}.complete-panel{background:linear-gradient(145deg,#0f172a,#172554);color:#fff;border-radius:20px;padding:45px;text-align:center;max-width:850px;margin:25px auto}.complete-icon{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:#10b981;margin:0 auto 18px;font-size:30px}.complete-panel>span{color:#93c5fd}.complete-panel h2{font-size:28px;letter-spacing:-.03em;margin:8px 0}.complete-panel p{max-width:650px;margin:0 auto;color:#cbd5e1;font-size:12px;line-height:1.7}.complete-actions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin-top:22px}.complete-actions .secondary-btn{background:#fff;color:#0f172a;border-color:#fff}@media(max-width:850px){.choice-grid,.review-grid,.photo-workspace{grid-template-columns:1fr}.onboard-form-grid{grid-template-columns:1fr}.onboard-field.full,.form-actions.full{grid-column:auto}.onboarding-heading h1{font-size:29px}.photo-preview{margin:auto}.complete-panel{padding:28px 18px}.onboarding-topbar{padding:0 16px}.onboarding-container{padding:28px 16px 50px}}@media(max-width:560px){.onboarding-account span{display:none}.card-head{display:block}.review-actions{justify-content:flex-start}}
`;
