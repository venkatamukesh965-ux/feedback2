import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Upload, FileText, Users, AlertTriangle, MessageSquareWarning, Search,
  Download, Sparkles, Activity, RefreshCw, CheckCircle2, Zap, ShieldCheck,
  Database, Orbit, Layers3, BrainCircuit, Radar, ScanSearch, TrendingUp,
  Gauge, Filter, ArrowUpRight, ChevronRight, Cpu, Network, Waves, Eye,
  Crosshair, Command, BarChart3, CircleDot, Bot, Fingerprint, Target,
  Flame, Clock3, Copy, Radio, SlidersHorizontal, Maximize2, X
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, LineChart, Line
} from "recharts";
import "./index.css";

const nf = new Intl.NumberFormat();
const fmt = (n) => nf.format(n ?? 0);
const pct = (n) => `${Number(n ?? 0).toFixed(1)}%`;
const colors = ["#22d3ee", "#8b5cf6", "#34d399", "#f59e0b", "#fb7185", "#60a5fa", "#f472b6"];

function App() {
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sentiment, setSentiment] = useState("all");
  const [issue, setIssue] = useState("all");
  const [command, setCommand] = useState(false);
  const input = useRef();

  const analyze = async (selected) => {
    if (!selected) return;
    setFile(selected); setLoading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", selected);
      const response = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (e) { setError(e.message); setResult(null); }
    finally { setLoading(false); }
  };

  const downloadPdf = async () => {
    if (!result) return;
    try {
      const response = await fetch("/api/report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, filename: result.filename }),
      });
      if (!response.ok) throw new Error("PDF generation failed");
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "feedback-intelligence-report.pdf"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
  };

  const filtered = useMemo(() => {
    const rows = result?.all_records || []; const q = query.toLowerCase().trim();
    return rows.filter((x) => {
      const hay = `${x.user} ${x.channel} ${x.text}`.toLowerCase();
      return (!q || hay.includes(q)) && (sentiment === "all" || x.sentiment === sentiment)
        && (issue === "all" || (issue === "issue" && x.issue) || (issue === "nonissue" && !x.issue));
    }).slice(0, 500);
  }, [result, query, sentiment, issue]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#02030b] text-slate-100 selection:bg-cyan-300/30">
      <NexusBackdrop />
      <div className="scanlines pointer-events-none fixed inset-0 z-[80] opacity-[.035]" />
      <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#02030b]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="brand-core"><div className="brand-orbit"/><div className="brand-orbit two"/><Orbit size={20}/></div>
            <div><div className="text-sm font-black tracking-[.16em]">NEXUS<span className="text-cyan-300">.INTEL</span></div><div className="text-[9px] uppercase tracking-[.28em] text-slate-600">Feedback intelligence command system</div></div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <StatusPill icon={<Radio size={11}/>} text="LIVE ANALYSIS" />
            <button onClick={() => setCommand(true)} className="rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-xs text-slate-400 transition hover:border-cyan-300/30 hover:text-cyan-200"><Command size={13} className="mr-2 inline"/>Command</button>
            {result && <button onClick={downloadPdf} className="flex items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-200 transition hover:-translate-y-0.5 hover:bg-cyan-300/15 hover:shadow-[0_0_35px_rgba(34,211,238,.16)]"><Download size={14}/> Export PDF</button>}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        {!result ? <Landing input={input} loading={loading} file={file} error={error} onFile={analyze}/> : <Dashboard result={result} filtered={filtered} query={query} setQuery={setQuery} sentiment={sentiment} setSentiment={setSentiment} issue={issue} setIssue={setIssue} downloadPdf={downloadPdf} onNew={() => {setResult(null);setFile(null);setError("");}}/>}
      </main>
      <footer className="relative z-10 mx-auto max-w-[1700px] px-5 pb-8 pt-3 text-center text-[9px] uppercase tracking-[.35em] text-slate-700">NEXUS INTELLIGENCE GRID · LOCAL ANALYSIS · SIGNAL / PATTERN / ACTION</footer>
      {command && <CommandDeck close={() => setCommand(false)} />}
    </div>
  );
}

