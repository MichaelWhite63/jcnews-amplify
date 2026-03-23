/**
 * GeopoliticalRiskDashboard.jsx
 * Generated: Mar 23, 2026 — live data from geopolitical_get_prompt()
 *
 * SETUP (one-time):
 *   npm install recharts
 *
 * USAGE — drop into src/components/ then import anywhere:
 *   import GeopoliticalRiskDashboard from "./components/GeopoliticalRiskDashboard";
 *   <GeopoliticalRiskDashboard />
 */

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ScatterChart, Scatter, ZAxis,
} from "recharts";

// ─── Live data (Mar 23 2026) ──────────────────────────────────────────────────

const SUMMARY = {
  date: "Mar 23, 2026",
  totalBpdAtRisk: "22.8M",
  escalationBpd: "+21.0M",
  surplus: "+3.8M",
  wti: "$89.04",
  brent: "$100.93",
  wtiTrend: "falling",
  brentTrend: "rising",
  spread: "$11.89",
};

const PRIMARY_EVENTS = [
  {
    id: "hormuz",
    name: "Strait of Hormuz / Iran Tension",
    bpd: 17.0,
    totalBpd: 22.8,
    status: "high",
    trend: "worsening",
    type: "Maritime threat",
    impact: "+$30–50/bbl if closed",
    confidence: 0.70,
    color: "#E24B4A",
    badge: "danger",
    detail:
      "Iran's ability to threaten Strait of Hormuz shipping is HIGH and worsening. " +
      "17M bpd in daily transit exposure — the dominant tail risk. A full closure would spike " +
      "prices +$30–50/bbl, dwarfing all other active events. Confidence: 70%.",
  },
  {
    id: "redsea",
    name: "Red Sea / Houthi Attacks",
    bpd: 4.5,
    totalBpd: 22.8,
    status: "high",
    trend: "stable",
    type: "Maritime threat",
    impact: "+$2–5/bbl risk premium",
    confidence: 0.68,
    color: "#EF9F27",
    badge: "warning",
    detail:
      "Houthi attacks on commercial shipping in Bab el-Mandeb and Suez Canal. " +
      "4.5M bpd in transit exposure. Trend is stable — persistently elevated. " +
      "Disruption forces Cape of Good Hope rerouting, adding cost rather than direct supply loss. " +
      "Confidence: 68%.",
  },
  {
    id: "usiran",
    name: "US–Iran Relations",
    bpd: 1.3,
    totalBpd: 22.8,
    status: "sanctions enf.",
    trend: "stable",
    type: "Sanctions / exports",
    impact: "+$2–5/bbl baseline",
    confidence: 0.68,
    color: "#378ADD",
    badge: "info",
    detail:
      "US–Iran tensions stable at sanctions enforcement level. Iran oil exports direction is BULLISH. " +
      "Escalation level 3 carries a latent +21M bpd additional exposure risk if tensions escalate " +
      "to direct Hormuz confrontation. Confidence: 68%.",
  },
];

const SECONDARY_EVENTS = [
  {
    name: "Ukraine–Russia War",
    status: "Ongoing",
    trend: "stable",
    badge: "warning",
    detail:
      "Status: ongoing · trend stable. Russia gasoline exports plummeted to 5–6M bbl in March " +
      "from ~12M bbl prior month. 4M bpd export base · ±500k bpd swing · +$3–8/bbl risk premium. Confidence: 50%.",
  },
  {
    name: "Libya Instability",
    status: "Disrupted",
    trend: "worsening",
    badge: "danger",
    detail:
      "Status downgraded to disrupted; trend worsening. Political division between rival governments. " +
      "±500k bpd risk · ±$1–3/bbl. Confidence: 70%.",
  },
  {
    name: "Venezuela Sanctions",
    status: "Partial",
    trend: "stable",
    badge: "neutral",
    detail:
      "~1M bpd under Chevron license · ±300k bpd swing · ±$1–2/bbl. Low impact, stable. Confidence: 58%.",
  },
];

const BAR_DATA = [
  { name: "Hormuz",  bpd: 17.0, fill: "#E24B4A" },
  { name: "Red Sea", bpd: 4.5,  fill: "#EF9F27" },
  { name: "US–Iran", bpd: 1.3,  fill: "#378ADD" },
];

const SCATTER_DATA = [
  { x: 20, y: 40,  z: 400, label: "Hormuz closure",     fill: "#E24B4A" },
  { x: 60, y: 3.5, z: 200, label: "Red Sea disruption", fill: "#EF9F27" },
  { x: 35, y: 7,   z: 160, label: "US–Iran escalation", fill: "#378ADD" },
  { x: 50, y: 4,   z: 140, label: "Libya / Russia",     fill: "#888780" },
];

