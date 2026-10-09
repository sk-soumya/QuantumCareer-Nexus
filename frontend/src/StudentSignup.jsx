import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

export default function StudentSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function register() {
    setError("");
    setMessage("");

    if (form.full_name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          full_name: form.full_name.trim(),
          role: "STUDENT",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.detail)
            ? data.detail.map((item) => item.msg).join(", ")
            : data?.detail || "Student registration failed."
        );
      }

      setMessage("Student account created successfully. Redirecting to login...");
      setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (err) {
      setError(err.message || "Student registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <div className="login-card" style={{ maxWidth: 520 }}>
        <div className="login-brand">
          <div className="login-brand-mark">C</div>
          <div>
            <span>CAMPUSLINK</span>
            <small>Student onboarding</small>
          </div>
        </div>

        <div className="login-heading">
          <span className="section-kicker">STUDENT SIGN UP</span>
          <h1>Create your placement profile</h1>
          <p>
            Start with your account. You can complete CGPA, skills and resume
            information after signing in.
          </p>
        </div>

        <div className="login-form">
          <div className="form-field">
            <label>Full name</label>
            <input
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              placeholder="Soumyakanta Behera"
              autoComplete="name"
            />
          </div>

          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="form-field">
            <label>Confirm password</label>
            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) => setField("confirm_password", e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") register();
              }}
            />
          </div>

          <div className="verification-card" style={{ marginTop: 2 }}>
            <span className="verification-icon">✓</span>
            <div>
              <strong>Student role is assigned automatically</strong>
              <p>You cannot register a recruiter or administrator account from this page.</p>
            </div>
          </div>

          <button
            type="button"
            className="primary-btn login-btn"
            onClick={register}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Student Account →"}
          </button>
        </div>

        {error && <div className="status-message error"><span>!</span>{error}</div>}
        {message && <div className="status-message success"><span>✓</span>{message}</div>}

        <div className="login-footer">
          <span>Student access</span>
          <Link to="/login" style={{ color: "#2563eb", textDecoration: "none" }}>
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