function NexusBackdrop() {
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(34,211,238,.13),transparent_32%),radial-gradient(circle_at_92%_24%,rgba(139,92,246,.14),transparent_27%),radial-gradient(circle_at_5%_72%,rgba(14,165,233,.09),transparent_30%)]"/>
    <div className="hud-grid absolute inset-x-[-10%] top-[-5%] h-[80vh] opacity-50"/>
    <div className="absolute left-[5%] top-[15%] h-72 w-72 rounded-full bg-cyan-400/10 blur-[120px] animate-pulse"/>
    <div className="absolute right-[0%] top-[38%] h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-[140px] animate-pulse [animation-delay:1s]"/>
    <div className="absolute bottom-[5%] left-[38%] h-80 w-80 rounded-full bg-blue-500/[.06] blur-[130px]"/>
    <div className="absolute left-1/2 top-20 h-1 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_90px_40px_rgba(34,211,238,.25)]"/>
  </div>;
}

function Landing({input,loading,file,error,onFile}) {
  return <section className="min-h-[calc(100vh-120px)] py-3 lg:py-8">
    <div className="grid items-center gap-10 xl:grid-cols-[1.08fr_.92fr]">
      <div className="relative py-6 lg:py-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[.055] px-4 py-2 text-[10px] font-black uppercase tracking-[.3em] text-cyan-200 shadow-[0_0_45px_rgba(34,211,238,.08)]"><Radar size={13} className="animate-pulse"/> Autonomous feedback observatory</div>
        <h1 className="max-w-5xl text-5xl font-black leading-[.88] tracking-[-.07em] sm:text-7xl lg:text-[7.4rem]">Feedback<br/><span className="chrome-text">into signal.</span></h1>
        <p className="mt-8 max-w-2xl text-base leading-8 text-slate-400 md:text-lg">Drop your exported reviews. The engine scans every record, surfaces recurring pain, maps sentiment, detects repetition and turns raw feedback into an interactive intelligence command center.</p>
        <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[[BrainCircuit,"TOPICS"],[Fingerprint,"DUPLICATES"],[TrendingUp,"TRENDS"],[ShieldCheck,"LOCAL"]].map(([I,t],i)=><div key={t} className="feature-chip" style={{animationDelay:`${i*120}ms`}}><I size={15}/><span>{t}</span></div>)}
        </div>
        <div className="mt-9 flex items-center gap-5 text-[10px] uppercase tracking-[.22em] text-slate-600"><span><span className="text-cyan-300">●</span> XML</span><span>CSV</span><span>JSON</span><span>TSV</span><span>TXT</span><span className="hidden sm:inline">25 MB MAX</span></div>
      </div>
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="holo-stage">
          <div className="orbit-ring r1"/><div className="orbit-ring r2"/><div className="orbit-ring r3"/>
          <div className="stage-sphere"><div className="sphere-core"><div className="sphere-cross"/><Cpu size={38}/></div></div>
          <div className="float-card c1"><Activity size={13}/><span>Signal</span><b>LIVE</b></div>
          <div className="float-card c2"><Waves size={13}/><span>Patterns</span><b>∞</b></div>
          <div className="float-card c3"><Target size={13}/><span>Precision</span><b>HIGH</b></div>
          <div className="float-card c4"><Database size={13}/><span>Local</span><b>SAFE</b></div>
          <Dropzone input={input} loading={loading} file={file} onFile={onFile}/>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}
      </div>
    </div>
    <div className="mt-7 grid gap-3 sm:grid-cols-3">
      <MetricStrip icon={<ScanSearch/>} title="Pattern engine" text="Recurring themes + near-duplicates"/>
      <MetricStrip icon={<BarChart3/>} title="Signal mapping" text="Volume, sentiment + issue density"/>
      <MetricStrip icon={<FileText/>} title="Executive output" text="One-click intelligence PDF"/>
    </div>
  </section>;
}

function Dropzone({input,loading,file,onFile}) {
  return <div onClick={()=>!loading&&input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();onFile(e.dataTransfer.files[0]);}} className="drop-core group">
    <input ref={input} type="file" accept=".xml,.csv,.json,.tsv,.txt" className="hidden" onChange={e=>onFile(e.target.files[0])}/>
    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,.08),transparent_36%,rgba(139,92,246,.09))]"/>
    <div className="energy-line"/><div className="energy-line two"/>
    <div className="relative z-10 flex min-h-[430px] flex-col items-center justify-center text-center px-8">
      <div className="upload-reactor"><div className="reactor-ring one"/><div className="reactor-ring two"/><div className="reactor-ring three"/><div className="reactor-center">{loading?<RefreshCw size={30} className="animate-spin text-cyan-200"/>:<Upload size={30} className="text-cyan-200"/>}</div></div>
      <div className="mt-7 text-2xl font-black tracking-tight">{loading?"Reading intelligence stream…":file?file.name:"Drop data into the reactor"}</div>
      <div className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Every row becomes a signal. Every repeated complaint becomes a pattern.</div>
      <div className="mt-7 rounded-full border border-cyan-300/15 bg-cyan-300/[.06] px-5 py-2.5 text-[10px] font-black uppercase tracking-[.25em] text-cyan-200">{file&&!loading?<><CheckCircle2 size={13} className="mr-2 inline text-emerald-300"/>Dataset loaded · replace</>:<>Click or drag · initialize</>}</div>
    </div>
  </div>;
}

