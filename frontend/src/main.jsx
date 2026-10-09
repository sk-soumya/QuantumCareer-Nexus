import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

function ErrorScreen({ error }) {
  const message =
    error instanceof Error
      ? error.stack || error.message
      : String(error);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #172554 0%, #020617 55%, #000 100%)",
        color: "#e2e8f0",
        display: "grid",
        placeItems: "center",
        padding: "30px",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "min(900px, 100%)",
          background: "rgba(15, 23, 42, 0.94)",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          borderRadius: "22px",
          padding: "28px",
          boxShadow: "0 30px 90px rgba(0,0,0,.45)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "7px 11px",
            borderRadius: "999px",
            background: "rgba(239,68,68,.12)",
            border: "1px solid rgba(239,68,68,.3)",
            color: "#fca5a5",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: ".08em",
          }}
        >
          CAMPUSLINK ERROR
        </div>

        <h1
          style={{
            margin: "16px 0 8px",
            fontSize: "28px",
            color: "#fff",
          }}
        >
          The page could not be loaded
        </h1>

        <p
          style={{
            margin: "0 0 18px",
            color: "#94a3b8",
            lineHeight: 1.6,
          }}
        >
          The application is running, but your App.jsx has a JavaScript
          loading/rendering error. The exact error is shown below.
        </p>

        <pre
          style={{
            margin: 0,
            padding: "18px",
            borderRadius: "14px",
            background: "#020617",
            border: "1px solid #1e293b",
            color: "#fda4af",
            whiteSpace: "pre-wrap",
            overflowX: "auto",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          {message}
        </pre>

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: "18px",
            border: 0,
            borderRadius: "12px",
            padding: "12px 18px",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Reload CampusLink
        </button>
      </div>
    </div>
  );
}

async function startApp() {
  if (!rootElement) {
    throw new Error(
      'CampusLink root element not found. Check index.html for <div id="root"></div>.'
    );
  }

  const root = ReactDOM.createRoot(rootElement);

  try {
    const module = await import("./App.jsx");

    const App = module.default;

    if (!App) {
      throw new Error(
        "App.jsx loaded, but it does not have a default export."
      );
    }

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("CampusLink App.jsx failed to load:", error);

    root.render(
      <React.StrictMode>
        <ErrorScreen error={error} />
      </React.StrictMode>
    );
  }
}

startApp().catch((error) => {
  console.error("CampusLink startup failed:", error);

  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <ErrorScreen error={error} />
      </React.StrictMode>
    );
  }
});