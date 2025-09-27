import React, { useMemo, useState } from "react";
import { Activity, Beaker, FlaskConical, SlidersHorizontal, Home, TrendingUp, TrendingDown } from "lucide-react";

/**
 * Molecular You – Hormone Score Prototype UI (Menstrual & Adrenal Focus)
 * ----------------------------------------------------------------------
 * Tabs:
 *  - Home (overview across timepoints)
 *  - Menstrual Irregularities & Infertility
 *  - Adrenal & Endocrine Disorders
 *
 * Notes:
 * - Placeholder ranges/targets; values are for demo only.
 * - Multi-timepoint view with improved sparklines (banded background, labels, area).
 * - Color bands: 0–69 red, 70–90 yellow, 91+ blue.
 */

// ------------------------
// Helper math
// ------------------------
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

// Map a value to 0–100 where 100 = middle of reference range, 0 = very far.
function rangeCenteredScore(value, low, high) {
  if (low == null || high == null || low >= high || value == null) return 50;
  const mid = (low + high) / 2;
  const half = (high - low) / 2;
  const dist = Math.abs(value - mid);
  const normalized = dist / (half || 1e-6);
  const inside = value >= low && value <= high;
  const base = inside ? 100 - normalized * 50 : 100 - (1 + (dist - half) / (half || 1e-6)) * 50;
  return clamp(Math.round(base), 0, 100);
}

function ratioScore(actual, target) {
  if (actual == null || target == null || target === 0) return 50;
  const dev = Math.abs(actual - target) / Math.abs(target);
  const s = 100 - dev * 100;
  return clamp(Math.round(s), 0, 100);
}

function weightedAverage(items) {
  const { sumW, sumWX } = items.reduce((acc, it) => ({
    sumW: acc.sumW + (it.w || 0),
    sumWX: acc.sumWX + (it.w || 0) * (it.x || 0),
  }), { sumW: 0, sumWX: 0 });
  if (sumW === 0) return 0;
  return Math.round(sumWX / sumW);
}

function statusFromRange(value, low, high) {
  if (value == null || low == null || high == null || low >= high) return { label: "—", tone: "bg-gray-200 text-gray-700" };
  if (value < low) return { label: "Low", tone: "bg-blue-100 text-blue-800" };
  if (value > high) return { label: "High", tone: "bg-rose-100 text-rose-800" };
  return { label: "Optimal", tone: "bg-green-100 text-green-800" };
}

// Color bands per requirement
function bandKey(value) {
  if (value == null) return "yellow";
  if (value <= 69) return "red";
  if (value <= 90) return "yellow";
  return "blue";
}
const BAND = {
  red:   { text: "text-red-600",   fill: "bg-red-600",   border: "border-red-200",   muted: "text-red-600" },
  yellow:{ text: "text-yellow-500", fill: "bg-yellow-500", border: "border-yellow-200", muted: "text-yellow-600" },
  blue:  { text: "text-blue-600",  fill: "bg-blue-600",  border: "border-blue-200",  muted: "text-blue-600" },
};

// Donut ring (used only for headline score)
function Donut({ value }) {
  const pct = clamp(value, 0, 100);
  const angle = (pct / 100) * 360;
  const band = bandKey(pct);
  return (
    <div className={`relative w-32 h-32 ${BAND[band].text}`}>
      <div className="absolute inset-0 rounded-full" style={{
        background: `conic-gradient(currentColor ${angle}deg, #e5e7eb ${angle}deg)`
      }} />
      <div className="absolute inset-2 bg-white rounded-full border border-gray-100 grid place-items-center">
        <div className="text-2xl font-semibold text-gray-900">{pct}</div>
      </div>
    </div>
  );
}