function MetricStrip({icon,title,text}) { return <div className="metric-strip"><div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/10 bg-cyan-300/[.06] text-cyan-300">{icon}</div><div><div className="text-xs font-bold text-slate-300">{title}</div><div className="mt-1 text-[10px] text-slate-600">{text}</div></div><ChevronRight className="ml-auto text-slate-700" size={15}/></div>; }
function StatusPill({icon,text}) { return <div className="flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-3 py-1.5 text-[9px] font-black tracking-[.18em] text-emerald-300">{icon}{text}</div>; }

function Dashboard({result:r,filtered,query,setQuery,sentiment,setSentiment,issue,setIssue,downloadPdf,onNew}) {
  const issues = r.top_issues || r.topics || [];
  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/10 bg-white/[.02] p-6 lg:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(34,211,238,.10),transparent_28%),radial-gradient(circle_at_20%_100%,rgba(139,92,246,.08),transparent_30%)]"/>
      <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
        <div><div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.3em] text-cyan-300"><Activity size={13}/> Intelligence stream online</div><h2 className="text-4xl font-black tracking-[-.06em] md:text-6xl">Command center<span className="text-cyan-300">.</span></h2><p className="mt-3 text-xs text-slate-600">{r.filename} · {fmt(r.records)} records · {fmt(r.unique_users)} unique users</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={onNew} className="rounded-xl border border-white/10 bg-white/[.035] px-4 py-2.5 text-xs text-slate-400 transition hover:bg-white/[.07]">New analysis</button><button onClick={downloadPdf} className="flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 shadow-[0_0_45px_rgba(34,211,238,.2)] transition hover:-translate-y-1 hover:bg-cyan-200"><Download size={14}/> PDF report</button></div>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">{["INGEST","PARSE","CLUSTER","SENTIMENT","DUPLICATE","TREND","SYNTHESIZE","READY"].map((x,i)=><div key={x} className="pipeline-node"><span>{String(i+1).padStart(2,"0")}</span>{x}</div>)}</div>
    </section>

    <Kpis r={r}/>
    <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <Panel title="Signal pressure matrix" subtitle="How much of the dataset contains issue-bearing feedback" icon={<Gauge size={17}/>}> <SignalMatrix r={r}/></Panel>
      <Panel title="Sentiment field" subtitle="Overall tone distribution" icon={<Sparkles size={17}/>}> <SentimentField r={r}/></Panel>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Recurring issue radar" subtitle="Highest repeated topics in the dataset" icon={<Radar size={17}/>}><Topics topics={issues}/></Panel>
      <Panel title="Pain-point sectors" subtitle="Operational categories extracted from issue language" icon={<Layers3 size={17}/>}><CategoryChart data={r.categories||[]}/></Panel>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Panel title="Temporal signal graph" subtitle="Feedback volume over time" icon={<TrendingUp size={17}/>}><TrendChart data={r.trend||[]}/></Panel>
      <Panel title="AI telemetry" subtitle="Synthetic operational view of the current dataset" icon={<Bot size={17}/>}><Telemetry r={r}/></Panel>
    </div>

    <DuplicateRadar r={r}/>
    <InsightWall r={r}/>
    <RecordExplorer filtered={filtered} query={query} setQuery={setQuery} sentiment={sentiment} setSentiment={setSentiment} issue={issue} setIssue={setIssue}/>
  </div>;
}

function Kpis({r}) { const cards=[[Database,"TOTAL FEEDBACK",r.records,"cyan"],[Users,"UNIQUE USERS",r.unique_users,"violet"],[AlertTriangle,"ISSUE-BEARING",r.issue_records??r.issue_count,"rose"],[Sparkles,"NEGATIVE",r.sentiment?.Negative||0,"amber"]]; return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([I,l,v,t],i)=><div key={l} className="kpi-card" style={{animationDelay:`${i*80}ms`}}><div className="kpi-glow"/><div className={`kpi-icon ${t}`}><I size={18}/></div><div className="relative z-10 mt-7 text-4xl font-black tracking-[-.04em]">{fmt(v)}</div><div className="relative z-10 mt-1 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">{l}</div><ArrowUpRight className="absolute right-4 top-4 text-slate-700" size={15}/><div className="kpi-bars"><i/><i/><i/><i/><i/><i/><i/><i/></div></div>)}</div>; }