// ─── Design tokens ────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#f5f5f3",
  surface: "#ffffff",
  border: "rgba(0,0,0,0.10)",
  text: "#1a1a18",
  muted: "#73726c",
  faint: "#aaaaaa",
  track: "#f0efea",
};

const BADGE = {
  danger:  { background: "#FCEBEB", color: "#791F1F" },
  warning: { background: "#FAEEDA", color: "#633806" },
  info:    { background: "#E6F1FB", color: "#0C447C" },
  success: { background: "#EAF3DE", color: "#27500A" },
  neutral: { background: "#F1EFE8", color: "#444441" },
};

function getTrend(t = "") {
  const v = t.toLowerCase();
  if (["worsening", "escalating"].includes(v)) return { icon: "▲", color: "#A32D2D", bg: "#FCEBEB" };
  if (["improving", "easing", "de-escalating"].includes(v)) return { icon: "▼", color: "#27500A", bg: "#EAF3DE" };
  return { icon: "●", color: "#73726c", bg: "#F1EFE8" };
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

const s = {
  badge: (variant = "neutral") => ({
    ...(BADGE[variant] || BADGE.neutral),
    display: "inline-block",
    fontSize: 11,
    fontWeight: 500,
    padding: "2px 8px",
    borderRadius: 4,
    whiteSpace: "nowrap",
  }),
  trendTag: (trend) => {
    const t = getTrend(trend);
    return {
      display: "inline-block",
      fontSize: 11,
      fontWeight: 500,
      padding: "1px 6px",
      borderRadius: 3,
      color: t.color,
      background: t.bg,
      whiteSpace: "nowrap",
    };
  },
  card: (extra = {}) => ({
    background: COLORS.surface,
    border: `0.5px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "1rem 1.25rem",
    marginBottom: "1rem",
    ...extra,
  }),
  sectionLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: COLORS.faint,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: 10,
    margin: "0 0 10px 0",
  },
};

function Badge({ variant, children }) {
  return <span style={s.badge(variant)}>{children}</span>;
}

function TrendTag({ trend }) {
  const t = getTrend(trend);
  return <span style={s.trendTag(trend)}>{t.icon} {trend}</span>;
}

function SectionLabel({ children }) {
  return <p style={s.sectionLabel}>{children}</p>;
}

function Card({ children, style }) {
  return <div style={s.card(style)}>{children}</div>;
}

function MetricCard({ label, value, valueColor, sub }) {
  return (
    <div style={{ background: COLORS.bg, borderRadius: 8, padding: 12 }}>
      <p style={{ fontSize: 12, color: COLORS.muted, margin: "0 0 3px 0" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 500, color: valueColor, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 12, color: COLORS.muted, margin: "2px 0 0 0" }}>{sub}</p>
    </div>
  );
}

// ─── Event rows ───────────────────────────────────────────────────────────────

function EventRow({ event }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((event.bpd / event.totalBpd) * 100);

  return (
    <div
      onClick={() => setOpen((o) => !o)}
      style={{
        padding: "12px 0",
        borderBottom: `0.5px solid ${COLORS.border}`,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: event.color, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{event.name}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: event.color }}>{event.bpd}M bpd</span>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
        <Badge variant={event.badge}>{event.status}</Badge>
        <TrendTag trend={event.trend} />
        <span style={{ fontSize: 12, color: COLORS.muted }}>{event.impact}</span>
        <span style={{ fontSize: 11, color: COLORS.faint, marginLeft: "auto" }}>
          conf. {Math.round(event.confidence * 100)}%
        </span>
      </div>

      <div style={{ height: 5, background: COLORS.track, borderRadius: 3, marginTop: 7, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: event.color, borderRadius: 3 }} />
      </div>

      {open && (
        <p style={{
          margin: "8px 0 0 0",
          fontSize: 13,
          color: COLORS.muted,
          lineHeight: 1.6,
          paddingLeft: 14,
          borderLeft: `2px solid ${event.color}`,
        }}>
          {event.detail}
        </p>
      )}
    </div>
  );
}

function SecondaryCard({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen((o) => !o)}
      style={{ background: COLORS.bg, borderRadius: 8, padding: 10, cursor: "pointer", userSelect: "none" }}
    >
      <p style={{ fontSize: 13, fontWeight: 500, color: COLORS.text, margin: "0 0 5px 0" }}>{item.name}</p>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <Badge variant={item.badge}>{item.status}</Badge>
        <TrendTag trend={item.trend} />
      </div>
      {open && (
        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: COLORS.muted, lineHeight: 1.6 }}>{item.detail}</p>
      )}
    </div>
  );
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

function ScatterDot({ cx, cy, payload }) {
  const r = Math.sqrt(payload.z) * 0.55;
  return (
    <circle cx={cx} cy={cy} r={r} fill={payload.fill} fillOpacity={0.75} stroke={payload.fill} strokeWidth={1} />
  );
}

function ScatterTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: COLORS.surface,
      border: `0.5px solid ${COLORS.border}`,
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 12,
      color: COLORS.text,
    }}>
      <p style={{ fontWeight: 500, margin: 0 }}>{d.label}</p>
      <p style={{ color: COLORS.muted, margin: "2px 0 0 0" }}>Prob: ~{d.x}% · Impact: +${d.y}/bbl</p>
    </div>
  );
}

function BarTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: COLORS.surface,
      border: `0.5px solid ${COLORS.border}`,
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 12,
      color: COLORS.text,
    }}>
      <p style={{ fontWeight: 500, margin: 0 }}>{label}</p>
      <p style={{ color: COLORS.muted, margin: "2px 0 0 0" }}>{payload[0].value}M bpd at risk</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GeopoliticalRiskDashboard() {
  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: COLORS.bg,
      minHeight: "100vh",
      padding: "24px 16px",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: 8,
        }}>
          <div>
            <p style={{ fontSize: 13, color: COLORS.muted, margin: "0 0 3px 0" }}>
              Geopolitical risk briefing · {SUMMARY.date}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: COLORS.text, margin: 0 }}>
              Global oil supply risk dashboard
            </h2>
          </div>
          <Badge variant="danger">Hormuz — worsening</Badge>
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, marginBottom: "1rem" }}>
          <MetricCard label="Supply at risk"     value={SUMMARY.totalBpdAtRisk}  valueColor="#A32D2D" sub="bpd · 3 active events" />
          <MetricCard label="Escalation (add'l)" value={SUMMARY.escalationBpd}   valueColor="#854F0B" sub="bpd worst case" />
          <MetricCard label="Market surplus"     value={SUMMARY.surplus}          valueColor="#3B6D11" sub="bpd buffer" />
        </div>

        {/* Price card */}
        <Card style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <SectionLabel>WTI</SectionLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 500, color: COLORS.text }}>{SUMMARY.wti}</span>
              <Badge variant={SUMMARY.wtiTrend === "rising" ? "warning" : "neutral"}>
                {SUMMARY.wtiTrend}
              </Badge>
            </div>
          </div>
          <div style={{ width: "0.5px", height: 32, background: COLORS.border }} />
          <div>
            <SectionLabel>Brent</SectionLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 500, color: COLORS.text }}>{SUMMARY.brent}</span>
              <Badge variant={SUMMARY.brentTrend === "rising" ? "warning" : "neutral"}>
                {SUMMARY.brentTrend}
              </Badge>
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: COLORS.muted, textAlign: "right" }}>
            Spread: {SUMMARY.spread}/bbl<br />WTI falling · Brent rising (2-wk)
          </div>
        </Card>

        {/* Primary events */}
        <Card>
          <SectionLabel>Primary risk events · bpd exposure — click any row to expand</SectionLabel>
          {PRIMARY_EVENTS.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </Card>

        {/* Bar chart */}
        <Card>
          <SectionLabel>Supply exposure breakdown</SectionLabel>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={BAR_DATA} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: COLORS.muted }}
                tickFormatter={(v) => `${v}M`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: COLORS.muted }}
                width={64}
              />
              <Tooltip content={<BarTooltipContent />} />
              <Bar dataKey="bpd" radius={[0, 4, 4, 0]}>
                {BAR_DATA.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Secondary events */}
        <Card>
          <SectionLabel>Background events · click to expand</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 10 }}>
            {SECONDARY_EVENTS.map((s) => (
              <SecondaryCard key={s.name} item={s} />
            ))}
          </div>
        </Card>

        {/* Scatter / risk matrix */}
        <Card style={{ marginBottom: 0 }}>
          <SectionLabel>Risk matrix · probability vs. price impact (bubble = scale)</SectionLabel>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 28, left: 10 }}>
              <XAxis
                type="number"
                dataKey="x"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: COLORS.muted }}
                label={{ value: "Probability (%)", position: "insideBottom", offset: -16, fontSize: 11, fill: COLORS.muted }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 55]}
                tick={{ fontSize: 11, fill: COLORS.muted }}
                label={{ value: "+$/bbl", angle: -90, position: "insideLeft", fontSize: 11, fill: COLORS.muted }}
              />
              <ZAxis type="number" dataKey="z" range={[60, 600]} />
              <Tooltip content={<ScatterTooltipContent />} />
              <Scatter data={SCATTER_DATA} shape={<ScatterDot />} />
            </ScatterChart>
          </ResponsiveContainer>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 6, fontSize: 12, color: COLORS.muted }}>
            {SCATTER_DATA.map((d) => (
              <span key={d.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.fill, display: "inline-block", flexShrink: 0 }} />
                {d.label}
              </span>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