// Trend chart with banded background, gridlines, labels, and area
function TrendChart({ series, labels }) {
  const w = 360, h = 96, pad = 12;
  if (!series || series.length === 0) return null;
  const innerW = w - pad * 2; const innerH = h - pad * 2;
  const xFor = (i) => pad + (i * innerW) / Math.max(1, series.length - 1);
  const yFor = (v) => pad + (100 - clamp(v, 0, 100)) / 100 * innerH;

  const points = series.map((v, i) => [xFor(i), yFor(v)]);
  const pathLine = points.map(([x,y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const y0 = yFor(0);
  const areaPath = `${pathLine} L ${points[points.length-1][0].toFixed(1)},${y0.toFixed(1)} L ${points[0][0].toFixed(1)},${y0.toFixed(1)} Z`;

  const last = series[series.length - 1];
  const band = bandKey(last);

  const y70 = yFor(70), y90 = yFor(90), y100 = yFor(100);
  const grid = [50, 70, 90];

  return (
    <svg width={w} height={h} className="block">
      {/* Bands */}
      <rect x={0} y={y100} width={w} height={y90 - y100} fill="#dbeafe" opacity="0.5" />
      <rect x={0} y={y90} width={w} height={y70 - y90} fill="#fef08a" opacity="0.45" />
      <rect x={0} y={y70} width={w} height={y0 - y70} fill="#fecaca" opacity="0.45" />

      {/* Grid lines */}
      {grid.map((g, idx) => (
        <g key={idx}>
          <line x1={pad} x2={w - pad} y1={yFor(g)} y2={yFor(g)} stroke="#94a3b8" strokeDasharray="4 4" opacity="0.5" />
          <text x={pad} y={yFor(g) - 4} fontSize="10" fill="#64748b">{g}</text>
        </g>
      ))}

      {/* Area & line */}
      <path d={areaPath} fill="currentColor" opacity="0.12" className={BAND[band].text} />
      <path d={pathLine} fill="none" stroke="currentColor" strokeWidth="2" className={BAND[band].text} />

      {/* Points & value labels */}
      {points.map(([x,y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3" fill="currentColor" className={BAND[band].text} />
          <text x={x} y={y - 6} fontSize="10" textAnchor="middle" fill="#374151">{Math.round(series[i])}</text>
          {labels && labels[i] && (
            <text x={x} y={h - 2} fontSize="10" textAnchor="middle" fill="#6b7280">{labels[i]}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ------------------------
// Reference ranges & example inputs (PLACEHOLDERS)
// ------------------------
const REF = {
  Progesterone: { low: 1.0, high: 20.0, unit: "ng/mL" },
  Pregnenolone: { low: 50, high: 200, unit: "ng/dL" },
  "17-Hydroxyprogesterone": { low: 20, high: 120, unit: "ng/dL" },
  Estrone: { low: 30, high: 200, unit: "pg/mL" },
  Estradiol: { low: 20, high: 300, unit: "pg/mL" },
  Estriol: { low: 0.1, high: 10, unit: "ng/mL" },
  "2-Hydroxyestrone": { low: 1, high: 40, unit: "pg/mL" },
  Testosterone: { low: 15, high: 70, unit: "ng/dL" },
  DHEA: { low: 100, high: 350, unit: "ng/dL" },
  DHT: { low: 3, high: 30, unit: "ng/dL" },
  Androstenedione: { low: 30, high: 200, unit: "ng/dL" },
  Androsterone: { low: 50, high: 220, unit: "ng/dL" },
  Hydroxytestosterone: { low: 1, high: 20, unit: "ng/dL" },
  Cortisol: { low: 5, high: 20, unit: "ug/dL" },
  Cortisone: { low: 1, high: 8, unit: "ug/dL" },
  Corticosterone: { low: 0.1, high: 5, unit: "ug/dL" },
  Aldosterone: { low: 4, high: 31, unit: "ng/dL" },
};

const EXAMPLE_A = {
  label: "Example A – Female (Perimenopause)",
  values: {
    Progesterone: 2.1,
    Pregnenolone: 70,
    "17-Hydroxyprogesterone": 45,
    Estrone: 95,
    Estradiol: 45,
    Estriol: 0.4,
    "2-Hydroxyestrone": 12,
    Testosterone: 24,
    DHEA: 165,
    DHT: 6,
    Androstenedione: 90,
    Androsterone: 120,
    Hydroxytestosterone: 4,
    Cortisol: 17.5,
    Cortisone: 3.2,
    Corticosterone: 0.6,
    Aldosterone: 14,
  }
};

const EXAMPLE_B = {
  label: "Example B – High Stress",
  values: {
    Progesterone: 4.2,
    Pregnenolone: 60,
    "17-Hydroxyprogesterone": 38,
    Estrone: 120,
    Estradiol: 90,
    Estriol: 0.7,
    "2-Hydroxyestrone": 10,
    Testosterone: 30,
    DHEA: 120,
    DHT: 8,
    Androstenedione: 110,
    Androsterone: 140,
    Hydroxytestosterone: 5,
    Cortisol: 22.0,
    Cortisone: 3.8,
    Corticosterone: 0.4,
    Aldosterone: 18,
  }
};

// Default weights per sub-score
const DEFAULT_WEIGHTS = {
  estrogenBalance: { Estradiol: 3, Estrone: 2, Estriol: 1, "2-Hydroxyestrone": 2 },
  progesteroneSufficiency: { Progesterone: 3, "17-Hydroxyprogesterone": 1, Pregnenolone: 1 },
  menopauseTransition: { Estradiol: 3, Progesterone: 2, DHEA: 1 },
  cortisolHomeostasis: { Cortisol: 3, Cortisone: 2, Corticosterone: 1 },
  adrenalAdaptability: { ratio_Cortisol_to_DHEA: 3, ratio_Cortisol_to_Cortisone: 2 },
};

export default function App() {
  // --- State
  const [timepoints, setTimepoints] = useState([
    { label: "T1", values: EXAMPLE_A.values },
    { label: "T2", values: EXAMPLE_B.values },
  ]);
  const [dataset, setDataset] = useState(EXAMPLE_B); // current = last
  const [values, setValues] = useState(EXAMPLE_B.values);
  const [prevValues, setPrevValues] = useState(EXAMPLE_A.values);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [tab, setTab] = useState("home");

  // Utilities to manage timepoints
  const addTimepoint = (ds, label) => {
    setPrevValues(values);
    setDataset(ds);
    setValues(ds.values);
    setTimepoints(prev => [...prev, { label, values: ds.values }]);
  };

  const replaceCurrent = (ds) => {
    setPrevValues(values);
    setDataset(ds);
    setValues(ds.values);
  };

  // --- Biomarker-level scores (current)
  const bioScores = useMemo(() => {
    const out = {};
    Object.keys(values).forEach((k) => {
      const v = values[k];
      const r = REF[k] || {};
      out[k] = rangeCenteredScore(v, r.low, r.high);
    });
    return out;
  }, [values]);

  // --- Ratios (current)
  const ratio = useMemo(() => ({
    Cortisol_to_DHEA: (values.Cortisol != null && values.DHEA != null) ? values.Cortisol / values.DHEA : null,
    Cortisol_to_Cortisone: (values.Cortisol != null && values.Cortisone != null) ? values.Cortisol / values.Cortisone : null,
    Estradiol_to_Estrone: (values.Estradiol != null && values.Estrone != null) ? values.Estradiol / values.Estrone : null,
    TwoOHE1_to_E1: (values["2-Hydroxyestrone"] != null && values.Estrone != null) ? values["2-Hydroxyestrone"] / values.Estrone : null,
  }), [values]);

  // --- Sub-scores (current)
  const estrogenBalance = useMemo(() => {
    const parts = [
      { x: bioScores.Estradiol, w: weights.estrogenBalance.Estradiol },
      { x: bioScores.Estrone, w: weights.estrogenBalance.Estrone },
      { x: bioScores.Estriol, w: weights.estrogenBalance.Estriol },
      { x: bioScores["2-Hydroxyestrone"], w: weights.estrogenBalance["2-Hydroxyestrone"] },
    ];
    const ratioE2E1 = ratioScore(ratio.Estradiol_to_Estrone, 0.6);
    const ratio2OHE1E1 = ratioScore(ratio.TwoOHE1_to_E1, 0.1);
    parts.push({ x: ratioE2E1, w: 2 });
    parts.push({ x: ratio2OHE1E1, w: 2 });
    return weightedAverage(parts);
  }, [bioScores, weights, ratio]);

  const progesteroneSufficiency = useMemo(() => weightedAverage([
    { x: bioScores.Progesterone, w: weights.progesteroneSufficiency.Progesterone },
    { x: bioScores["17-Hydroxyprogesterone"], w: weights.progesteroneSufficiency["17-Hydroxyprogesterone"] },
    { x: bioScores.Pregnenolone, w: weights.progesteroneSufficiency.Pregnenolone },
  ]), [bioScores, weights]);

  const menopauseTransition = useMemo(() => weightedAverage([
    { x: bioScores.Estradiol, w: weights.menopauseTransition.Estradiol },
    { x: bioScores.Progesterone, w: weights.menopauseTransition.Progesterone },
    { x: bioScores.DHEA, w: weights.menopauseTransition.DHEA },
  ]), [bioScores, weights]);

  const cortisolHomeostasis = useMemo(() => weightedAverage([
    { x: bioScores.Cortisol, w: weights.cortisolHomeostasis.Cortisol },
    { x: bioScores.Cortisone, w: weights.cortisolHomeostasis.Cortisone },
    { x: bioScores.Corticosterone, w: weights.cortisolHomeostasis.Corticosterone },
  ]), [bioScores, weights]);

  const adrenalAdaptability = useMemo(() => {
    const s1 = ratioScore(ratio.Cortisol_to_DHEA, 0.08);
    const s2 = ratioScore(ratio.Cortisol_to_Cortisone, 4.5);
    return weightedAverage([
      { x: s1, w: weights.adrenalAdaptability.ratio_Cortisol_to_DHEA },
      { x: s2, w: weights.adrenalAdaptability.ratio_Cortisol_to_Cortisone },
    ]);
  }, [ratio, weights]);

  // --- Panel composites (current)
  const menstrualComposite = useMemo(() => weightedAverage([
    { x: estrogenBalance, w: 3 },
    { x: progesteroneSufficiency, w: 2 },
    { x: menopauseTransition, w: 1 },
  ]), [estrogenBalance, progesteroneSufficiency, menopauseTransition]);

  const adrenalComposite = useMemo(() => weightedAverage([
    { x: cortisolHomeostasis, w: 3 },
    { x: adrenalAdaptability, w: 2 },
  ]), [cortisolHomeostasis, adrenalAdaptability]);

  // --- Helper to compute composites for arbitrary values (for history)
  const computeComposites = (vals) => {
    const bs = {};
    Object.keys(REF).forEach((k) => {
      const v = vals[k];
      const r = REF[k] || {};
      bs[k] = rangeCenteredScore(v, r.low, r.high);
    });
    const rt = {
      Cortisol_to_DHEA: (vals.Cortisol != null && vals.DHEA != null) ? vals.Cortisol / vals.DHEA : null,
      Cortisol_to_Cortisone: (vals.Cortisol != null && vals.Cortisone != null) ? vals.Cortisol / vals.Cortisone : null,
      Estradiol_to_Estrone: (vals.Estradiol != null && vals.Estrone != null) ? vals.Estradiol / vals.Estrone : null,
      TwoOHE1_to_E1: (vals["2-Hydroxyestrone"] != null && vals.Estrone != null) ? vals["2-Hydroxyestrone"] / vals.Estrone : null,
    };
    const estBal = (()=>{
      const parts = [
        { x: bs.Estradiol, w: weights.estrogenBalance.Estradiol },
        { x: bs.Estrone, w: weights.estrogenBalance.Estrone },
        { x: bs.Estriol, w: weights.estrogenBalance.Estriol },
        { x: bs["2-Hydroxyestrone"], w: weights.estrogenBalance["2-Hydroxyestrone"] },
      ];
      const r1 = ratioScore(rt.Estradiol_to_Estrone, 0.6);
      const r2 = ratioScore(rt.TwoOHE1_to_E1, 0.1);
      parts.push({ x: r1, w: 2 });
      parts.push({ x: r2, w: 2 });
      return weightedAverage(parts);
    })();
    const progSuf = weightedAverage([
      { x: bs.Progesterone, w: weights.progesteroneSufficiency.Progesterone },
      { x: bs["17-Hydroxyprogesterone"], w: weights.progesteroneSufficiency["17-Hydroxyprogesterone"] },
      { x: bs.Pregnenolone, w: weights.progesteroneSufficiency.Pregnenolone },
    ]);
    const meno = weightedAverage([
      { x: bs.Estradiol, w: weights.menopauseTransition.Estradiol },
      { x: bs.Progesterone, w: weights.menopauseTransition.Progesterone },
      { x: bs.DHEA, w: weights.menopauseTransition.DHEA },
    ]);
    const cortHomeo = weightedAverage([
      { x: bs.Cortisol, w: weights.cortisolHomeostasis.Cortisol },
      { x: bs.Cortisone, w: weights.cortisolHomeostasis.Cortisone },
      { x: bs.Corticosterone, w: weights.cortisolHomeostasis.Corticosterone },
    ]);
    const adrAdapt = weightedAverage([
      { x: ratioScore(rt.Cortisol_to_DHEA, 0.08), w: weights.adrenalAdaptability.ratio_Cortisol_to_DHEA },
      { x: ratioScore(rt.Cortisol_to_Cortisone, 4.5), w: weights.adrenalAdaptability.ratio_Cortisol_to_Cortisone },
    ]);
    return {
      menstrual: weightedAverage([{ x: estBal, w: 3 }, { x: progSuf, w: 2 }, { x: meno, w: 1 }]),
      adrenal: weightedAverage([{ x: cortHomeo, w: 3 }, { x: adrAdapt, w: 2 }]),
    };
  };

  // --- Build history series for charts
  const historySeries = useMemo(() => {
    const men = [];
    const adr = [];
    timepoints.forEach(tp => {
      const c = computeComposites(tp.values);
      men.push(c.menstrual);
      adr.push(c.adrenal);
    });
    return { men, adr };
  }, [timepoints, weights]);

  // --- Deltas for trends (current vs previous)
  const prevComp = useMemo(() => computeComposites(prevValues), [prevValues, weights]);
  const deltaMenstrual = Math.round((menstrualComposite - prevComp.menstrual) * 10) / 10;
  const deltaAdrenal = Math.round((adrenalComposite - prevComp.adrenal) * 10) / 10;

  // --- UI helpers
  const ScoreCard = ({ title, value, icon, delta, series }) => {
    const band = bandKey(value);
    const up = delta > 0; const down = delta < 0; const flat = delta === 0;
    return (
      <div className={`p-6 rounded-2xl border bg-white shadow-sm ${BAND[band].border}`}>
        <div className="flex items-center gap-6">
          <div className="text-gray-500">{icon}</div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">{title}</div>
            <div className="text-2xl font-semibold flex items-baseline gap-2">
              <span>{value}</span>
              {delta != null && (
                <span className={`text-sm ${up?"text-green-600":down?"text-red-600":"text-gray-500"} flex items-center gap-1`}>
                  {up && <TrendingUp className="w-3.5 h-3.5"/>}
                  {down && <TrendingDown className="w-3.5 h-3.5"/>}
                  {flat && <span>•</span>}
                  {delta > 0 ? `+${delta}` : `${delta}`} <span className="text-gray-500">vs last</span>
                </span>
              )}
            </div>
          </div>
          <Donut value={value} />
        </div>
        {series && (
          <div className="mt-5">
            <TrendChart series={series} labels={timepoints.map(tp=>tp.label)} />
          </div>
        )}
      </div>
    );
  };

  const WeightSlider = ({ label, value, onChange, min=0, max=5 }) => (
    <div className="flex items-center gap-3 py-1">
      <div className="w-44 text-sm text-gray-600">{label}</div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e)=>onChange(Number(e.target.value))}
        className="w-full" />
      <div className="w-10 text-sm text-gray-700 text-right">{value}</div>
    </div>
  );

  const HormoneRow = ({ name }) => {
    const v = values[name];
    const r = REF[name] || {};
    const st = statusFromRange(v, r.low, r.high);
    return (
      <div className="grid grid-cols-12 items-center py-2 border-b last:border-b-0">
        <div className="col-span-4 font-medium">{name}</div>
        <div className="col-span-3 text-gray-700">{v ?? "—"} {r.unit || ""}</div>
        <div className="col-span-3 text-sm text-gray-500">Ref: {r.low ?? "?"}–{r.high ?? "?"} {r.unit || ""}</div>
        <div className="col-span-2">
          <span className={`px-2 py-1 rounded-full text-xs ${st.tone}`}>{st.label}</span>
        </div>
      </div>
    );
  };

  // --- Sidebar (dataset + weights)
  const Sidebar = () => (
    <aside className="space-y-6">
      <div className="p-5 rounded-2xl border bg-white shadow-sm">
        <div className="text-sm text-gray-500">Data & Testing</div>
        <div className="font-semibold mt-1">{dataset.label}</div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button className="px-2 py-1 text-xs rounded-md bg-gray-100" onClick={()=>replaceCurrent(EXAMPLE_A)}>Use Example A</button>
          <button className="px-2 py-1 text-xs rounded-md bg-gray-100" onClick={()=>replaceCurrent(EXAMPLE_B)}>Use Example B</button>
          <button className="px-2 py-1 text-xs rounded-md bg-gray-100" onClick={()=>addTimepoint(EXAMPLE_A, `T${timepoints.length+1}`)}>Add TP (A)</button>
          <button className="px-2 py-1 text-xs rounded-md bg-gray-100" onClick={()=>addTimepoint(EXAMPLE_B, `T${timepoints.length+1}`)}>Add TP (B)</button>
        </div>
        <div className="text-xs text-gray-500 mt-2">Timepoints in view: {timepoints.length}</div>
      </div>

      {tab === 'menstrual' && (
        <div className="p-5 rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-500"/>
            <div className="font-semibold">Tweak Weights – Menstrual</div>
          </div>
          <div className="text-xs uppercase text-gray-400 mb-2">Estrogen Balance</div>
          {Object.entries(weights.estrogenBalance).map(([k,v])=> (
            <WeightSlider key={k} label={k} value={v}
              onChange={(nv)=>setWeights(prev=>({ ...prev, estrogenBalance: { ...prev.estrogenBalance, [k]: nv }}))} />
          ))}
          <div className="text-xs uppercase text-gray-400 mt-4 mb-2">Progesterone Sufficiency</div>
          {Object.entries(weights.progesteroneSufficiency).map(([k,v])=> (
            <WeightSlider key={k} label={k} value={v}
              onChange={(nv)=>setWeights(prev=>({ ...prev, progesteroneSufficiency: { ...prev.progesteroneSufficiency, [k]: nv }}))} />
          ))}
          <div className="text-xs uppercase text-gray-400 mt-4 mb-2">Menopause Transition Index</div>
          {Object.entries(weights.menopauseTransition).map(([k,v])=> (
            <WeightSlider key={k} label={k} value={v}
              onChange={(nv)=>setWeights(prev=>({ ...prev, menopauseTransition: { ...prev.menopauseTransition, [k]: nv }}))} />
          ))}
        </div>
      )}

      {tab === 'adrenal' && (
        <div className="p-5 rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-500"/>
            <div className="font-semibold">Tweak Weights – Adrenal</div>
          </div>
          <div className="text-xs uppercase text-gray-400 mb-2">Cortisol Homeostasis</div>
          {Object.entries(weights.cortisolHomeostasis).map(([k,v])=> (
            <WeightSlider key={k} label={k} value={v}
              onChange={(nv)=>setWeights(prev=>({ ...prev, cortisolHomeostasis: { ...prev.cortisolHomeostasis, [k]: nv }}))} />
          ))}
          <div className="text-xs uppercase text-gray-400 mt-4 mb-2">Adrenal Adaptability (ratios)</div>
          {Object.entries(weights.adrenalAdaptability).map(([k,v])=> (
            <WeightSlider key={k} label={k.replaceAll('_',' : ')} value={v}
              onChange={(nv)=>setWeights(prev=>({ ...prev, adrenalAdaptability: { ...prev.adrenalAdaptability, [k]: nv }}))} />
          ))}
          <div className="mt-2 text-xs text-gray-500">
            Ratio targets (demo): Cortisol:DHEA 0.08, Cortisol:Cortisone 4.5
          </div>
        </div>
      )}
    </aside>
  );

  // --- Render
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-6 h-6 text-indigo-600"/>
            <div>
              <div className="font-semibold">Molecular You</div>
              <div className="text-xs text-gray-500">Hormone Score Prototype</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button onClick={()=>setTab("home")} className={`px-3 py-1.5 rounded-full ${tab==='home'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700'}`}><Home className="inline w-4 h-4 mr-1"/>Home</button>
            <button onClick={()=>setTab("menstrual")} className={`px-3 py-1.5 rounded-full ${tab==='menstrual'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700'}`}>Menstrual Irregularities & Fertility</button>
            <button onClick={()=>setTab("adrenal")} className={`px-3 py-1.5 rounded-full ${tab==='adrenal'?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700'}`}>Adrenal & Endocrine Disorders</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* LAYOUT GRID: main content + sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          <div className="xl:col-span-3 space-y-8">
            {/* HOME TAB */}
            {tab === 'home' && (
              <section className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <ScoreCard title="Menstrual/Fertility Composite" value={menstrualComposite} icon={<Beaker/>} delta={deltaMenstrual} series={historySeries.men} />
                  <ScoreCard title="Adrenal/Endocrine Composite" value={adrenalComposite} icon={<Activity/>} delta={deltaAdrenal} series={historySeries.adr} />
                </div>
                <div className="text-sm text-gray-600">
                  Tip: use the tabs above to drill into each category. The home page is intended for a quick client overview.
                </div>
              </section>
            )}

            {/* MENSTRUAL TAB */}
            {tab === 'menstrual' && (
              <section className="space-y-8">
                {/* Headline score only for THIS category */}
                <div className="p-6 rounded-2xl border bg-white shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Main Category</div>
                    <div className="text-xl font-semibold">Menstrual Irregularities & Infertility</div>
                  </div>
                  <Donut value={menstrualComposite} />
                </div>

                {/* Sub-scores shown as horizontal bars */}
                <div className="p-6 rounded-2xl border bg-white shadow-sm">
                  <div className="text-sm text-gray-500 mb-4">Sub-scores</div>
                  <div className="space-y-4">
                    <BarRow label="Estrogen Balance" value={estrogenBalance} />
                    <BarRow label="Progesterone Sufficiency" value={progesteroneSufficiency} />
                    <BarRow label="Menopause Transition Index" value={menopauseTransition} />
                  </div>
                </div>

                <div className="p-6 rounded-2xl border bg-white shadow-sm">
                  <div className="text-sm text-gray-500 mb-2">Hormone measurements (example)</div>
                  <div className="grid grid-cols-12 font-medium text-sm border-b py-2">
                    <div className="col-span-4">Analyte</div>
                    <div className="col-span-3">Value</div>
                    <div className="col-span-3">Reference</div>
                    <div className="col-span-2">Status</div>
                  </div>
                  {["Progesterone","17-Hydroxyprogesterone","Estrone","Estradiol","Estriol","2-Hydroxyestrone","Pregnenolone"].map((k)=> <HormoneRow key={k} name={k} />)}
                </div>
              </section>
            )}

            {/* ADRENAL TAB */}
            {tab === 'adrenal' && (
              <section className="space-y-8">
                {/* Headline score only for THIS category */}
                <div className="p-6 rounded-2xl border bg-white shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Main Category</div>
                    <div className="text-xl font-semibold">Adrenal & Endocrine Disorders</div>
                  </div>
                  <Donut value={adrenalComposite} />
                </div>

                {/* Sub-scores shown as horizontal bars */}
                <div className="p-6 rounded-2xl border bg-white shadow-sm">
                  <div className="text-sm text-gray-500 mb-4">Sub-scores</div>
                  <div className="space-y-4">
                    <BarRow label="Cortisol Homeostasis" value={cortisolHomeostasis} />
                    <BarRow label="Adrenal Adaptability" value={adrenalAdaptability} />
                  </div>
                </div>

                <div className="p-6 rounded-2xl border bg-white shadow-sm">
                  <div className="text-sm text-gray-500 mb-2">Hormone measurements (example)</div>
                  <div className="grid grid-cols-12 font-medium text-sm border-b py-2">
                    <div className="col-span-4">Analyte</div>
                    <div className="col-span-3">Value</div>
                    <div className="col-span-3">Reference</div>
                    <div className="col-span-2">Status</div>
                  </div>
                  {["Cortisol","Cortisone","Corticosterone","Aldosterone","17-Hydroxyprogesterone","Pregnenolone","DHEA"].map((k)=> <HormoneRow key={k} name={k} />)}
                </div>
              </section>
            )}

            {/* FOOTER */}
            <div className="mt-6 text-xs text-gray-500">
              This UI and scoring math are prototypes for exploration only and are not medical advice.
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="xl:col-span-2 space-y-6">
            <Sidebar />
          </div>
        </div>
      </main>
    </div>
  );
}