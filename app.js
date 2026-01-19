const { useState, useEffect, useMemo, useRef } = React;

// --- Hooks & Helpers ---
const useTableResizing = (initialLeft = 256, initialRight = 192) => {
    const [leftWidth, setLeftWidth] = useState(initialLeft);
    const [rightWidth, setRightWidth] = useState(initialRight);

    const handleResize = (setter, isRight) => (e) => {
        const startX = e.clientX, startW = isRight ? rightWidth : leftWidth;
        const onMove = (ev) => {
            const dx = ev.clientX - startX;
            setter(isRight ? Math.min(440, Math.max(160, startW - dx)) : Math.min(500, Math.max(120, startW + dx)));
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return { 
        leftWidth, rightWidth, 
        startResizing: handleResize(setLeftWidth, false), 
        startResizingRight: handleResize(setRightWidth, true) 
    };
};

const getSyncUrl = (apiBase, syncCode, syncWord) => {
    let baseUrl = apiBase || '';
    if (!baseUrl && window.location.hostname.includes('netlify.app')) {
        baseUrl = '/.netlify/functions/sync';
    }
    const url = baseUrl.includes('/.netlify/functions/') 
        ? `${baseUrl}?code=${encodeURIComponent(syncCode)}`
        : `${baseUrl}/api/state?code=${encodeURIComponent(syncCode)}`;
    
    return syncWord ? `${url}&word=${encodeURIComponent(syncWord)}` : url;
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const getChartPoints = (values, w, h, maxY) => {
    return values.map((v, i) => {
        const x = (i / Math.max(1, values.length - 1)) * w;
        const y = h - clamp(v, 0, maxY) / maxY * h;
        return [x, y];
    });
};

const getSmoothPath = (pts, tension = 0.9) => {
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
    return pathParts.join(' ');
};

const SimpleAreaChart = ({ values = [], color = "#10B981", maxY = 100, datasets = [], isLight }) => {
    const activeDatasets = datasets.length > 0 ? datasets : [{ values, color, id: 'def' }];
    const w = 1000, h = 100;
    
    return (
        <div className="w-full h-full relative">
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%" className="block">
                <defs>
                    {activeDatasets.map((ds, i) => (
                        <linearGradient key={`grad-${ds.id || i}`} id={`grad-${ds.id || i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={ds.color} stopOpacity={isLight ? 0.4 : 0.15}/>
                            <stop offset="95%" stopColor={ds.color} stopOpacity="0"/>
                        </linearGradient>
                    ))}
                </defs>
                {activeDatasets.map((ds, i) => {
                    const pts = getChartPoints(ds.values, w, h, maxY);
                    const topPath = getSmoothPath(pts, 0.85);
                    return (
                        <React.Fragment key={ds.id || i}>
                            <path d={`${topPath} L ${w},${h} L 0,${h} Z`} fill={`url(#grad-${ds.id || i})`} className="transition-all duration-300" />
                            <path d={topPath} fill="none" stroke={ds.color} strokeWidth="3" strokeLinecap="round" style={{ vectorEffect: 'non-scaling-stroke' }} className="transition-all duration-300" />
                        </React.Fragment>
                    );
                })}
            </svg>
        </div>
    );
};

const SimpleLineChart = ({ values = [], color = "#22c55e", maxY = 100, opacity = 0.7, isLight }) => {
    const w = Math.max(1, values.length - 1);
    const h = 100;
    const pts = getChartPoints(values, w, h, maxY);
    const path = getSmoothPath(pts, 0.95);
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%">
            <defs>
                <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="1.8" floodColor={color} floodOpacity={isLight ? 0.3 : 0.5}/>
                </filter>
            </defs>
            <g stroke={isLight ? "#e2e8f0" : "#334155"} strokeWidth="0.5">
                <line x1="0" y1={h*0.25} x2={w} y2={h*0.25} strokeDasharray="3 3"/>
                <line x1="0" y1={h*0.5} x2={w} y2={h*0.5} strokeDasharray="3 3"/>
                <line x1="0" y1={h*0.75} x2={w} y2={h*0.75} strokeDasharray="3 3"/>
            </g>
            <path d={path} fill="none" stroke={color} strokeOpacity={isLight ? 0.9 : 0.85} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#lineGlow)"/>
        </svg>
    );
};

const RechartsObj = window.Recharts || null;
const ResponsiveContainer = RechartsObj ? RechartsObj.ResponsiveContainer : null;
const AreaChart = RechartsObj ? RechartsObj.AreaChart : null;
const Area = RechartsObj ? RechartsObj.Area : null;
const LineChart = RechartsObj ? RechartsObj.LineChart : null;
const Line = RechartsObj ? RechartsObj.Line : null;
const XAxis = RechartsObj ? RechartsObj.XAxis : null;
const YAxis = RechartsObj ? RechartsObj.YAxis : null;
const CartesianGrid = RechartsObj ? RechartsObj.CartesianGrid : null;
const Tooltip = RechartsObj ? RechartsObj.Tooltip : null;

const TwoToneDonutGauge = ({ percent = 0, isLight }) => {
    const size = 160;
    const stroke = 14;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(100, percent));
    const greenLen = c * (p / 100);
    const remLen = c - greenLen;
    const green = isLight ? '#22c55e' : '#39ff14';
    const orange = isLight ? '#f59e0b' : '#f59e0b';
    return (
        <div className="w-full h-full flex items-center justify-center -mt-4">
            <svg width={size} height={size}>
                <defs>
                    <filter id="donutGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={green} floodOpacity={isLight ? "0.3" : "0.55"}/>
                    </filter>
                </defs>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={isLight ? '#f1f5f9' : '#1f2937'} strokeWidth={stroke}/>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={orange} strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={`${remLen} ${c}`} strokeDashoffset={greenLen}
                        transform={`rotate(-90 ${size/2} ${size/2})`} />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={green} strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={`${greenLen} ${c}`} strokeDashoffset={0}
                        transform={`rotate(-90 ${size/2} ${size/2})`} filter="url(#donutGlow)" />
                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="22" fill={isLight ? '#334155' : '#e5e7eb'} fontWeight="700">{Math.round(p)}%</text>
            </svg>
        </div>
    );
};

const WeeklyBarsSmall = ({ weeks = [], isLight }) => {
    const containerRef = React.useRef(null);
    const [barW, setBarW] = React.useState(24);
    const [hoveredIdx, setHoveredIdx] = React.useState(null);
    
    // Usiamo 100 come base per le percentuali, così l'altezza è assoluta
    // Riduciamo l'altezza massima da 140 a 120 per non far uscire il grafico
    const maxVal = 100;
    const chartHeight = 120;

    React.useEffect(() => {
        const el = containerRef.current;
        if (!el || weeks.length === 0) return;
        const w = el.clientWidth;
        const bw = Math.max(22, Math.floor(w / weeks.length) - 12);
        setBarW(bw);
    }, [weeks]);

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-between px-3 relative pb-6">
            {weeks.map((v, i) => {
                const h = Math.round((v / maxVal) * chartHeight);
                return (
                    <div 
                        key={i} 
                        className="flex flex-col items-center relative group"
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        {/* Tooltip */}
                        {hoveredIdx === i && (
                            <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-bold z-10 whitespace-nowrap shadow-xl transition-all duration-200 ${isLight ? 'bg-slate-800 text-white' : 'bg-blue-500 text-white'}`}>
                                {Math.round(v)}%
                                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${isLight ? 'bg-slate-800' : 'bg-blue-500'}`}></div>
                            </div>
                        )}
                        
                        <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-300'} mb-1 font-medium transition-colors ${hoveredIdx === i ? (isLight ? 'text-blue-600' : 'text-blue-400') : ''}`}>
                            S{i+1}
                        </div>
                        
                        <div className={`rounded-md flex items-end overflow-hidden transition-all duration-300 ${isLight ? 'bg-slate-100' : 'bg-slate-800/50'} ${hoveredIdx === i ? 'ring-2 ring-blue-500/20 scale-105' : ''}`} style={{ width: `${barW}px`, height: `${chartHeight}px` }}>
                            <div 
                                className={`w-full transition-all duration-500 ${hoveredIdx === i ? 'bg-blue-400' : 'bg-blue-500'}`} 
                                style={{ height: `${h}px` }}
                            ></div>
                        </div>
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
    { id: 4, name: "Corsa", icon: "Coffee", goal: 31, completedDates: {} },
    { id: 5, name: ">2L acqua 💧", icon: "Droplet", goal: 31, completedDates: {} },
    { id: 6, name: "Letto 🛌", icon: "Moon", goal: 31, completedDates: {} },
    { id: 7, name: "Cucina", icon: "Brain", goal: 31, completedDates: {} },
    { id: 8, name: "Lavoro", icon: "Check", goal: 30, completedDates: {} },
];

const INITIAL_MENTAL_STATE = {
    logs: {} 
};


// --- Components ---


const ProgressBar = ({ value, max, colorClass = "bg-green-500", height = "h-2", isLight = false }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className={`w-full ${isLight ? 'bg-slate-200' : 'bg-[#1f2937]'} rounded-full ${height}`}>
            <div className={`${colorClass} rounded-full ${height}`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

const Header = ({ totalHabits, completedHabits, totalPossible, currentDate, onNext, onPrev, onNextYear, onPrevYear, onExport, onImportClick, syncCode, setSyncCode, syncWord, setSyncWord, syncStatus, syncError, apiBase, setApiBase, supabaseConfig, setSupabaseConfig, isLight, openSyncSettings, doneToday, notDoneToday, totalTasks, saveCount }) => {
    const progress = totalPossible > 0 ? (completedHabits / totalPossible) * 100 : 0;
    const monthName = getMonthName(currentDate.getFullYear(), currentDate.getMonth());
    const year = currentDate.getFullYear();

    const d = new Date();
    const dayName = d.toLocaleString('it-IT', { weekday: 'long' });
    const dayCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dd = d.getDate();
    const mon = d.toLocaleString('it-IT', { month: 'short' });
    const monCap = mon.charAt(0).toUpperCase() + mon.slice(1);
    const yy = d.getFullYear();
    
    return (
        <div className={`${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#0f172a] border-[#1f2937] text-slate-200'} border p-5 rounded-xl shadow-sm mb-6 flex flex-col gap-4 transition-colors duration-300`}>
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-shrink-0">
                    <button onClick={onPrev} className={`p-2 ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-300'} rounded-full transition-colors`}>
                        <Icons.ChevronLeft />
                    </button>
                    <h1 className={`text-3xl font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'} w-48 text-center select-none`}>{monthName} {year}</h1>
                    <button onClick={onNext} className={`p-2 ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-300'} rounded-full transition-colors`}>
                        <Icons.ChevronRight />
                    </button>
                    <div className="ml-2 flex items-center gap-2">
                        <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Anno</span>
                        <button onClick={onPrevYear} className={`p-1 ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-300'} rounded-full transition-colors`}>
                            <Icons.ChevronLeft />
                        </button>
                        <button onClick={onNextYear} className={`p-1 ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-300'} rounded-full transition-colors`}>
                            <Icons.ChevronRight />
                        </button>
                    </div>
                </div>
                
                <div className="flex gap-4 items-center flex-shrink-0">
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={onExport} className={`px-3 py-1 rounded-full ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} text-xs font-bold transition-colors`}>Esporta</button>
                        <button onClick={onImportClick} className={`px-3 py-1 rounded-full ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} text-xs font-bold transition-colors`}>Importa</button>
                    </div>
                </div>
            </div>

            <div className={`flex items-center justify-between flex-wrap gap-4 pt-4 border-t ${isLight ? 'border-slate-100' : 'border-[#1f2937]'}`}>
                <div className={`px-4 py-1.5 rounded-full ${isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-900/20 text-blue-400'} text-sm font-bold flex items-center gap-2 shadow-sm`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {`${dayCap} ${dd} ${monCap} ${yy}`}
                </div>

                <div className="flex items-center gap-6 md:gap-10">
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Fatte</div>
                        <div className={`text-lg font-black ${isLight ? 'text-green-600' : 'text-green-400'}`}>{doneToday || 0}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Mancanti</div>
                        <div className={`text-lg font-black ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>{notDoneToday || 0}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Totali</div>
                        <div className={`text-lg font-black ${isLight ? 'text-blue-500' : 'text-blue-400'}`}>{totalTasks || 0}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Sync</div>
                        <div className={`text-lg font-black ${isLight ? 'text-purple-500' : 'text-purple-400'}`}>{saveCount || 0}</div>
                    </div>
                </div>

                <div className="flex-1 max-w-xs ml-auto">
                    <div className="flex justify-between mb-1 items-center">
                        <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-bold tracking-wider`}>Completamento Giorno</span>
                        <span className={`text-xs font-black ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{totalTasks > 0 ? ((doneToday / totalTasks) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                    <ProgressBar value={doneToday} max={totalTasks} height="h-2.5" isLight={isLight} />
                </div>
            </div>
        </div>
    );
};


const HabitGrid = ({ habits, onToggle, onRename, onUpdateGoal, onDelete, onAdd, currentDate, daysInMonth, dailyStats, onUpdateIcon, isLight }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");

    const [editingGoalId, setEditingGoalId] = useState(null);
    const [editGoalValue, setEditGoalValue] = useState("");

    const { leftWidth, rightWidth, startResizing, startResizingRight } = useTableResizing(256, 192);
    const scrollRef = React.useRef(null);
    const [cellWidth, setCellWidth] = useState(24);
    const rowHeight = 40;
    const [sliderValue, setSliderValue] = useState(0);

    const recalcCellWidth = () => {
        const el = scrollRef.current;
        if (!el) return;
        const w = el.clientWidth;
        const cw = Math.max(24, Math.floor(w / Math.max(1, daysInMonth)));
        setCellWidth(cw);
    };

    useEffect(() => {
        const el = scrollRef.current;
        const handleScroll = () => {
            if (!el) return;
            setSliderValue(el.scrollLeft);
        };
        const handleResize = () => recalcCellWidth();
        window.addEventListener('resize', handleResize);
        if (el) el.addEventListener('scroll', handleScroll);
        recalcCellWidth();
        return () => {
            window.removeEventListener('resize', handleResize);
            if (el) el.removeEventListener('scroll', handleScroll);
        };
    }, [daysInMonth, leftWidth, rightWidth]);

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
        <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors duration-300`}>
            <div className="flex">
                {/* Left Column: Habit Names */}
                <div className={`flex-shrink-0 border-r ${isLight ? 'border-slate-100 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} z-10`} style={{ width: leftWidth }}>
                    <div className={`h-8 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0b1220] border-[#1f2937]'} border-b`}></div>
                    <div className={`h-12 ${isLight ? 'bg-slate-50 border-slate-100 text-slate-800' : 'bg-[#0b1220] border-[#1f2937] text-slate-200'} border-b flex items-center justify-center font-bold`}>
                        Le mie abitudini
                    </div>
                    <div className={`h-6 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0b1220] border-[#1f2937]'} border-b`}></div>
                    {habits.map(habit => {
                        const IconComp = Icons[habit.icon] || Icons.Check;
                        const isEditing = editingId === habit.id;

                        return (
                            <div key={habit.id} className={`border-b ${isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-[#1f2937] hover:bg-slate-800'} flex items-center px-4 transition-colors group relative`} style={{ height: rowHeight }}>
                                <span className={`mr-2 ${isLight ? 'text-slate-400' : 'text-slate-300'} flex-shrink-0 cursor-pointer`} onClick={() => setEditingIconId(habit.id)}><IconComp /></span>
                                {editingIconId === habit.id && (
                                    <div className={`absolute left-8 top-1 z-20 ${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-800 border-[#1f2937] shadow-2xl'} border rounded p-2 flex flex-wrap gap-2 w-48`}>
                                        {iconOptions.map(k => {
                                            const Ico = Icons[k];
                                            return (
                                                <button key={k} onClick={() => { onUpdateIcon(habit.id, k); setEditingIconId(null); }} className={`p-1 rounded ${isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-700'} ${habit.icon===k? (isLight ? 'bg-blue-50 border border-blue-500' : 'bg-slate-700 border border-blue-500') : ''}`}>
                                                    <span className={isLight ? 'text-blue-600' : 'text-slate-200'}><Ico /></span>
                                                </button>
                                            );
                                        })}
                                        <button onClick={() => setEditingIconId(null)} className={`w-full text-center py-1 mt-1 text-xs ${isLight ? 'text-slate-400 hover:text-slate-600 bg-slate-50' : 'text-slate-400 hover:text-slate-200 bg-slate-700'} rounded`}>chiudi</button>
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
                                        className={`text-sm font-medium ${isLight ? 'text-slate-800 bg-slate-50' : 'text-slate-200 bg-slate-800'} w-full border border-blue-500 rounded px-1 outline-none`}
                                    />
                                ) : (
                                    <span 
                                        className={`text-sm font-medium ${isLight ? 'text-slate-600' : 'text-slate-200'} truncate flex-grow cursor-pointer`}
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
                                        className={`ml-2 ${isLight ? 'text-slate-300 hover:text-red-500' : 'text-slate-500 hover:text-red-500'} opacity-0 group-hover:opacity-100 transition-opacity`}
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
                        className={`border-b ${isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-[#1f2937] hover:bg-slate-800'} flex items-center px-4 transition-colors cursor-pointer text-blue-600 hover:text-blue-500 font-bold`}
                        style={{ height: rowHeight }}
                    >
                        <span className="mr-2"><Icons.Plus /></span>
                        <span className="text-sm">Aggiungi abitudine</span>
                    </div>

                    {/* Progress Footer Labels */}
                    <div className={`border-t ${isLight ? 'border-slate-100' : 'border-[#1f2937]'}`}>
                        <div className={`h-8 flex items-center justify-end px-4 text-xs font-bold ${isLight ? 'text-slate-500 bg-slate-50 border-slate-100' : 'text-slate-300 bg-[#0b1220] border-[#1f2937]'} border-b transition-colors duration-300`}>Fatto (%)</div>
                        <div className={`h-8 flex items-center justify-end px-4 text-xs font-bold ${isLight ? 'text-slate-500 bg-white border-slate-100' : 'text-slate-300 bg-[#0f172a] border-[#1f2937]'} border-b transition-colors duration-300`}>Fatto</div>
                        <div className={`h-8 flex items-center justify-end px-4 text-xs font-bold ${isLight ? 'text-slate-500 bg-white border-slate-100' : 'text-slate-300 bg-[#0f172a]'} transition-colors duration-300`}>Non fatto</div>
                        <div className={`h-32 border-t ${isLight ? 'border-slate-100 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} transition-colors duration-300`}></div>
                    </div>
                </div>
                <div onMouseDown={startResizing} className={`w-2 cursor-col-resize ${isLight ? 'bg-slate-50 hover:bg-blue-400 border-slate-100' : 'bg-[#0b1220] hover:bg-blue-500 border-[#1f2937]'} transition-none border-x`}></div>

                {/* Middle: Days Grid */}
                <div className="flex-grow flex flex-col min-w-0">
                    <div ref={scrollRef} className="overflow-x-auto">
                        <div className="min-w-max">
                            <div className={`flex h-8 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0b1220] border-[#1f2937]'} border-b transition-colors duration-300`}>
                                {Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, i) => {
                                    const size = Math.min(7, daysInMonth - i * 7);
                                    const w = cellWidth * size;
                                    return (
                                        <div key={i} className={`flex-shrink-0 flex items-center justify-center border-r ${isLight ? 'border-slate-100 text-slate-500' : 'border-[#1f2937] text-slate-300'} text-[10px] font-bold transition-colors duration-300`} style={{ width: w }}>
                                            {`Settimana ${i + 1}`}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex">
                                {/* Header Row for Days */}
                                {daysArray.map(day => (
                                    <div key={day} className={`flex-shrink-0 flex flex-col items-center justify-center h-12 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0b1220] border-[#1f2937]'} border-b border-r transition-colors duration-300`} style={{ width: cellWidth }}>
                                        <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{getDayName(day)}</span>
                                        <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{day}</span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Header spacer to match Analysis column */}
                            <div className={`flex h-6 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0b1220] border-[#1f2937]'} border-b transition-colors duration-300`}></div>
                            
                            {/* Grid Body */}
                            <div>
                                {habits.map(habit => (
                                    <div key={habit.id} className={`flex border-b ${isLight ? 'border-slate-100' : 'border-[#1f2937]'} transition-colors duration-300`} style={{ height: rowHeight }}>
                                        {daysArray.map(day => {
                                            const done = isDone(habit, day);
                                            return (
                                                <div 
                                                    key={day} 
                                                    onClick={() => onToggle(habit.id, day)}
                                                    className={`border-r ${isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-[#1f2937] hover:bg-slate-800'} flex items-center justify-center cursor-pointer transition-colors duration-300`}
                                                    style={{ width: cellWidth }}
                                                >
                                                    {done ? (
                                                        <div className="rounded flex items-center justify-center transition-all text-white"
                                                             style={{ 
                                                                 width: '24px', 
                                                                 height: '24px', 
                                                                 backgroundColor: isLight ? '#10b981' : '#39ff14', 
                                                                 boxShadow: isLight ? '0 0 8px rgba(16,185,129,0.3)' : '0 0 8px 2px rgba(57,255,20,0.6)' 
                                                             }}>
                                                            <Icons.Check />
                                                        </div>
                                                    ) : (
                                                        <div className={`rounded flex items-center justify-center transition-all ${isLight ? 'bg-slate-50' : 'bg-[#1f2937]'} text-slate-400`} style={{ width: '24px', height: '24px' }}></div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                            
                            {/* Spacer for "Add Habit" row */}
                            <div className={`border-b ${isLight ? 'border-slate-100' : 'border-[#1f2937]'} transition-colors duration-300`} style={{ height: rowHeight }}></div>

                            {/* Progress Footer Values */}
                            <div className={`border-t ${isLight ? 'border-slate-100' : 'border-[#1f2937]'} transition-colors duration-300`}>
                                <div className={`flex h-8 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0b1220] border-[#1f2937]'} border-b transition-colors duration-300`}>
                                    {dailyStats.map(stat => (
                                        <div key={stat.day} className={`flex-shrink-0 flex items-center justify-center border-r ${isLight ? 'border-slate-100 text-slate-500' : 'border-[#1f2937] text-slate-300'} text-[10px] font-bold`} style={{ width: cellWidth }}>
                                            {Math.round(stat.percentage)}%
                                        </div>
                                    ))}
                                </div>
                                <div className={`flex h-8 ${isLight ? 'bg-white border-slate-100' : 'bg-[#0f172a] border-[#1f2937]'} border-b transition-colors duration-300`}>
                                    {dailyStats.map(stat => (
                                        <div key={stat.day} className={`flex-shrink-0 flex items-center justify-center border-r ${isLight ? 'border-slate-100 text-slate-600' : 'border-[#1f2937] text-slate-300'} text-[10px]`} style={{ width: cellWidth }}>
                                            {stat.done}
                                        </div>
                                    ))}
                                </div>
                                <div className={`flex h-8 ${isLight ? 'bg-white border-slate-100' : 'bg-[#0f172a] border-[#1f2937]'} transition-colors duration-300`}>
                                    {dailyStats.map(stat => (
                                        <div key={stat.day} className={`flex-shrink-0 flex items-center justify-center border-r ${isLight ? 'border-slate-100 text-slate-400' : 'border-[#1f2937] text-slate-300'} text-[10px]`} style={{ width: cellWidth }}>
                                            {stat.notDone}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className={`h-32 border-t ${isLight ? 'border-slate-100 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} relative px-2 transition-colors duration-300`}>
                        {ResponsiveContainer && AreaChart && Area ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorHabit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={isLight ? 0.3 : 0.15}/>
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#f1f5f9" : "#1f2937"} vertical={false} />
                                    <XAxis dataKey="day" hide />
                        <YAxis domain={[0, 100]} hide />
                        <Area type="monotone" dataKey="percentage" stroke="#22c55e" strokeWidth={3} fill="url(#colorHabit)" animationDuration={1000} dot={false} activeDot={false} />
                    </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <SimpleAreaChart values={dailyStats.map(s => s.percentage)} color="#22c55e" maxY={100} labels={dailyStats.map(s => s.day)} isLight={isLight} />
                        )}
                    </div>
                </div>

                {/* Right Column: Analysis */}
                <div onMouseDown={startResizingRight} className={`w-2 cursor-col-resize ${isLight ? 'bg-slate-50 hover:bg-blue-400 border-slate-100' : 'bg-[#0b1220] hover:bg-blue-500 border-[#1f2937]'} transition-none border-x`}></div>
                <div className={`flex-shrink-0 border-l ${isLight ? 'border-slate-100 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} transition-colors duration-300`} style={{ width: rightWidth }}>
                     <div className={`h-8 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0b1220] border-[#1f2937]'} border-b transition-colors duration-300`}></div>
                     <div className={`h-12 ${isLight ? 'bg-slate-50 border-slate-100 text-slate-700' : 'bg-[#0b1220] border-[#1f2937] text-slate-200'} border-b flex items-center justify-center font-bold transition-colors duration-300`}>
                        Analisi
                    </div>
                    <div className={`flex h-6 ${isLight ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-[#0b1220] border-[#1f2937] text-slate-400'} border-b text-[10px] transition-colors duration-300`}>
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
                            <div key={habit.id} className={`h-10 border-b ${isLight ? 'border-slate-100' : 'border-[#1f2937]'} flex items-center px-2 transition-colors duration-300`}>
                                <div className={`w-10 text-xs text-center ${isLight ? 'text-slate-500' : 'text-slate-300'}`}>
                                    {isEditingGoal ? (
                                        <input 
                                            type="number" 
                                            value={editGoalValue}
                                            onChange={(e) => setEditGoalValue(e.target.value)}
                                            onBlur={saveEditingGoal}
                                            onKeyDown={handleGoalKeyDown}
                                            autoFocus
                                            className={`w-full text-center border border-blue-500 rounded outline-none p-0 ${isLight ? 'bg-white text-slate-700' : 'bg-slate-800 text-slate-200'}`}
                                        />
                                    ) : (
                                        <span 
                                            onClick={() => startEditingGoal(habit)}
                                            className={`cursor-pointer ${isLight ? 'hover:text-blue-600' : 'hover:text-blue-400'} hover:font-bold`}
                                            title="Clicca per modificare obiettivo"
                                        >
                                            {scaledGoal}
                                        </span>
                                    )}
                                </div>
                                <div className={`w-10 text-xs text-center font-bold ${isLight ? 'text-slate-600' : 'text-slate-200'} cursor-help transition-colors duration-300`} title={`${percentage}%`}>{actual}</div>
                                <div className="flex-grow px-2 transition-colors duration-300" title={`${percentage}%`}>
                                    <ProgressBar value={actual} max={denom} colorClass={percentage >= 100 ? "bg-green-500" : "bg-blue-500"} height="h-2" isLight={isLight} />
                                </div>
                            </div>
                        );
                    })}
                     {/* Spacer for "Add Habit" row */}
                     <div className={`border-b ${isLight ? 'border-slate-100' : 'border-[#1f2937]'} transition-colors duration-300`} style={{ height: rowHeight }}></div>
                     
                     {/* Empty space to match footer height */}
                     <div className={`border-t-2 ${isLight ? 'border-slate-100 bg-slate-50' : 'border-[#1f2937] bg-[#0b1220]'} h-[96px] transition-colors duration-300`}></div>
                     <div className={`border-t ${isLight ? 'border-slate-100 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} h-32 transition-colors duration-300`}></div>
                </div>
            </div>
        </div>
    );
};

const TodayInfo = ({ isLight, doneToday, notDoneToday, totalTasks, saveCount }) => {
    const d = new Date();
    const dayName = d.toLocaleString('it-IT', { weekday: 'long' });
    const dayCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dd = d.getDate();
    const mon = d.toLocaleString('it-IT', { month: 'short' });
    const monCap = mon.charAt(0).toUpperCase() + mon.slice(1);
    const yy = d.getFullYear();
    return (
        <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border p-2.5 md:p-3 rounded-2xl md:rounded-xl shadow-sm mb-4 flex items-center justify-between flex-wrap gap-3 md:gap-4 transition-colors duration-300`}>
            <div className={`px-3 py-1 rounded-full ${isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-200'} text-xs md:text-sm font-medium transition-colors duration-300`}>
                {`Oggi: ${dayCap} ${dd} ${monCap} ${yy}`}
            </div>
            
            {doneToday !== undefined && (
                <div className="flex items-center gap-4 md:gap-8 mr-1 md:mr-2">
                    <div className="flex flex-col items-center">
                        <div className={`text-[8px] md:text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Fatte</div>
                        <div className={`text-xs md:text-sm font-black ${isLight ? 'text-green-600' : 'text-green-400'}`}>{doneToday}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[8px] md:text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Mancanti</div>
                        <div className={`text-xs md:text-sm font-black ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>{notDoneToday}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[8px] md:text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Totali</div>
                        <div className={`text-xs md:text-sm font-black ${isLight ? 'text-blue-500' : 'text-blue-400'}`}>{totalTasks}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[8px] md:text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Sync</div>
                        <div className={`text-xs md:text-sm font-black ${isLight ? 'text-purple-500' : 'text-purple-400'}`}>{saveCount}</div>
                    </div>
                </div>
            )}
        </div>
    );
};
const MentalStateGrid = ({ mentalState, onUpdate, currentDate, daysInMonth, isLight }) => {
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
            motivation: log.motivation || 0
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
        if (!v) return { backgroundColor: 'transparent', color: isLight ? '#94a3b8' : '#94a3b8' };
        const val = Math.max(0, Math.min(10, v));
        const hue = Math.round((val / 10) * 120);
        return { 
            backgroundColor: isLight ? `hsl(${hue}, 60%, 85%)` : `hsl(${hue}, 60%, 15%)`,
            color: isLight ? `hsl(${hue}, 100%, 25%)` : `hsl(${hue}, 100%, 75%)`,
            fontWeight: 'bold'
        };
    };

    const { leftWidth, rightWidth, startResizing, startResizingRight } = useTableResizing(256, 192);
    const scrollRef = React.useRef(null);
    const [cellWidth, setCellWidth] = useState(24);
    
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
        window.addEventListener('resize', handleResize);
        recalcCellWidth();
        return () => window.removeEventListener('resize', handleResize);
    }, [daysInMonth, leftWidth, rightWidth]);

    return (
        <div className={`${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-[#0f172a] border-[#1f2937] text-slate-200'} border rounded-xl shadow-sm overflow-hidden flex flex-col mt-6 transition-colors duration-300`}>
             <div className="flex">
                {/* Left Header */}
                <div className={`flex-shrink-0 border-r ${isLight ? 'border-slate-200 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} z-10 transition-colors duration-300`} style={{ width: leftWidth }}>
                    <div className={`h-8 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#0b1220] border-[#1f2937] text-slate-200'} border-b flex items-center justify-center font-bold text-xs transition-colors duration-300`}>
                        Stato Mentale
                    </div>
                    <div className={`h-8 flex items-center justify-end px-4 text-xs font-bold ${isLight ? 'text-slate-500 bg-white border-slate-200' : 'text-slate-300 bg-[#0f172a] border-[#1f2937]'} border-b transition-colors duration-300`}>Umore (1-10)</div>
                    <div className={`h-8 flex items-center justify-end px-4 text-xs font-bold ${isLight ? 'text-slate-500 bg-white' : 'text-slate-300 bg-[#0f172a]'} transition-colors duration-300`}>Motivazione (1-10)</div>
                    <div className={`h-20 border-t ${isLight ? 'border-slate-200 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} flex items-center justify-center gap-4 transition-colors duration-300`}>
                        <div className={`px-3 py-1 rounded-full ${isLight ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-pink-900/30 text-pink-300'} text-[10px] font-bold transition-colors duration-300`}>
                            Media Umore: {moodAvg.toFixed(1)}
                        </div>
                        <div className={`px-3 py-1 rounded-full ${isLight ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-blue-900/30 text-blue-300'} text-[10px] font-bold transition-colors duration-300`}>
                            Media Motivazione: {motAvg.toFixed(1)}
                        </div>
                    </div>
                </div>

                <div onMouseDown={startResizing} className={`w-2 cursor-col-resize ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b1220] border-[#1f2937]'} hover:bg-blue-500 transition-none border-x`}></div>

                {/* Grid */}
                <div className="flex-grow flex flex-col min-w-0">
                    <div ref={scrollRef} className="overflow-x-auto">
                        <div className="min-w-max">
                            <div className={`flex h-8 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b1220] border-[#1f2937]'} border-b transition-colors duration-300`}>
                                {Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, i) => {
                                    const size = Math.min(7, daysInMonth - i * 7);
                                    const w = cellWidth * size;
                                    return (
                                        <div key={i} className={`flex-shrink-0 flex items-center justify-center border-r ${isLight ? 'border-slate-200 text-slate-500' : 'border-[#1f2937] text-slate-300'} text-[10px] font-bold transition-colors duration-300`} style={{ width: w }}>
                                            {`Settimana ${i + 1}`}
                                        </div>
                                    );
                                })}
                            </div>

                             {/* Mood Row */}
                             <div className={`flex h-8 border-b ${isLight ? 'border-slate-200' : 'border-[#1f2937]'} transition-colors duration-300`}>
                                {daysArray.map(day => {
                                    const log = getLog(day);
                                    return (
                                        <div key={day} className={`border-r ${isLight ? 'border-slate-200' : 'border-[#1f2937]'} flex items-center justify-center transition-colors duration-300`} style={{ width: cellWidth }}>
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
                                        <div key={day} className={`border-r ${isLight ? 'border-slate-200' : 'border-[#1f2937]'} flex items-center justify-center transition-colors duration-300`} style={{ width: cellWidth }}>
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
                        </div>
                    </div>

                    <div className={`h-48 border-t ${isLight ? 'border-slate-200 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} relative transition-colors duration-300`}>
                        {ResponsiveContainer && AreaChart && Area ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 20, right: 15, left: 5, bottom: 10 }}>
                                    <defs>
                                        <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ec4899" stopOpacity={isLight ? 0.3 : 0.15}/>
                                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorMot" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={isLight ? 0.3 : 0.15}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1f2937'} vertical={false} />
                                    <XAxis dataKey="name" hide />
                                    <YAxis domain={[0, 10]} hide />
                                    <Area type="monotone" dataKey="mood" stroke="#ec4899" strokeWidth={3} fill="url(#colorMood)" animationDuration={1000} dot={false} activeDot={false} />
                                    <Area type="monotone" dataKey="motivation" stroke="#3b82f6" strokeWidth={3} fill="url(#colorMot)" animationDuration={1000} dot={false} activeDot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <SimpleAreaChart 
                                maxY={11} 
                                labels={daysArray.map(d => d.toString())} 
                                datasets={[
                                    { values: chartData.map(d => d.mood), color: "#ec4899", label: "Umore", id: "mood" },
                                    { values: chartData.map(d => d.motivation), color: "#3b82f6", label: "Motivazione", id: "mot" }
                                ]}
                                isLight={isLight}
                            />
                        )}
                    </div>
                </div>

                {/* Right Filler */}
                <div onMouseDown={startResizingRight} className={`w-2 cursor-col-resize ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b1220] border-[#1f2937]'} hover:bg-blue-500 transition-none border-x`}></div>
                <div className={`flex-shrink-0 border-l ${isLight ? 'border-slate-200 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} transition-colors duration-300`} style={{ width: rightWidth }}>
                    <div className={`h-8 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b1220] border-[#1f2937]'} border-b transition-colors duration-300`}></div>
                    <div className={`h-8 border-b ${isLight ? 'border-slate-200' : 'border-[#1f2937]'} transition-colors duration-300`}></div>
                    <div className="h-8"></div>
                    <div className={`h-32 border-t ${isLight ? 'border-slate-200' : 'border-[#1f2937]'} transition-colors duration-300`}></div>
                </div>
             </div>
        </div>
    );
};

const SchoolGradesView = ({ schoolData, setSchoolData, isLight, openSyncSettings }) => {
    const [activeSchoolTab, setActiveSchoolTab] = useState('dashboard'); // 'dashboard', 'subjects', 'calendar', 'tests'
    const [newSubject, setNewSubject] = useState('');
    const [showAddTest, setShowAddTest] = useState(false);
    const [editingTestId, setEditingTestId] = useState(null);
    const [testForm, setTestForm] = useState({ subjectId: '', date: '', type: 'Scritto', note: '' });
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [addingGradeTo, setAddingGradeTo] = useState(null); // ID della materia
    const [editingGradeId, setEditingGradeId] = useState(null); // ID del voto in modifica
    const [gradeForm, setGradeForm] = useState({ value: '', date: new Date().toISOString().split('T')[0], topic: '' });

    const addSubject = (e) => {
        e.preventDefault();
        if (!newSubject.trim()) return;
        const subject = {
            id: Date.now().toString(),
            name: newSubject.trim(),
            grades: []
        };
        setSchoolData(prev => ({
            ...prev,
            subjects: [...prev.subjects, subject]
        }));
        setNewSubject('');
    };

    const deleteSubject = (id) => {
        if (!confirm("Eliminando la materia cancellerai anche tutti i voti e le verifiche associate. Procedere?")) return;
        setSchoolData(prev => ({
            ...prev,
            subjects: prev.subjects.filter(s => s.id !== id),
            tests: prev.tests.filter(t => t.subjectId !== id)
        }));
    };

    const updateGlobalMaxGrade = (newMax) => {
        if (newMax === '') return;
        const val = parseFloat(newMax);
        if (isNaN(val) || val <= 0) return;

        setSchoolData(prev => ({
            ...prev,
            maxGrade: val
        }));
    };

    const updateGlobalMinGrade = (newMin) => {
        if (newMin === '') return;
        const val = parseFloat(newMin);
        if (isNaN(val) || val < 0) return;

        setSchoolData(prev => ({
            ...prev,
            minGrade: val
        }));
    };

    const addGrade = (subjectId, value, date, topic = '') => {
        const max = schoolData.maxGrade || 10;
        const val = parseFloat(value);
        if (isNaN(val) || val < 0 || val > max) return;
        
        const grade = {
            id: Date.now().toString(),
            value: val,
            date: date || new Date().toISOString().split('T')[0],
            topic: topic.trim()
        };
        setSchoolData(prev => ({
            ...prev,
            subjects: prev.subjects.map(s => 
                s.id === subjectId ? { ...s, grades: [...s.grades, grade] } : s
            )
        }));
    };

    const updateGrade = (subjectId, gradeId, value, date, topic = '') => {
        const max = schoolData.maxGrade || 10;
        const val = parseFloat(value);
        if (isNaN(val) || val < 0 || val > max) return;

        setSchoolData(prev => ({
            ...prev,
            subjects: prev.subjects.map(s => 
                s.id === subjectId ? { 
                    ...s, 
                    grades: s.grades.map(g => 
                        g.id === gradeId ? { ...g, value: val, date, topic: topic.trim() } : g
                    ) 
                } : s
            )
        }));
    };

    const removeGrade = (subjectId, gradeId) => {
        setSchoolData(prev => ({
            ...prev,
            subjects: prev.subjects.map(s => 
                s.id === subjectId ? { ...s, grades: s.grades.filter(g => g.id !== gradeId) } : s
            )
        }));
    };

    const addTest = (e) => {
        e.preventDefault();
        if (!testForm.subjectId || !testForm.date) return;
        
        if (editingTestId) {
            setSchoolData(prev => ({
                ...prev,
                tests: prev.tests.map(t => 
                    t.id === editingTestId ? { ...t, ...testForm } : t
                )
            }));
            setEditingTestId(null);
        } else {
            const test = {
                id: Date.now().toString(),
                ...testForm,
                completed: false
            };
            setSchoolData(prev => ({
                ...prev,
                tests: [...prev.tests, test]
            }));
        }
        
        setTestForm({ subjectId: '', date: '', type: 'Scritto', note: '' });
        setShowAddTest(false);
    };

    const startEditingTest = (test) => {
        setEditingTestId(test.id);
        setTestForm({
            subjectId: test.subjectId,
            date: test.date,
            type: test.type,
            note: test.note || ''
        });
        setShowAddTest(true);
    };

    const deleteTest = (id) => {
        setSchoolData(prev => ({
            ...prev,
            tests: prev.tests.filter(t => t.id !== id)
        }));
    };

    const completeTest = (test, gradeValue) => {
        addGrade(test.subjectId, gradeValue, test.date);
        setSchoolData(prev => ({
            ...prev,
            tests: prev.tests.filter(t => t.id !== test.id)
        }));
    };

    const calculateAverage = (grades) => {
        if (grades.length === 0) return 0;
        const sum = grades.reduce((acc, g) => acc + g.value, 0);
        return (sum / grades.length).toFixed(2);
    };

    const getGradeColor = (value, max = 10, min = 0, isLight = false) => {
        const val = parseFloat(value);
        const m = parseFloat(max) || 10;
        const n = parseFloat(min) || 0;
        
        if (isNaN(val) || val === 0) return isLight ? 'text-slate-400 bg-slate-100 border-slate-200' : 'text-slate-500 bg-slate-800 border-slate-700';
        
        if (val >= m) return isLight ? 'text-emerald-600 bg-emerald-100 border-emerald-200' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-emerald-900/10';
        
        const range = m - n;
        if (range <= 0) return isLight ? 'text-slate-400 bg-slate-100 border-slate-200' : 'text-slate-500 bg-slate-800 border-slate-700';
        
        const rel = (val - n) / range;
        
        if (rel <= 0) return isLight ? 'text-red-600 bg-red-100 border-red-200' : 'text-red-500 bg-red-500/10 border-red-500/20 shadow-red-900/10';
        if (rel < 0.25) return isLight ? 'text-red-500 bg-red-50 border-red-100' : 'text-red-400 bg-red-400/10 border-red-400/20 shadow-red-900/10';
        if (rel < 0.45) return isLight ? 'text-orange-700 bg-orange-100 border-orange-200' : 'text-orange-600 bg-orange-600/10 border-orange-600/20 shadow-orange-900/10';
        if (rel < 0.60) return isLight ? 'text-orange-500 bg-orange-50 border-orange-100' : 'text-orange-400 bg-orange-400/10 border-orange-400/20 shadow-orange-900/10';
        if (rel < 0.70) return isLight ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-amber-900/10';
        if (rel < 0.80) return isLight ? 'text-yellow-600 bg-yellow-50 border-yellow-100' : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20 shadow-yellow-900/10';
        if (rel < 0.88) return isLight ? 'text-lime-600 bg-lime-50 border-lime-100' : 'text-lime-400 bg-lime-400/10 border-lime-400/20 shadow-lime-900/10';
        if (rel < 0.95) return isLight ? 'text-green-600 bg-green-50 border-green-100' : 'text-green-500 bg-green-500/10 border-green-500/20 shadow-green-900/10';
        return isLight ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-900/10';
    };

    const getGradeBarColor = (value, max = 10, min = 0, isLight = false) => {
        const val = parseFloat(value);
        const m = parseFloat(max) || 10;
        const n = parseFloat(min) || 0;
        if (isNaN(val) || val === 0) return isLight ? 'from-slate-400 to-slate-200' : 'from-slate-600 to-slate-400';
        if (val >= m) return isLight ? 'from-emerald-600 to-emerald-400' : 'from-emerald-600 to-emerald-400';
        
        const range = m - n;
        if (range <= 0) return isLight ? 'from-slate-400 to-slate-200' : 'from-slate-600 to-slate-400';
        
        const rel = (val - n) / range;
        
        if (rel <= 0) return isLight ? 'from-red-600 to-red-400' : 'from-red-600 to-red-400';
        if (rel < 0.25) return isLight ? 'from-red-500 to-red-300' : 'from-red-500 to-red-300';
        if (rel < 0.45) return isLight ? 'from-orange-700 to-orange-500' : 'from-orange-700 to-orange-500';
        if (rel < 0.60) return isLight ? 'from-orange-500 to-orange-300' : 'from-orange-500 to-orange-300';
        if (rel < 0.70) return isLight ? 'from-amber-500 to-amber-300' : 'from-amber-500 to-amber-300';
        if (rel < 0.80) return isLight ? 'from-yellow-500 to-yellow-300' : 'from-yellow-500 to-yellow-300';
        if (rel < 0.88) return isLight ? 'from-lime-500 to-lime-300' : 'from-lime-500 to-lime-300';
        if (rel < 0.95) return isLight ? 'from-green-600 to-green-400' : 'from-green-600 to-green-400';
        return isLight ? 'from-emerald-600 to-emerald-400' : 'from-emerald-600 to-emerald-400';
    };

    const totalAveragePercent = useMemo(() => {
        const subjects = schoolData.subjects || [];
        const percents = subjects
            .map(s => {
                const avg = parseFloat(calculateAverage(s.grades || []));
                return avg > 0 ? (avg / (schoolData.maxGrade || 10)) : null;
            })
            .filter(p => p !== null);
        if (percents.length === 0) return 0;
        return (percents.reduce((a, b) => a + b, 0) / percents.length);
    }, [schoolData.subjects, schoolData.maxGrade]);

    const stats = useMemo(() => {
        const max = schoolData.maxGrade || 10;
        const min = schoolData.minGrade || 0;
        const subjectsWithRelativeAvg = (schoolData.subjects || [])
            .map(s => {
                const avg = parseFloat(calculateAverage(s.grades || []));
                return { ...s, avg, relative: avg / max };
            })
            .filter(s => s.avg > 0);
        
        const best = subjectsWithRelativeAvg.length > 0 
            ? [...subjectsWithRelativeAvg].sort((a, b) => b.relative - a.relative)[0] 
            : null;
        
        const worst = subjectsWithRelativeAvg.length > 0 
            ? [...subjectsWithRelativeAvg].sort((a, b) => a.relative - b.relative)[0] 
            : null;

        return { best, worst };
    }, [schoolData.subjects, schoolData.maxGrade, schoolData.minGrade]);

    const totalAverageDisplay = (totalAveragePercent * (schoolData.maxGrade || 10)).toFixed(2);

    const upcomingTests = useMemo(() => {
        const now = new Date().toISOString().split('T')[0];
        const tests = schoolData.tests || [];
        return tests
            .filter(t => t.date >= now)
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [schoolData.tests]);

    const renderDashboard = () => {
        const max = schoolData.maxGrade || 10;
        const min = schoolData.minGrade || 6;
        const subjects = schoolData.subjects || [];
        
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-xl'} border rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden group transition-all duration-300`}>
                        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-blue-600/5 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                        <div className="relative">
                            <div className={`text-[10px] md:text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-widest mb-1 transition-colors duration-300`}>Media</div>
                            <div className={`text-2xl md:text-4xl font-black ${getGradeColor(totalAverageDisplay, max, min, isLight).split(' ')[0]} transition-colors duration-300`}>
                                {totalAverageDisplay}
                            </div>
                            <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}>
                                <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${parseFloat(totalAverageDisplay) >= min ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {subjects.length} Materie
                            </div>
                        </div>
                    </div>

                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-xl'} border rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden group transition-all duration-300`}>
                    <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-purple-600/5 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="relative">
                        <div className={`text-[10px] md:text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-widest mb-1 transition-colors duration-300`}>Verifiche</div>
                        <div className={`text-2xl md:text-4xl font-black ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
                            {upcomingTests.length}
                        </div>
                        <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}>
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-purple-500"></span>
                            <span className="truncate">{upcomingTests.length > 0 ? `${upcomingTests[0].date}` : 'Libero'}</span>
                        </div>
                    </div>
                </div>

                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-xl'} border rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden group transition-all duration-300`}>
                    <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-green-600/5 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="relative">
                        <div className={`text-[10px] md:text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-widest mb-1 transition-colors duration-300`}>Migliore</div>
                        <div className={`text-lg md:text-2xl font-black ${isLight ? 'text-green-600' : 'text-green-400'} truncate`}>
                            {stats.best ? stats.best.name : '-'}
                        </div>
                        <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}>
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500"></span>
                            {stats.best ? `${stats.best.avg}` : '0.00'}
                        </div>
                    </div>
                </div>

                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-xl'} border rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden group transition-all duration-300`}>
                    <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-red-600/5 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="relative">
                        <div className={`text-[10px] md:text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-widest mb-1 transition-colors duration-300`}>Peggiore</div>
                        <div className={`text-lg md:text-2xl font-black ${isLight ? 'text-red-600' : 'text-red-400'} truncate`}>
                            {stats.worst ? stats.worst.name : '-'}
                        </div>
                        <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}>
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500"></span>
                            {stats.worst ? `${stats.worst.avg}` : '0.00'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-xl'} border rounded-3xl p-6 transition-all duration-300`}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-lg font-bold ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300`}>Verifiche in arrivo</h3>
                        <button onClick={() => setActiveSchoolTab('tests')} className={`${isLight ? 'text-blue-600' : 'text-blue-400'} text-sm hover:underline`}>Vedi tutte</button>
                    </div>
                    <div className="space-y-4">
                        {upcomingTests.slice(0, 3).map(test => {
                            const subject = schoolData.subjects.find(s => s.id === test.subjectId);
                            return (
                                <div key={test.id} className={`flex items-center gap-4 p-4 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#1e293b]/50 border-[#1f2937]'} rounded-2xl border transition-colors duration-300`}>
                                    <div className={`flex flex-col items-center justify-center w-12 h-12 ${isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-600/20 text-blue-400'} rounded-xl`}>
                                        <span className="text-xs font-bold uppercase">{new Date(test.date).toLocaleString('it-IT', { month: 'short' })}</span>
                                        <span className="text-lg font-black leading-none">{new Date(test.date).getDate()}</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className={`font-bold ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300`}>{subject?.name || 'Materia eliminata'}</div>
                                        <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{test.type} {test.note && `• ${test.note}`}</div>
                                    </div>
                                </div>
                            );
                        })}
                        {upcomingTests.length === 0 && (
                            <div className="text-center py-8 text-slate-500 italic">Nessuna verifica programmata</div>
                        )}
                    </div>
                </div>

                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-xl'} border rounded-3xl p-6 transition-all duration-300`}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-lg font-bold ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300`}>Ultime medie</h3>
                        <button onClick={() => setActiveSchoolTab('subjects')} className={`${isLight ? 'text-blue-600' : 'text-blue-400'} text-sm hover:underline`}>Tutte le materie</button>
                    </div>
                    <div className="space-y-4">
                        {schoolData.subjects.slice(0, 4).map(subject => {
                            const avg = calculateAverage(subject.grades);
                            return (
                                <div key={subject.id} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className={`font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'} transition-colors duration-300`}>{subject.name}</span>
                                        <span className={`font-bold ${getGradeColor(avg, max, min, isLight).split(' ')[0]}`}>{avg > 0 ? avg : '-'}</span>
                                    </div>
                                    <div className={`h-1.5 w-full ${isLight ? 'bg-slate-100' : 'bg-[#1e293b]'} rounded-full overflow-hidden transition-colors duration-300`}>
                                        <div 
                                            className={`h-full transition-all duration-500 bg-gradient-to-r ${getGradeBarColor(avg, max, min, isLight)}`}
                                            style={{ width: `${(parseFloat(avg) / max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
    };

    const renderSubjects = () => {
        const max = schoolData.maxGrade || 10;
        const min = schoolData.minGrade || 6;
        
        return (
        <div className="space-y-8">
            <div className={`flex flex-col md:flex-row items-center justify-between gap-6 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border p-8 rounded-[2rem] shadow-xl transition-colors duration-300`}>
                <div>
                    <h2 className={`text-3xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300`}>Materie e Voti</h2>
                    <p className="text-slate-500 font-medium mt-1">Gestisci le tue materie e i tuoi progressi</p>
                </div>
            </div>

            <form onSubmit={addSubject} className="flex gap-4">
                <input 
                    type="text" 
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Esempio: Matematica, Latino..."
                    className={`flex-1 ${isLight ? 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400' : 'bg-[#0f172a] border-[#1f2937] text-slate-200 focus:border-blue-500'} border rounded-2xl px-6 py-4 focus:outline-none transition-all shadow-inner`}
                />
                <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Aggiungi Materia
                </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {(schoolData.subjects || []).map(subject => {
                    const avg = calculateAverage(subject.grades || []);
                    return (
                        <div key={subject.id} className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-sm'} border rounded-2xl md:rounded-3xl p-4 md:p-6 hover:shadow-xl transition-all group relative overflow-hidden duration-300`}>
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center justify-between mb-4 md:mb-6">
                                <div className="flex-1 min-w-0 mr-4">
                                    <h3 className={`text-lg md:text-2xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} group-hover:text-blue-400 transition-colors duration-300 truncate`}>{subject.name}</h3>
                                    <div className="text-[10px] md:text-xs font-bold text-slate-500 mt-0.5 md:mt-1 uppercase tracking-widest">{subject.grades.length} voti</div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-4">
                                    <div className={`text-base md:text-xl font-black px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl ${getGradeColor(avg, max, min, isLight)}`}>
                                        {avg > 0 ? avg : '-'}
                                    </div>
                                    <button 
                                        onClick={() => deleteSubject(subject.id)}
                                        className={`text-slate-600 hover:text-red-400 p-2 transition-colors ${isLight ? 'bg-slate-100' : 'bg-[#1e293b]'} rounded-xl`}
                                    >
                                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6 min-h-[40px] md:min-h-[48px]">
                                {subject.grades.map(grade => (
                                    <div key={grade.id} className="relative group/grade">
                                        <button 
                                            onClick={() => {
                                                setAddingGradeTo(subject.id);
                                                setEditingGradeId(grade.id);
                                                setGradeForm({ value: grade.value, date: grade.date, topic: grade.topic || '' });
                                            }}
                                            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex flex-col items-center justify-center font-black text-xs md:text-sm border-2 transition-all hover:scale-110 shadow-lg ${getGradeColor(grade.value, max, min, isLight)}`}
                                        >
                                            <span>{grade.value}</span>
                                        </button>
                                        
                                        {/* Tooltip per data e argomento */}
                                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-800 border-slate-700 text-white'} text-[10px] p-2 rounded-xl opacity-0 group-hover/grade:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl border`}>
                                            <div className="font-bold text-blue-400 mb-1">{new Date(grade.date).toLocaleDateString('it-IT')}</div>
                                            {grade.topic && <div className={`${isLight ? 'text-slate-500' : 'text-slate-300'} italic leading-tight`}>"{grade.topic}"</div>}
                                            {!grade.topic && <div className="text-slate-500 italic text-[9px]">Nessun argomento</div>}
                                            <div className={`absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent ${isLight ? 'border-t-white' : 'border-t-slate-800'}`}></div>
                                        </div>

                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeGrade(subject.id, grade.id);
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/grade:opacity-100 transition-opacity shadow-xl z-10"
                                        >
                                            <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                                
                                {addingGradeTo === subject.id ? null : (
                                    <button 
                                        onClick={() => {
                                            setAddingGradeTo(subject.id);
                                            setEditingGradeId(null);
                                            setGradeForm({ value: '', date: new Date().toISOString().split('T')[0], topic: '' });
                                        }}
                                        className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl border-2 border-dashed ${isLight ? 'border-slate-200' : 'border-[#1f2937]'} flex items-center justify-center text-slate-600 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer group/add`}
                                    >
                                        <svg className="w-5 h-5 md:w-6 md:h-6 group-hover/add:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                )}
                            </div>

                            <div className={`h-1.5 md:h-2 w-full ${isLight ? 'bg-slate-100' : 'bg-[#1e293b]'} rounded-full overflow-hidden shadow-inner transition-colors duration-300`}>
                                <div 
                                    className={`h-full transition-all duration-1000 ease-out bg-gradient-to-r ${getGradeBarColor(avg, max, min, isLight)}`}
                                    style={{ width: `${(parseFloat(avg) / max) * 100}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
    };

    const renderTests = () => {
        const max = schoolData.maxGrade || 10;
        const min = schoolData.minGrade || 6;
        
        return (
        <div className="space-y-6">
            <div className={`flex flex-col md:flex-row items-center justify-between gap-6 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border p-8 rounded-[2rem] shadow-xl transition-colors duration-300`}>
                <div>
                    <h2 className={`text-3xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300`}>Registro Verifiche</h2>
                    <p className="text-slate-500 font-medium mt-1">Pianifica e gestisci le tue prove</p>
                </div>
                <button 
                    onClick={() => setShowAddTest(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-purple-900/20 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Nuova Verifica
                </button>
            </div>

            {showAddTest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border rounded-3xl p-8 max-w-md w-full shadow-2xl transition-all`}>
                    <div className="flex justify-between items-center mb-6">
                        <h4 className={`text-2xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors`}>
                            {editingTestId ? 'Modifica Verifica' : 'Nuova Verifica'}
                        </h4>
                        <button onClick={() => { setShowAddTest(false); setEditingTestId(null); setTestForm({ subjectId: '', date: '', type: 'Scritto', note: '' }); }} className="text-slate-500 hover:text-red-500 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                        <form onSubmit={addTest} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Materia</label>
                                <select 
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all`}
                                    value={testForm.subjectId}
                                    onChange={e => setTestForm({...testForm, subjectId: e.target.value})}
                                    required
                                >
                                    <option value="">Seleziona...</option>
                                    {schoolData.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Data</label>
                                <input 
                                    type="date" 
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all`}
                                    value={testForm.date}
                                    onChange={e => setTestForm({...testForm, date: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tipo</label>
                                <div className="flex gap-2">
                                    {['Scritto', 'Orale', 'Pratico'].map(t => (
                                        <button 
                                            key={t} type="button"
                                            onClick={() => setTestForm({...testForm, type: t})}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${testForm.type === t ? 'bg-purple-600 text-white' : isLight ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-[#1e293b] text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Note (opzionale)</label>
                                <input 
                                    type="text" 
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all`}
                                    value={testForm.note}
                                    onChange={e => setTestForm({...testForm, note: e.target.value})}
                                    placeholder="Capitoli, argomenti..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowAddTest(false)} className={`flex-1 px-4 py-3 rounded-2xl font-bold ${isLight ? 'text-slate-500 hover:bg-slate-50' : 'text-slate-400 hover:bg-slate-800'} transition-all`}>Annulla</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold shadow-lg shadow-purple-900/20 transition-all">Salva</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="space-y-3 md:space-y-4">
        {schoolData.tests.sort((a,b) => a.date.localeCompare(b.date)).map(test => {
            const subject = schoolData.subjects.find(s => s.id === test.subjectId);
            const isPast = test.date < new Date().toISOString().split('T')[0];
            return (
                <div key={test.id} className={`flex items-center gap-4 md:gap-6 p-4 md:p-6 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-xl'} border ${isPast ? (isLight ? 'border-red-200 bg-red-50/30' : 'border-red-900/30') : ''} rounded-2xl md:rounded-3xl transition-all duration-300 hover:scale-[1.01]`}>
                    <div className={`flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 shrink-0 ${isPast ? (isLight ? 'bg-red-100 text-red-600' : 'bg-red-900/20 text-red-400') : 'bg-purple-600/20 text-purple-400'} rounded-xl md:rounded-2xl transition-colors duration-300`}>
                        <span className="text-[10px] md:text-xs font-black uppercase">{new Date(test.date).toLocaleString('it-IT', { month: 'short' })}</span>
                        <span className="text-xl md:text-2xl font-black leading-none">{new Date(test.date).getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <h4 className={`text-base md:text-xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300 truncate`}>{subject?.name || 'Materia eliminata'}</h4>
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider ${test.type === 'Scritto' ? (isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/10 text-blue-400') : (isLight ? 'bg-orange-100 text-orange-600' : 'bg-orange-500/10 text-orange-400')} transition-colors duration-300`}>
                                {test.type}
                            </span>
                        </div>
                        <p className={`text-xs md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-500'} font-medium transition-colors duration-300 truncate`}>{test.note || 'Nessuna nota aggiunta'}</p>
                    </div>
                    <div className="flex gap-1.5 md:gap-2">
                        <button onClick={() => startEditingTest(test)} className={`p-2.5 md:p-3 ${isLight ? 'bg-slate-100 text-slate-500 hover:text-blue-500 hover:bg-blue-50' : 'bg-slate-800/50 text-slate-500 hover:text-blue-400 hover:bg-blue-900/20'} rounded-xl md:rounded-2xl transition-all duration-300`}>
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {isPast && (
                            <div className={`flex items-center gap-1.5 md:gap-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1e293b] border-[#1f2937]'} p-1 rounded-xl md:rounded-2xl border transition-colors duration-300`}>
                                <input 
                                    type="number" step="0.5" min="1" max={max} placeholder="Voto"
                                    className={`w-10 md:w-16 bg-transparent text-center font-black text-xs md:text-base ${isLight ? 'text-blue-600' : 'text-blue-400'} focus:outline-none`}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            completeTest(test, e.target.value);
                                        }
                                    }}
                                />
                                <button onClick={(e) => completeTest(test, e.target.previousSibling.value)} className="bg-green-600 p-1.5 md:p-2 rounded-lg md:rounded-xl text-white hover:bg-green-500 transition-all duration-300">
                                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                </button>
                            </div>
                        )}
                        <button onClick={() => deleteTest(test.id)} className={`p-2.5 md:p-3 ${isLight ? 'bg-slate-100 text-slate-500 hover:text-red-500 hover:bg-red-50' : 'bg-slate-800/50 text-slate-500 hover:text-red-400 hover:bg-red-900/20'} rounded-xl md:rounded-2xl transition-all duration-300`}>
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            );
        })}
                {schoolData.tests.length === 0 && (
                    <div className={`text-center py-20 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border border-dashed rounded-3xl transition-colors duration-300`}>
                        <p className={`font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Nessuna verifica programmata nel registro.</p>
                    </div>
                )}
            </div>
        </div>
    );
    };

    const renderCalendar = () => {
        const max = schoolData.maxGrade || 10;
        const min = schoolData.minGrade || 6;
        
        const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
        const lastDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
        const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        const days = [];
        
        for (let i = 0; i < startOffset; i++) days.push(null);
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), i));

        const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
        const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h3 className={`text-2xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} capitalize transition-colors duration-300`}>
                            {calendarDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className={`flex ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937]'} border rounded-xl overflow-hidden transition-colors duration-300`}>
                            <button onClick={prevMonth} className={`p-2 ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1e293b]'} ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button onClick={nextMonth} className={`p-2 ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1e293b]'} ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300 border-l ${isLight ? 'border-slate-200' : 'border-[#1f2937]'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                            </button>
                            <button 
                                onClick={() => setCalendarDate(new Date())}
                                className={`px-3 py-1 text-[10px] font-black uppercase tracking-tighter ${isLight ? 'hover:bg-slate-50 text-slate-500' : 'hover:bg-[#1e293b] text-slate-500'} transition-colors duration-300 border-l ${isLight ? 'border-slate-200' : 'border-[#1f2937]'}`}
                            >
                                Oggi
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
                        <div className={`flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}><span className="w-3 h-3 bg-purple-500 rounded-full shadow-sm shadow-purple-900/20"></span> Verifica</div>
                        <div className={`flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}><span className="w-3 h-3 bg-green-500 rounded-full shadow-sm shadow-green-900/20"></span> Voto</div>
                    </div>
                </div>

                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-2xl'} border rounded-3xl overflow-hidden transition-colors duration-300`}>
                    <div className={`grid grid-cols-7 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-[#1f2937] bg-[#1e293b]/50'} transition-colors duration-300`}>
                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
                            <div key={d} className={`py-4 text-center text-[10px] font-black ${isLight ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-widest transition-colors duration-300`}>{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {days.map((date, i) => {
                            if (!date) return <div key={`empty-${i}`} className={`h-24 md:h-32 border-b border-r ${isLight ? 'border-slate-100 bg-slate-50/30' : 'border-[#1f2937] bg-[#0b1220]/30'} transition-colors duration-300`}></div>;
                            
                            const dateKey = date.toISOString().split('T')[0];
                            const dayTests = schoolData.tests.filter(t => t.date === dateKey);
                            const dayGrades = schoolData.subjects.flatMap(s => s.grades.filter(g => g.date === dateKey).map(g => ({...g, subjectName: s.name, subjectId: s.id})));
                            const isToday = dateKey === new Date().toISOString().split('T')[0];

                            return (
                                <div key={dateKey} className={`h-24 md:h-32 border-b border-r ${isLight ? 'border-slate-100' : 'border-[#1f2937]'} p-2 relative transition-all duration-300 hover:bg-blue-500/5 ${isToday ? (isLight ? 'bg-blue-50' : 'bg-blue-600/5') : ''}`}>
                                    <span className={`text-sm font-black ${isToday ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-lg shadow-blue-900/40' : isLight ? 'text-slate-700' : 'text-slate-500'} transition-all duration-300`}>
                                        {date.getDate()}
                                    </span>
                                    <div className="mt-1 space-y-1 overflow-y-auto max-h-[calc(100%-1.5rem)]">
                                        {dayTests.map(t => (
                                            <button 
                                                key={t.id} 
                                                onClick={() => startEditingTest(t)}
                                                className={`w-full text-left text-[9px] font-bold bg-purple-600 text-white p-1 rounded-md truncate shadow-sm transition-all duration-300 hover:scale-105 active:scale-95`}
                                            >
                                                {t.type.charAt(0)}: {schoolData.subjects.find(s => s.id === t.subjectId)?.name}
                                            </button>
                                        ))}
                                        {dayGrades.map(g => (
                                            <button 
                                                key={g.id} 
                                                onClick={() => {
                                                    setAddingGradeTo(g.subjectId);
                                                    setEditingGradeId(g.id);
                                                    setGradeForm({ value: g.value, date: g.date, topic: g.topic || '' });
                                                }}
                                                className={`w-full text-left text-[9px] font-bold ${getGradeColor(g.value, max, min, isLight).split(' ')[1]} ${getGradeColor(g.value, max, min, isLight).split(' ')[0]} p-1 rounded-md truncate shadow-sm transition-all duration-300 hover:scale-105 active:scale-95`}
                                            >
                                                {g.value}: {g.subjectName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/30">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        </div>
                        <h2 className={`text-4xl font-black ${isLight ? 'text-slate-800' : 'text-white'} tracking-tight`}>School Hub</h2>
                    </div>
                    <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} font-medium ml-1`}>Il tuo centro di controllo per la carriera scolastica.</p>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-[#1e293b] border-slate-700'} border rounded-2xl p-2 flex items-center gap-4 shadow-sm`}>
                        <div className="flex items-center gap-2 px-2 border-r border-slate-200/50">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Min</span>
                            <input 
                                type="number" 
                                value={schoolData.minGrade || 0}
                                onChange={(e) => updateGlobalMinGrade(e.target.value)}
                                className={`w-10 h-8 rounded-lg ${isLight ? 'bg-slate-50 text-red-600' : 'bg-[#0f172a] text-red-400'} text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all border-none`}
                            />
                        </div>
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Max</span>
                            <input 
                                type="number" 
                                value={schoolData.maxGrade || 10}
                                onChange={(e) => updateGlobalMaxGrade(e.target.value)}
                                className={`w-10 h-8 rounded-lg ${isLight ? 'bg-slate-50 text-blue-600' : 'bg-[#0f172a] text-blue-400'} text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all border-none`}
                            />
                        </div>
                    </div>
                </div>
                </div>

            <div className={`flex p-1.5 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937]'} border rounded-full md:rounded-3xl mb-8 w-full md:w-fit overflow-x-auto no-scrollbar shadow-inner transition-all duration-300`}>
                {[
                    { id: 'dashboard', label: 'Home', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                    { id: 'subjects', label: 'Materie', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                    { id: 'tests', label: 'Verifiche', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
                    { id: 'calendar', label: 'Calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveSchoolTab(tab.id)}
                        className={`flex flex-1 items-center justify-center gap-2 px-3 md:px-6 py-3 rounded-full md:rounded-2xl text-xs md:text-sm font-bold transition-all duration-300 ${activeSchoolTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]'}`}
                    >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={tab.icon} /></svg>
                        <span className="hidden md:inline">{tab.label}</span>
                        <span className="md:hidden">{activeSchoolTab === tab.id ? tab.label : ''}</span>
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeSchoolTab === 'dashboard' && renderDashboard()}
                {activeSchoolTab === 'subjects' && renderSubjects()}
                {activeSchoolTab === 'tests' && renderTests()}
                {activeSchoolTab === 'calendar' && renderCalendar()}
            </div>

            {addingGradeTo && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border rounded-3xl p-8 max-w-md w-full shadow-2xl transition-all`}>
                        <h4 className={`text-2xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} mb-6 transition-colors`}>
                            {editingGradeId ? 'Modifica Voto' : 'Aggiungi Voto'}
                        </h4>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Voto</label>
                                <input 
                                    type="number" step="0.5" min="0" max={schoolData.maxGrade || 10}
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all`}
                                    value={gradeForm.value}
                                    onChange={e => setGradeForm({...gradeForm, value: e.target.value})}
                                    placeholder={`Min: ${schoolData.minGrade || 6}, Max: ${schoolData.maxGrade || 10}`}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Data</label>
                                <input 
                                    type="date" 
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all`}
                                    value={gradeForm.date}
                                    onChange={e => setGradeForm({...gradeForm, date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Argomento (opzionale)</label>
                                <input 
                                    type="text" 
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all`}
                                    value={gradeForm.topic}
                                    onChange={e => setGradeForm({...gradeForm, topic: e.target.value})}
                                    placeholder="Esempio: Equazioni di secondo grado"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => {
                                        setAddingGradeTo(null);
                                        setEditingGradeId(null);
                                    }} 
                                    className={`flex-1 px-4 py-3 rounded-2xl font-bold ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'} transition-all`}
                                >
                                    Annulla
                                </button>
                                <button 
                                    onClick={() => {
                                        if (editingGradeId) {
                                            updateGrade(addingGradeTo, editingGradeId, gradeForm.value, gradeForm.date, gradeForm.topic);
                                        } else {
                                            addGrade(addingGradeTo, gradeForm.value, gradeForm.date, gradeForm.topic);
                                        }
                                        setAddingGradeTo(null);
                                        setEditingGradeId(null);
                                        setGradeForm({ value: '', date: new Date().toISOString().split('T')[0], topic: '' });
                                    }}
                                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 transition-all"
                                >
                                    {editingGradeId ? 'Aggiorna' : 'Salva'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const App = () => {
    // Current date state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState('tracker'); // 'tracker' o 'school'
    const importInputRef = useRef(null);
    const [updatedAt, setUpdatedAt] = useState(() => {
        const v = localStorage.getItem('tracker_updatedAt');
        return v ? Number(v) : 0;
    });
    const [syncCode, setSyncCode] = useState(() => {
        return localStorage.getItem('tracker_sync_code') || '';
    });
    const [syncWord, setSyncWord] = useState(() => {
        return localStorage.getItem('tracker_sync_word') || '';
    });
    const [apiBase, setApiBase] = useState(() => {
        const saved = localStorage.getItem('tracker_api_base');
        if (saved !== null && saved !== "null" && saved !== "undefined") return saved;

        const isGitHub = window.location.hostname.includes('github.io');
        if (isGitHub) return 'supabase://';
        return '';
    });
    const [showSyncSettings, setShowSyncSettings] = useState(false);
    const [syncSettingsForm, setSyncSettingsForm] = useState({
        apiBase: '',
        supabaseUrl: '',
        supabaseKey: '',
        syncCode: '',
        syncWord: ''
    });

    const openSyncSettings = () => {
        setSyncSettingsForm({
            apiBase: apiBase,
            supabaseUrl: supabaseConfig.url || '',
            supabaseKey: supabaseConfig.key || '',
            syncCode: syncCode,
            syncWord: syncWord
        });
        setShowSyncSettings(true);
    };

    const saveSyncSettings = (e) => {
        if (e) e.preventDefault();
        
        const newApiBase = syncSettingsForm.apiBase.trim();
        setApiBase(newApiBase);
        localStorage.setItem('tracker_api_base', newApiBase);

        const newSupabaseConfig = {
            url: syncSettingsForm.supabaseUrl.trim(),
            key: syncSettingsForm.supabaseKey.trim()
        };
        setSupabaseConfig(newSupabaseConfig);
        localStorage.setItem('tracker_supabase_config', JSON.stringify(newSupabaseConfig));

        setSyncCode(syncSettingsForm.syncCode.trim());
        setSyncWord(syncSettingsForm.syncWord.trim());
        
        setShowSyncSettings(false);
    };

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
    const deviceIdRef = useRef(localStorage.getItem('tracker_device_id') || (() => {
        const nid = 'dev-' + Math.random().toString(36).slice(2);
        localStorage.setItem('tracker_device_id', nid);
        return nid;
    })());

    const [habits, setHabits] = useState(() => {
        const saved = localStorage.getItem('tracker_habits');
        try { return saved ? JSON.parse(saved) : INITIAL_HABITS; } catch { return INITIAL_HABITS; }
    });
    
    const [mentalState, setMentalState] = useState(() => {
        const saved = localStorage.getItem('tracker_mental');
        try { return saved ? JSON.parse(saved) : INITIAL_MENTAL_STATE; } catch { return INITIAL_MENTAL_STATE; }
    });

    const [schoolData, setSchoolData] = useState(() => {
        const saved = localStorage.getItem('tracker_school');
        const defaultData = { subjects: [], tests: [], maxGrade: 10, minGrade: 6, theme: 'dark' };
        try { 
            const parsed = saved ? JSON.parse(saved) : defaultData;
            return { ...defaultData, ...parsed };
        } catch { return defaultData; }
    });

    const toggleTheme = () => {
        setSchoolData(prev => ({
            ...prev,
            theme: prev.theme === 'light' ? 'dark' : 'light'
        }));
    };
    
    useEffect(() => {
        if (!isRemoteUpdateRef.current) {
            isLocalChangeRef.current = true;
        }
    }, [schoolData]);

    useEffect(() => {
        localStorage.setItem('tracker_habits', JSON.stringify(habits));
        localStorage.setItem('tracker_mental', JSON.stringify(mentalState));
        localStorage.setItem('tracker_school', JSON.stringify(schoolData));
        localStorage.setItem('tracker_updatedAt', String(updatedAt));
        if (syncCode) localStorage.setItem('tracker_sync_code', syncCode);
        else localStorage.removeItem('tracker_sync_code');
        if (syncWord) localStorage.setItem('tracker_sync_word', syncWord);
        else localStorage.removeItem('tracker_sync_word');
    }, [habits, mentalState, schoolData, updatedAt, syncCode, syncWord]);
    
    const processImport = (data, isHash = false) => {
        if (data && data.habits && data.mentalState) {
            setHabits(data.habits);
            setMentalState(data.mentalState);
            if (data.schoolData) setSchoolData(data.schoolData);
            alert(isHash ? 'Import completato dal link' : 'Import completato');
            return true;
        }
        if (!isHash) alert('File non valido');
        return false;
    };

    useEffect(() => {
        const h = window.location.hash;
        if (h && h.startsWith('#import=')) {
            try {
                const json = decodeURIComponent(escape(atob(h.slice(8))));
                processImport(JSON.parse(json), true);
            } catch {}
            history.replaceState(null, '', window.location.pathname);
        }
    }, []);

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
                        srv = data ? data.state : { habits: [], mentalState: { logs: {} }, schoolData: { subjects: [] }, updatedAt: 0 };
                    } catch (supabaseErr) {
                        console.error("Supabase fetch error:", supabaseErr);
                        throw new Error("Errore database: verifica URL e Key");
                    }
                } else {
                    if (apiBase === 'supabase://') {
                        throw new Error("Supabase non configurato. Clicca sul pallino per impostare URL e Key.");
                    }
                    const fullUrl = getSyncUrl(apiBase, syncCode, syncWord);
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
                    if (srv.schoolData) setSchoolData(srv.schoolData);
                    setUpdatedAt(su);
                    setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
                } else if (su === 0 || (updatedAt > su)) {
                    const now = Date.now();
                    const payload = { habits, mentalState, schoolData, updatedAt: now, deviceId: deviceIdRef.current };
                    
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
                        const fullUrl = getSyncUrl(apiBase, syncCode, syncWord);
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
    }, [syncCode, syncWord, apiBase, supabaseClient]);

    useEffect(() => {
        if (!syncCode) return;
        if (isRemoteUpdateRef.current) return;
        if (!isLocalChangeRef.current) return;
        
        let t = null;
        const push = async () => {
            setSyncStatus('syncing');
            const now = Date.now();
            const safeCode = syncCode.replace(/[^a-z0-9-_]/gi, '').toLowerCase();
            const payload = { habits, mentalState, schoolData, updatedAt: now, deviceId: deviceIdRef.current };

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
                    const fullUrl = getSyncUrl(apiBase, syncCode, syncWord);
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
    }, [habits, mentalState, schoolData, syncCode, syncWord, apiBase]);

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
                    if (apiBase === 'supabase://') return; 
                    const fullUrl = getSyncUrl(apiBase, syncCode, syncWord);
                    const res = await fetch(fullUrl, { cache: 'no-store' });
                    if (res.ok) srv = await res.json();
                }

                if (srv) {
                    const su = Number(srv.updatedAt || 0);
                    if (su > updatedAt && srv.habits && srv.mentalState) {
                        isRemoteUpdateRef.current = true;
                        setHabits(srv.habits);
                        setMentalState(srv.mentalState);
                        if (srv.schoolData) setSchoolData(srv.schoolData);
                        setUpdatedAt(su);
                        setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
                        setSyncStatus('synced');
                    }
                }
            } catch {}
        }, 3000);
        return () => clearInterval(interval);
    }, [updatedAt, syncCode, syncWord, apiBase, supabaseClient]);
    // Navigation
    const adjustDate = (months = 0, years = 0) => {
        setCurrentDate(new Date(currentDate.getFullYear() + years, currentDate.getMonth() + months, 1));
    };

    // Derived values for current month
    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const year = currentDate.getFullYear(), month = currentDate.getMonth();

    const toggleHabit = (habitId, day) => {
        isLocalChangeRef.current = true;
        const dateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        setHabits(prev => prev.map(h => {
            if (h.id !== habitId) return h;
            const next = { ...h.completedDates };
            if (next[dateKey]) delete next[dateKey]; else next[dateKey] = true;
            return { ...h, completedDates: next };
        }));
    };

    const updateField = (setter, field, isLocal = true) => (id, value) => {
        if (isLocal) isLocalChangeRef.current = true;
        setter(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const renameHabit = updateField(setHabits, 'name');
    const updateGoal = updateField(setHabits, 'goal');
    const updateHabitIcon = updateField(setHabits, 'icon');

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
        setMentalState(prev => ({
            ...prev,
            logs: {
                ...prev.logs,
                [dateKey]: { ...(prev.logs[dateKey] || { mood: 0, motivation: 0 }), [field]: value }
            }
        }));
    };

    // Calculate stats for current month
    const totalPossibleCompletions = habits.length * daysInMonth;
    
    const actualCompletions = useMemo(() => habits.reduce((acc, h) => {
        for(let d=1; d<=daysInMonth; d++) {
            if(h.completedDates[`${year}-${(month+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`]) acc++;
        }
        return acc;
    }, 0), [habits, daysInMonth, year, month]);

    const dailyStats = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => {
        const dk = `${year}-${(month+1).toString().padStart(2,'0')}-${(i+1).toString().padStart(2,'0')}`;
        const done = habits.filter(h => h.completedDates[dk]).length;
        return { day: i + 1, done, notDone: habits.length - done, percentage: habits.length ? (done/habits.length)*100 : 0 };
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

    const isLight = schoolData.theme === 'light';

    return (
        <div className={`flex min-h-screen ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0b1220] text-slate-300'} font-sans selection:bg-blue-500/30 transition-colors duration-300`}>
            {/* Sidebar Navigation */}
            <div className={`w-16 md:w-20 ${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border-r flex flex-col items-center py-8 gap-8 flex-shrink-0 transition-colors duration-300`}>
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/20">
                    <span className="text-white font-bold text-xl">T</span>
                </div>
                
                <button 
                    onClick={() => setActiveTab('tracker')}
                    className={`p-3 rounded-xl transition-all duration-200 ${activeTab === 'tracker' ? (isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-600/20 text-blue-400 shadow-inner') : (isLight ? 'text-slate-500 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]')}`}
                    title="Tracker"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                </button>

                <button 
                    onClick={() => setActiveTab('school')}
                    className={`p-3 rounded-xl transition-all duration-200 ${activeTab === 'school' ? (isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-600/20 text-blue-400 shadow-inner') : (isLight ? 'text-slate-500 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]')}`}
                    title="Scuola"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </button>

                <div className="mt-auto flex flex-col gap-4 items-center">
                    <button 
                        onClick={openSyncSettings}
                        className={`p-3 rounded-xl transition-all duration-200 relative group ${syncCode ? 'text-blue-500 bg-blue-500/10' : (isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800')}`}
                        title={`Backend: ${apiBase || 'locale'}${syncError ? '\nErrore: ' + syncError : ''}\nPC acceso: ${syncStatus === 'synced' ? 'Sì' : 'No'}\nClicca per configurare`}
                    >
                        <svg className={`w-6 h-6 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 ${isLight ? 'border-white' : 'border-[#0f172a]'} ${syncStatus === 'synced' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : syncStatus === 'syncing' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                    </button>

                    <button 
                        onClick={toggleTheme}
                        className={`p-3 rounded-xl transition-all duration-200 ${isLight ? 'text-orange-500 hover:bg-orange-50' : 'text-yellow-400 hover:bg-yellow-400/10'}`}
                        title={isLight ? "Attiva Tema Scuro" : "Attiva Tema Chiaro"}
                    >
                        {isLight ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 max-h-screen overflow-y-auto p-4 md:p-8">
                <input ref={importInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                        try { processImport(JSON.parse(reader.result)); } catch { alert('Errore durante l\'import'); }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                }} />

                <div className="max-w-[1400px] mx-auto">
                    <Header 
                        totalHabits={habits.length}
                        completedHabits={habits.filter(h => {
                            const y = currentDate.getFullYear();
                            const m = currentDate.getMonth();
                            const d = new Date(currentDate).getDate();
                            const dateKey = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                            return !!h.completedDates[dateKey];
                        }).length}
                        totalPossible={habits.length}
                        currentDate={currentDate}
                        onNext={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                        onPrev={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                        onNextYear={() => setCurrentDate(new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)))}
                        onPrevYear={() => setCurrentDate(new Date(currentDate.setFullYear(currentDate.getFullYear() - 1)))}
                        onExport={() => {
                            const data = { habits, mentalState, schoolData };
                            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `tracker-export-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                        }}
                        onImportClick={() => importInputRef.current.click()}
                        syncCode={syncCode}
                        setSyncCode={setSyncCode}
                        syncWord={syncWord}
                        setSyncWord={setSyncWord}
                        syncStatus={syncStatus}
                        syncError={syncError}
                        apiBase={apiBase}
                        setApiBase={setApiBase}
                        supabaseConfig={supabaseConfig}
                        setSupabaseConfig={setSupabaseConfig}
                        isLight={isLight}
                        openSyncSettings={openSyncSettings}
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

                    {showSyncSettings && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className={`${isLight ? 'bg-white text-slate-800' : 'bg-[#1e293b] text-slate-100'} w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 border ${isLight ? 'border-slate-200' : 'border-slate-700'}`}>
                                <div className={`p-6 border-b ${isLight ? 'border-slate-100' : 'border-slate-700'} flex justify-between items-center bg-gradient-to-r ${isLight ? 'from-blue-50 to-indigo-50' : 'from-blue-900/20 to-indigo-900/20'}`}>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Impostazioni Sync
                                    </h2>
                                    <button onClick={() => setShowSyncSettings(false)} className={`p-2 rounded-full ${isLight ? 'hover:bg-slate-200 text-slate-400' : 'hover:bg-slate-700 text-slate-500'} transition-colors`}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <form onSubmit={saveSyncSettings} className="p-6 space-y-5">
                                    <div className="space-y-4">
                                        <div>
                                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Backend URL / Modalità</label>
                                            <input 
                                                type="text" 
                                                placeholder="URL del backend o 'supabase://'"
                                                className={`w-full px-4 py-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 focus:ring-blue-500/20' : 'bg-slate-900 border-slate-700 focus:ring-blue-500/20'} focus:outline-none focus:ring-4 transition-all font-mono text-sm`}
                                                value={syncSettingsForm.apiBase}
                                                onChange={e => setSyncSettingsForm({...syncSettingsForm, apiBase: e.target.value})}
                                            />
                                            <p className={`mt-1 text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Usa 'supabase://' per sincronizzazione diretta tramite Supabase.</p>
                                        </div>

                                        {syncSettingsForm.apiBase === 'supabase://' && (
                                            <div className={`p-4 rounded-xl border ${isLight ? 'bg-blue-50/50 border-blue-100' : 'bg-blue-900/10 border-blue-900/30'} space-y-3`}>
                                                <div>
                                                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-blue-600/70' : 'text-blue-400/70'}`}>Supabase URL</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="https://xyz.supabase.co"
                                                        className={`w-full px-3 py-2 rounded-lg border ${isLight ? 'bg-white border-blue-200 focus:ring-blue-500/20' : 'bg-slate-900 border-blue-900/50 focus:ring-blue-500/20'} focus:outline-none focus:ring-4 transition-all font-mono text-xs`}
                                                        value={syncSettingsForm.supabaseUrl}
                                                        onChange={e => setSyncSettingsForm({...syncSettingsForm, supabaseUrl: e.target.value})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-blue-600/70' : 'text-blue-400/70'}`}>Supabase Anon Key</label>
                                                    <input 
                                                        type="password" 
                                                        placeholder="La tua anon key"
                                                        className={`w-full px-3 py-2 rounded-lg border ${isLight ? 'bg-white border-blue-200 focus:ring-blue-500/20' : 'bg-slate-900 border-blue-900/50 focus:ring-blue-500/20'} focus:outline-none focus:ring-4 transition-all font-mono text-xs`}
                                                        value={syncSettingsForm.supabaseKey}
                                                        onChange={e => setSyncSettingsForm({...syncSettingsForm, supabaseKey: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Codice Sync</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="es. miao"
                                                    className={`w-full px-4 py-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700'} focus:outline-none font-mono text-sm`}
                                                    value={syncSettingsForm.syncCode}
                                                    onChange={e => setSyncSettingsForm({...syncSettingsForm, syncCode: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Password (Word)</label>
                                                <input 
                                                    type="password" 
                                                    placeholder="Opzionale"
                                                    className={`w-full px-4 py-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700'} focus:outline-none font-mono text-sm`}
                                                    value={syncSettingsForm.syncWord}
                                                    onChange={e => setSyncSettingsForm({...syncSettingsForm, syncWord: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => setShowSyncSettings(false)}
                                            className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-all ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                                        >
                                            Annulla
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                                        >
                                            Salva
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tracker' ? (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border rounded-xl shadow-sm p-4 h-[220px] transition-colors duration-300`}>
                                    <div className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'} mb-2`}>Andamento Mensile</div>
                                    <div className="h-[170px]">
                                        {ResponsiveContainer && AreaChart && Area ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#60A5FA" stopOpacity={isLight ? 0.3 : 0.15}/>
                                                            <stop offset="95%" stopColor="#60A5FA" stopOpacity="0"/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1f2937"} vertical={false} />
                                                    <XAxis dataKey="day" hide />
                                                    <YAxis domain={[0, 100]} hide />
                                                    <Area type="monotone" dataKey="percentage" stroke="#60A5FA" strokeWidth={3} fill="url(#colorMonthly)" animationDuration={1000} dot={false} activeDot={false} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <SimpleAreaChart values={dailyStats.map(s => s.percentage)} color="#60A5FA" maxY={100} labels={dailyStats.map(s => s.day)} isLight={isLight} />
                                        )}
                                    </div>
                                </div>
                                <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border rounded-xl shadow-sm p-4 h-[220px] transition-colors duration-300`}>
                                    <div className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'} mb-2`}>Completamento</div>
                                    <TwoToneDonutGauge percent={totalPossibleCompletions > 0 ? (actualCompletions / totalPossibleCompletions) * 100 : 0} isLight={isLight} />
                                </div>
                                <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-[#0f172a] border-[#1f2937]'} border rounded-xl shadow-sm p-4 h-[220px] transition-colors duration-300`}>
                                    <div className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'} mb-2`}>Medie Settimanali</div>
                                    <WeeklyBarsSmall weeks={weeklyPercents} isLight={isLight} />
                                </div>
                            </div>

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
                                isLight={isLight}
                            />

                            <MentalStateGrid 
                                mentalState={mentalState}
                                onUpdate={updateMentalState}
                                currentDate={currentDate}
                                daysInMonth={daysInMonth}
                                isLight={isLight}
                            />
                        </>
                    ) : activeTab === 'school' ? (
                        <SchoolGradesView 
                            schoolData={schoolData} 
                            setSchoolData={setSchoolData} 
                            isLight={isLight}
                            openSyncSettings={openSyncSettings}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (!window.reactRoot) {
    window.reactRoot = ReactDOM.createRoot(rootElement);
}
window.reactRoot.render(<App />);
