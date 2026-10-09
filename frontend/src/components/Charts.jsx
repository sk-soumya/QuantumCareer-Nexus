export function BarChart({ data, max = 100 }) {
  return (
    <div className="chart-bars">
      {data.map((item) => (
        <div key={item.label} className="chart-bar-row">
          <div className="chart-bar-label">{item.label}</div>
          <div className="chart-bar-track">
            <div
              className="chart-bar-fill"
              style={{ width: `${Math.min(100, (Number(item.value) / max) * 100)}%` }}
            />
          </div>
          <div className="chart-bar-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ value, label, sublabel }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const circumference = 2 * Math.PI * 43;
  const dash = (safe / 100) * circumference;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 110 110" className="donut-svg">
        <circle cx="55" cy="55" r="43" className="donut-bg" />
        <circle
          cx="55"
          cy="55"
          r="43"
          className="donut-value"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="donut-center">
        <strong>{safe.toFixed(0)}%</strong>
        <span>{label}</span>
        {sublabel && <small>{sublabel}</small>}
      </div>
    </div>
  );
}

export function LineChart({ data }) {
  if (!data.length) {
    return <div className="chart-empty">No trend data available.</div>;
  }

  const width = 620;
  const height = 220;
  const padX = 28;
  const padY = 24;
  const maxValue = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const minValue = Math.min(...data.map((d) => Number(d.value) || 0), 0);
  const range = Math.max(maxValue - minValue, 1);
  const step = data.length === 1 ? 0 : (width - padX * 2) / (data.length - 1);
  const points = data.map((d, index) => {
    const x = padX + index * step;
    const y = height - padY - ((Number(d.value) - minValue) / range) * (height - padY * 2);
    return { ...d, x, y };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1="28" x2="592" y1="45" y2="45" className="grid-line" />
        <line x1="28" x2="592" y1="105" y2="105" className="grid-line" />
        <line x1="28" x2="592" y1="165" y2="165" className="grid-line" />
        <path d={path} className="line-path" />
        {points.map((p) => (
          <circle key={`${p.label}-${p.x}`} cx={p.x} cy={p.y} r="4" className="line-point" />
        ))}
      </svg>
      <div className="line-labels">
        {data.map((p) => <span key={p.label}>{p.label}</span>)}
      </div>
    </div>
  );
}
