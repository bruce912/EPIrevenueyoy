import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  Download,
  ExternalLink,
  Filter,
  LineChart,
  RotateCcw,
} from "lucide-react";
import records from "./data/revenue-data.json";
import "./styles.css";

const companies = [
  { code: "7722", name: "連加 LINE Pay", short: "LINE Pay", color: "#0f9f5f", mark: "LP" },
  { code: "6033", name: "一卡通 iPASS", short: "iPASS", color: "#1463d8", mark: "IP" },
  { code: "6035", name: "悠遊卡 EasyCard", short: "EasyCard", color: "#6d3ac9", mark: "EC" },
  { code: "6034", name: "愛金卡 ICASH", short: "ICASH", color: "#f97316", mark: "IC" },
  { code: "6038", name: "街口 Jkopay", short: "Jkopay", color: "#e11d48", mark: "JK" },
  { code: "6040", name: "全支付 PXPay Plus", short: "PXPay+", color: "#d7a100", mark: "PX" },
];

const sourceCards = [
  {
    name: "公開資訊觀測站 (MOPS)",
    text: "各公司月營收公告",
    url: "https://mops.twse.com.tw/mops/#/web/t05st10_ifrs",
  },
  {
    name: "Yahoo 財經",
    text: "公開資訊觀測站公告轉載",
    url: "https://tw.stock.yahoo.com/",
  },
  {
    name: "FinMind 財經資訊",
    text: "月營收資料集",
    url: "https://finmindtrade.com/",
  },
  {
    name: "WantGoo 玩股網",
    text: "公司月營收公開資料補值",
    url: "https://www.wantgoo.com/",
  },
];

const periods = [...new Set(records.map((record) => record.period))].sort();
const latestPeriod = periods.at(-1);
const companyByCode = new Map(companies.map((company) => [company.code, company]));
const formatNumber = new Intl.NumberFormat("zh-TW");