function SignalMatrix({r}) { const rate=Number(r.issue_rate??r.issue_pct??0); return <div className="grid items-center gap-8 md:grid-cols-[250px_1fr]"><div className="relative mx-auto h-56 w-56"><div className="signal-dial"><div className="dial-core"><b>{pct(rate)}</b><span>ISSUE SIGNAL</span></div></div><div className="dial-tick t1"/><div className="dial-tick t2"/><div className="dial-tick t3"/><div className="dial-tick t4"/></div><div className="grid gap-3 sm:grid-cols-3"><MiniStat icon={<AlertTriangle size={15}/>} label="Issue records" value={r.issue_records??r.issue_count}/><MiniStat icon={<Users size={15}/>} label="Unique users" value={r.unique_users}/><MiniStat icon={<MessageSquareWarning size={15}/>} label="Topics detected" value={(r.top_issues??r.topics??[]).length}/></div></div>; }
function SentimentField({r}) { const data=["Negative","Neutral","Positive"].map(k=>({name:k,value:r.sentiment?.[k]||0})); return <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={data} dataKey="value" innerRadius={66} outerRadius={94} paddingAngle={5}>{[0,1,2].map(i=><Cell key={i} fill={colors[i+4]}/>)}</Pie><Tooltip contentStyle={{background:"#07111f",border:"1px solid #24364d",borderRadius:14}}/><text x="50%" y="47%" textAnchor="middle" fill="#f8fafc" fontSize="27" fontWeight="800">{fmt(r.records)}</text><text x="50%" y="59%" textAnchor="middle" fill="#64748b" fontSize="10">RECORDS</text></PieChart></ResponsiveContainer>; }
function TrendChart({data}) { if(data.length<2) return <div className="grid min-h-[280px] place-items-center text-sm text-slate-600">Not enough dated feedback for a temporal graph.</div>; return <ResponsiveContainer width="100%" height={300}><AreaChart data={data}><defs><linearGradient id="nexusTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity=".4"/><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" stroke="#475569" tick={{fill:"#64748b",fontSize:10}}/><YAxis stroke="#475569" tick={{fill:"#64748b",fontSize:10}}/><Tooltip contentStyle={{background:"#07111f",border:"1px solid #24364d",borderRadius:14}}/><Area type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={3} fill="url(#nexusTrend)"/></AreaChart></ResponsiveContainer>; }
function Telemetry({r}) { const vals=[Number(r.records||0),Number(r.unique_users||0),Number(r.issue_records??r.issue_count??0),Number(r.sentiment?.Negative||0),Number((r.top_issues||r.topics||[]).length)]; return <div className="space-y-4">{[["DATA INGESTION",100,"cyan"],["PATTERN COVERAGE",Math.min(98,45+vals[4]*6),"violet"],["ISSUE DENSITY",Math.min(100,Number(r.issue_rate??r.issue_pct??0)),"rose"],["USER COVERAGE",r.records?Math.min(100,(r.unique_users/r.records)*100):0,"emerald"]].map(([l,v,t])=><div key={l}><div className="mb-2 flex justify-between text-[9px] font-black tracking-[.2em] text-slate-600"><span>{l}</span><span>{Number(v).toFixed(0)}%</span></div><div className="telemetry-track"><div className={`telemetry-fill ${t}`} style={{width:`${Math.max(4,Math.min(100,v))}%`}}/></div></div>)}<div className="grid grid-cols-3 gap-2 pt-2">{["CPU","MODEL","LOCAL"].map((x,i)=><div key={x} className="rounded-xl border border-white/[.06] bg-white/[.025] p-3 text-center"><div className="text-[8px] uppercase tracking-[.2em] text-slate-600">{x}</div><div className="mt-1 text-xs font-bold text-cyan-300">{i===0?"READY":i===1?"NEXUS":"ON"}</div></div>)}</div></div>; }

