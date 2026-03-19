import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

/* ═══════════════════════════════════════════════════════════════
   STOKESHIRE KPI & ANALYTICS DASHBOARD
   Live GA4 + Search Console + Orders
   Design: Cormorant Garamond + Jost | Copper + Cream + Ink
   ═══════════════════════════════════════════════════════════════ */

const C = {
  copper: "#AD7A28", copperLight: "#C4943F", copperGlow: "rgba(173,122,40,0.12)",
  cream: "#FAF8F5", creamDark: "#F3EFE9", warmGray: "#E8E2D9",
  ink: "#1C1C1C", charcoal: "#2E2E2E", slate: "#6B6560", stone: "#9A948D",
  white: "#FFFFFF", success: "#3A7D44", warning: "#D4A017", danger: "#B53A2E",
  accent1: "#5B7F95", accent2: "#7B6B8D", accent3: "#8B6F4E",
};

const FONT = {
  display: "'Cormorant Garamond', 'Georgia', serif",
  body: "'Jost', 'Helvetica Neue', sans-serif",
};

// ═══ LIVE CSV URLS ═══
const CSV_URLS = {
  standardMetrics: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSTiGPTj3d8JIUglnoc9_h25XJWa1u-5umMUkXXIMvipwZZA8h9VWCQIx7nN_JDFjzmvB_r2OKqsEq/pub?gid=0&single=true&output=csv",
  searchConsole: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTSTiGPTj3d8JIUglnoc9_h25XJWa1u-5umMUkXXIMvipwZZA8h9VWCQIx7nN_JDFjzmvB_r2OKqsEq/pub?gid=1051370982&single=true&output=csv",
  orders: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTt55QDq_dohHCVo7Y_joehj1-4NSFzSv_gQ0ZvbTtGMNXlblkitH1K_bUaslmvqqJM3FSA95s0y9yN/pub?output=csv",
};

// ═══ CSV PARSER ═══
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text, skipMetaRows = 0) {
  const lines = text.split("\n").filter(l => l.trim());
  const dataLines = lines.slice(skipMetaRows);
  if (dataLines.length < 2) return [];
  const headers = parseCSVLine(dataLines[0]);
  return dataLines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ""; });
    return row;
  }).filter(r => Object.values(r).some(v => v));
}

// ═══ FORMATTERS ═══
const fmt = {
  num: (n) => n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 }),
  pct: (n) => n == null ? "—" : (Number(n) * 100).toFixed(1) + "%",
  dur: (s) => {
    const sec = Math.round(Number(s));
    const m = Math.floor(sec / 60);
    const ss = sec % 60;
    return `${m}:${String(ss).padStart(2, "0")}`;
  },
  dec: (n, d = 1) => n == null ? "—" : Number(n).toFixed(d),
  usd: (n) => n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 }),
  compact: (n) => {
    const v = Number(n);
    if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
    if (v >= 1000) return (v / 1000).toFixed(1) + "K";
    return v.toFixed(0);
  },
};

