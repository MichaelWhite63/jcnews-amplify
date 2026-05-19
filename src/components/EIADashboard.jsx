import { useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts";

const colors = {
  bg: "#ffffff",
  card: "#f5f7f5",
  border: "#e0e4e0",
  borderLight: "#eeeeee",
  text: "#1a1a1a",
  textDim: "#555555",
  textMuted: "#888888",
  green: "#16a34a",
  red: "#dc2626",
  amber: "#d97706",
  amberDim: "#fef3c7",
  blue: "#2563eb",
  neutral: "#64748b",
};

const styles = {
  page: {
    background: colors.bg,
    color: colors.text,
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 14,
    lineHeight: 1.5,
    minHeight: "100vh",
    padding: "2rem",
  },
  pageHeader: {
    borderBottom: `1px solid ${colors.border}`,
    paddingBottom: "1.5rem",
    marginBottom: "2rem",
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: "0.5rem",
  },
  h1: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 22,
    fontWeight: 600,
    color: colors.text,
    letterSpacing: "-0.02em",
    margin: 0,
  },
  meta: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: "0.4rem",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: "1.5rem",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: "1.5rem",
  },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    marginBottom: "1.5rem",
  },
  statCard: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "1rem",
  },
  statLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "0.5rem",
  },
  statValue: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 26,
    fontWeight: 600,
    lineHeight: 1,
    marginBottom: "0.4rem",
  },
  statSub: {
    fontSize: 11,
    color: colors.textDim,
  },
  card: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "1.25rem",
  },
  cardTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "1rem",
    paddingBottom: "0.6rem",
    borderBottom: `1px solid ${colors.borderLight}`,
  },
  legend: {
    display: "flex",
    gap: 16,
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: colors.textDim,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
    flexShrink: 0,
  },
  paddRow: {
    marginBottom: 10,
  },
  paddLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  paddName: {
    fontSize: 12,
    color: colors.textDim,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  paddPct: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    fontWeight: 500,
  },
  barTrack: {
    height: 5,
    background: colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 5,
    borderRadius: 3,
    transition: "width 0.6s ease",
  },
  marketRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 0",
    borderBottom: `1px solid ${colors.borderLight}`,
    fontSize: 12,
  },
  marketKey: { color: colors.textDim, display: "flex", alignItems: "center", gap: 6 },
  marketVal: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 500,
  },
  signalCard: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "1rem 1.25rem",
  },
  signalType: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 5,
  },
  signalName: {
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 5,
  },
  signalDesc: {
    fontSize: 11,
    color: colors.textDim,
    lineHeight: 1.5,
  },
  verdictBar: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderLeft: `4px solid ${colors.neutral}`,
    borderRadius: "0 6px 6px 0",
    padding: "1rem 1.25rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "2rem",
    flexWrap: "wrap",
  },
  verdictLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 4,
  },
  verdictValue: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 18,
    fontWeight: 600,
    color: colors.neutral,
  },
  verdictText: {
    fontSize: 12,
    color: colors.textDim,
    lineHeight: 1.6,
    maxWidth: 600,
  },
  warningBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: colors.amberDim,
    color: colors.amber,
    border: "1px solid #5a420a",
    borderRadius: 4,
    padding: "2px 8px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    fontWeight: 500,
  },
};

const chartData = [
  { label: "Crude", actual: -4.3, fiveYr: -2.6, fourWk: -1.9, actualColor: "#4ade80" },
  { label: "Gasoline", actual: -4.1, fiveYr: -0.7, fourWk: -4.9, actualColor: "#4ade80" },
  { label: "Distillates", actual: 0.2, fiveYr: 0.5, fourWk: -3.1, actualColor: "#f87171" },
];

const paddData = [
  { name: "PADD 1 — East Coast", pct: 89.2, color: colors.blue, badge: null },
  { name: "PADD 2 — Midwest", pct: 86.0, color: colors.amber, badge: null },
  { name: "PADD 3 — Gulf Coast", pct: 95.9, color: colors.red, badge: "⚠ CRITICAL" },
  { name: "PADD 4 — Rocky Mtn", pct: 67.2, color: colors.neutral, badge: null },
  { name: "PADD 5 — West Coast", pct: 79.9, color: colors.neutral, badge: null },
];

const marketRows = [
  { key: "WTI (2-wk trend)", val: "$102.15  ▼ 3.1%", color: colors.red, badge: null },
  { key: "Brent (2-wk trend)", val: "$107.44  ▼ 3.2%", color: colors.red, badge: null },
  { key: "3-2-1 crack spread", val: "$54.02 / bbl", color: colors.green, badge: null },
  { key: "Crude exports", val: "4.8M bpd", color: colors.text, badge: null },
  { key: "Global surplus", val: "3.8M bpd", color: colors.red, badge: null },
  { key: "OECD vs 5-yr avg", val: "−51.4 MMbbl", color: colors.green, badge: null },
  { key: "EIA adj. factor", val: "−1,399 k bpd", color: colors.amber, badge: "NOISY" },
  { key: "Philly Fed", val: "26.7  expanding", color: colors.green, badge: null },
  { key: "DXY", val: "98.55", color: colors.text, badge: null },
];