function DuplicateRadar({r}) { const groups=r.near_duplicates||r.duplicate_groups||r.repeated_feedback||[]; const count=Array.isArray(groups)?groups.length:0; return <Panel title="Repetition & duplicate intelligence" subtitle="Exact and near-identical feedback signals" icon={<Fingerprint size={17}/>}><div className="grid gap-5 lg:grid-cols-[.65fr_1.35fr]"><div className="duplicate-core"><div className="duplicate-scan"/><Copy size={25}/><strong>{fmt(count)}</strong><span>detected groups</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{["Exact repeats","Near duplicates","Repeated complaints","Signal compression","Noise reduction","Cluster confidence"].map((x,i)=><div key={x} className="mini-intel"><CircleDot size={12}/><span>{x}</span><b>{i<2?count: i===2?fmt(r.issue_records??r.issue_count):"ACTIVE"}</b></div>)}</div></div></Panel>; }
function InsightWall({r}) { const cats=r.categories||[]; const top=(r.top_issues||r.topics||[]).slice(0,4); return <section className="insight-wall"><div className="relative z-10"><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.28em] text-violet-300"><Sparkles size={13}/> Intelligence synthesis</div><h3 className="text-2xl font-black tracking-tight md:text-3xl">What the dataset is telling you</h3><p className="mt-2 max-w-2xl text-xs leading-6 text-slate-500">A visual summary layer built directly from the analyzer output — recurring issues, category pressure and sentiment concentration.</p></div><div className="relative z-10 mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{top.map((x,i)=><div className="insight-card" key={`${x.topic||x.name||i}`}><div className="text-[9px] font-black tracking-[.2em] text-slate-600">SIGNAL {String(i+1).padStart(2,"0")}</div><div className="mt-3 text-sm font-bold text-slate-200">{x.topic||x.name||"Recurring signal"}</div><div className="mt-2 text-2xl font-black text-cyan-300">{fmt(x.mentions??x.count??0)}</div><div className="text-[9px] uppercase tracking-widest text-slate-600">mentions</div></div>)}{!top.length&&<div className="col-span-full rounded-2xl border border-white/[.06] p-6 text-sm text-slate-600">No recurring issue signals were returned by the analyzer.</div>}{cats.slice(0,2).map((x,i)=><div className="insight-card violet" key={`cat-${i}`}><div className="text-[9px] font-black tracking-[.2em] text-slate-600">SECTOR</div><div className="mt-3 text-sm font-bold text-slate-200">{x.category}</div><div className="mt-2 text-2xl font-black text-violet-300">{fmt(x.count)}</div><div className="text-[9px] uppercase tracking-widest text-slate-600">issue records</div></div>)}</div></section>; }

