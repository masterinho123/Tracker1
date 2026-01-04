const { useState, useEffect, useMemo, useRef } = React;

const SimpleAreaChart = ({ values = [], color = "#10B981", maxY = 100, labels = [] }) => {
    const { useState, useRef } = React;
    const [hoverIndex, setHoverIndex] = useState(null);
    const containerRef = useRef(null);
    const w = Math.max(1, values.length - 1);
    const h = 100;
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    const pts = values.map((v, i) => {
        const x = (i / Math.max(1, values.length - 1)) * w;
        const y = h - clamp(v, 0, maxY) / maxY * h;
        return [x, y];
    });
    const tension = 0.9;
    const pathParts = [];
    for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        if (i === 0) {
            pathParts.push(`M${x},${y}`);
        } else {
            const p0 = pts[i - 2] || pts[i - 1];
            const p1 = pts[i - 1];
            const p2 = pts[i];
            const p3 = pts[i + 1] || p2;
            const cp1x = p1[0] + (p2[0] - p0[0]) / 6 * tension;
            const cp1y = p1[1] + (p2[1] - p0[1]) / 6 * tension;
            const cp2x = p2[0] - (p3[0] - p1[0]) / 6 * tension;
            const cp2y = p2[1] - (p3[1] - p1[1]) / 6 * tension;
            pathParts.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`);
        }
    }
    const topPath = pathParts.join(' ');
    const areaPath = `${topPath} L ${w},${h} L 0,${h} Z`;
    const hs = hoverIndex != null ? pts[hoverIndex] : null;
    const label = (i) => labels && labels[i] != null ? labels[i] : `${i+1}`;
    return (
        <div ref={containerRef} className="w-full h-full relative"
            onMouseMove={(e) => {
                const rect = containerRef.current.getBoundingClientRect();
                const relX = e.clientX - rect.left;
                const idx = Math.round((relX / rect.width) * (values.length - 1));
                setHoverIndex(clamp(idx, 0, values.length - 1));
            }}
            onMouseLeave={() => setHoverIndex(null)}
        >
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%">
                <defs>
                    <linearGradient id="simpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity="0.18"/>
                        <stop offset="95%" stopColor={color} stopOpacity="0"/>
                    </linearGradient>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor={color} floodOpacity="0.15"/>
                    </filter>
                </defs>
                <path d={areaPath} fill="url(#simpGrad)" />
                <path d={topPath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" filter="url(#shadow)"/>
            </svg>
            {hs && (
                <div style={{ left: `${(hs[0]/w)*100}%`, top: `${(hs[1]/h)*100}%` }} className="absolute -translate-x-1/2 -translate-y-3 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded shadow border border-[#1f2937]">
                    <span className="font-bold">{label(hoverIndex)}</span> <span className="ml-1">{Math.round(values[hoverIndex])}</span>
                </div>
            )}
        </div>
    );
};

const SimpleLineChart = ({ values = [], color = "#22c55e", maxY = 100, opacity = 0.7, showDots = true }) => {
    const w = Math.max(1, values.length - 1);
    const h = 100;
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    const pts = values.map((v, i) => {
        const x = (i / Math.max(1, values.length - 1)) * w;
        const y = h - clamp(v, 0, maxY) / maxY * h;
        return [x, y];
    });
    const tension = 0.95;
    const pathParts = [];
    for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        if (i === 0) {
            pathParts.push(`M${x},${y}`);
        } else {
            const p0 = pts[i - 2] || pts[i - 1];
            const p1 = pts[i - 1];
            const p2 = pts[i];
            const p3 = pts[i + 1] || p2;
            const cp1x = p1[0] + (p2[0] - p0[0]) / 6 * tension;
            const cp1y = p1[1] + (p2[1] - p0[1]) / 6 * tension;
            const cp2x = p2[0] - (p3[0] - p1[0]) / 6 * tension;
            const cp2y = p2[1] - (p3[1] - p1[1]) / 6 * tension;
            pathParts.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`);
        }
    }
    const path = pathParts.join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%">
            <defs>
                <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor="#39ff14" floodOpacity="0.5"/>
                </filter>
            </defs>
            <g stroke="#334155" strokeWidth="0.5">
                <line x1="0" y1={h*0.25} x2={w} y2={h*0.25} strokeDasharray="3 3"/>
                <line x1="0" y1={h*0.5} x2={w} y2={h*0.5} strokeDasharray="3 3"/>
                <line x1="0" y1={h*0.75} x2={w} y2={h*0.75} strokeDasharray="3 3"/>
            </g>
            <path d={path} fill="none" stroke="#39ff14" strokeOpacity={0.85} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlow)"/>
            {showDots && pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="1.2" fill="#39ff14" />
            ))}
        </svg>
    );
};

const RechartsObj = window.Recharts || null;
const ResponsiveContainer = RechartsObj ? RechartsObj.ResponsiveContainer : null;
const AreaChart = RechartsObj ? RechartsObj.AreaChart : null;
const Area = RechartsObj ? RechartsObj.Area : null;
const LineChart = RechartsObj ? RechartsObj.LineChart : null;
const Line = RechartsObj ? RechartsObj.Line : null;
const CartesianGrid = RechartsObj ? RechartsObj.CartesianGrid : null;
const Tooltip = RechartsObj ? RechartsObj.Tooltip : null;

const TwoToneDonutGauge = ({ percent = 0 }) => {
    const size = 160;
    const stroke = 14;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(100, percent));
    const greenLen = c * (p / 100);
    const remLen = c - greenLen;
    const green = '#39ff14';
    const orange = '#f59e0b';
    return (
        <div className="w-full h-full flex items-center justify-center">
            <svg width={size} height={size}>
                <defs>
                    <filter id="donutGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={green} floodOpacity="0.55"/>
                    </filter>
                </defs>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1f2937" strokeWidth={stroke}/>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={orange} strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={`${remLen} ${c}`} strokeDashoffset={greenLen}
                        transform={`rotate(-90 ${size/2} ${size/2})`} />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={green} strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={`${greenLen} ${c}`} strokeDashoffset={0}
                        transform={`rotate(-90 ${size/2} ${size/2})`} filter="url(#donutGlow)" />
                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="22" fill="#e5e7eb" fontWeight="700">{Math.round(p)}%</text>
            </svg>
        </div>
    );
};