const signals = [
  {
    type: "Crude oil",
    name: "Draw beats both benchmarks",
    nameColor: colors.green,
    desc: "−4.3M bbl outperforms −2.6M 5-yr and −1.9M 4-wk averages. Credibility reduced by −1,399 k bpd adj. factor — reported draw may be statistically overstated.",
  },
  {
    type: "Gasoline",
    name: "Strong demand",
    nameColor: colors.green,
    desc: "Production up + draw of 4.1M bbl, beating the 5-yr avg (−0.7M) by a wide margin. Lags the 4-wk pace (−4.9M), suggesting some deceleration in trend velocity.",
  },
  {
    type: "Distillates",
    name: "Demand destruction",
    nameColor: colors.red,
    desc: "Production decreased + build of +0.2M. Sharply misses 4-wk avg (−3.1M). Distillate demand is a leading industrial indicator — this signals weakening freight/manufacturing activity.",
  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 4, padding: "8px 12px" }}>
      <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: colors.textDim, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: p.color || colors.text, margin: "2px 0" }}>
          {p.name}: {p.value > 0 ? "+" : ""}{p.value.toFixed(1)}M bbl
        </p>
      ))}
    </div>
  );
};

export default function EIADashboard() {
  return (
    <div style={styles.page}>
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={styles.pageHeader}>
        <div style={styles.eyebrow}>EIA Weekly Petroleum Status Report</div>
        <h1 style={styles.h1}>U.S. Inventory Dashboard</h1>
        <div style={styles.meta}>
          Week ending May 1, 2026 &nbsp;·&nbsp; Report date: May 7, 2026 &nbsp;·&nbsp; Sentiment:{" "}
          <span style={{ color: colors.neutral, fontWeight: 500 }}>NEUTRAL</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={styles.grid4}>
        {[
          { label: "Crude change", value: "−4.3M", color: colors.green, sub: "bbl · beat −2.6M 5-yr avg" },
          { label: "Gasoline change", value: "−4.1M", color: colors.green, sub: "bbl · beat −0.7M 5-yr avg" },
          { label: "Distillate change", value: "+0.2M", color: colors.red, sub: "bbl · demand destruction signal" },
          { label: "Cushing stocks", value: "−0.6M", color: colors.green, sub: "29.1M bbl total · WTI support" },
        ].map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statLabel}>{s.label}</div>
            <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
            <div style={styles.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ ...styles.card, marginBottom: "1.5rem" }}>
        <div style={styles.cardTitle}>Inventory change vs benchmarks (M bbl)</div>
        <div style={styles.legend}>
          {[
            { color: "#4ade80", label: "Actual" },
            { color: "#94a3b8", label: "5-yr seasonal avg" },
            { color: "#fbbf24", label: "4-wk trend avg" },
          ].map((l) => (
            <span key={l.label} style={styles.legendItem}>
              <span style={{ ...styles.legendSwatch, background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke={colors.border} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: colors.textDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}
                axisLine={{ stroke: colors.border }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: colors.textDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v > 0 ? "+" : "") + v.toFixed(1) + "M"}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke={colors.border} />
              <Bar dataKey="actual" name="Actual" radius={[3, 3, 0, 0]}
                fill="#4ade80"
                /* per-bar color handled below via Cell workaround */
              />
              <Bar dataKey="fiveYr" name="5-yr avg" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="fourWk" name="4-wk avg" fill="#fbbf24" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PADD + Market Context */}
      <div style={styles.grid2}>
        {/* PADD */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>PADD refinery utilization</div>
          {paddData.map((p, i) => (
            <div key={p.name} style={{ ...styles.paddRow, marginBottom: i === paddData.length - 1 ? 0 : 10 }}>
              <div style={styles.paddLabelRow}>
                <span style={styles.paddName}>
                  {p.name}
                  {p.badge && (
                    <span style={styles.warningBadge}>{p.badge}</span>
                  )}
                </span>
                <span style={{ ...styles.paddPct, color: p.color }}>{p.pct}%</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width: `${p.pct}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Market Context */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Market context</div>
          {marketRows.map((r, i) => (
            <div key={r.key} style={{ ...styles.marketRow, borderBottom: i === marketRows.length - 1 ? "none" : `1px solid ${colors.borderLight}` }}>
              <span style={styles.marketKey}>
                {r.key}
                {r.badge && <span style={styles.warningBadge}>{r.badge}</span>}
              </span>
              <span style={{ ...styles.marketVal, color: r.color }}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signal Cards */}
      <div style={styles.grid3}>
        {signals.map((s) => (
          <div key={s.type} style={styles.signalCard}>
            <div style={styles.signalType}>{s.type}</div>
            <div style={{ ...styles.signalName, color: s.nameColor }}>{s.name}</div>
            <div style={styles.signalDesc}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Verdict */}
      <div style={styles.verdictBar}>
        <div>
          <div style={styles.verdictLabel}>Overall verdict</div>
          <div style={styles.verdictValue}>NEUTRAL</div>
        </div>
        <div style={styles.verdictText}>
          Crude draw beats benchmarks but confidence is impaired by a −1,399 k bpd EIA adjustment factor — the actual
          draw may be overstated. Gasoline signals genuine demand strength; distillate demand destruction offsets this
          with a bearish industrial read. PADD 3 running at 95.9% is export-focused, not a domestic demand story. The
          3.8M bpd global surplus caps the upside regardless of weekly draws. Sentiment remains neutral.
        </div>
      </div>
    </div>
  );
}