function RecordExplorer({filtered,query,setQuery,sentiment,setSentiment,issue,setIssue}) { return <Panel title="Record intelligence explorer" subtitle="Search, filter and inspect individual feedback signals" icon={<ScanSearch size={17}/>}><div className="mb-5 grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search user, channel or feedback signal…" className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10"/></div><div className="flex flex-wrap gap-2"><FilterButton active={sentiment==="all"} onClick={()=>setSentiment("all")}>All tone</FilterButton><FilterButton active={sentiment==="Negative"} onClick={()=>setSentiment("Negative")}>Negative</FilterButton><FilterButton active={sentiment==="Positive"} onClick={()=>setSentiment("Positive")}>Positive</FilterButton><FilterButton active={issue==="issue"} onClick={()=>setIssue(issue==="issue"?"all":"issue")}>Issues</FilterButton><FilterButton active={issue==="nonissue"} onClick={()=>setIssue(issue==="nonissue"?"all":"nonissue")}>Non-issues</FilterButton></div></div><div className="overflow-x-auto rounded-2xl border border-white/[.06]"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white/[.03] text-[9px] uppercase tracking-[.2em] text-slate-600"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Tone</th><th className="px-4 py-3">Signal</th><th className="px-4 py-3">Feedback</th></tr></thead><tbody className="divide-y divide-white/[.05]">{filtered.map((x,i)=><tr key={`${x.index}-${i}`} className="transition hover:bg-cyan-300/[.025]"><td className="px-4 py-3 font-semibold text-slate-300">{x.user}</td><td className="px-4 py-3 text-slate-500">{x.channel}</td><td className="px-4 py-3"><Tone value={x.sentiment}/></td><td className="px-4 py-3">{x.issue?<span className="rounded-full border border-rose-300/15 bg-rose-300/10 px-2 py-1 text-[10px] text-rose-300">ISSUE</span>:<span className="text-slate-700">—</span>}</td><td className="max-w-[700px] px-4 py-3 text-slate-400">{x.text}</td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[.15em] text-slate-700"><span>Showing {fmt(filtered.length)} records</span><span>Display cap 500</span></div></Panel>; }

function Panel({title,subtitle,icon,children,className=""}) { return <section className={`panel-3d ${className}`}><div className="panel-sheen"/><div className="relative z-10 mb-5 flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-bold text-slate-200">{icon}<span>{title}</span></div><div className="mt-1 text-[10px] uppercase tracking-[.12em] text-slate-600">{subtitle}</div></div><Maximize2 size={14} className="text-slate-700"/></div><div className="relative z-10">{children}</div></section>; }
function MiniStat({icon,label,value}) { return <div className="rounded-2xl border border-white/[.06] bg-white/[.025] p-4 transition hover:-translate-y-1 hover:border-cyan-300/15"><div className="mb-5 text-cyan-300">{icon}</div><div className="text-2xl font-black">{fmt(value)}</div><div className="mt-1 text-[10px] uppercase tracking-[.15em] text-slate-600">{label}</div></div>; }
function Topics({topics=[]}) { if(!topics.length)return <div className="rounded-2xl border border-white/[.06] p-8 text-center text-sm text-slate-600">No recurring topics detected.</div>; const max=Math.max(...topics.map(x=>x.mentions||x.count||0),1); return <div className="space-y-2">{topics.slice(0,10).map((x,i)=>{const v=x.mentions||x.count||0;const label=x.topic||x.name||"Unknown";return <div key={`${label}-${i}`} className="topic-row"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-200">{label}</div><div className="mt-1 truncate text-[10px] text-slate-700">{x.sample||"Recurring feedback signal"}</div></div><div className="shrink-0 text-right"><div className="text-lg font-black text-cyan-300">{fmt(v)}</div><div className="text-[8px] uppercase tracking-widest text-slate-700">mentions</div></div></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[.04]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 transition-all duration-1000" style={{width:`${Math.max(5,v/max*100)}%`}}/></div></div>})}</div>; }
function CategoryChart({data=[]}) { if(!data.length)return <div className="grid min-h-[280px] place-items-center text-sm text-slate-600">No issue categories detected.</div>; return <ResponsiveContainer width="100%" height={310}><BarChart data={data.slice(0,8)} layout="vertical" margin={{left:12,right:20}}><CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false}/><XAxis type="number" stroke="#475569" tick={{fill:"#64748b",fontSize:10}}/><YAxis type="category" dataKey="category" width={125} stroke="#475569" tick={{fill:"#94a3b8",fontSize:10}}/><Tooltip contentStyle={{background:"#07111f",border:"1px solid #24364d",borderRadius:14}}/><Bar dataKey="count" radius={[0,8,8,0]} fill="#22d3ee"/></BarChart></ResponsiveContainer>; }
function FilterButton({active,onClick,children}) { return <button onClick={onClick} className={`rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] transition ${active?"border-cyan-300/30 bg-cyan-300/10 text-cyan-200":"border-white/10 bg-white/[.03] text-slate-600 hover:text-slate-300"}`}>{children}</button>; }
function Tone({value}) { const cls=value==="Negative"?"text-rose-300 bg-rose-300/10 border-rose-300/15":value==="Positive"?"text-emerald-300 bg-emerald-300/10 border-emerald-300/15":"text-slate-400 bg-white/5 border-white/10"; return <span className={`rounded-full border px-2 py-1 text-[10px] ${cls}`}>{value}</span>; }
function CommandDeck({close}) { return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-5 backdrop-blur-md" onClick={close}><div onClick={e=>e.stopPropagation()} className="command-deck"><div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-[.3em] text-cyan-300">NEXUS COMMAND DECK</div><div className="mt-2 text-2xl font-black">System controls</div></div><button onClick={close} className="rounded-xl border border-white/10 p-2 text-slate-500 hover:text-white"><X size={16}/></button></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{[[SlidersHorizontal,"Analysis controls","Ready"],[Network,"Signal network","Online"],[Eye,"Visual telemetry","Active"],[Crosshair,"Focus mode","Armed"]].map(([I,t,s])=><div key={t} className="command-item"><I size={17} className="text-cyan-300"/><div><div className="text-sm font-bold">{t}</div><div className="mt-1 text-[10px] text-slate-600">{s}</div></div><span className="ml-auto h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.8)]"/></div>)}</div><div className="mt-6 rounded-2xl border border-cyan-300/10 bg-cyan-300/[.04] p-4 text-xs leading-6 text-slate-500">This deck is a visual command layer. Existing analysis, upload and PDF APIs remain unchanged.</div></div></div>; }

createRoot(document.getElementById("root")).render(<App/>);