const WeeklyBarsSmall = ({ weeks = [] }) => {
    const containerRef = React.useRef(null);
    const [barW, setBarW] = React.useState(24);
    const max = Math.max(1, ...weeks);
    React.useEffect(() => {
        const el = containerRef.current;
        if (!el || weeks.length === 0) return;
        const w = el.clientWidth;
        const bw = Math.max(22, Math.floor(w / weeks.length) - 12);
        setBarW(bw);
    }, [weeks]);
    return (
        <div ref={containerRef} className="w-full h-full flex items-end justify-between px-3">
            {weeks.map((v, i) => {
                const h = Math.round((v / max) * 140);
                return (
                    <div key={i} className="flex flex-col items-center">
                        <div className="bg-blue-500 rounded-sm" style={{ width: `${barW}px`, height: `${h}px` }}></div>
                        <div className="text-[11px] text-slate-300 mt-1">S{i+1}</div>
                    </div>
                );
            })}
        </div>
    );
};
// --- Icons ---
const Icons = {
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    Dumbbell: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7.972-7.972a4 4 0 0 1 5.656 5.656L8.657 15.657"/><path d="m11 21-7.972-7.972a4 4 0 0 1 5.656-5.656L16.657 15.343"/></svg>,
    Book: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    Dollar: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    Briefcase: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
    XCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
    Leaf: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 1.45 6"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>,
    Pen: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
    ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
    Droplet: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3C9 7 6 9.5 6 13a6 6 0 0 0 12 0c0-3.5-3-6-6-10z"></path></svg>,
    Heart: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 8.6a5 5 0 0 0-7.1 0L12 10.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z" transform="translate(-4 -6) scale(0.8)"></path></svg>,
    Coffee: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="12" height="10" rx="2"></rect><path d="M15 10h3a3 3 0 0 1 0 6h-3"></path><path d="M6 3v3M10 3v3M14 3v3"></path></svg>,
    Apple: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 13c0-3-2-5-4-5s-4 2-4 5 2 7 4 7 4-4 4-7z"></path><path d="M14 4c-1 2-3 2-4 2 1-2 3-2 4-2z"></path></svg>,
    Bicycle: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="17" r="3"></circle><circle cx="18" cy="17" r="3"></circle><path d="M6 17l5-8h4l3 8"></path><path d="M9 9l2 3"></path></svg>,
    Music: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M12 6l8-2v10"></path><path d="M12 6v10"></path></svg>,
    Code: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 4 3 12 8 20"></polyline><polyline points="16 4 21 12 16 20"></polyline></svg>,
    Home: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8"></path><rect x="5" y="11" width="14" height="10" rx="2"></rect></svg>,
    Star: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 9 22 9 17 13 19 21 12 17 5 21 7 13 2 9 9 9"></polygon></svg>,
    Brain: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7a4 4 0 0 0-4 4 4 4 0 0 0 4 4h8a4 4 0 0 0 4-4 4 4 0 0 0-4-4H8z"></path><path d="M8 7v8M16 7v8"></path></svg>,
    Yoga: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"></circle><path d="M12 7v6"></path><path d="M8 13l4 3 4-3"></path><path d="M6 19h12"></path></svg>,
    Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"></path></svg>,
    Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path></svg>,
    Target: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle><path d="M12 2v4M2 12h4M20 12h4M12 20v4" transform="translate(-2 -2) scale(0.8)"></path></svg>,
};

// --- Date Helpers ---
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
};