function formatRevenue(value) {
  return formatNumber.format(Math.round(value));
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function toCsv(rows) {
  const headers = ["月份", "代號", "公司", "本月營收(千元)", "去年同期(千元)", "YoY", "MoM", "來源"];
  const body = rows.map((row) => [
    row.period,
    row.code,
    row.company,
    row.currentRevenue,
    row.priorYearRevenue,
    formatPercent(row.yoyGrowth),
    formatPercent(row.momGrowth),
    row.sourceUrl,
  ]);
  return [headers, ...body]
    .map((line) => line.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(rows) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "taiwan-e-payment-revenue-yoy.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [selectedCodes, setSelectedCodes] = useState(() => new Set(companies.map((company) => company.code)));
  const [activePeriod, setActivePeriod] = useState(latestPeriod);
  const [metricFocus, setMetricFocus] = useState("currentRevenue");

  const selectedRecords = useMemo(
    () => records.filter((record) => selectedCodes.has(record.code)),
    [selectedCodes],
  );
  const latestRows = useMemo(
    () => records.filter((record) => record.period === latestPeriod),
    [],
  );
  const activeRows = useMemo(
    () => records.filter((record) => record.period === activePeriod && selectedCodes.has(record.code)),
    [activePeriod, selectedCodes],
  );
  const visibleRows = useMemo(
    () => records.filter((record) => selectedCodes.has(record.code) && record.period <= activePeriod),
    [activePeriod, selectedCodes],
  );

  const totalLatest = latestRows.reduce((sum, row) => sum + row.currentRevenue, 0);
  const totalPrior = latestRows.reduce((sum, row) => sum + row.priorYearRevenue, 0);
  const blendedYoy = totalLatest / totalPrior - 1;

  function toggleCompany(code) {
    setSelectedCodes((current) => {
      const next = new Set(current);
      if (next.has(code) && next.size > 1) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function resetFilters() {
    setSelectedCodes(new Set(companies.map((company) => company.code)));
    setActivePeriod(latestPeriod);
    setMetricFocus("currentRevenue");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            <LineChart size={23} />
          </div>
          <div>
            <h1>台灣電子支付同業月營收比較</h1>
            <p>2025-07 至 2026-06 · 單位：新台幣千元</p>
          </div>
        </div>
        <div className="topbar-meta">
          <span>資料期間：2025-07 至 2026-06</span>
          <span>製作日期：2026-07-13</span>
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar" aria-label="最新月份概覽">
          <div className="overview-card">
            <div className="eyeline">最新月份概覽</div>
            <strong>{latestPeriod}</strong>
            <span>合計營收 {formatRevenue(totalLatest)}</span>
            <b className={blendedYoy >= 0 ? "positive" : "negative"}>{formatPercent(blendedYoy)} YoY</b>
          </div>

          <div className="kpi-list">
            {latestRows.map((row) => {
              const company = companyByCode.get(row.code);
              return (
                <button
                  className={`kpi-card ${selectedCodes.has(row.code) ? "selected" : ""}`}
                  key={row.code}
                  onClick={() => toggleCompany(row.code)}
                  type="button"
                  style={{ "--company-color": company.color }}
                >
                  <span className="company-mark">{company.mark}</span>
                  <span className="kpi-body">
                    <span className="kpi-name">{row.code} {company.name}</span>
                    <strong>{formatRevenue(row.currentRevenue)}</strong>
                    <small className={row.yoyGrowth >= 0 ? "positive" : "negative"}>
                      {formatPercent(row.yoyGrowth)} YoY
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="content-panel">
          <div className="toolbar">
            <label className="field">
              <span><CalendarDays size={15} /> 期間</span>
              <select value={activePeriod} onChange={(event) => setActivePeriod(event.target.value)}>
                {periods.map((period) => <option key={period}>{period}</option>)}
              </select>
            </label>
            <label className="field">
              <span><Filter size={15} /> 指標</span>
              <select value={metricFocus} onChange={(event) => setMetricFocus(event.target.value)}>
                <option value="currentRevenue">每月營收</option>
                <option value="priorYearRevenue">去年同期</option>
                <option value="yoyGrowth">YoY 成長率</option>
              </select>
            </label>
            <div className="segmented" aria-label="公司篩選">
              {companies.map((company) => (
                <button
                  className={selectedCodes.has(company.code) ? "active" : ""}
                  key={company.code}
                  onClick={() => toggleCompany(company.code)}
                  type="button"
                >
                  {company.short}
                </button>
              ))}
            </div>
            <button className="icon-button" onClick={resetFilters} type="button">
              <RotateCcw size={16} /> 重設篩選
            </button>
          </div>

          <section className="chart-grid">
            <ChartCard
              title="每月營收"
              unit="新台幣千元"
              records={selectedRecords}
              metric="currentRevenue"
              highlighted={metricFocus === "currentRevenue"}
            />
            <ChartCard
              title="去年同期"
              unit="新台幣千元"
              records={selectedRecords}
              metric="priorYearRevenue"
              highlighted={metricFocus === "priorYearRevenue"}
            />
            <ChartCard
              title="YoY 成長率"
              unit="%"
              records={selectedRecords}
              metric="yoyGrowth"
              highlighted={metricFocus === "yoyGrowth"}
              percent
            />
          </section>

          <section className="period-strip">
            {activeRows.map((row) => {
              const company = companyByCode.get(row.code);
              return (
                <article key={`${row.code}-${row.period}`} style={{ "--company-color": company.color }}>
                  <span>{company.short}</span>
                  <strong>{formatRevenue(row.currentRevenue)}</strong>
                  <small className={row.yoyGrowth >= 0 ? "positive" : "negative"}>{formatPercent(row.yoyGrowth)}</small>
                </article>
              );
            })}
          </section>

          <section className="table-card">
            <div className="section-heading">
              <div>
                <h2>月營收明細</h2>
                <span>顯示 {visibleRows.length} 筆，共 72 筆</span>
              </div>
              <button className="icon-button" type="button" onClick={() => downloadCsv(visibleRows)}>
                <Download size={16} /> 下載 CSV
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>年月</th>
                    <th>公司</th>
                    <th>本月營收</th>
                    <th>去年同期</th>
                    <th>YoY</th>
                    <th>MoM</th>
                    <th>來源</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const company = companyByCode.get(row.code);
                    return (
                      <tr key={`${row.code}-${row.period}`}>
                        <td>{row.period}</td>
                        <td><span className="dot" style={{ backgroundColor: company.color }} />{row.code} {company.short}</td>
                        <td>{formatRevenue(row.currentRevenue)}</td>
                        <td>{formatRevenue(row.priorYearRevenue)}</td>
                        <td className={row.yoyGrowth >= 0 ? "positive" : "negative"}>{formatPercent(row.yoyGrowth)}</td>
                        <td className={row.momGrowth >= 0 ? "positive" : row.momGrowth < 0 ? "negative" : ""}>{formatPercent(row.momGrowth)}</td>
                        <td>
                          <a href={row.sourceUrl} target="_blank" rel="noreferrer">
                            {row.sourceType} <ExternalLink size={13} />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="source-panel" aria-label="資料來源">
            <div className="section-heading">
              <div>
                <h2>資料來源</h2>
                <span>來源連結也保留於明細表每列</span>
              </div>
            </div>
            <div className="source-grid">
              {sourceCards.map((source) => (
                <a href={source.url} key={source.name} target="_blank" rel="noreferrer">
                  <strong>{source.name}</strong>
                  <span>{source.text}</span>
                  <ExternalLink size={15} />
                </a>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function ChartCard({ title, unit, records: chartRecords, metric, highlighted, percent = false }) {
  return (
    <article className={`chart-card ${highlighted ? "highlighted" : ""}`}>
      <div className="chart-heading">
        <div>
          <h2>{title}</h2>
          <span>單位：{unit}</span>
        </div>
      </div>
      <MultiLineChart records={chartRecords} metric={metric} percent={percent} />
    </article>
  );
}

function MultiLineChart({ records: chartRecords, metric, percent }) {
  const width = 680;
  const height = 330;
  const margin = { top: 24, right: 20, bottom: 48, left: 62 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const grouped = companies
    .filter((company) => chartRecords.some((record) => record.code === company.code))
    .map((company) => ({
      ...company,
      values: periods.map((period) => chartRecords.find((record) => record.code === company.code && record.period === period)?.[metric] ?? null),
    }));
  const allValues = grouped.flatMap((series) => series.values).filter((value) => value != null);
  const minValue = percent ? Math.min(-0.8, Math.min(...allValues)) : 0;
  const maxValue = percent ? Math.max(0.8, Math.max(...allValues)) : Math.max(...allValues) * 1.1;
  const yScale = (value) => margin.top + (maxValue - value) / (maxValue - minValue) * plotHeight;
  const xScale = (index) => margin.left + (periods.length === 1 ? 0 : index / (periods.length - 1) * plotWidth);
  const ticks = Array.from({ length: 5 }, (_, index) => minValue + ((maxValue - minValue) * index) / 4);

  return (
    <div className="chart-scroll">
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${titleForMetric(metric)} 趨勢圖`}>
        <g>
          {ticks.map((tick) => {
            const y = yScale(tick);
            return (
              <g key={tick}>
                <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} className="grid-line" />
                <text x={margin.left - 10} y={y + 4} className="axis-label" textAnchor="end">
                  {percent ? `${Math.round(tick * 100)}%` : compactNumber(tick)}
                </text>
              </g>
            );
          })}
          {periods.map((period, index) => {
            const shouldShow = index % 2 === 0 || index === periods.length - 1;
            if (!shouldShow) return null;
            return (
              <text key={period} x={xScale(index)} y={height - 18} className="axis-label" textAnchor="middle">
                {period}
              </text>
            );
          })}
        </g>
        {grouped.map((series) => {
          const points = series.values
            .map((value, index) => (value == null ? null : `${xScale(index)},${yScale(value)}`))
            .filter(Boolean)
            .join(" ");
          return (
            <g key={series.code}>
              <polyline points={points} fill="none" stroke={series.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {series.values.map((value, index) => value == null ? null : (
                <circle key={`${series.code}-${periods[index]}`} cx={xScale(index)} cy={yScale(value)} r="3.6" fill={series.color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {grouped.map((series) => (
          <span key={series.code}><i style={{ backgroundColor: series.color }} />{series.short}</span>
        ))}
      </div>
    </div>
  );
}

function titleForMetric(metric) {
  if (metric === "priorYearRevenue") return "去年同期月營收";
  if (metric === "yoyGrowth") return "YoY 成長率";
  return "每月營收";
}

function compactNumber(value) {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}K`;
  return String(Math.round(value));
}

createRoot(document.getElementById("root")).render(<App />);