// ═══ COMPONENTS ═══
function KPI({ label, value, sub, accent = C.copper, icon }) {
  return (
    <div style={{
      background: C.white, borderRadius: 10, padding: "18px 20px",
      border: `1px solid ${C.warmGray}`, position: "relative", overflow: "hidden",
      transition: "box-shadow 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 20px ${C.copperGlow}`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: accent }} />
      {icon && <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontFamily: FONT.body, fontSize: 11, fontWeight: 500,
        color: C.stone, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 600,
        color: C.ink, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.slate, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children, style = {} }) {
  return (
    <div style={{
      background: C.white, borderRadius: 10, padding: "20px 24px",
      border: `1px solid ${C.warmGray}`, ...style
    }}>
      {title && <div style={{
        fontFamily: FONT.display, fontSize: 18, fontWeight: 600, color: C.ink,
        marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.warmGray}`
      }}>{title}</div>}
      {children}
    </div>
  );
}

function Pill({ children, color = C.copper }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 12,
      fontSize: 11, fontWeight: 500, fontFamily: FONT.body,
      background: color + "18", color: color, letterSpacing: "0.02em",
    }}>{children}</span>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${C.warmGray}`, marginBottom: 24 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          fontFamily: FONT.body, fontSize: 13, fontWeight: active === t.id ? 600 : 400,
          color: active === t.id ? C.copper : C.slate, background: "none", border: "none",
          padding: "10px 20px", cursor: "pointer", position: "relative",
          borderBottom: active === t.id ? `2px solid ${C.copper}` : "2px solid transparent",
          marginBottom: -2, transition: "all 0.2s",
        }}>
          {t.icon && <span style={{ marginRight: 6 }}>{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  );
}

function MiniSparkline({ data, dataKey, color = C.copper, height = 40, width = 120 }) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5}
          fill={`url(#spark-${dataKey})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ═══ MAIN DASHBOARD ═══
export default function StokeshireKPIDashboard() {
  const [tab, setTab] = useState("overview");
  const [trafficData, setTrafficData] = useState([]);
  const [searchData, setSearchData] = useState([]);
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchCSV = useCallback(async (url, key, skipMeta = 0) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return parseCSV(text, skipMeta);
    } catch (err) {
      setErrors(prev => ({ ...prev, [key]: err.message }));
      return [];
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [traffic, search, orders] = await Promise.all([
        fetchCSV(CSV_URLS.standardMetrics, "traffic", 2),
        fetchCSV(CSV_URLS.searchConsole, "search", 2),
        fetchCSV(CSV_URLS.orders, "orders", 0),
      ]);
      setTrafficData(traffic);
      setSearchData(search);
      setOrdersData(orders);
      setLastUpdated(new Date());
      setLoading(false);
    }
    load();
  }, [fetchCSV]);

  // ═══ COMPUTED METRICS ═══
  const metrics = useMemo(() => {
    if (!trafficData.length) return null;

    const clean = trafficData
      .map(r => ({
        date: r["Day"] || r["Date"] || r["day"],
        sessions: parseFloat(r["Sessions"] || r["sessions"] || 0),
        users: parseFloat(r["Total users"] || r["total_users"] || 0),
        newUsers: parseFloat(r["New users"] || r["new_users"] || 0),
        engRate: parseFloat(r["Engagement rate"] || r["engagement_rate"] || 0),
        viewsPerSession: parseFloat(r["Views per session"] || r["views_per_session"] || 0),
        avgDuration: parseFloat(r["Average session duration"] || r["avg_session_duration"] || 0),
      }))
      .filter(r => r.date && r.sessions > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const last30 = clean.slice(-30);
    const prev30 = clean.slice(-60, -30);
    const last7 = clean.slice(-7);

    const sum = (arr, k) => arr.reduce((s, r) => s + (r[k] || 0), 0);
    const avg = (arr, k) => arr.length ? sum(arr, k) / arr.length : 0;

    const totalSessions30 = sum(last30, "sessions");
    const totalSessions_prev = sum(prev30, "sessions");
    const sessionChange = totalSessions_prev ? ((totalSessions30 - totalSessions_prev) / totalSessions_prev * 100) : 0;

    const totalUsers30 = sum(last30, "users");
    const totalNewUsers30 = sum(last30, "newUsers");
    const avgEngRate30 = avg(last30, "engRate");
    const avgDuration30 = avg(last30, "avgDuration");
    const avgViewsPerSession30 = avg(last30, "viewsPerSession");
    const avgSessionsPerDay = avg(last30, "sessions");

    const weeklyData = [];
    for (let i = 0; i < clean.length; i += 7) {
      const week = clean.slice(i, i + 7);
      if (week.length < 3) continue;
      weeklyData.push({
        week: week[0].date.slice(5),
        sessions: sum(week, "sessions"),
        users: sum(week, "users"),
        newUsers: sum(week, "newUsers"),
        engRate: avg(week, "engRate"),
      });
    }

    return {
      daily: clean, last30, prev30, last7, weeklyData,
      totalSessions30, sessionChange, totalUsers30, totalNewUsers30,
      avgEngRate30, avgDuration30, avgViewsPerSession30, avgSessionsPerDay,
    };
  }, [trafficData]);

  const searchMetrics = useMemo(() => {
    if (!searchData.length) return null;

    const clean = searchData
      .map(r => ({
        query: r["Query"] || r["query"] || "",
        position: parseFloat(r["position"] || 0),
        clicks: parseInt(r["clicks"] || 0),
        ctr: parseFloat(r["ctr"] || 0),
        impressions: parseInt(r["impressions"] || 0),
        page: r["Page"] || r["page"] || "",
      }))
      .filter(r => r.query && r.clicks > 0)
      .sort((a, b) => b.clicks - a.clicks);

    const totalClicks = clean.reduce((s, r) => s + r.clicks, 0);
    const totalImpressions = clean.reduce((s, r) => s + r.impressions, 0);
    const avgCTR = totalImpressions ? totalClicks / totalImpressions : 0;
    const top20 = clean.slice(0, 20);

    // Group by landing page
    const pageMap = {};
    clean.forEach(r => {
      const slug = r.page.replace("https://www.wisconsindesignerdoodles.com", "") || "/";
      if (!pageMap[slug]) pageMap[slug] = { page: slug, clicks: 0, impressions: 0, queries: 0 };
      pageMap[slug].clicks += r.clicks;
      pageMap[slug].impressions += r.impressions;
      pageMap[slug].queries += 1;
    });
    const topPages = Object.values(pageMap).sort((a, b) => b.clicks - a.clicks).slice(0, 15);

    // Keyword clusters
    const clusters = {};
    clean.forEach(r => {
      const q = r.query.toLowerCase();
      let bucket = "Other";
      if (q.includes("bernedoodle") || q.includes("bernadoodle")) bucket = "Bernedoodle";
      else if (q.includes("aussiedoodle") || q.includes("aussie")) bucket = "Aussiedoodle / AMD";
      else if (q.includes("goldendoodle")) bucket = "Goldendoodle";
      else if (q.includes("hypoallergenic")) bucket = "Hypoallergenic";
      else if (q.includes("stokeshire") || q.includes("stokes")) bucket = "Brand";
      else if (q.includes("calculator") || q.includes("weight") || q.includes("growth")) bucket = "Calculators";
      else if (q.includes("mountain dog") || q.includes("mountain doodle")) bucket = "Aussiedoodle / AMD";
      if (!clusters[bucket]) clusters[bucket] = { name: bucket, clicks: 0, impressions: 0, count: 0 };
      clusters[bucket].clicks += r.clicks;
      clusters[bucket].impressions += r.impressions;
      clusters[bucket].count += 1;
    });
    const clusterList = Object.values(clusters).sort((a, b) => b.clicks - a.clicks);

    return { all: clean, top20, topPages, totalClicks, totalImpressions, avgCTR, clusterList };
  }, [searchData]);

  const TABS = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "traffic", label: "Traffic", icon: "📈" },
    { id: "seo", label: "SEO & Keywords", icon: "🔍" },
    { id: "pages", label: "Top Pages", icon: "📄" },
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: C.cream, display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, border: `3px solid ${C.warmGray}`,
          borderTopColor: C.copper, borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontFamily: FONT.body, fontSize: 14, color: C.slate }}>
          Loading live data from Google Sheets...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.cream, fontFamily: FONT.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700&family=Jost:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.warmGray}; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        background: C.ink, padding: "20px 32px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{
            fontFamily: FONT.display, fontSize: 24, fontWeight: 600,
            color: C.cream, letterSpacing: "0.02em",
          }}>
            Stokeshire Analytics
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.stone, marginTop: 2 }}>
            KPI Dashboard · Live GA4 + Search Console
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {Object.keys(errors).length > 0 && (
            <Pill color={C.danger}>
              {Object.keys(errors).length} feed{Object.keys(errors).length > 1 ? "s" : ""} offline
            </Pill>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.stone }}>
              {trafficData.length} days · {searchData.length > 0 ? fmt.compact(searchData.length) + " keywords" : "—"}
            </div>
            {lastUpdated && (
              <div style={{ fontFamily: FONT.body, fontSize: 10, color: C.slate }}>
                Fetched {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: C.copper, color: C.cream, border: "none", borderRadius: 6,
              padding: "8px 16px", fontFamily: FONT.body, fontSize: 12, fontWeight: 500,
              cursor: "pointer", letterSpacing: "0.04em",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── COPPER ACCENT ── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.copper}, ${C.copperLight}, ${C.copper})` }} />

      {/* ── TABS + CONTENT ── */}
      <div style={{ padding: "24px 32px", maxWidth: 1280, margin: "0 auto" }}>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />

        {/* ═══════════ OVERVIEW ═══════════ */}
        {tab === "overview" && metrics && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
              <KPI icon="👁" label="Sessions (30d)" value={fmt.num(metrics.totalSessions30)}
                sub={`${metrics.sessionChange >= 0 ? "+" : ""}${metrics.sessionChange.toFixed(1)}% vs prior`}
                accent={metrics.sessionChange >= 0 ? C.success : C.danger} />
              <KPI icon="👤" label="Users (30d)" value={fmt.num(metrics.totalUsers30)}
                sub={`${fmt.num(metrics.totalNewUsers30)} new`} accent={C.accent1} />
              <KPI icon="⚡" label="Engagement Rate" value={fmt.pct(metrics.avgEngRate30)}
                sub="30-day avg" accent={C.copper} />
              <KPI icon="📄" label="Pages / Session" value={fmt.dec(metrics.avgViewsPerSession30)}
                sub="30-day avg" accent={C.accent2} />
              <KPI icon="⏱" label="Avg Duration" value={fmt.dur(metrics.avgDuration30)}
                sub="30-day avg" accent={C.accent3} />
            </div>

            {searchMetrics && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
                <KPI icon="🔍" label="Total Clicks (90d)" value={fmt.num(searchMetrics.totalClicks)}
                  sub="Search Console" accent={C.success} />
                <KPI icon="👀" label="Impressions (90d)" value={fmt.compact(searchMetrics.totalImpressions)}
                  sub="Search Console" accent={C.accent1} />
                <KPI icon="📊" label="Avg CTR" value={fmt.pct(searchMetrics.avgCTR)}
                  sub="Across all queries" accent={C.copper} />
                <KPI icon="🏷" label="Tracked Keywords" value={fmt.num(searchMetrics.all.length)}
                  sub="With 1+ click" accent={C.accent2} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
              <Section title="Daily Sessions — Last 30 Days">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={metrics.last30} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <defs>
                      <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.copper} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={C.copper} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.warmGray} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.stone }} tickFormatter={v => v?.slice(5) || ""} />
                    <YAxis tick={{ fontSize: 10, fill: C.stone }} />
                    <Tooltip
                      contentStyle={{ fontFamily: FONT.body, fontSize: 12, borderRadius: 8, border: `1px solid ${C.warmGray}` }}
                      formatter={(v, n) => [fmt.num(v), n === "sessions" ? "Sessions" : n]}
                      labelFormatter={l => l}
                    />
                    <Area type="monotone" dataKey="sessions" stroke={C.copper} strokeWidth={2}
                      fill="url(#sessionGrad)" dot={false} activeDot={{ r: 4, fill: C.copper }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Section>

              {searchMetrics && (
                <Section title="Keyword Clusters by Clicks">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {searchMetrics.clusterList.slice(0, 7).map((c, i) => {
                      const maxClicks = searchMetrics.clusterList[0]?.clicks || 1;
                      const pct = (c.clicks / maxClicks) * 100;
                      const colors = [C.copper, C.accent1, C.accent2, C.success, C.accent3, C.warning, C.danger];
                      return (
                        <div key={c.name}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: C.ink }}>{c.name}</span>
                            <span style={{ fontSize: 11, color: C.slate }}>{fmt.num(c.clicks)} clicks</span>
                          </div>
                          <div style={{ height: 8, background: C.creamDark, borderRadius: 4, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 4, width: `${pct}%`,
                              background: colors[i % colors.length], transition: "width 0.6s ease",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}
            </div>

            {searchMetrics && (
              <Section title="Top 10 Keywords by Clicks">
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT.body, fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${C.warmGray}` }}>
                        {["#", "Keyword", "Clicks", "Impressions", "CTR", "Avg Position", "Landing Page"].map(h => (
                          <th key={h} style={{
                            textAlign: h === "Keyword" || h === "Landing Page" ? "left" : "right",
                            padding: "8px 10px", fontSize: 11, fontWeight: 600,
                            color: C.stone, textTransform: "uppercase", letterSpacing: "0.05em",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {searchMetrics.top20.slice(0, 10).map((r, i) => {
                        const slug = r.page.replace("https://www.wisconsindesignerdoodles.com", "") || "/";
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${C.creamDark}` }}
                            onMouseEnter={e => e.currentTarget.style.background = C.copperGlow}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <td style={{ padding: "10px", textAlign: "right", color: C.stone, fontSize: 11 }}>{i + 1}</td>
                            <td style={{ padding: "10px", fontWeight: 500, color: C.ink, maxWidth: 260 }}>{r.query}</td>
                            <td style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: C.copper }}>{fmt.num(r.clicks)}</td>
                            <td style={{ padding: "10px", textAlign: "right", color: C.slate }}>{fmt.num(r.impressions)}</td>
                            <td style={{ padding: "10px", textAlign: "right", color: C.slate }}>{fmt.pct(r.ctr)}</td>
                            <td style={{ padding: "10px", textAlign: "right" }}>
                              <Pill color={r.position <= 3 ? C.success : r.position <= 10 ? C.warning : C.danger}>
                                {fmt.dec(r.position)}
                              </Pill>
                            </td>
                            <td style={{ padding: "10px", fontSize: 11, color: C.slate, maxWidth: 200,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slug}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ═══════════ TRAFFIC ═══════════ */}
        {tab === "traffic" && metrics && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
              <KPI label="Avg Sessions / Day" value={fmt.num(Math.round(metrics.avgSessionsPerDay))}
                sub="Last 30 days" accent={C.copper} />
              <KPI label="New User Rate" value={fmt.pct(metrics.totalNewUsers30 / (metrics.totalUsers30 || 1))}
                sub={`${fmt.num(metrics.totalNewUsers30)} new of ${fmt.num(metrics.totalUsers30)}`} accent={C.accent1} />
              <KPI label="Engagement Rate" value={fmt.pct(metrics.avgEngRate30)}
                sub="30-day avg" accent={C.success} />
              <KPI label="Avg Duration" value={fmt.dur(metrics.avgDuration30)}
                sub="30-day avg" accent={C.accent3} />
            </div>

            <Section title="Sessions & Users — Full Range" style={{ marginBottom: 24 }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.daily} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.warmGray} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.stone }}
                    tickFormatter={v => v?.slice(5) || ""} interval={6} />
                  <YAxis tick={{ fontSize: 10, fill: C.stone }} />
                  <Tooltip contentStyle={{ fontFamily: FONT.body, fontSize: 12, borderRadius: 8 }}
                    labelFormatter={l => l} />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="sessions" stroke={C.copper} strokeWidth={2} dot={false} name="Sessions" />
                  <Line type="monotone" dataKey="users" stroke={C.accent1} strokeWidth={1.5} dot={false} name="Users" strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="newUsers" stroke={C.accent2} strokeWidth={1} dot={false} name="New Users" strokeDasharray="2 2" />
                </LineChart>
              </ResponsiveContainer>
            </Section>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Section title="Engagement Rate Trend">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metrics.last30} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <defs>
                      <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.success} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={C.success} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.warmGray} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.stone }} tickFormatter={v => v?.slice(8) || ""} />
                    <YAxis tick={{ fontSize: 9, fill: C.stone }} tickFormatter={v => (v * 100).toFixed(0) + "%"} domain={[0.2, 0.8]} />
                    <Tooltip formatter={v => [fmt.pct(v), "Engagement"]} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Area type="monotone" dataKey="engRate" stroke={C.success} fill="url(#engGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </Section>

              <Section title="Avg Session Duration Trend">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metrics.last30} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.warmGray} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.stone }} tickFormatter={v => v?.slice(8) || ""} />
                    <YAxis tick={{ fontSize: 9, fill: C.stone }} tickFormatter={v => Math.round(v / 60) + "m"} />
                    <Tooltip formatter={v => [fmt.dur(v), "Duration"]} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Bar dataKey="avgDuration" fill={C.accent3} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>
          </div>
        )}

        {/* ═══════════ SEO & KEYWORDS ═══════════ */}
        {tab === "seo" && searchMetrics && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
              <KPI icon="🔍" label="Total Clicks" value={fmt.num(searchMetrics.totalClicks)} accent={C.copper} />
              <KPI icon="👀" label="Impressions" value={fmt.compact(searchMetrics.totalImpressions)} accent={C.accent1} />
              <KPI icon="📊" label="Avg CTR" value={fmt.pct(searchMetrics.avgCTR)} accent={C.success} />
              <KPI icon="🏷" label="Keywords w/ Clicks" value={fmt.num(searchMetrics.all.length)} accent={C.accent2} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <Section title="Top 20 Keywords — Clicks">
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={searchMetrics.top20} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 140 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.warmGray} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: C.stone }} />
                    <YAxis dataKey="query" type="category" tick={{ fontSize: 10, fill: C.ink }} width={130}
                      tickFormatter={v => v.length > 22 ? v.slice(0, 22) + "…" : v} />
                    <Tooltip contentStyle={{ fontFamily: FONT.body, fontSize: 12, borderRadius: 6 }}
                      formatter={(v, n) => [n === "clicks" ? fmt.num(v) : fmt.num(v), n === "clicks" ? "Clicks" : "Impressions"]} />
                    <Bar dataKey="clicks" fill={C.copper} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="Keyword Cluster Breakdown">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={searchMetrics.clusterList.slice(0, 7)} dataKey="clicks" nameKey="name"
                      cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: C.stone, strokeWidth: 1 }}
                      style={{ fontSize: 11, fontFamily: FONT.body }}>
                      {searchMetrics.clusterList.slice(0, 7).map((_, i) => {
                        const colors = [C.copper, C.accent1, C.accent2, C.success, C.accent3, C.warning, C.stone];
                        return <Cell key={i} fill={colors[i % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip formatter={v => [fmt.num(v), "Clicks"]} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                  </PieChart>
                </ResponsiveContainer>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Cluster Detail</div>
                  {searchMetrics.clusterList.map((c, i) => (
                    <div key={c.name} style={{
                      display: "flex", justifyContent: "space-between", padding: "6px 0",
                      borderBottom: i < searchMetrics.clusterList.length - 1 ? `1px solid ${C.creamDark}` : "none",
                    }}>
                      <span style={{ fontSize: 12, color: C.ink }}>{c.name}</span>
                      <span style={{ fontSize: 12, color: C.slate }}>
                        {fmt.num(c.clicks)} clicks · {fmt.num(c.count)} queries
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <Section title="Full Keyword Table — Top 50">
              <div style={{ overflowX: "auto", maxHeight: 600, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT.body, fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.warmGray}`, position: "sticky", top: 0, background: C.white, zIndex: 1 }}>
                      {["#", "Keyword", "Position", "Clicks", "CTR", "Impressions", "Landing Page"].map(h => (
                        <th key={h} style={{
                          textAlign: h === "Keyword" || h === "Landing Page" ? "left" : "right",
                          padding: "8px 8px", fontSize: 10, fontWeight: 600, color: C.stone,
                          textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {searchMetrics.all.slice(0, 50).map((r, i) => {
                      const slug = r.page.replace("https://www.wisconsindesignerdoodles.com", "") || "/";
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.creamDark}` }}
                          onMouseEnter={e => e.currentTarget.style.background = C.copperGlow}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.stone, fontSize: 10 }}>{i + 1}</td>
                          <td style={{ padding: "6px 8px", fontWeight: 500, color: C.ink }}>{r.query}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right" }}>
                            <Pill color={r.position <= 3 ? C.success : r.position <= 10 ? C.warning : C.danger}>
                              {fmt.dec(r.position)}
                            </Pill>
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: C.copper }}>{fmt.num(r.clicks)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.slate }}>{fmt.pct(r.ctr)}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: C.slate }}>{fmt.num(r.impressions)}</td>
                          <td style={{ padding: "6px 8px", fontSize: 10, color: C.slate, maxWidth: 180,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slug}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {/* ═══════════ TOP PAGES ═══════════ */}
        {tab === "pages" && searchMetrics && (
          <div className="fade-in">
            <Section title="Top Landing Pages by Search Clicks" style={{ marginBottom: 24 }}>
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={searchMetrics.topPages} layout="vertical"
                  margin={{ top: 5, right: 20, bottom: 5, left: 200 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.warmGray} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: C.stone }} />
                  <YAxis dataKey="page" type="category" tick={{ fontSize: 10, fill: C.ink }} width={190}
                    tickFormatter={v => v.length > 35 ? "…" + v.slice(-32) : v} />
                  <Tooltip contentStyle={{ fontFamily: FONT.body, fontSize: 12, borderRadius: 6 }}
                    formatter={(v) => [fmt.num(v), "Clicks"]} />
                  <Bar dataKey="clicks" fill={C.copper} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>

            <Section title="Page Performance Detail">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT.body, fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.warmGray}` }}>
                      {["#", "Page", "Clicks", "Impressions", "Unique Keywords"].map(h => (
                        <th key={h} style={{
                          textAlign: h === "Page" ? "left" : "right",
                          padding: "8px 10px", fontSize: 10, fontWeight: 600, color: C.stone,
                          textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {searchMetrics.topPages.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.creamDark}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.copperGlow}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: C.stone, fontSize: 10 }}>{i + 1}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 500, color: C.ink, fontSize: 11 }}>{r.page}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: C.copper }}>{fmt.num(r.clicks)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: C.slate }}>{fmt.num(r.impressions)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: C.slate }}>{fmt.num(r.queries)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}

        {/* ═══════════ NO DATA STATE ═══════════ */}
        {!metrics && !loading && (
          <Section>
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
              <div style={{ fontFamily: FONT.display, fontSize: 20, color: C.ink, marginBottom: 8 }}>
                No data loaded yet
              </div>
              <div style={{ fontFamily: FONT.body, fontSize: 13, color: C.slate, maxWidth: 400, margin: "0 auto" }}>
                Make sure your Google Sheets are published to the web as CSV. The dashboard fetches live data
                each time you load the page.
              </div>
            </div>
          </Section>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding: "16px 32px", borderTop: `1px solid ${C.warmGray}`,
        display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40,
      }}>
        <span style={{ fontFamily: FONT.body, fontSize: 11, color: C.stone }}>
          Stokeshire Designer Doodles · DATCP #514401-DS · Medford, WI
        </span>
        <span style={{ fontFamily: FONT.body, fontSize: 11, color: C.stone }}>
          Data auto-refreshes on page load · CSV cache ~5 min
        </span>
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${C.copper}, ${C.copperLight}, ${C.copper})`, zIndex: 999 }} />
    </div>
  );
}