const getMonthName = (year, month) => {
    const name = new Date(year, month).toLocaleString('it-IT', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
};

// --- Mock Data Setup ---
// New structure: completedDates is a map of "YYYY-MM-DD": true
const INITIAL_HABITS = [
    { id: 1, name: "Sveglia ⏰", icon: "Clock", goal: 31, completedDates: {} },
    { id: 2, name: "Studio 📖", icon: "Book", goal: 25, completedDates: {} },
    { id: 3, name: "Allenamento 🏋️‍♂️", icon: "Dumbbell", goal: 20, completedDates: {} },
    { id: 4, name: "<=2 caffè ☕", icon: "Coffee", goal: 31, completedDates: {} },
    { id: 5, name: ">2L acqua 💧", icon: "Droplet", goal: 31, completedDates: {} },
    { id: 6, name: "Letto 🛌", icon: "Moon", goal: 31, completedDates: {} },
    { id: 7, name: "Francese 🥐", icon: "Brain", goal: 31, completedDates: {} },
    { id: 8, name: "Buongiorno/Buonanotte ✅", icon: "Check", goal: 30, completedDates: {} },
];

const INITIAL_MENTAL_STATE = {
    logs: {} 
};


// --- Components ---


const ProgressBar = ({ value, max, colorClass = "bg-green-500", height = "h-2" }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className={`w-full bg-[#1f2937] rounded-full ${height}`}>
            <div className={`${colorClass} rounded-full ${height}`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

const Header = ({ totalHabits, completedHabits, totalPossible, currentDate, onNext, onPrev, onNextYear, onPrevYear, onExport, onImportClick, onShare, syncCode, setSyncCode, syncStatus, syncError, apiBase, setApiBase, supabaseConfig, setSupabaseConfig }) => {
    const progress = totalPossible > 0 ? (completedHabits / totalPossible) * 100 : 0;
    const monthName = getMonthName(currentDate.getFullYear(), currentDate.getMonth());
    const year = currentDate.getFullYear();
    
    const changeApiBase = () => {
        if (apiBase === 'supabase://') {
            const url = prompt("Supabase URL:", supabaseConfig.url || '');
            if (url === null) return;
            const key = prompt("Supabase Anon Key:", supabaseConfig.key || '');
            if (key === null) return;
            
            const newConfig = { url: url.trim(), key: key.trim() };
            setSupabaseConfig(newConfig);
            localStorage.setItem('tracker_supabase_config', JSON.stringify(newConfig));
            
            if (confirm("Vuoi cambiare modalità di sync? Clicca OK per inserire un URL o Annulla per restare su Supabase.")) {
                const newBase = prompt("Inserisci l'URL del backend:", '');
                if (newBase !== null) {
                    setApiBase(newBase);
                    localStorage.setItem('tracker_api_base', newBase);
                }
            }
        } else {
            const newBase = prompt("Inserisci l'URL del backend (o 'supabase://' per sync diretto):", apiBase);
            if (newBase !== null) {
                setApiBase(newBase);
                localStorage.setItem('tracker_api_base', newBase);
            }
        }
    };

    return (
        <div className="bg-[#0f172a] border border-[#1f2937] text-slate-200 p-5 rounded-xl shadow-sm mb-6 flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-shrink-0">
                <button onClick={onPrev} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300">
                    <Icons.ChevronLeft />
                </button>
                <h1 className="text-3xl font-bold text-slate-100 w-48 text-center select-none">{monthName} {year}</h1>
                <button onClick={onNext} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300">
                    <Icons.ChevronRight />
                </button>
                <div className="ml-2 flex items-center gap-2">
                    <span className="text-xs text-slate-400">Anno</span>
                    <button onClick={onPrevYear} className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-300">
                        <Icons.ChevronLeft />
                    </button>
                    <button onClick={onNextYear} className="p-1 hover:bg-slate-800 rounded-full transition-colors text-slate-300">
                        <Icons.ChevronRight />
                    </button>
                </div>
            </div>
            
            <div className="flex gap-4 items-center flex-shrink-0">
                <div className="text-center">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Numero di abitudini</div>
                    <div className="text-xl font-bold text-slate-200">{totalHabits}</div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-slate-400 uppercase tracking-wide">Completate</div>
                    <div className="text-xl font-bold text-slate-200">{completedHabits}</div>
                </div>
                <div className="w-48">
                    <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400 uppercase tracking-wide">Progresso</span>
                        <span className="text-xs font-bold text-slate-200">{progress.toFixed(2)}%</span>
                    </div>
                    <ProgressBar value={completedHabits} max={totalPossible} height="h-3" />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div 
                        className="flex items-center bg-[#0b1220] border border-[#1f2937] rounded-full px-3 py-1 mr-2 cursor-pointer group relative"
                        title={`Backend: ${apiBase || 'locale'}${syncError ? '\nErrore: ' + syncError : ''}\nPC acceso: ${syncStatus === 'synced' ? 'Sì' : 'No'}\nClicca per cambiare URL`}
                        onClick={(e) => {
                            if (e.target.tagName !== 'INPUT') changeApiBase();
                        }}
                    >
                        <div className={`w-2 h-2 rounded-full mr-2 ${syncStatus === 'synced' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <input 
                            type="text" 
                            placeholder="Codice Sync" 
                            value={syncCode}
                            onChange={(e) => setSyncCode(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent border-none outline-none text-[10px] text-slate-300 w-20 font-mono"
                        />
                        <span className="text-[9px] text-slate-500 ml-1 uppercase tracking-tighter group-hover:text-blue-400">Sync</span>
                        {syncError && (
                            <div className="absolute top-full left-0 mt-2 p-2 bg-red-900 border border-red-500 text-white text-[10px] rounded shadow-lg z-50 w-48 pointer-events-none">
                                {syncError}
                            </div>
                        )}
                    </div>
                    <button onClick={onExport} className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">Esporta</button>
                    <button onClick={onImportClick} className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">Importa</button>
                    <button onClick={onShare} className="px-3 py-1 rounded-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold">Condividi</button>
                </div>
            </div>
        </div>
    );
};

const StatsBadges = ({ dateText, doneToday, notDoneToday, totalTasks, saveCount }) => {
    return (
        <div className="bg-[#0f172a] border border-[#1f2937] text-slate-200 p-4 rounded-xl shadow-sm mb-4 flex items-center flex-wrap gap-4">
            <div className="px-4 py-1 rounded-full bg-slate-800 text-slate-200 text-sm font-medium">{dateText}</div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                    <div className="text-xs text-slate-400">Fatte oggi</div>
                    <div className="mt-1 px-4 py-1 rounded-full bg-green-600 text-white text-sm font-bold">{doneToday}</div>
                </div>
                <div className="flex flex-col items-center">
                    <div className="text-xs text-slate-400">Non fatte</div>
                    <div className="mt-1 px-4 py-1 rounded-full bg-slate-800 text-slate-200 text-sm font-bold">{notDoneToday}</div>
                </div>
                <div className="flex flex-col items-center">
                    <div className="text-xs text-slate-400">Attività totali</div>
                    <div className="mt-1 px-4 py-1 rounded-full bg-slate-800 text-slate-200 text-sm font-bold">{totalTasks}</div>
                </div>
                <div className="flex flex-col items-center">
                    <div className="text-xs text-slate-400">Salvataggi</div>
                    <div className="mt-1 px-4 py-1 rounded-full bg-slate-800 text-slate-200 text-sm font-bold">{saveCount}</div>
                </div>
            </div>
        </div>
    );
};
const HabitGrid = ({ habits, onToggle, onRename, onUpdateGoal, onDelete, onAdd, currentDate, daysInMonth, dailyStats, onUpdateIcon }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");

    const [editingGoalId, setEditingGoalId] = useState(null);
    const [editGoalValue, setEditGoalValue] = useState("");

    const [leftWidth, setLeftWidth] = useState(256);
    const [rightWidth, setRightWidth] = useState(192);
    const scrollRef = React.useRef(null);
    const [cellWidth, setCellWidth] = useState(24);
    const rowHeight = 40;
    const [sliderMax, setSliderMax] = useState(0);
    const [sliderValue, setSliderValue] = useState(0);
    const startResizing = (e) => {
        const startX = e.clientX;
        const startW = leftWidth;
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const next = Math.min(440, Math.max(180, startW + dx));
            setLeftWidth(next);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };
    const startResizingRight = (e) => {
        const startX = e.clientX;
        const startW = rightWidth;
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const next = Math.min(440, Math.max(160, startW - dx));
            setRightWidth(next);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };
    const recalcSlider = () => {};
    const recalcCellWidth = () => {
        const el = scrollRef.current;
        if (!el) return;
        const w = el.clientWidth;
        const cw = Math.max(24, Math.floor(w / Math.max(1, daysInMonth)));
        setCellWidth(cw);
    };
    useEffect(() => {
        const el = scrollRef.current;
        const handleResize = () => recalcSlider();
        const handleScroll = () => {
            if (!el) return;
            setSliderValue(el.scrollLeft);
        };
        window.addEventListener('resize', handleResize);
        if (el) el.addEventListener('scroll', handleScroll);
        recalcCellWidth();
        return () => {
            window.removeEventListener('resize', handleResize);
            if (el) el.removeEventListener('scroll', handleScroll);
        };
    }, [daysInMonth, leftWidth, rightWidth]);
    useEffect(() => { recalcCellWidth(); }, [daysInMonth, leftWidth, rightWidth]);

    const startEditing = (habit) => {
        setEditingId(habit.id);
        setEditName(habit.name);
    };

    const saveEditing = () => {
        if (editingId && editName.trim()) {
            onRename(editingId, editName);
        }
        setEditingId(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveEditing();
        }
    };

    const startEditingGoal = (habit) => {
        setEditingGoalId(habit.id);
        setEditGoalValue(habit.goal);
    };

    const saveEditingGoal = () => {
        if (editingGoalId && editGoalValue !== "") {
            onUpdateGoal(editingGoalId, editGoalValue);
        }
        setEditingGoalId(null);
    };

    const handleGoalKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveEditingGoal();
        }
    };
    
    // Helper to check if done
    const isDone = (habit, day) => {
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        return !!habit.completedDates[dateKey];
    };

    // Helper to get day name (Su, Mo, etc)
    const getDayName = (day) => {
        const date = new Date(year, month, day);
        const name = date.toLocaleDateString('it-IT', { weekday: 'short' });
        return name.charAt(0).toUpperCase() + name.slice(1, 2);
    };
    
    const [editingIconId, setEditingIconId] = useState(null);
    const iconOptions = ["Check", "Clock", "Dumbbell", "Book", "Calendar", "Dollar", "Briefcase", "XCircle", "Leaf", "Pen", "Droplet", "Heart", "Coffee", "Apple", "Bicycle", "Music", "Code", "Home", "Star", "Brain", "Yoga", "Sun", "Moon", "Target"];
    return (
        <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="flex">
                {/* Left Column: Habit Names */}
                <div className="flex-shrink-0 border-r border-[#1f2937] z-10 bg-[#0f172a]" style={{ width: leftWidth }}>
                    <div className="h-8 bg-[#0b1220] border-b border-[#1f2937]"></div>
                    <div className="h-12 bg-[#0b1220] border-b border-[#1f2937] flex items-center justify-center font-bold text-slate-200">
                        Le mie abitudini
                    </div>
                    <div className="h-6 bg-[#0b1220] border-b border-[#1f2937]"></div>
                    {habits.map(habit => {
                        const IconComp = Icons[habit.icon] || Icons.Check;
                        const isEditing = editingId === habit.id;

                        return (
                            <div key={habit.id} className="border-b border-[#1f2937] flex items-center px-4 hover:bg-slate-800 transition-colors group relative" style={{ height: rowHeight }}>
                                <span className="mr-2 text-slate-300 flex-shrink-0 cursor-pointer" onClick={() => setEditingIconId(habit.id)}><IconComp /></span>
                                {editingIconId === habit.id && (
                                    <div className="absolute left-8 top-1 z-20 bg-slate-800 border border-[#1f2937] rounded shadow p-2 flex flex-wrap gap-2 w-48">
                                        {iconOptions.map(k => {
                                            const Ico = Icons[k];
                                            return (
                                                <button key={k} onClick={() => { onUpdateIcon(habit.id, k); setEditingIconId(null); }} className={`p-1 rounded hover:bg-slate-700 ${habit.icon===k?'bg-slate-700 border border-blue-500':''}`}>
                                                    <span className="text-slate-200"><Ico /></span>
                                                </button>
                                            );
                                        })}
                                        <button onClick={() => setEditingIconId(null)} className="w-full text-center py-1 mt-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-700 rounded">chiudi</button>
                                    </div>
                                )}
                                
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={saveEditing}
                                        onKeyDown={handleKeyDown}
                                        autoFocus
                                        className="text-sm font-medium text-slate-200 w-full border border-blue-500 rounded px-1 outline-none bg-slate-800"
                                    />
                                ) : (
                                    <span 
                                        className="text-sm font-medium text-slate-200 truncate flex-grow cursor-pointer"
                                        onClick={() => startEditing(habit)}
                                        title="Clicca per rinominare"
                                    >
                                        {habit.name}
                                    </span>
                                )}

                                {/* Delete Button - Visible on Hover */}
                                {!isEditing && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDelete(habit.id); }}
                                        className="ml-2 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Elimina abitudine"
                                    >
                                        <Icons.Trash />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    
                    {/* Add Habit Button */}
                    <div 
                        onClick={onAdd}
                        className="border-b border-[#1f2937] flex items-center px-4 hover:bg-slate-800 transition-colors cursor-pointer text-blue-400 hover:text-blue-300"
                        style={{ height: rowHeight }}
                    >
                        <span className="mr-2"><Icons.Plus /></span>
                        <span className="text-sm font-bold">Aggiungi abitudine</span>
                    </div>

                    {/* Progress Footer Labels */}
                    <div className="border-t border-[#1f2937]">
                        <div className="h-8 flex items-center justify-end px-4 text-xs font-bold text-slate-300 bg-[#0b1220] border-b border-[#1f2937]">Fatto (%)</div>
                        <div className="h-8 flex items-center justify-end px-4 text-xs font-bold text-slate-300 bg-[#0f172a] border-b border-[#1f2937]">Fatto</div>
                        <div className="h-8 flex items-center justify-end px-4 text-xs font-bold text-slate-300 bg-[#0f172a]">Non fatto</div>
                        <div className="h-32 border-t border-[#1f2937] bg-[#0f172a]"></div>
                    </div>
                </div>
                <div onMouseDown={startResizing} className="w-2 cursor-col-resize bg-[#0b1220] hover:bg-blue-500 transition-none border-x border-[#1f2937]"></div>

                {/* Middle: Days Grid */}
                <div ref={scrollRef} className="flex-grow overflow-x-auto">
                    <div className="min-w-max">
                        <div className="flex h-8 bg-[#0b1220] border-b border-[#1f2937]">
                            {Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, i) => {
                                const size = Math.min(7, daysInMonth - i * 7);
                                const w = cellWidth * size;
                                return (
                                    <div key={i} className="flex-shrink-0 flex items-center justify-center border-r border-[#1f2937] text-[10px] font-bold text-slate-300" style={{ width: w }}>
                                        {`Settimana ${i + 1}`}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex">
                            {/* Header Row for Days */}
                            {daysArray.map(day => (
                                <div key={day} className="flex-shrink-0 flex flex-col items-center justify-center h-12 bg-[#0b1220] border-b border-[#1f2937] border-r border-[#1f2937]" style={{ width: cellWidth }}>
                                    <span className="text-[10px] text-slate-400">{getDayName(day)}</span>
                                    <span className="text-xs font-bold text-slate-200">{day}</span>
                                </div>
                            ))}
                        </div>
                        
                        {/* Header spacer to match Analysis column */}
                        <div className="flex h-6 bg-[#0b1220] border-b border-[#1f2937]"></div>
                        
                        {/* Grid Body */}
                        <div>
                            {habits.map(habit => (
                                <div key={habit.id} className="flex border-b border-[#1f2937]" style={{ height: rowHeight }}>
                                    {daysArray.map(day => {
                                        const done = isDone(habit, day);
                                        return (
                                            <div 
                                                key={day} 
                                                onClick={() => onToggle(habit.id, day)}
                                                className="border-r border-[#1f2937] flex items-center justify-center cursor-pointer hover:bg-slate-800"
                                                style={{ width: cellWidth }}
                                            >
                                                {done ? (
                                                    <div className="rounded flex items-center justify-center transition-all text-white"
                                                         style={{ width: '24px', height: '24px', backgroundColor: '#39ff14', boxShadow: '0 0 8px 2px rgba(57,255,20,0.6)' }}>
                                                        <Icons.Check />
                                                    </div>
                                                ) : (
                                                    <div className="rounded flex items-center justify-center transition-all text-slate-400 bg-[#1f2937]" style={{ width: '24px', height: '24px' }}></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        
                        {/* Spacer for "Add Habit" row */}
                        <div className="border-b border-[#1f2937]" style={{ height: rowHeight }}></div>

                         {/* Progress Footer Values */}
                         <div className="border-t border-[#1f2937]">
                             <div className="flex h-8 bg-[#0b1220] border-b border-[#1f2937]">
                                {dailyStats.map(stat => (
                                    <div key={stat.day} className="flex-shrink-0 flex items-center justify-center border-r border-[#1f2937] text-[10px] font-bold text-slate-300" style={{ width: cellWidth }}>
                                        {Math.round(stat.percentage)}%
                                    </div>
                                ))}
                             </div>
                             <div className="flex h-8 bg-[#0f172a] border-b border-[#1f2937]">
                                {dailyStats.map(stat => (
                                    <div key={stat.day} className="flex-shrink-0 flex items-center justify-center border-r border-[#1f2937] text-[10px] text-slate-300" style={{ width: cellWidth }}>
                                        {stat.done}
                                    </div>
                                ))}
                             </div>
                             <div className="flex h-8 bg-[#0f172a]">
                                {dailyStats.map(stat => (
                                    <div key={stat.day} className="flex-shrink-0 flex items-center justify-center border-r border-[#1f2937] text-[10px] text-slate-300" style={{ width: cellWidth }}>
                                        {stat.notDone}
                                    </div>
                                ))}
                             </div>
                             
                             <div className="h-32 border-t border-[#1f2937] bg-[#0f172a] relative px-2">
                                <SimpleLineChart values={dailyStats.map(s => s.percentage)} color="#39ff14" maxY={100} opacity={0.85} showDots={true} />
                             </div>
                         </div>
                    </div>
                </div>

                {/* Right Column: Analysis */}
                <div onMouseDown={startResizingRight} className="w-2 cursor-col-resize bg-[#0b1220] hover:bg-blue-500 transition-none border-x border-[#1f2937]"></div>
                <div className="flex-shrink-0 border-l border-[#1f2937] bg-[#0f172a]" style={{ width: rightWidth }}>
                     <div className="h-8 bg-[#0b1220] border-b border-[#1f2937]"></div>
                     <div className="h-12 bg-[#0b1220] border-b border-[#1f2937] flex items-center justify-center font-bold text-slate-200">
                        Analisi
                    </div>
                    <div className="flex h-6 bg-[#0b1220] border-b border-[#1f2937] text-[10px] text-slate-400">
                        <div className="w-10 flex items-center justify-center">Obiettivo</div>
                        <div className="w-10 flex items-center justify-center">Attuale</div>
                        <div className="flex-grow flex items-center justify-center">Progresso</div>
                    </div>
                     {habits.map(habit => {
                        // Calculate actual for THIS month
                        let actual = 0;
                        for(let d=1; d<=daysInMonth; d++) {
                             if(isDone(habit, d)) actual++;
                        }
                        
                        const scaledGoal = Math.round((habit.goal || 0) * daysInMonth / 31);
                        const denom = Math.max(1, scaledGoal);
                        const percentage = Math.round((actual / denom) * 100);
                        const isEditingGoal = editingGoalId === habit.id;

                        return (
                            <div key={habit.id} className="h-10 border-b border-[#1f2937] flex items-center px-2">
                                <div className="w-10 text-xs text-center text-slate-300">
                                    {isEditingGoal ? (
                                        <input 
                                            type="number" 
                                            value={editGoalValue}
                                            onChange={(e) => setEditGoalValue(e.target.value)}
                                            onBlur={saveEditingGoal}
                                            onKeyDown={handleGoalKeyDown}
                                            autoFocus
                                            className="w-full text-center border border-blue-500 rounded outline-none p-0 bg-slate-800 text-slate-200"
                                        />
                                    ) : (
                                        <span 
                                            onClick={() => startEditingGoal(habit)}
                                            className="cursor-pointer hover:text-blue-400 hover:font-bold"
                                            title="Clicca per modificare obiettivo"
                                        >
                                            {scaledGoal}
                                        </span>
                                    )}
                                </div>
                                <div className="w-10 text-xs text-center font-bold text-slate-200 cursor-help" title={`${percentage}%`}>{actual}</div>
                                <div className="flex-grow px-2" title={`${percentage}%`}>
                                    <ProgressBar value={actual} max={denom} colorClass="bg-green-500" height="h-2" />
                                </div>
                            </div>
                        );
                    })}
                     {/* Spacer for "Add Habit" row */}
                     <div className="border-b border-[#1f2937]" style={{ height: rowHeight }}></div>
                     
                     {/* Empty space to match footer height */}
                     <div className="border-t-2 border-[#1f2937] h-[96px] bg-[#0b1220]"></div>
                     <div className="border-t border-[#1f2937] h-32 bg-[#0f172a]"></div>
                </div>
            </div>
        </div>
    );
};

const TodayInfo = () => {
    const d = new Date();
    const dayName = d.toLocaleString('it-IT', { weekday: 'long' });
    const dayCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dd = d.getDate();
    const mon = d.toLocaleString('it-IT', { month: 'short' });
    const monCap = mon.charAt(0).toUpperCase() + mon.slice(1);
    const yy = d.getFullYear();
    return (
        <div className="bg-[#0f172a] border border-[#1f2937] p-3 rounded-xl shadow-sm mb-4 flex items-center">
            <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-sm font-medium">
                {`Oggi: ${dayCap} ${dd} ${monCap} ${yy}`}
            </div>
        </div>
    );
};
const MentalStateGrid = ({ mentalState, onUpdate, currentDate, daysInMonth }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getLog = (day) => {
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        return mentalState.logs[dateKey] || { mood: 0, motivation: 0 };
    };

    const handleUpdate = (day, field, value) => {
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        onUpdate(dateKey, field, value);
    };

    // Chart Data
    const chartData = daysArray.map(day => {
        const log = getLog(day);
        return {
            name: day.toString(),
            mood: log.mood || 0,
            motivation: log.motivation || 0,
            value: log.mood || 0
        };
    });
    let moodSum = 0, moodN = 0, motSum = 0, motN = 0;
    daysArray.forEach(day => {
        const l = getLog(day);
        if (l.mood > 0) { moodSum += l.mood; moodN++; }
        if (l.motivation > 0) { motSum += l.motivation; motN++; }
    });
    const moodAvg = moodN ? (moodSum / moodN) : 0;
    const motAvg = motN ? (motSum / motN) : 0;
    const bgFor = (v) => {
        if (!v) return { backgroundColor: 'transparent', color: '#94a3b8' };
        const val = Math.max(0, Math.min(10, v));
        const hue = Math.round((val / 10) * 120);
        return { 
            backgroundColor: `hsl(${hue}, 60%, 15%)`,
            color: `hsl(${hue}, 100%, 75%)`,
            fontWeight: 'bold'
        };
    };

    const [leftWidth, setLeftWidth] = useState(256);
    const [rightWidth, setRightWidth] = useState(192);
    const scrollRef = React.useRef(null);
    const [cellWidth, setCellWidth] = useState(24);
    const startResizing = (e) => {
        const startX = e.clientX;
        const startW = leftWidth;
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const next = Math.min(440, Math.max(180, startW + dx));
            setLeftWidth(next);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };
    const startResizingRight = (e) => {
        const startX = e.clientX;
        const startW = rightWidth;
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            const next = Math.min(440, Math.max(160, startW - dx));
            setRightWidth(next);
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };
    const recalcSlider = () => {};
    const recalcCellWidth = () => {
        const el = scrollRef.current;
        if (!el) return;
        const w = el.clientWidth;
        const cw = Math.max(20, Math.floor(w / Math.max(1, daysInMonth)));
        setCellWidth(cw);
    };
    useEffect(() => {
        const el = scrollRef.current;
        const handleResize = () => recalcCellWidth();
        const handleScroll = () => {
            if (!el) return;
            // noop sync
        };
        window.addEventListener('resize', handleResize);
        if (el) el.addEventListener('scroll', handleScroll);
        recalcCellWidth();
        return () => {
            window.removeEventListener('resize', handleResize);
            if (el) el.removeEventListener('scroll', handleScroll);
        };
    }, [daysInMonth, leftWidth, rightWidth]);
    useEffect(() => { recalcCellWidth(); }, [daysInMonth, leftWidth, rightWidth]);

    return (
        <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl shadow-sm overflow-hidden flex flex-col mt-6 text-slate-200">
             <div className="flex">
                {/* Left Header */}
                <div className="flex-shrink-0 border-r border-[#1f2937] z-10 bg-[#0f172a]" style={{ width: leftWidth }}>
                    <div className="h-8 bg-[#0b1220] border-b border-[#1f2937] flex items-center justify-center font-bold text-slate-200 text-xs">
                        Stato Mentale
                    </div>
                    <div className="h-8 flex items-center justify-end px-4 text-xs font-bold text-slate-300 bg-[#0f172a] border-b border-[#1f2937]">Umore (1-10)</div>
                    <div className="h-8 flex items-center justify-end px-4 text-xs font-bold text-slate-300 bg-[#0f172a]">Motivazione (1-10)</div>
                    <div className="h-20 border-t border-[#1f2937] bg-[#0f172a] flex items-center justify-center gap-4">
                        <div className="px-3 py-1 rounded-full bg-green-900/30 text-green-300 text-xs font-bold">
                            Media Umore: {moodAvg.toFixed(1)}
                        </div>
                        <div className="px-3 py-1 rounded-full bg-green-900/30 text-green-300 text-xs font-bold">
                            Media Motivazione: {motAvg.toFixed(1)}
                        </div>
                    </div>
                </div>

                <div onMouseDown={startResizing} className="w-2 cursor-col-resize bg-[#0b1220] hover:bg-blue-500 transition-none border-x border-[#1f2937]"></div>

                {/* Grid */}
                <div ref={scrollRef} className="flex-grow overflow-x-auto">
                    <div className="min-w-max">
                        <div className="flex h-8 bg-[#0b1220] border-b border-[#1f2937]">
                            {Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, i) => {
                                const size = Math.min(7, daysInMonth - i * 7);
                                const w = cellWidth * size;
                                return (
                                    <div key={i} className="flex-shrink-0 flex items-center justify-center border-r border-[#1f2937] text-[10px] font-bold text-slate-300" style={{ width: w }}>
                                        {`Settimana ${i + 1}`}
                                    </div>
                                );
                            })}
                        </div>

                         {/* Mood Row */}
                         <div className="flex h-8 border-b border-[#1f2937]">
                            {daysArray.map(day => {
                                const log = getLog(day);
                                return (
                                    <div key={day} className="border-r border-[#1f2937] flex items-center justify-center" style={{ width: cellWidth }}>
                                        <input 
                                            type="number"
                                            min="1" max="10"
                                            value={log.mood || ''}
                                            onChange={(e) => handleUpdate(day, 'mood', parseInt(e.target.value) || 0)}
                                            className="w-full h-full text-center text-xs outline-none"
                                            style={bgFor(log.mood)}
                                            placeholder="-"
                                        />
                                    </div>
                                );
                            })}
                         </div>

                         {/* Motivation Row */}
                         <div className="flex h-8">
                            {daysArray.map(day => {
                                const log = getLog(day);
                                return (
                                    <div key={day} className="border-r border-[#1f2937] flex items-center justify-center" style={{ width: cellWidth }}>
                                        <input 
                                            type="number"
                                            min="1" max="10"
                                            value={log.motivation || ''}
                                            onChange={(e) => handleUpdate(day, 'motivation', parseInt(e.target.value) || 0)}
                                            className="w-full h-full text-center text-xs outline-none"
                                            style={bgFor(log.motivation)}
                                            placeholder="-"
                                        />
                                    </div>
                                );
                            })}
                         </div>

                         

                         <div className="h-32 border-t border-[#1f2937] bg-[#0f172a] relative">
                            {ResponsiveContainer && AreaChart && Area ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 6, left: 6, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorMoodSoft" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.18}/>
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} fill="url(#colorMoodSoft)" />
                                        {Tooltip && <Tooltip />}
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <SimpleAreaChart values={chartData.map(d => d.value)} color="#10B981" maxY={10} labels={daysArray.map(d => d.toString())} />
                            )}
                         </div>
                    </div>
                 </div>

                {/* Right Filler */}
                 <div onMouseDown={startResizingRight} className="w-2 cursor-col-resize bg-[#0b1220] hover:bg-blue-500 transition-none border-x border-[#1f2937]"></div>
                 <div className="flex-shrink-0 border-l border-[#1f2937] bg-[#0f172a]" style={{ width: rightWidth }}>
                    <div className="h-8 bg-[#0b1220] border-b border-[#1f2937]"></div>
                    <div className="h-8 border-b border-[#1f2937]"></div>
                    <div className="h-8"></div>
                    <div className="h-32 border-t border-[#1f2937]"></div>
                 </div>
             </div>
        </div>
    );
};

const App = () => {
    // Current date state
    const [currentDate, setCurrentDate] = useState(new Date());
    const importInputRef = useRef(null);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [shareAltUrl, setShareAltUrl] = useState('');
    const [shareShowFull, setShareShowFull] = useState(false);
    const shareCanvasRef = useRef(null);
    const shareDataCanvasRef = useRef(null);
    const [shareDataError, setShareDataError] = useState('');
    const [updatedAt, setUpdatedAt] = useState(() => {
        const v = localStorage.getItem('tracker_updatedAt');
        return v ? Number(v) : 0;
    });
    const [syncCode, setSyncCode] = useState(() => {
        return localStorage.getItem('tracker_sync_code') || '';
    });
    const [apiBase, setApiBase] = useState(() => {
        const saved = localStorage.getItem('tracker_api_base');
        if (saved !== null && saved !== "null" && saved !== "undefined") return saved;

        const isGitHub = window.location.hostname.includes('github.io');
        if (isGitHub) return 'supabase://';
        return '';
    });

    const [supabaseConfig, setSupabaseConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('tracker_supabase_config');
            if (saved && saved !== "null" && saved !== "undefined") {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch (e) {}
        return { url: '', key: '' };
    });

    const supabaseClient = useMemo(() => {
        try {
            if (apiBase === 'supabase://' && supabaseConfig.url && supabaseConfig.key && window.supabase) {
                return window.supabase.createClient(supabaseConfig.url, supabaseConfig.key);
            }
        } catch (e) {
            console.error("Errore inizializzazione Supabase:", e);
        }
        return null;
    }, [apiBase, supabaseConfig]);

    useEffect(() => {
        localStorage.setItem('tracker_supabase_config', JSON.stringify(supabaseConfig));
    }, [supabaseConfig]);
    const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'
    const [syncError, setSyncError] = useState('');
    const isRemoteUpdateRef = useRef(false);
    const isLocalChangeRef = useRef(false);
    const deviceIdRef = useRef(null);
    if (!deviceIdRef.current) {
        const existing = localStorage.getItem('tracker_device_id');
        if (existing) {
            deviceIdRef.current = existing;
        } else {
            const nid = 'dev-' + Math.random().toString(36).slice(2);
            localStorage.setItem('tracker_device_id', nid);
            deviceIdRef.current = nid;
        }
    }

    // Load from localStorage or use initial data
    const [habits, setHabits] = useState(() => {
        const saved = localStorage.getItem('tracker_habits');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse habits from localStorage", e);
                return INITIAL_HABITS;
            }
        }
        return INITIAL_HABITS;
    });
    
    const [mentalState, setMentalState] = useState(() => {
        const saved = localStorage.getItem('tracker_mental');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse mental state from localStorage", e);
                return INITIAL_MENTAL_STATE;
            }
        }
        return INITIAL_MENTAL_STATE;
    });
    
    // Save to localStorage whenever data changes
    useEffect(() => {
        localStorage.setItem('tracker_habits', JSON.stringify(habits));
    }, [habits]);

    useEffect(() => {
        localStorage.setItem('tracker_mental', JSON.stringify(mentalState));
    }, [mentalState]);
    useEffect(() => {
        localStorage.setItem('tracker_updatedAt', String(updatedAt));
    }, [updatedAt]);

    useEffect(() => {
        if (syncCode) localStorage.setItem('tracker_sync_code', syncCode);
        else localStorage.removeItem('tracker_sync_code');
    }, [syncCode]);
    
    useEffect(() => {
        const h = window.location.hash;
        if (h && h.startsWith('#import=')) {
            const encoded = h.slice('#import='.length);
            try {
                const json = decodeURIComponent(escape(atob(encoded)));
                const data = JSON.parse(json);
                if (data && data.habits && data.mentalState) {
                    setHabits(data.habits);
                    setMentalState(data.mentalState);
                    localStorage.setItem('tracker_habits', JSON.stringify(data.habits));
                    localStorage.setItem('tracker_mental', JSON.stringify(data.mentalState));
                    alert('Import completato dal link');
                }
            } catch {}
            history.replaceState(null, '', window.location.pathname);
        }
    }, []);

    useEffect(() => {
        if (syncCode) {
            localStorage.setItem('tracker_sync_code', syncCode);
        }
    }, [syncCode]);

    useEffect(() => {
        let cancelled = false;
        const fetchServer = async () => {
            if (!syncCode) return;
            setSyncStatus('syncing');
            try {
                let srv = null;
                const safeCode = syncCode.replace(/[^a-z0-9-_]/gi, '').toLowerCase();

                if (supabaseClient) {
                    try {
                        const { data, error } = await supabaseClient
                            .from('sync_states')
                            .select('state')
                            .eq('code', safeCode)
                            .single();
                        if (error && error.code !== 'PGRST116') throw error;
                        srv = data ? data.state : { habits: [], mentalState: { logs: {} }, updatedAt: 0 };
                    } catch (supabaseErr) {
                        console.error("Supabase fetch error:", supabaseErr);
                        throw new Error("Errore database: verifica URL e Key");
                    }
                } else {
                    if (apiBase === 'supabase://') {
                        throw new Error("Supabase non configurato. Clicca sul pallino per impostare URL e Key.");
                    }
                    let baseUrl = apiBase || '';
                    if (!baseUrl && window.location.hostname.includes('netlify.app')) {
                        baseUrl = '/.netlify/functions/sync';
                    }
                    const fullUrl = baseUrl.includes('/.netlify/functions/') 
                        ? `${baseUrl}?code=${encodeURIComponent(syncCode)}`
                        : `${baseUrl}/api/state?code=${encodeURIComponent(syncCode)}`;

                    const res = await fetch(fullUrl, { cache: 'no-store' });
                    if (!res.ok) { 
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || `Errore server: ${res.status}`);
                    }
                    srv = await res.json();
                }

                setSyncError('');
                const su = Number(srv.updatedAt || 0);
                if (su > updatedAt && srv.habits && srv.mentalState) {
                    if (cancelled) return;
                    isRemoteUpdateRef.current = true;
                    setHabits(srv.habits);
                    setMentalState(srv.mentalState);
                    setUpdatedAt(su);
                    setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
                } else if (su === 0 || (updatedAt > su)) {
                    const now = Date.now();
                    const payload = { habits, mentalState, updatedAt: now, deviceId: deviceIdRef.current };
                    
                    if (supabaseClient) {
                        const { error } = await supabaseClient
                            .from('sync_states')
                            .upsert({ 
                                code: safeCode, 
                                state: payload,
                                updated_at: new Date(now).toISOString()
                            }, { onConflict: 'code' });
                        if (error) throw error;
                    } else {
                        let baseUrl = apiBase || '';
                        if (!baseUrl && window.location.hostname.includes('netlify.app')) {
                            baseUrl = '/.netlify/functions/sync';
                        }
                        const fullUrl = baseUrl.includes('/.netlify/functions/') 
                            ? `${baseUrl}?code=${encodeURIComponent(syncCode)}`
                            : `${baseUrl}/api/state?code=${encodeURIComponent(syncCode)}`;
                        await fetch(fullUrl, { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify(payload) 
                        });
                    }
                    if (!cancelled) setUpdatedAt(now);
                }
                setSyncStatus('synced');
            } catch (err) {
                console.error("Sync error:", err);
                setSyncStatus('error');
                setSyncError(err.message || 'Errore di connessione');
            }
        };
        fetchServer();
        return () => { cancelled = true; };
    }, [syncCode, apiBase, supabaseClient]);

    useEffect(() => {
        if (!syncCode) return;
        if (isRemoteUpdateRef.current) return;
        if (!isLocalChangeRef.current) return;
        
        let t = null;
        const push = async () => {
            setSyncStatus('syncing');
            const now = Date.now();
            const safeCode = syncCode.replace(/[^a-z0-9-_]/gi, '').toLowerCase();
            const payload = { habits, mentalState, updatedAt: now, deviceId: deviceIdRef.current };

            try {
                if (supabaseClient) {
                    const { error } = await supabaseClient
                        .from('sync_states')
                        .upsert({ 
                            code: safeCode, 
                            state: payload,
                            updated_at: new Date(now).toISOString()
                        }, { onConflict: 'code' });
                    if (error) throw error;
                } else {
                    if (apiBase === 'supabase://') {
                        throw new Error("Supabase non configurato.");
                    }
                    let baseUrl = apiBase || '';
                    if (!baseUrl && window.location.hostname.includes('netlify.app')) {
                        baseUrl = '/.netlify/functions/sync';
                    }
                    const fullUrl = baseUrl.includes('/.netlify/functions/') 
                        ? `${baseUrl}?code=${encodeURIComponent(syncCode)}`
                        : `${baseUrl}/api/state?code=${encodeURIComponent(syncCode)}`;

                    const res = await fetch(fullUrl, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify(payload) 
                    });
                    if (!res.ok) throw new Error(`Errore server: ${res.status}`);
                }
                
                setUpdatedAt(now);
                setSyncStatus('synced');
                isLocalChangeRef.current = false;
            } catch (err) {
                setSyncStatus('error');
                setSyncError(err.message || 'Errore di connessione');
            }
        };
        t = setTimeout(push, 800);
        return () => { if (t) clearTimeout(t); };
    }, [habits, mentalState, syncCode, apiBase]);

    useEffect(() => {
        if (!syncCode) return;
        const interval = setInterval(async () => {
            if (isRemoteUpdateRef.current) return;
            if (isLocalChangeRef.current) return; 
            try {
                let srv = null;
                const safeCode = syncCode.replace(/[^a-z0-9-_]/gi, '').toLowerCase();

                if (supabaseClient) {
                    const { data, error } = await supabaseClient
                        .from('sync_states')
                        .select('state')
                        .eq('code', safeCode)
                        .single();
                    if (error && error.code !== 'PGRST116') throw error;
                    srv = data ? data.state : null;
                } else {
                    if (apiBase === 'supabase://') return; // Skip if not configured
                    let baseUrl = apiBase || '';
                    if (!baseUrl && window.location.hostname.includes('netlify.app')) {
                        baseUrl = '/.netlify/functions/sync';
                    }
                    const fullUrl = baseUrl.includes('/.netlify/functions/') 
                        ? `${baseUrl}?code=${encodeURIComponent(syncCode)}`
                        : `${baseUrl}/api/state?code=${encodeURIComponent(syncCode)}`;

                    const res = await fetch(fullUrl, { cache: 'no-store' });
                    if (res.ok) srv = await res.json();
                }

                if (srv) {
                    const su = Number(srv.updatedAt || 0);
                    if (su > updatedAt && srv.habits && srv.mentalState) {
                        isRemoteUpdateRef.current = true;
                        setHabits(srv.habits);
                        setMentalState(srv.mentalState);
                        setUpdatedAt(su);
                        setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
                        setSyncStatus('synced');
                    }
                }
            } catch {}
        }, 3000);
        return () => clearInterval(interval);
    }, [updatedAt, syncCode, apiBase, supabaseClient]);
    useEffect(() => {
        if (shareOpen && shareShowFull) {
            const QR = window.QRCode;
            const canvas = shareDataCanvasRef.current;
            if (QR && canvas && shareUrl) {
                try { 
                    setShareDataError('');
                    QR.toCanvas(canvas, shareUrl, { width: 300, errorCorrectionLevel: 'L' }); 
                } catch (e) {
                    setShareDataError('Il link è troppo lungo per il QR. Usa “Copia link con dati”.');
                }
            }
        }
    }, [shareOpen, shareShowFull, shareUrl]);
    // Navigation
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    const nextYear = () => {
        setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
    };
    const prevYear = () => {
        setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
    };

    // Derived values for current month
    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    
    const toggleHabit = (habitId, day) => {
        isLocalChangeRef.current = true;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        setHabits(prevHabits => 
            prevHabits.map(habit => {
                if (habit.id === habitId) {
                    const newCompletedDates = { ...habit.completedDates };
                    if (newCompletedDates[dateKey]) {
                        delete newCompletedDates[dateKey];
                    } else {
                        newCompletedDates[dateKey] = true;
                    }
                    return { ...habit, completedDates: newCompletedDates };
                }
                return habit;
            })
        );
    };

    const renameHabit = (habitId, newName) => {
        isLocalChangeRef.current = true;
        setHabits(prevHabits => 
            prevHabits.map(habit => 
                habit.id === habitId ? { ...habit, name: newName } : habit
            )
        );
    };

    const updateGoal = (habitId, newGoal) => {
        isLocalChangeRef.current = true;
        setHabits(prevHabits => 
            prevHabits.map(habit => 
                habit.id === habitId ? { ...habit, goal: parseInt(newGoal) || 0 } : habit
            )
        );
    };

    const updateHabitIcon = (habitId, iconKey) => {
        isLocalChangeRef.current = true;
        setHabits(prevHabits => 
            prevHabits.map(habit => 
                habit.id === habitId ? { ...habit, icon: iconKey } : habit
            )
        );
    };

    const deleteHabit = (habitId) => {
        if (confirm("Sei sicuro di voler eliminare questa abitudine?")) {
            isLocalChangeRef.current = true;
            setHabits(prevHabits => prevHabits.filter(h => h.id !== habitId));
        }
    };

    const addHabit = () => {
        isLocalChangeRef.current = true;
        const newId = Math.max(0, ...habits.map(h => h.id)) + 1;
        const newHabit = {
            id: newId,
            name: "Nuova abitudine",
            icon: "Check", 
            goal: 30, // Default goal
            completedDates: {}
        };
        setHabits(prevHabits => [...prevHabits, newHabit]);
    };

    const updateMentalState = (dateKey, field, value) => {
        isLocalChangeRef.current = true;
        setMentalState(prevState => {
            const newLogs = { ...prevState.logs };
            if (!newLogs[dateKey]) {
                newLogs[dateKey] = { mood: 0, motivation: 0 };
            }
            newLogs[dateKey] = { ...newLogs[dateKey], [field]: value };
            return { ...prevState, logs: newLogs };
        });
    };

    // Calculate stats for current month
    const totalHabitsCount = habits.length;
    const totalPossibleCompletions = totalHabitsCount * daysInMonth;
    
    // Calculate actual completions for THIS month
    let actualCompletions = 0;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    habits.forEach(habit => {
        for(let d=1; d<=daysInMonth; d++) {
             const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
             if(habit.completedDates[dateKey]) actualCompletions++;
        }
    });

    const dailyStats = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        let doneCount = 0;
        habits.forEach(h => {
            if(h.completedDates[dateKey]) doneCount++;
        });
        
        const totalCount = habits.length;
        const percentage = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
        
        return {
            day,
            done: doneCount,
            notDone: totalCount - doneCount,
            percentage
        };
    }), [habits, daysInMonth, year, month]);
    const weeklyPercents = useMemo(() => {
        const arr = [];
        for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
            const start = w * 7;
            const end = Math.min(daysInMonth, start + 7);
            let sum = 0;
            for (let d = start; d < end; d++) sum += dailyStats[d].percentage || 0;
            const avg = (end - start) > 0 ? sum / (end - start) : 0;
            arr.push(avg);
        }
        return arr;
    }, [dailyStats, daysInMonth]);

    return (
        <div className="min-h-screen p-8 max-w-[1400px] mx-auto text-slate-200">
            <input ref={importInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const imported = JSON.parse(reader.result);
                        if (imported && imported.habits && imported.mentalState) {
                            setHabits(imported.habits);
                            setMentalState(imported.mentalState);
                            localStorage.setItem('tracker_habits', JSON.stringify(imported.habits));
                            localStorage.setItem('tracker_mental', JSON.stringify(imported.mentalState));
                            alert('Import completato');
                        } else {
                            alert('File non valido');
                        }
                    } catch (err) {
                        alert('Errore durante l\'import');
                    }
                };
                reader.readAsText(file);
                e.target.value = '';
            }} />
            <Header 
                totalHabits={habits.length}
                completedHabits={actualCompletions}
                totalPossible={totalPossibleCompletions}
                currentDate={currentDate}
                onNext={nextMonth}
                onPrev={prevMonth}
                onNextYear={nextYear}
                onPrevYear={prevYear}
                onExport={() => {
                    const data = { habits, mentalState };
                    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'tracker_backup.json';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                }}
                onImportClick={() => {
                    if (importInputRef.current) importInputRef.current.click();
                }}
                onShare={() => {
                    const payload = JSON.stringify({ habits, mentalState });
                    const b64 = btoa(unescape(encodeURIComponent(payload)));
                    const base = window.location.origin + window.location.pathname;
                    const url = `${base}#import=${b64}`;
                    setShareUrl(url);
                    setShareAltUrl(base);
                    setShareOpen(true);
                    setShareShowFull(false);
                    setTimeout(() => {
                        const QR = window.QRCode;
                        const canvas = shareCanvasRef.current;
                        if (QR && canvas) {
                            try {
                                QR.toCanvas(canvas, base, { width: 200 });
                            } catch {}
                        }
                    }, 50);
                }}
                syncCode={syncCode}
                setSyncCode={setSyncCode}
                syncStatus={syncStatus}
                syncError={syncError}
                apiBase={apiBase}
                setApiBase={setApiBase}
                supabaseConfig={supabaseConfig}
                setSupabaseConfig={setSupabaseConfig}
            />
            {shareOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShareOpen(false)}>
                    <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl shadow-lg p-6 w-[95vw] max-w-[560px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-3">
                            <div className="text-lg font-bold text-slate-100">Condividi</div>
                            <button onClick={() => setShareOpen(false)} className="p-2 rounded hover:bg-slate-800 text-slate-400">
                                <Icons.XCircle />
                            </button>
                        </div>
                        <div className="text-xs text-slate-400 mb-4">Scansiona il QR oppure copia il link.</div>
                        <div className="flex items-start gap-4">
                            <canvas ref={shareCanvasRef} className="border border-[#1f2937] rounded w-[200px] h-[200px] bg-white p-1"></canvas>
                            <div className="flex-1">
                                <div className="text-xs bg-[#0b1220] rounded p-2 border border-[#1f2937] whitespace-nowrap overflow-hidden text-ellipsis text-slate-300" title={shareAltUrl}>{shareAltUrl}</div>
                                <div className="mt-2 flex gap-2">
                                    <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(shareAltUrl); }} className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">Copia link breve</button>
                                    {'share' in navigator ? <button onClick={() => { try { navigator.share({ url: shareAltUrl }); } catch {} }} className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-bold">Condividi</button> : null}
                                </div>
                                <div className="mt-4">
                                    <button onClick={() => setShareShowFull(s => !s)} className="text-xs text-slate-400 hover:text-slate-200 underline">
                                        {shareShowFull ? 'Nascondi link con dati' : 'Mostra link con dati (avanzato)'}
                                    </button>
                                    {shareShowFull && (
                                        <div className="mt-2">
                                            <textarea readOnly value={shareUrl} className="w-full h-24 text-xs bg-[#0b1220] rounded p-2 border border-[#1f2937] break-all text-slate-300"></textarea>
                                            <div className="mt-2 flex gap-2">
                                                <button onClick={() => { navigator.clipboard && navigator.clipboard.writeText(shareUrl); }} className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">Copia link con dati</button>
                                                <button onClick={() => {
                                                    const QR = window.QRCode;
                                                    const canvas = shareDataCanvasRef.current;
                                                    if (QR && canvas) {
                                                        try { 
                                                            setShareDataError('');
                                                            QR.toCanvas(canvas, shareUrl, { width: 300, errorCorrectionLevel: 'L' }); 
                                                        } catch (e) {
                                                            setShareDataError('Il link è troppo lungo per il QR. Usa “Copia link con dati”.');
                                                        }
                                                    }
                                                }} className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">Genera QR dati</button>
                                            </div>
                                            <div className="mt-3">
                                                {shareDataError && <div className="text-xs text-red-400 mb-2">{shareDataError}</div>}
                                                <canvas ref={shareDataCanvasRef} className="border border-[#1f2937] rounded w-[300px] h-[300px] bg-white p-1"></canvas>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={() => setShareOpen(false)} className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">Chiudi</button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl shadow-sm p-4 h-[220px]">
                    <div className="text-sm font-semibold text-slate-200 mb-2">Andamento Mensile</div>
                    <div className="h-[170px]">
                        <SimpleAreaChart values={dailyStats.map(s => s.percentage)} color="#60A5FA" maxY={100} labels={dailyStats.map(s => s.day)} />
                    </div>
                </div>
                <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl shadow-sm p-4 h-[220px]">
                    <div className="text-sm font-semibold text-slate-200 mb-2">Completamento</div>
                    <TwoToneDonutGauge percent={totalPossibleCompletions > 0 ? (actualCompletions / totalPossibleCompletions) * 100 : 0} />
                </div>
                <div className="bg-[#0f172a] border border-[#1f2937] rounded-xl shadow-sm p-4 h-[220px]">
                    <div className="text-sm font-semibold text-slate-200 mb-2">Medie Settimanali</div>
                    <WeeklyBarsSmall weeks={weeklyPercents} />
                </div>
            </div>

            <StatsBadges 
                dateText={`${new Date(currentDate).toLocaleString('it-IT', { weekday: 'long' }).replace(/^./, c => c.toUpperCase())} ${new Date(currentDate).getDate()} ${new Date(currentDate).toLocaleString('it-IT', { month: 'short' }).replace(/^./, c => c.toUpperCase())} ${new Date(currentDate).getFullYear()}`}
                doneToday={habits.filter(h => {
                    const y = currentDate.getFullYear();
                    const m = currentDate.getMonth();
                    const d = new Date(currentDate).getDate();
                    const dateKey = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                    return !!h.completedDates[dateKey];
                }).length}
                notDoneToday={Math.max(0, habits.length - habits.filter(h => {
                    const y = currentDate.getFullYear();
                    const m = currentDate.getMonth();
                    const d = new Date(currentDate).getDate();
                    const dateKey = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                    return !!h.completedDates[dateKey];
                }).length)}
                totalTasks={habits.length}
                saveCount={
                    habits.reduce((acc, h) => acc + Object.keys(h.completedDates).length, 0) +
                    Object.values(mentalState.logs).reduce((acc, l) => acc + ((l.mood || 0) > 0 || ((l.motivation || 0) > 0) ? 1 : 0), 0)
                }
            />
            
            <HabitGrid 
                habits={habits} 
                onToggle={toggleHabit} 
                onRename={renameHabit}
                onUpdateGoal={updateGoal}
                onDelete={deleteHabit}
                onAdd={addHabit}
                onUpdateIcon={updateHabitIcon}
                currentDate={currentDate}
                daysInMonth={daysInMonth}
                dailyStats={dailyStats}
            />

            <MentalStateGrid 
                mentalState={mentalState}
                onUpdate={updateMentalState}
                currentDate={currentDate}
                daysInMonth={daysInMonth}
            />

            <div className="mt-8 text-center text-slate-500 text-sm">
                Progetto Demo Trae AI - Habit Tracker
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
