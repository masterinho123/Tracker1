const { useState, useEffect, useMemo, useRef, useCallback } = React;

// Suppress Recharts defaultProps warning in React 18
const originalConsoleError = console.error;
console.error = (...args) => {
    if (typeof args[0] === 'string') {
        if (args[0].includes('Support for defaultProps will be removed from function components')) return;
        if (args[0].includes('Failed to execute \'observe\' on \'MutationObserver\'')) return;
    }
    originalConsoleError(...args);
};

// Global error handler for MutationObserver parameter 1 error (often caused by Recharts/ResponsiveContainer)
window.addEventListener('error', (event) => {
    if (event.message && event.message.includes("Failed to execute 'observe' on 'MutationObserver'")) {
        event.stopImmediatePropagation();
        event.preventDefault();
    }
}, true);

window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes("Failed to execute 'observe' on 'MutationObserver'")) {
        event.preventDefault();
    }
});

// --- Hooks & Helpers ---
const useGridTable = (daysInMonth, initialLeft = 256, initialRight = 192, minCellWidth = 24) => {
    const [leftWidth, setLeftWidth] = useState(initialLeft);
    const [rightWidth, setRightWidth] = useState(initialRight);
    const scrollRef = useRef(null);
    const [cellWidth, setCellWidth] = useState(minCellWidth);
    const [scrollLeft, setScrollLeft] = useState(0);

    const widthsRef = useRef({ left: leftWidth, right: rightWidth });
    useEffect(() => {
        widthsRef.current = { left: leftWidth, right: rightWidth };
    }, [leftWidth, rightWidth]);

    const handleResize = useCallback((setter, isRight) => (e) => {
        const startX = e.clientX;
        const startW = isRight ? widthsRef.current.right : widthsRef.current.left;
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
    }, []);

    const recalcCellWidth = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const w = el.clientWidth;
        const cw = Math.max(minCellWidth, Math.floor(w / Math.max(1, daysInMonth)));
        setCellWidth(cw);
    }, [daysInMonth, minCellWidth]);

    useEffect(() => {
        const el = scrollRef.current;
        const handleScroll = () => {
            if (el) setScrollLeft(el.scrollLeft);
        };
        const handleResize = () => recalcCellWidth();
        window.addEventListener('resize', handleResize);
        if (el) el.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (el) el.removeEventListener('scroll', handleScroll);
        };
    }, [recalcCellWidth]);

    useEffect(() => {
        recalcCellWidth();
    }, [recalcCellWidth, leftWidth, rightWidth]);

    return {
        leftWidth, rightWidth,
        startResizing: handleResize(setLeftWidth, false),
        startResizingRight: handleResize(setRightWidth, true),
        scrollRef,
        cellWidth,
        scrollLeft,
        recalcCellWidth
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

const FlagIcon = React.memo(({ lang, className = "w-4 h-3" }) => {
    const flags = {
        it: <svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#009246"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2" x="2" fill="#ce2b37"/></svg>,
        en: <svg viewBox="0 0 60 30"><clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath><clipPath id="t"><path d="M30,15 h30 v15 z v0 h-30 z v0 h-30 v-15 z v0 h30 z"/></clipPath><g clipPath="url(#s)"><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/><path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/></g></svg>,
        fr: <svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#002395"/><rect width="1" height="2" x="1" fill="#fff"/><rect width="1" height="2" x="2" fill="#ed2939"/></svg>,
        de: <svg viewBox="0 0 5 3"><rect width="5" height="3" y="0" fill="#000"/><rect width="5" height="2" y="1" fill="#D00"/><rect width="5" height="1" y="2" fill="#FFCE00"/></svg>
    };
    return (
        <div className={`inline-flex items-center justify-center overflow-hidden rounded-[1px] ${className}`}>
            {flags[lang] || flags.en}
        </div>
    );
});

const Card = ({ children, className = "", isLight, noPadding = false, group = false, overflow = true }) => (
    <div className={`${THEME.card(isLight)} border rounded-2xl md:rounded-3xl ${noPadding ? '' : 'p-4 md:p-6'} transition-all duration-300 ${group ? 'group' : ''} ${overflow ? 'overflow-hidden' : ''} ${className}`}>
        {children}
    </div>
);

const SmartAreaChart = ({ data, values, color, maxY, isLight, showGrid = false, xKey = "day", yDomain = [0, 100], datasets = null }) => {
    if (window.Recharts?.ResponsiveContainer) {
        const { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis } = window.Recharts;
        return (
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        {datasets ? datasets.map(ds => (
                            <linearGradient key={ds.id} id={`grad-${ds.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={ds.color} stopOpacity={isLight ? 0.3 : 0.15}/>
                                <stop offset="95%" stopColor={ds.color} stopOpacity="0"/>
                            </linearGradient>
                        )) : (
                            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={isLight ? 0.3 : 0.15}/>
                                <stop offset="95%" stopColor={color} stopOpacity="0"/>
                            </linearGradient>
                        )}
                    </defs>
                    {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#f1f5f9" : "#1f2937"} vertical={false} />}
                    <XAxis dataKey={xKey} hide />
                    <YAxis domain={yDomain} hide />
                    {datasets ? datasets.map(ds => (
                        <Area 
                            key={ds.id} type="monotone" dataKey={ds.id} stroke={ds.color} 
                            fill={`url(#grad-${ds.id})`} strokeWidth={3} animationDuration={1000} dot={false} activeDot={false}
                        />
                    )) : (
                        <Area 
                            type="monotone" dataKey="percentage" stroke={color} 
                            fill={`url(#grad-${color})`} strokeWidth={3} animationDuration={1000} dot={false} activeDot={false}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        );
    }

    return (
        <div className={`w-full h-full flex items-center justify-center ${isLight ? 'text-slate-400' : 'text-slate-600'} text-xs italic`}>
            {t.loadingCharts || "Loading charts..."}
        </div>
    );
};

const TwoToneDonutGauge = React.memo(({ percent = 0, isLight }) => {
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
});

const WeeklyBarsSmall = React.memo(({ weeks = [], isLight }) => {
    const containerRef = useRef(null);
    const [barW, setBarW] = useState(24);
    const [hoveredIdx, setHoveredIdx] = useState(null);
    
    const maxVal = 100;
    const chartHeight = 120;

    const updateBarWidth = useCallback(() => {
        const el = containerRef.current;
        if (!el || weeks.length === 0) return;
        const w = el.clientWidth;
        const bw = Math.max(22, Math.floor(w / weeks.length) - 12);
        setBarW(bw);
    }, [weeks]);

    useEffect(() => {
        updateBarWidth();
        window.addEventListener('resize', updateBarWidth);
        return () => window.removeEventListener('resize', updateBarWidth);
    }, [updateBarWidth]);

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
});
// --- Theme Constants ---
const THEME = {
    card: (isLight) => isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-xl',
    bg: (isLight) => isLight ? 'bg-slate-50' : 'bg-[#0b1220]',
    bgSoft: (isLight, color = 'slate') => {
        const colors = {
            slate: isLight ? 'bg-slate-100/50' : 'bg-slate-800/50',
            purple: isLight ? 'bg-purple-100/50' : 'bg-purple-900/20',
            blue: isLight ? 'bg-blue-100/50' : 'bg-blue-900/20',
            green: isLight ? 'bg-green-100/50' : 'bg-green-900/20',
            orange: isLight ? 'bg-orange-100/50' : 'bg-orange-900/20',
            red: isLight ? 'bg-red-100/50' : 'bg-red-900/20',
        };
        return colors[color] || colors.slate;
    },
    border: (isLight) => isLight ? 'border-slate-100' : 'border-[#1f2937]',
    borderStrong: (isLight) => isLight ? 'border-slate-200' : 'border-[#2d3748]',
    text: (isLight, color = null) => {
        if (!color) return isLight ? 'text-slate-700' : 'text-slate-100';
        const colors = {
            blue: isLight ? 'text-blue-600' : 'text-blue-400',
            green: isLight ? 'text-green-600' : 'text-green-400',
            purple: isLight ? 'text-purple-600' : 'text-purple-400',
            red: isLight ? 'text-red-600' : 'text-red-400',
            orange: isLight ? 'text-orange-600' : 'text-orange-400',
        };
        return colors[color] || (isLight ? 'text-slate-700' : 'text-slate-100');
    },
    textMuted: (isLight) => isLight ? 'text-slate-400' : 'text-slate-400',
    textDim: (isLight) => isLight ? 'text-slate-500' : 'text-slate-300',
    hover: (isLight) => isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800',
    input: (isLight) => isLight ? 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-500' : 'bg-[#1e293b] border-[#1f2937] text-slate-200 focus:border-blue-500',
    buttonGhost: (isLight) => isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800',
    gradeColor: (isLight, value, max = 10, min = 0) => {
            const val = parseFloat(value);
            const m = parseFloat(max) || 10;
            const n = parseFloat(min) || 0;
            if (isNaN(val) || val === 0) return isLight ? 'text-slate-400 bg-slate-100 border-slate-200' : 'text-slate-500 bg-slate-800 border-slate-700';
            
            const rel = m > n ? (val - n) / (m - n) : 0;
            if (rel >= 1) return isLight ? 'text-emerald-600 bg-emerald-100 border-emerald-200' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            if (rel <= 0) return isLight ? 'text-red-600 bg-red-100 border-red-200' : 'text-red-500 bg-red-500/10 border-red-500/20';
            if (rel < 0.45) return isLight ? 'text-red-500 bg-red-50 border-red-100' : 'text-red-400 bg-red-400/10 border-red-400/20';
            if (rel < 0.60) return isLight ? 'text-orange-600 bg-orange-100 border-orange-200' : 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            if (rel < 0.75) return isLight ? 'text-yellow-600 bg-yellow-50 border-yellow-100' : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            return isLight ? 'text-green-600 bg-green-50 border-green-100' : 'text-green-500 bg-green-500/10 border-green-500/20';
        },
        gradeBar: (value, max = 10, min = 0) => {
            const val = parseFloat(value);
            const m = parseFloat(max) || 10;
            const n = parseFloat(min) || 0;
            if (isNaN(val) || val === 0) return 'from-slate-400 to-slate-200';
            const rel = m > n ? (val - n) / (m - n) : 0;
            if (rel >= 1) return 'from-emerald-600 to-emerald-400';
            if (rel <= 0) return 'from-red-600 to-red-400';
            if (rel < 0.45) return 'from-red-500 to-red-300';
            if (rel < 0.60) return 'from-orange-500 to-orange-300';
            if (rel < 0.75) return 'from-yellow-500 to-yellow-300';
            return 'from-green-600 to-green-400';
        },
        badge: (isLight, color = 'blue') => {
        const colors = {
            blue: isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-900/20 text-blue-400',
            green: isLight ? 'bg-green-50 text-green-600' : 'bg-green-900/20 text-green-400',
            purple: isLight ? 'bg-purple-50 text-purple-600' : 'bg-purple-900/20 text-purple-400',
            orange: isLight ? 'bg-orange-50 text-orange-600' : 'bg-orange-900/20 text-orange-400',
            slate: isLight ? 'bg-slate-50 text-slate-600' : 'bg-slate-900/20 text-slate-400',
        };
        return colors[color] || colors.blue;
    }
};

// --- Icons ---
const Icons = {
    Check: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>),
    Clock: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>),
    Book: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>),
    Calendar: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>),
    XCircle: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>),
    Leaf: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 1.45 6"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>),
    Pen: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>),
    Trash: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>),
    Plus: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>),
    ChevronLeft: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>),
    ChevronRight: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>),
    Settings: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
    Droplet: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3C9 7 6 9.5 6 13a6 6 0 0 0 12 0c0-3.5-3-6-6-10z"></path></svg>),
    Heart: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 8.6a5 5 0 0 0-7.1 0L12 10.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z" transform="translate(-4 -6) scale(0.8)"></path></svg>),
    Coffee: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="12" height="10" rx="2"></rect><path d="M15 10h3a3 3 0 0 1 0 6h-3"></path><path d="M6 3v3M10 3v3M14 3v3"></path></svg>),
    Apple: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 13c0-3-2-5-4-5s-4 2-4 5 2 7 4 7 4-4 4-7z"></path><path d="M14 4c-1 2-3 2-4 2 1-2 3-2 4-2z"></path></svg>),
    Bicycle: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="17" r="3"></circle><circle cx="18" cy="17" r="3"></circle><path d="M6 17l5-8h4l3 8"></path><path d="M9 9l2 3"></path></svg>),
    Music: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M12 6l8-2v10"></path><path d="M12 6v10"></path></svg>),
    Code: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 4 3 12 8 20"></polyline><polyline points="16 4 21 12 16 20"></polyline></svg>),
    Home: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8"></path><rect x="5" y="11" width="14" height="10" rx="2"></rect></svg>),
    Star: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 9 22 9 17 13 19 21 12 17 5 21 7 13 2 9 9 9"></polygon></svg>),
    Brain: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7a4 4 0 0 0-4 4 4 4 0 0 0 4 4h8a4 4 0 0 0 4-4 4 4 0 0 0-4-4H8z"></path><path d="M8 7v8M16 7v8"></path></svg>),
    Yoga: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"></circle><path d="M12 7v6"></path><path d="M8 13l4 3 4-3"></path><path d="M6 19h12"></path></svg>),
    Sun: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"></path></svg>),
    Moon: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"></path></svg>),
    Target: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle><path d="M12 2v4M2 12h4M20 12h4M12 20v4" transform="translate(-2 -2) scale(0.8)"></path></svg>),
    User: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>),
    Info: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>),
    School: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>),
    X: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12" /></svg>),
    History: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>),
    List: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>),
    Trophy: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>),
    MapPin: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="12" r="3"></circle></svg>),
};

// --- Date Helpers ---
const formatDate = (date) => {
    if (!(date instanceof Date)) date = new Date(date);
    return getDateKey(date.getFullYear(), date.getMonth(), date.getDate());
};

const getDateKey = (year, month, day) => {
    return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

const getTodayDisplay = (language) => {
    const d = new Date();
    const locale = getLocale(language);
    const dayName = d.toLocaleString(locale, { weekday: 'long' });
    const dayCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dd = d.getDate();
    const mon = d.toLocaleString(locale, { month: 'short' });
    const monCap = mon.charAt(0).toUpperCase() + mon.slice(1);
    const yy = d.getFullYear();
    return `${dayCap} ${dd} ${monCap} ${yy}`;
};

const getTodayKey = () => {
    const now = new Date();
    return getDateKey(now.getFullYear(), now.getMonth(), now.getDate());
};

const calculateStreak = (completedDates) => {
    if (!completedDates || Object.keys(completedDates).length === 0) return { current: 0, best: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate current streak
    let current = 0;
    let checkDate = new Date(today);
    
    // If today is not completed, check from yesterday
    const todayKey = getDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
    if (!completedDates[todayKey]) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
        const key = getDateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
        if (completedDates[key]) {
            current++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    // Calculate best streak
    let best = 0;
    let tempBest = 0;
    const sortedDates = Object.keys(completedDates).sort();
    
    if (sortedDates.length > 0) {
        let prevDate = null;
        for (const dateStr of sortedDates) {
            const currentDate = new Date(dateStr);
            if (prevDate) {
                const diffTime = Math.abs(currentDate - prevDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) {
                    tempBest++;
                } else {
                    tempBest = 1;
                }
            } else {
                tempBest = 1;
            }
            best = Math.max(best, tempBest);
            prevDate = currentDate;
        }
    }

    return { current, best };
};

const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
};

// --- Translations ---
const translations = {
    it: {
        tracker: "Tracker",
        school: "Scuola",
        done: "Fatte",
        missing: "Mancanti",
        total: "Totali",
        sync: "Sync",
        dailyCompletion: "Completamento Giorno",
        monthlyProgress: "Andamento Mensile",
        completion: "Completamento",
        weeklyAverages: "Medie Settimanali",
        export: "Esporta",
        import: "Importa",
        year: "Anno",
        addHabit: "Aggiungi Abitudine",
        rename: "Rinomina",
        goal: "Obiettivo",
        delete: "Elimina",
        save: "Salva",
        cancel: "Annulla",
        mood: "Umore",
        motivation: "Motivazione",
        schoolHub: "School Hub",
        schoolDesc: "Il tuo centro di controllo per la carriera scolastica.",
        min: "Min",
        max: "Max",
        home: "Home",
        subjects: "Materie",
        tests: "Verifiche",
        calendar: "Calendario",
        addSubject: "Aggiungi Materia",
        avg: "Media",
        noGrades: "Nessun voto",
        noTests: "Nessuna verifica",
        date: "Data",
        type: "Tipo",
        written: "Scritto",
        oral: "Orale",
        practical: "Pratico",
        moodAvg: "Media Umore",
        motivationAvg: "Media Motivazione",
        week: "Settimana",
        schoolGrades: "Materie e Voti",
        schoolGradesDesc: "Gestisci le tue materie e i tuoi progressi",
        addSubjectPlaceholder: "Esempio: Matematica, Latino...",
        gradesCount: "voti",
        noTopic: "Nessun argomento",
        testRegistry: "Registro Verifiche",
        testRegistryDesc: "Pianifica e gestisci le tue prove",
        showCompleted: "Verifiche vecchie",
        hideCompleted: "Nascondi vecchie",
        newTest: "Nuova Verifica",
        editTest: "Modifica Verifica",
        selectSubject: "Seleziona...",
        optionalNote: "Note (opzionale)",
        notePlaceholder: "Capitoli, argomenti...",
        noNotes: "Nessuna nota aggiunta",
        deleteSubjectConfirm: "Eliminando la materia cancellerai anche tutti i voti e le verifiche associate. Procedere?",
        bestSubject: "Migliore",
        worstSubject: "Peggiore",
        upcomingTests: "Verifiche in arrivo",
        viewAll: "Vedi tutte",
        subjectDeleted: "Materia eliminata",
        noTestsPlanned: "Nessuna verifica programmata",
        latestAverages: "Ultime medie",
        allSubjects: "Tutte le materie",
        noTestsPlannedRegistry: "Nessuna verifica programmata nel registro.",
        loadingCharts: "Caricamento grafici...",
        today: "Oggi",
        test: "Verifica",
        grade: "Voto",
        mon: "Lun",
        tue: "Mar",
        wed: "Mer",
        thu: "Gio",
        fri: "Ven",
        sat: "Sab",
        sun: "Dom",
        editGrade: "Modifica Voto",
        addGradeTitle: "Aggiungi Voto",
        topicOptional: "Argomento (opzionale)",
        topicPlaceholder: "Esempio: Equazioni di secondo grado",
        update: "Aggiorna",
        deleteHabitConfirm: "Sei sicuro di voler eliminare questa abitudine?",
        newHabitName: "Nuova abitudine",
        importSuccessLink: "Import completato dal link",
        importSuccess: "Import completato",
        invalidFile: "File non valido",
        importError: "Errore durante l'import",
        switchLanguage: "Cambia lingua",
        themeDarkTitle: "Attiva Tema Scuro",
        themeLightTitle: "Attiva Tema Chiaro",
        syncSettings: "Impostazioni Sync",
        backendUrl: "Backend URL / Modalità",
        backendPlaceholder: "URL del backend o 'supabase://'",
        supabaseDesc: "Usa 'supabase://' per sincronizzazione diretta tramite Supabase.",
        supabaseUrl: "Supabase URL",
        supabaseKey: "Supabase Anon Key",
        syncCodeLabel: "Codice Sync",
        syncCodePlaceholder: "es. miao",
        password: "Password (Word)",
        optional: "Opzionale",
        supabaseInitError: "Errore inizializzazione Supabase:",
        databaseError: "Errore database: verifica URL e Key",
        supabaseNotConfigured: "Supabase non configurato. Clicca sul pallino per impostare URL e Key.",
        supabaseNotConfiguredShort: "Supabase non configurato",
        connectionError: "Errore di connessione",
        backendLabel: "Backend",
        local: "Locale",
        pcAcceso: "PC acceso",
        streak: "Serie",
        best: "Record",
        settings: "Impostazioni",
        sufficiency: "Sufficienza",
        teacherPlaceholder: "Nome del docente",
        tasks: "Compiti",
        addTask: "Aggiungi Compito",
        editTask: "Modifica Compito",
        noTasks: "Nessun compito",
        tasksDesc: "Gestisci i tuoi compiti e le tue scadenze",
        dueDate: "Scadenza",
        completed: "Completato",
        taskPlaceholder: "Es. Esercizi pag. 100",
        weight: "Peso",
        targetAvg: "Obiettivo Media",
        neededGrade: "Voto necessario",
        notPossible: "Non possibile",
        nextTest: "Prossima Verifica",
        gradeTrend: "Andamento Voti",
        average: "Media",
        viewTrend: "Vedi Andamento",
        semesterDates: "Date Semestri",
        semester1: "Primo Semestre",
        semester2: "Secondo Semestre",
        all: "Totale",
        totalScore: "Punteggio totale",
        toNextTitle: "al prossimo titolo",
        schedule: "Orario",
        scheduleDesc: "Gestisci il tuo orario scolastico settimanale",
        addSchedule: "Aggiungi Lezione",
        editSchedule: "Modifica Lezione",
        noLessons: "Nessuna lezione",
        startTime: "Inizio",
        endTime: "Fine",
        room: "Aula",
        roomPlaceholder: "Es. Aula 101, Laboratorio...",
        goals: "Obiettivi",
        goalsDesc: "Traccia i tuoi traguardi personali",
        addGoal: "Nuovo Obiettivo",
        editGoal: "Modifica Obiettivo",
        goalTitlePlaceholder: "Es. Leggere 10 libri",
        goalDescPlaceholder: "Passi per raggiungere questo obiettivo...",
        longTermGoals: "Obiettivi a Lungo Termine",
        longTermGoalsDesc: "Traccia i tuoi obiettivi annuali o a lungo termine",
        targetValue: "Valore Target",
        targetValuePlaceholder: "es. 8:00/km o 100kg",
        offline: "Offline",
        online: "Online",
        syncPending: "Sincronizzazione in sospeso",
        deadline: "Scadenza",
        noGoals: "Ancora nessun obiettivo a lungo termine",
        title: "Titolo",
        ranks: {
            zombie: "Zombie",
            naufrago: "Naufrago",
            allarme: "Allarme",
            limbo: "Limbo",
            principiante: "Principiante",
            esploratore: "Esploratore",
            promessa: "Promessa",
            elite: "Elite",
            maestro: "Maestro",
            divinita: "Divinità"
        }
    },
    en: {
        tracker: "Tracker",
        school: "School",
        done: "Done",
        missing: "Missing",
        total: "Total",
        sync: "Sync",
        dailyCompletion: "Daily Completion",
        monthlyProgress: "Monthly Progress",
        completion: "Completion",
        weeklyAverages: "Weekly Averages",
        export: "Export",
        import: "Import",
        year: "Year",
        addHabit: "Add Habit",
        rename: "Rename",
        goal: "Goal",
        delete: "Delete",
        save: "Save",
        cancel: "Cancel",
        mood: "Mood",
        motivation: "Motivation",
        schoolHub: "School Hub",
        schoolDesc: "Your control center for your school career.",
        min: "Min",
        max: "Max",
        home: "Home",
        subjects: "Subjects",
        tests: "Tests",
        calendar: "Calendar",
        addSubject: "Add Subject",
        avg: "Avg",
        noGrades: "No grades",
        noTests: "No tests",
        date: "Date",
        type: "Type",
        written: "Written",
        oral: "Oral",
        practical: "Practical",
        moodAvg: "Mood Avg",
        motivationAvg: "Motivation Avg",
        week: "Week",
        schoolGrades: "Subjects & Grades",
        schoolGradesDesc: "Manage your subjects and progress",
        addSubjectPlaceholder: "Example: Math, Latin...",
        gradesCount: "grades",
        noTopic: "No topic",
        testRegistry: "Test Registry",
        testRegistryDesc: "Plan and manage your tests",
        showCompleted: "Past Tests",
        hideCompleted: "Hide Past",
        newTest: "New Test",
        editTest: "Edit Test",
        selectSubject: "Select...",
        optionalNote: "Notes (optional)",
        notePlaceholder: "Chapters, topics...",
        noNotes: "No notes added",
        deleteSubjectConfirm: "Deleting the subject will also delete all associated grades and tests. Proceed?",
        bestSubject: "Best",
        worstSubject: "Worst",
        upcomingTests: "Upcoming Tests",
        viewAll: "View all",
        subjectDeleted: "Subject deleted",
        noTestsPlanned: "No tests planned",
        latestAverages: "Latest Averages",
        allSubjects: "All subjects",
        noTestsPlannedRegistry: "No tests planned in the registry.",
        loadingCharts: "Loading charts...",
        today: "Today",
        test: "Test",
        grade: "Grade",
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
        sun: "Sun",
        editGrade: "Edit Grade",
        addGradeTitle: "Add Grade",
        topicOptional: "Topic (optional)",
        topicPlaceholder: "Example: Quadratic equations",
        update: "Update",
        deleteHabitConfirm: "Are you sure you want to delete this habit?",
        newHabitName: "New Habit",
        importSuccessLink: "Import completed from link",
        importSuccess: "Import completed",
        invalidFile: "Invalid file",
        importError: "Error during import",
        switchLanguage: "Switch language",
        themeDarkTitle: "Enable Dark Mode",
        themeLightTitle: "Enable Light Mode",
        syncSettings: "Sync Settings",
        backendUrl: "Backend URL / Mode",
        backendPlaceholder: "Backend URL or 'supabase://'",
        supabaseDesc: "Use 'supabase://' for direct sync via Supabase.",
        supabaseUrl: "Supabase URL",
        supabaseKey: "Supabase Anon Key",
        syncCodeLabel: "Sync Code",
        syncCodePlaceholder: "e.g. miao",
        password: "Password (Word)",
        optional: "Optional",
        supabaseInitError: "Supabase initialization error:",
        databaseError: "Database error: check URL and Key",
        supabaseNotConfigured: "Supabase not configured. Click the dot to set URL and Key.",
        supabaseNotConfiguredShort: "Supabase not configured",
        connectionError: "Connection error",
        backendLabel: "Backend",
        local: "Local",
        pcAcceso: "PC On",
        streak: "Streak",
        best: "Best",
        settings: "Settings",
        sufficiency: "Sufficiency",
        teacherPlaceholder: "Teacher's name",
        tasks: "Tasks",
        addTask: "Add Task",
        editTask: "Edit Task",
        noTasks: "No tasks",
        tasksDesc: "Manage your tasks and deadlines",
        dueDate: "Due date",
        completed: "Completed",
        taskPlaceholder: "e.g. Exercises p. 100",
        weight: "Weight",
        targetAvg: "Target Average",
        neededGrade: "Needed Grade",
        notPossible: "Not possible",
        nextTest: "Next Test",
        gradeTrend: "Grade Trend",
        average: "Average",
        viewTrend: "View Trend",
        semesterDates: "Semester Dates",
        semester1: "First Semester",
        semester2: "Second Semester",
        all: "Total",
        totalScore: "Total Score",
        toNextTitle: "to next title",
        schedule: "Schedule",
        scheduleDesc: "Manage your weekly school schedule",
        addSchedule: "Add Lesson",
        editSchedule: "Edit Lesson",
        noLessons: "No lessons",
        startTime: "Start",
        endTime: "End",
        room: "Room",
        roomPlaceholder: "e.g. Room 101, Lab...",
        goals: "Goals",
        goalsDesc: "Track your personal goals",
        addGoal: "New Goal",
        editGoal: "Edit Goal",
        goalTitlePlaceholder: "e.g. Read 10 books",
        goalDescPlaceholder: "Steps to achieve this goal...",
        longTermGoals: "Long Term Goals",
        longTermGoalsDesc: "Track your annual or long-term goals",
        targetValue: "Target Value",
        targetValuePlaceholder: "e.g. 8:00/km or 100kg",
        offline: "Offline",
        online: "Online",
        syncPending: "Sync pending",
        deadline: "Deadline",
        noGoals: "No long term goals yet",
        title: "Title",
        ranks: {
            zombie: "Zombie",
            naufrago: "Castaway",
            allarme: "Alarm",
            limbo: "Limbo",
            principiante: "Beginner",
            esploratore: "Explorer",
            promessa: "Promise",
            elite: "Elite",
            maestro: "Master",
            divinita: "Deity"
        }
    },
    fr: {
        tracker: "Tracker",
        school: "École",
        done: "Fait",
        missing: "Manquant",
        total: "Total",
        sync: "Sync",
        dailyCompletion: "Complétion du Jour",
        monthlyProgress: "Progression Mensuelle",
        completion: "Complétion",
        weeklyAverages: "Moyennes Hebdomadaires",
        export: "Exporter",
        import: "Importer",
        year: "Année",
        addHabit: "Ajouter Habitude",
        rename: "Renommer",
        goal: "Objectif",
        delete: "Supprimer",
        save: "Enregistrer",
        cancel: "Annuler",
        mood: "Humeur",
        motivation: "Motivation",
        schoolHub: "Centre Scolaire",
        schoolDesc: "Votre centre de contrôle pour votre carrière scolaire.",
        min: "Min",
        max: "Max",
        home: "Accueil",
        subjects: "Matières",
        tests: "Évaluations",
        calendar: "Calendrier",
        addSubject: "Ajouter Matière",
        avg: "Moyenne",
        noGrades: "Aucune note",
        noTests: "Aucune évaluation",
        date: "Date",
        type: "Type",
        written: "Écrit",
        oral: "Oral",
        practical: "Pratique",
        moodAvg: "Humeur Moy.",
        motivationAvg: "Motivation Moy.",
        week: "Semaine",
        schoolGrades: "Matières & Notes",
        schoolGradesDesc: "Gérez vos matières et vos progrès",
        addSubjectPlaceholder: "Exemple : Maths, Français...",
        gradesCount: "notes",
        noTopic: "Aucun sujet",
        testRegistry: "Registre des Évaluations",
        testRegistryDesc: "Planifiez et gérez vos épreuves",
        showCompleted: "Passées",
        hideCompleted: "Masquer",
        newTest: "Nouvelle Évaluation",
        editTest: "Modifier Évaluation",
        selectSubject: "Sélectionner...",
        optionalNote: "Notes (optionnel)",
        notePlaceholder: "Chapitres, sujets...",
        noNotes: "Aucune note ajoutée",
        deleteSubjectConfirm: "La suppression de la matière effacera également toutes les notes et évaluations associées. Procéder ?",
        bestSubject: "Meilleure",
        worstSubject: "Pire",
        upcomingTests: "Évaluations à venir",
        viewAll: "Voir tout",
        subjectDeleted: "Matière supprimée",
        noTestsPlanned: "Aucune évaluation prévue",
        latestAverages: "Dernières moyennes",
        allSubjects: "Toutes les matières",
        noTestsPlannedRegistry: "Aucune évaluation programmée dans le registre.",
        loadingCharts: "Chargement des graphiques...",
        today: "Aujourd'hui",
        test: "Éval",
        grade: "Note",
        mon: "Lun",
        tue: "Mar",
        wed: "Mer",
        thu: "Jeu",
        fri: "Ven",
        sat: "Sam",
        sun: "Dim",
        editGrade: "Modifier Note",
        addGradeTitle: "Ajouter Note",
        topicOptional: "Sujet (optionnel)",
        topicPlaceholder: "Exemple : Équations du second degré",
        update: "Mettre à jour",
        deleteHabitConfirm: "Êtes-vous sûr de vouloir supprimer cette habitude ?",
        newHabitName: "Nouvelle habitude",
        importSuccessLink: "Importation terminée depuis le lien",
        importSuccess: "Importation terminée",
        invalidFile: "Fichier invalide",
        importError: "Erreur lors de l'importation",
        switchLanguage: "Changer de langue",
        themeDarkTitle: "Activer le mode sombre",
        themeLightTitle: "Activer le mode clair",
        syncSettings: "Paramètres de synchronisation",
        backendUrl: "URL / Mode Backend",
        backendPlaceholder: "URL backend ou 'supabase://'",
        supabaseDesc: "Utilisez 'supabase://' pour une synchronisation directe via Supabase.",
        supabaseUrl: "URL Supabase",
        supabaseKey: "Clé Anon Supabase",
        syncCodeLabel: "Code Sync",
        syncCodePlaceholder: "ex. miao",
        password: "Mot de passe (Word)",
        optional: "Optionnel",
        supabaseInitError: "Erreur d'initialisation Supabase :",
        databaseError: "Erreur de base de données : vérifiez l'URL et la clé",
        supabaseNotConfigured: "Supabase non configuré. Cliquez sur le point pour définir l'URL et la clé.",
        connectionError: "Erreur de connexion",
        backendLabel: "Backend",
        local: "Locale",
        pcAcceso: "PC Allumé",
        streak: "Série",
        best: "Record",
        settings: "Paramètres",
        sufficiency: "Suffisance",
        teacherPlaceholder: "Nom de l'enseignant",
        tasks: "Devoirs",
        addTask: "Ajouter Devoir",
        editTask: "Modifier Devoir",
        noTasks: "Aucun devoir",
        tasksDesc: "Gérez vos devoirs et vos échéances",
        dueDate: "Échéance",
        completed: "Terminé",
        taskPlaceholder: "ex. Exercices p. 100",
        weight: "Poids",
        targetAvg: "Objectif Moyenne",
        neededGrade: "Note nécessaire",
        notPossible: "Pas possible",
        nextTest: "Prochaine Évaluation",
        gradeTrend: "Tendance des notes",
        average: "Moyenne",
        viewTrend: "Voir la tendance",
        semesterDates: "Dates des semestres",
        semester1: "Premier Semestre",
        semester2: "Second Semestre",
        all: "Total",
        totalScore: "Score total",
        toNextTitle: "au prochain titre",
        schedule: "Emploi du temps",
        scheduleDesc: "Gérez votre emploi du temps hebdomadaire",
        addSchedule: "Ajouter un cours",
        editSchedule: "Modifier le cours",
        noLessons: "Aucun cours",
        startTime: "Début",
        endTime: "Fin",
        room: "Salle",
        roomPlaceholder: "ex. Salle 101, Labo...",
        goals: "Objectifs",
        goalsDesc: "Suivez vos objectifs personnels",
        addGoal: "Nouvel Objectif",
        editGoal: "Modifier l'Objectif",
        goalTitlePlaceholder: "ex. Lire 10 livres",
        goalDescPlaceholder: "Étapes pour atteindre cet objectif...",
        longTermGoals: "Objectifs à long terme",
        longTermGoalsDesc: "Suivez vos objectifs annuels ou à long terme",
        offline: "Hors ligne",
        online: "En ligne",
        syncPending: "Sync en attente",
        deadline: "Échéance",
        targetValue: "Valeur Cible",
        targetValuePlaceholder: "ex. 8:00/km ou 100kg",
        noGoals: "Aucun obiettivo à long terme pour l'instant",
        title: "Titre",
        ranks: {
            zombie: "Zombie",
            naufrago: "Naufragé",
            allarme: "Alarme",
            limbo: "Limbo",
            principiante: "Débutant",
            esploratore: "Explorateur",
            promessa: "Promesse",
            elite: "Élite",
            maestro: "Maître",
            divinita: "Divinité"
        }
    },
    de: {
        tracker: "Tracker",
        school: "Schule",
        done: "Erledigt",
        missing: "Fehlend",
        total: "Gesamt",
        sync: "Sync",
        dailyCompletion: "Täglicher Abschluss",
        monthlyProgress: "Monatlicher Fortschritt",
        completion: "Abschluss",
        weeklyAverages: "Wöchentlicher Durchschnitt",
        export: "Exportieren",
        import: "Importieren",
        year: "Jahr",
        addHabit: "Gewohnheit hinzufügen",
        rename: "Umbenennen",
        goal: "Ziel",
        delete: "Löschen",
        save: "Speichern",
        cancel: "Abbrechen",
        mood: "Stimmung",
        motivation: "Motivation",
        schoolHub: "Schul-Hub",
        schoolDesc: "Dein Kontrollzentrum für deine Schullaufbahn.",
        min: "Min",
        max: "Max",
        home: "Home",
        subjects: "Fächer",
        tests: "Prüfungen",
        calendar: "Kalender",
        addSubject: "Fach hinzufügen",
        avg: "Schnitt",
        noGrades: "Keine Noten",
        noTests: "Keine Prüfungen",
        date: "Datum",
        type: "Typ",
        written: "Schriftlich",
        oral: "Mündlich",
        practical: "Praktisch",
        moodAvg: "Ø Stimmung",
        motivationAvg: "Ø Motivation",
        week: "Woche",
        schoolGrades: "Fächer & Noten",
        schoolGradesDesc: "Verwalte deine Fächer und deinen Fortschritt",
        addSubjectPlaceholder: "Z.B. Mathe, Latein...",
        gradesCount: "Noten",
        noTopic: "Kein Thema",
        testRegistry: "Prüfungsregister",
        testRegistryDesc: "Plane und verwalte deine Prüfungen",
        showCompleted: "Vergangene",
        hideCompleted: "Ausblenden",
        newTest: "Neue Prüfung",
        editTest: "Prüfung bearbeiten",
        selectSubject: "Auswählen...",
        optionalNote: "Notizen (optional)",
        notePlaceholder: "Kapitel, Themen...",
        noNotes: "Keine Notizen hinzugefügt",
        deleteSubjectConfirm: "Wenn du das Fach löschst, werden auch alle zugehörigen Noten und Prüfungen gelöscht. Fortfahren?",
        bestSubject: "Bestes",
        worstSubject: "Schlechtestes",
        upcomingTests: "Anstehende Prüfungen",
        viewAll: "Alle ansehen",
        subjectDeleted: "Fach gelöscht",
        noTestsPlanned: "Keine Prüfungen geplant",
        latestAverages: "Letzte Schnitte",
        allSubjects: "Alle Fächer",
        noTestsPlannedRegistry: "Keine geplanten Prüfungen im Register.",
        loadingCharts: "Diagramme werden geladen...",
        today: "Heute",
        test: "Prüfung",
        grade: "Note",
        mon: "Mo",
        tue: "Di",
        wed: "Mi",
        thu: "Do",
        fri: "Fr",
        sat: "Sa",
        sun: "So",
        editGrade: "Note bearbeiten",
        addGradeTitle: "Note hinzufügen",
        topicOptional: "Thema (optional)",
        topicPlaceholder: "Z.B. Quadratische Gleichungen",
        update: "Aktualisieren",
        deleteHabitConfirm: "Bist du sicher, dass du diese Gewohnheit löschen möchst?",
        newHabitName: "Neue Gewohnheit",
        importSuccessLink: "Import über Link erfolgreich",
        importSuccess: "Import erfolgreich",
        invalidFile: "Ungültige Datei",
        importError: "Fehler beim Import",
        switchLanguage: "Sprache wechseln",
        themeDarkTitle: "Dunkles Design aktivieren",
        themeLightTitle: "Helles Design aktivieren",
        syncSettings: "Sync-Einstellungen",
        backendUrl: "Backend-URL / Modus",
        backendPlaceholder: "Backend-URL oder 'supabase://'",
        supabaseDesc: "Verwende 'supabase://' für die direkte Synchronisierung über Supabase.",
        supabaseUrl: "Supabase-URL",
        supabaseKey: "Supabase Anon-Key",
        syncCodeLabel: "Sync-Code",
        syncCodePlaceholder: "z.B. miao",
        password: "Passwort (Wort)",
        optional: "Optional",
        supabaseInitError: "Fehler bei der Supabase-Initialisierung:",
        databaseError: "Datenbankfehler: URL und Key prüfen",
        supabaseNotConfigured: "Supabase nicht konfiguriert. Klicke auf den Punkt, um URL und Key einzustellen.",
        connectionError: "Verbindungsfehler",
        backendLabel: "Backend",
        local: "Lokal",
        pcAcceso: "PC an",
        streak: "Serie",
        best: "Rekord",
        settings: "Einstellungen",
        sufficiency: "Genügend",
        teacherPlaceholder: "Name des Lehrers",
        tasks: "Hausaufgaben",
        addTask: "Hausaufgabe hinzufügen",
        editTask: "Hausaufgabe bearbeiten",
        noTasks: "Keine Hausaufgaben",
        tasksDesc: "Verwalte deine Hausaufgaben und Fristen",
        dueDate: "Frist",
        completed: "Erledigt",
        taskPlaceholder: "z.B. Übungen S. 100",
        weight: "Gewichtung",
        targetAvg: "Ziel-Durchschnitt",
        neededGrade: "Nötige Note",
        notPossible: "Nicht möglich",
        nextTest: "Nächste Prüfung",
        gradeTrend: "Notenverlauf",
        average: "Durchschnitt",
        viewTrend: "Verlauf ansehen",
        semesterDates: "Semesterdaten",
        semester1: "Erstes Semester",
        semester2: "Zweites Semester",
        all: "Gesamt",
        totalScore: "Gesamtpunktzahl",
        toNextTitle: "bis zum nächsten Titel",
        schedule: "Stundenplan",
        scheduleDesc: "Verwalte deinen wöchentlichen Stundenplan",
        addSchedule: "Lektion hinzufügen",
        editSchedule: "Lektion bearbeiten",
        noLessons: "Keine Lektionen",
        startTime: "Beginn",
        endTime: "Ende",
        room: "Raum",
        roomPlaceholder: "z.B. Raum 101, Labor...",
        goals: "Ziele",
        goalsDesc: "Verfolge deine persönlichen Ziele",
        addGoal: "Neues Ziel",
        editGoal: "Ziel bearbeiten",
        goalTitlePlaceholder: "z.B. 10 Bücher lesen",
        goalDescPlaceholder: "Schritte zur Erreichung dieses Ziels...",
        longTermGoals: "Langfristige Ziele",
        longTermGoalsDesc: "Verfolge deine Jahres- oder langfristigen Ziele",
        targetValue: "Zielwert",
        targetValuePlaceholder: "z.B. 8:00/km oder 100kg",
        offline: "Offline",
        online: "Online",
        syncPending: "Sync ausstehend",
        deadline: "Frist",
        noGoals: "Noch keine langfristigen Ziele",
        title: "Titel",
        ranks: {
            zombie: "Zombie",
            naufrago: "Schiffbrüchiger",
            allarme: "Alarm",
            limbo: "Limbo",
            principiante: "Anfänger",
            esploratore: "Entdecker",
            promessa: "Hoffnung",
            elite: "Elite",
            maestro: "Meister",
            divinita: "Gottheit"
        }
    }
};

const getMonthName = (year, month, lang = 'it') => {
    const locale = getLocale(lang);
    const name = new Date(year, month).toLocaleString(locale, { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
};

const getLocale = (lang) => {
    if (lang === 'it') return 'it-IT';
    if (lang === 'fr') return 'fr-FR';
    if (lang === 'de') return 'de-DE';
    return 'en-US';
};

// --- Mock Data Setup ---
// New structure: completedDates is a map of "YYYY-MM-DD": true
const INITIAL_HABITS = [
    { id: 1, name: "Sveglia ⏰", icon: "Clock", goal: 31, completedDates: {} },
    { id: 2, name: "Studio 📖", icon: "Book", goal: 25, completedDates: {} },
    { id: 4, name: "Acqua 💧", icon: "Droplet", goal: 31, completedDates: {} },
];

const INITIAL_MENTAL_STATE = {
    logs: {} 
};


// --- Components ---


const ProgressBar = React.memo(({ value, max, colorClass = "bg-green-500", height = "h-2", isLight = false }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className={`w-full ${THEME.bgSoft(isLight)} rounded-full ${height}`}>
            <div className={`${colorClass} rounded-full ${height}`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
});

const Header = React.memo(({ totalHabits, completedHabits, totalPossible, currentDate, onNext, onPrev, onNextYear, onPrevYear, onExport, onImportClick, syncCode, setSyncCode, syncWord, setSyncWord, syncStatus, syncError, apiBase, setApiBase, supabaseConfig, setSupabaseConfig, isLight, openSyncSettings, doneToday, notDoneToday, totalTasks, saveCount, t, language, isOnline, hasPendingSync }) => {
    const progress = totalPossible > 0 ? (completedHabits / totalPossible) * 100 : 0;
    const monthName = useMemo(() => getMonthName(currentDate.getFullYear(), currentDate.getMonth(), language), [currentDate, language]);
    const year = currentDate.getFullYear();
    
    return (
        <Card isLight={isLight} className="mb-6 flex flex-col gap-4 !rounded-xl" noPadding>
            <div className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-shrink-0">
                    <button onClick={onPrev} className={`p-2 ${THEME.buttonGhost(isLight)} rounded-full transition-colors`}>
                        <Icons.ChevronLeft />
                    </button>
                    <h1 className={`text-3xl font-bold ${THEME.text(isLight)} w-48 text-center select-none`}>{monthName} {year}</h1>
                    <button onClick={onNext} className={`p-2 ${THEME.buttonGhost(isLight)} rounded-full transition-colors`}>
                        <Icons.ChevronRight />
                    </button>
                    <div className="ml-2 flex items-center gap-2">
                        <span className={`text-xs ${THEME.textMuted(isLight)}`}>{t.year}</span>
                        <button onClick={onPrevYear} className={`p-1 ${THEME.buttonGhost(isLight)} rounded-full transition-colors`}>
                            <Icons.ChevronLeft />
                        </button>
                        <button onClick={onNextYear} className={`p-1 ${THEME.buttonGhost(isLight)} rounded-full transition-colors`}>
                            <Icons.ChevronRight />
                        </button>
                    </div>
                </div>
                
                <div className="flex gap-4 items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isOnline ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                            {isOnline ? t.online : t.offline} {(!isOnline && hasPendingSync) ? `(${t.pendingSync || 'In attesa'})` : ''}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={onExport} className={`px-3 py-1 rounded-full ${THEME.bgSoft(isLight)} ${THEME.text(isLight)} text-xs font-bold transition-colors`}>{t.export}</button>
                            <button onClick={onImportClick} className={`px-3 py-1 rounded-full ${THEME.bgSoft(isLight)} ${THEME.text(isLight)} text-xs font-bold transition-colors`}>{t.import}</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`flex items-center justify-between flex-wrap gap-4 pt-4 border-t ${THEME.border(isLight)}`}>
                <div className={`px-4 py-1.5 rounded-full ${THEME.badge(isLight, 'blue')} text-sm font-bold flex items-center gap-2 shadow-sm`}>
                    <Icons.Calendar />
                    {getTodayDisplay(language)}
                </div>

                <div className="flex items-center gap-6 md:gap-10">
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${THEME.textMuted(isLight)}`}>{t.done}</div>
                        <div className={`text-lg font-black ${THEME.text(isLight, 'green')}`}>{doneToday || 0}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${THEME.textMuted(isLight)}`}>{t.missing}</div>
                        <div className={`text-lg font-black ${THEME.textMuted(isLight)}`}>{notDoneToday || 0}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${THEME.textMuted(isLight)}`}>{t.total}</div>
                        <div className={`text-lg font-black ${THEME.text(isLight, 'blue')}`}>{totalTasks || 0}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${THEME.textMuted(isLight)}`}>{t.sync}</div>
                        <div className={`text-lg font-black ${THEME.text(isLight, 'purple')}`}>{saveCount || 0}</div>
                    </div>
                </div>

                <div className="flex-1 max-w-xs ml-auto">
                    <div className="flex justify-between mb-1 items-center">
                        <span className={`text-[10px] ${THEME.textMuted(isLight)} uppercase font-bold tracking-wider`}>{t.dailyCompletion}</span>
                        <span className={`text-xs font-black ${THEME.text(isLight)}`}>{totalTasks > 0 ? ((doneToday / totalTasks) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                    <ProgressBar value={doneToday} max={totalTasks} height="h-2.5" isLight={isLight} />
                </div>
            </div>
        </div>
    </Card>
);
});


const HabitGrid = React.memo(({ habits, onToggle, onRename, onUpdateGoal, onDelete, onAdd, currentDate, daysInMonth, dailyStats, onUpdateIcon, onUpdateColor, isLight, t, language }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
    
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");

    const [editingGoalId, setEditingGoalId] = useState(null);
    const [editGoalValue, setEditGoalValue] = useState("");

    const { leftWidth, rightWidth, startResizing, startResizingRight, scrollRef, cellWidth, scrollLeft } = useGridTable(daysInMonth, 256, 192, 24);
    const rowHeight = 40;

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
    const isDone = useCallback((habit, day) => {
        const dateKey = getDateKey(year, month, day);
        return !!habit.completedDates[dateKey];
    }, [year, month]);

    // Helper to get day name (Su, Mo, etc)
    const getDayName = useCallback((day) => {
        const date = new Date(year, month, day);
        const locale = getLocale(language);
        const name = date.toLocaleDateString(locale, { weekday: 'short' });
        return name.charAt(0).toUpperCase() + name.slice(1, 2);
    }, [year, month, language]);
    
    const [editingIconId, setEditingIconId] = useState(null);
    const iconOptions = ["Check", "Clock", "Book", "Calendar", "Leaf", "Pen", "Droplet", "Heart", "Coffee", "Apple", "Bicycle", "Music", "Code", "Home", "Star", "Brain", "Yoga", "Sun", "Moon", "Target"];
    const colorOptions = [
        { name: 'Blue', class: 'bg-blue-500' },
        { name: 'Emerald', class: 'bg-emerald-500' },
        { name: 'Rose', class: 'bg-rose-500' },
        { name: 'Amber', class: 'bg-amber-500' },
        { name: 'Purple', class: 'bg-purple-500' },
        { name: 'Indigo', class: 'bg-indigo-500' },
        { name: 'Cyan', class: 'bg-cyan-500' },
        { name: 'Orange', class: 'bg-orange-500' }
    ];
    return (
        <Card isLight={isLight} noPadding overflow={true} className="flex flex-col !rounded-xl">
            <div className="flex">
                {/* Left Column: Habit Names */}
                <div className={`flex-shrink-0 border-r ${THEME.border(isLight)} ${isLight ? 'bg-white' : 'bg-[#0f172a]'} z-10`} style={{ width: leftWidth }}>
                    <div className={`h-8 ${THEME.bg(isLight)} ${THEME.border(isLight)} border-b`}></div>
                    <div className={`h-12 ${THEME.bg(isLight)} ${THEME.border(isLight)} ${THEME.text(isLight)} border-b flex items-center justify-center font-bold`}>
                        {t.habits}
                    </div>
                    <div className={`h-6 ${THEME.bg(isLight)} ${THEME.border(isLight)} border-b`}></div>
                    {habits.map(habit => {
                        const IconComp = Icons[habit.icon] || Icons.Check;
                        const isEditing = editingId === habit.id;
                        const habitColorClass = habit.color || 'bg-blue-500';

                        return (
        <div key={habit.id} className={`border-b ${THEME.border(isLight)} ${THEME.hover(isLight)} flex items-center px-4 transition-colors group relative`} style={{ height: rowHeight }}>
            <div className="flex items-center gap-2 mr-2 flex-shrink-0">
                <span className={`${THEME.textMuted(isLight)} cursor-pointer`} onClick={() => setEditingIconId(habit.id)}><IconComp /></span>
            </div>
            
            {editingIconId === habit.id && (
                <div className={`absolute left-16 top-1 z-30 ${THEME.card(isLight)} border ${THEME.border(isLight)} rounded-xl p-2 flex flex-wrap gap-2 w-48 shadow-xl animate-in zoom-in-95 duration-200`}>
                    {iconOptions.map(k => {
                                            const Ico = Icons[k];
                                            return (
                                                <button key={k} onClick={() => { onUpdateIcon(habit.id, k); setEditingIconId(null); }} className={`p-1 rounded ${isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-700'} ${habit.icon===k? (isLight ? 'bg-blue-50 border border-blue-500' : 'bg-slate-700 border border-blue-500') : ''}`}>
                                                    <span className={isLight ? 'text-blue-600' : 'text-slate-200'}><Ico /></span>
                                                </button>
                                            );
                                        })}
                                        <button onClick={() => setEditingIconId(null)} className={`w-full text-center py-1 mt-1 text-xs ${isLight ? 'text-slate-400 hover:text-slate-600 bg-slate-50' : 'text-slate-400 hover:text-slate-200 bg-slate-700'} rounded`}>{t.cancel}</button>
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
                                        title={t.rename}
                                    >
                                        {habit.name}
                                    </span>
                                )}

                                {/* Delete Button - Visible on Hover */}
                                {!isEditing && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onDelete(habit.id); }}
                                        className={`ml-2 ${isLight ? 'text-slate-300 hover:text-red-500' : 'text-slate-500 hover:text-red-500'} opacity-0 group-hover:opacity-100 transition-opacity`}
                                        title={t.delete}
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
                        <span className="text-sm">{t.addHabit}</span>
                    </div>

                    {/* Progress Footer Labels */}
                    <div className={`border-t ${isLight ? 'border-slate-100' : 'border-[#1f2937]'}`}>
                        <div className={`h-8 flex items-center justify-end px-4 text-xs font-bold ${isLight ? 'text-slate-500 bg-slate-50 border-slate-100' : 'text-slate-300 bg-[#0b1220] border-[#1f2937]'} border-b transition-colors duration-300`}>{t.done} (%)</div>
                        <div className={`h-8 flex items-center justify-end px-4 text-xs font-bold ${isLight ? 'text-slate-500 bg-white border-slate-100' : 'text-slate-300 bg-[#0f172a] border-[#1f2937]'} border-b transition-colors duration-300`}>{t.done}</div>
                        <div className={`h-8 flex items-center justify-end px-4 text-xs font-bold ${isLight ? 'text-slate-500 bg-white border-slate-100' : 'text-slate-300 bg-[#0f172a]'} transition-colors duration-300`}>{t.notDone}</div>
                        <div className={`h-32 border-t ${isLight ? 'border-slate-100 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} transition-colors duration-300`}></div>
                    </div>
                </div>
                <div onMouseDown={startResizing} className={`w-2 cursor-col-resize ${isLight ? 'bg-slate-50 hover:bg-blue-400 border-slate-100' : 'bg-[#0b1220] hover:bg-blue-500 border-[#1f2937]'} transition-none border-x`}></div>

                {/* Middle: Days Grid */}
                <div className="flex-grow flex flex-col min-w-0">
                    <div ref={scrollRef} className="overflow-x-auto">
                        <div className="min-w-max">
                            <div className={`flex h-8 ${THEME.border(isLight)} ${isLight ? 'bg-slate-50' : 'bg-[#0b1220]'} border-b transition-colors duration-300`}>
                                {Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, i) => {
                                    const size = Math.min(7, daysInMonth - i * 7);
                                    const w = cellWidth * size;
                                    return (
                                        <div key={i} className={`flex-shrink-0 flex items-center justify-center border-r ${THEME.border(isLight)} ${THEME.textMuted(isLight)} text-[10px] font-bold transition-colors duration-300`} style={{ width: w }}>
                                            {`${t.week} ${i + 1}`}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex">
                                {/* Header Row for Days */}
                                {daysArray.map(day => (
                                    <div key={day} className={`flex-shrink-0 flex flex-col items-center justify-center h-12 ${THEME.border(isLight)} ${isLight ? 'bg-slate-50' : 'bg-[#0b1220]'} border-b border-r transition-colors duration-300`} style={{ width: cellWidth }}>
                                        <span className={`text-[10px] ${THEME.textMuted(isLight)}`}>{getDayName(day)}</span>
                                        <span className={`text-xs font-bold ${THEME.text(isLight)}`}>{day}</span>
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
                        <SmartAreaChart 
                            data={dailyStats} 
                            values={dailyStats.map(s => s.percentage)} 
                            color="#22c55e" 
                            maxY={100} 
                            isLight={isLight} 
                            showGrid={true}
                        />
                    </div>
                </div>

                {/* Right Column: Analysis */}
                <div onMouseDown={startResizingRight} className={`w-2 cursor-col-resize ${isLight ? 'bg-slate-50 hover:bg-blue-400 border-slate-100' : 'bg-[#0b1220] hover:bg-blue-500 border-[#1f2937]'} transition-none border-x`}></div>
                <div className={`flex-shrink-0 border-l ${isLight ? 'border-slate-100 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} transition-colors duration-300`} style={{ width: rightWidth }}>
                     <div className={`h-8 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0b1220] border-[#1f2937]'} border-b transition-colors duration-300`}></div>
                     <div className={`h-12 ${isLight ? 'bg-slate-50 border-slate-100 text-slate-700' : 'bg-[#0b1220] border-[#1f2937] text-slate-200'} border-b flex items-center justify-center font-bold transition-colors duration-300`}>
                        {t.analysis}
                    </div>
                    <div className={`flex h-6 ${isLight ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-[#0b1220] border-[#1f2937] text-slate-400'} border-b text-[10px] transition-colors duration-300`}>
                        <div className="w-10 flex items-center justify-center">{t.goal}</div>
                        <div className="w-10 flex items-center justify-center">{t.current}</div>
                        <div className="w-10 flex items-center justify-center">🔥</div>
                        <div className="flex-grow flex items-center justify-center">{t.progress}</div>
                    </div>
                     {habits.map(habit => {
                        let act = 0;
                        for (let d = 1; d <= daysInMonth; d++) {
                            const dk = getDateKey(year, month, d);
                            if (habit.completedDates[dk]) act++;
                        }
                        const scaledGoal = Math.round((habit.goal || 0) * daysInMonth / 31);
                        const den = Math.max(1, scaledGoal);
                        const percentage = Math.round((act / den) * 100);
                        const streaks = calculateStreak(habit.completedDates);
                        const actual = act;
                        const currentStreak = streaks.current;
                        const bestStreak = streaks.best;
                        
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
                                            title={t.clickToEditGoal}
                                        >
                                            {scaledGoal}
                                        </span>
                                    )}
                                </div>
                                <div className={`w-10 text-xs text-center font-bold ${isLight ? 'text-slate-600' : 'text-slate-200'} cursor-help transition-colors duration-300`} title={`${percentage}%`}>{actual}</div>
                                <div className={`w-10 flex flex-col items-center justify-center text-[10px] font-bold ${currentStreak > 0 ? 'text-orange-500' : (isLight ? 'text-slate-300' : 'text-slate-700')} transition-colors duration-300`} title={`${t.streak}: ${currentStreak} | ${t.best}: ${bestStreak}`}>
                                    <span>{currentStreak}</span>
                                    {currentStreak > 0 && <span className="text-[8px] -mt-1">🔥</span>}
                                </div>
                                <div className="flex-grow px-2 transition-colors duration-300" title={`${percentage}%`}>
                                    <ProgressBar value={actual} max={Math.max(1, scaledGoal)} colorClass={percentage >= 100 ? "bg-green-500" : "bg-blue-500"} height="h-2" isLight={isLight} />
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
        </Card>
    );
});

const MentalStateGrid = React.memo(({ mentalState, onUpdate, currentDate, daysInMonth, isLight, t }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysArray = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    const getLog = useCallback((day) => {
        const dateKey = getDateKey(year, month, day);
        return mentalState.logs[dateKey] || { mood: 0, motivation: 0 };
    }, [mentalState, year, month]);

    const handleUpdate = useCallback((day, field, value) => {
        const dateKey = getDateKey(year, month, day);
        onUpdate(dateKey, field, value);
    }, [onUpdate, year, month]);

    // Chart Data
    const { chartData, moodAvg, motAvg } = useMemo(() => {
        const data = daysArray.map(day => {
            const dateKey = getDateKey(year, month, day);
            const log = mentalState.logs[dateKey] || { mood: 0, motivation: 0 };
            return {
                name: day.toString(),
                mood: log.mood || 0,
                motivation: log.motivation || 0
            };
        });

        let moodSum = 0, moodN = 0, motSum = 0, motN = 0;
        daysArray.forEach(day => {
            const dateKey = getDateKey(year, month, day);
            const l = mentalState.logs[dateKey] || { mood: 0, motivation: 0 };
            if (l.mood > 0) { moodSum += l.mood; moodN++; }
            if (l.motivation > 0) { motSum += l.motivation; motN++; }
        });

        return {
            chartData: data,
            moodAvg: moodN ? (moodSum / moodN) : 0,
            motAvg: motN ? (motSum / motN) : 0
        };
    }, [daysArray, mentalState, year, month]);

    const bgFor = useCallback((v) => {
        if (!v) return { backgroundColor: 'transparent', color: '#94a3b8' };
        const val = Math.max(0, Math.min(10, v));
        const hue = Math.round((val / 10) * 120);
        return { 
            backgroundColor: isLight ? `hsl(${hue}, 70%, 90%)` : `hsl(${hue}, 70%, 15%)`,
            color: isLight ? `hsl(${hue}, 100%, 25%)` : `hsl(${hue}, 100%, 75%)`,
            fontWeight: 'bold'
        };
    }, [isLight]);

    const { leftWidth, rightWidth, startResizing, startResizingRight, scrollRef, cellWidth } = useGridTable(daysInMonth, 256, 192, 20);

    return (
        <Card isLight={isLight} noPadding overflow={true} className="mt-6 flex flex-col !rounded-xl">
             <div className="flex">
                {/* Left Header */}
                <div className={`flex-shrink-0 border-r ${isLight ? 'border-slate-200 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} z-10 transition-colors duration-300`} style={{ width: leftWidth }}>
                    <div className={`h-8 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#0b1220] border-[#1f2937] text-slate-200'} border-b flex items-center justify-center font-bold text-xs transition-colors duration-300`}>
                        {t.mentalState}
                    </div>
                    <div className={`h-8 flex items-center justify-end px-4 text-xs font-bold ${isLight ? 'text-slate-500 bg-white border-slate-200' : 'text-slate-300 bg-[#0f172a] border-[#1f2937]'} border-b transition-colors duration-300`}>{t.mood} (1-10)</div>
                    <div className={`h-8 flex items-center justify-end px-4 text-xs font-bold ${isLight ? 'text-slate-500 bg-white' : 'text-slate-300 bg-[#0f172a]'} transition-colors duration-300`}>{t.motivation} (1-10)</div>
                    <div className={`h-20 border-t ${isLight ? 'border-slate-200 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} flex items-center justify-center gap-4 transition-colors duration-300`}>
                        <div className={`px-3 py-1 rounded-full ${isLight ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-pink-900/30 text-pink-300'} text-[10px] font-bold transition-colors duration-300`}>
                            {t.moodAvg}: {moodAvg.toFixed(1)}
                        </div>
                        <div className={`px-3 py-1 rounded-full ${isLight ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-blue-900/30 text-blue-300'} text-[10px] font-bold transition-colors duration-300`}>
                            {t.motivationAvg}: {motAvg.toFixed(1)}
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
                                            {`${t.week} ${i + 1}`}
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
                        <SmartAreaChart 
                            data={chartData} 
                            maxY={11} 
                            isLight={isLight} 
                            showGrid={true}
                            xKey="name"
                            yDomain={[0, 10]}
                            datasets={[
                                { id: "mood", color: "#ec4899", label: t.mood },
                                { id: "motivation", color: "#3b82f6", label: t.motivation }
                            ]}
                        />
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
        </Card>
    );
});

const GoalsView = ({ schoolData, isLight, t, language, onAddGoal, onUpdateGoal, onToggleGoal, onDeleteGoal }) => {
    const [showAddGoal, setShowAddGoal] = useState(false);
    const [goalForm, setGoalForm] = useState({ title: '', deadline: '', description: '', targetValue: '', completed: false });

    const goals = schoolData.longTermGoals || [];
    
    return (
        <div className="max-w-5xl mx-auto pb-12 px-4">
            <div className="flex flex-col items-center gap-6 mb-8">
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl shadow-blue-900/30 transform transition-transform hover:rotate-3 duration-500">
                        <Icons.Trophy className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className={`text-3xl md:text-5xl font-black ${isLight ? 'text-slate-800' : 'text-white'} tracking-tight`}>{t.longTermGoals}</h2>
                        <p className={`${THEME.textDim(isLight)} font-medium text-sm md:text-base`}>{t.longTermGoalsDesc}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <Card isLight={isLight} className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-[2rem] shadow-xl">
                    <div className="text-center md:text-left">
                        <h2 className={`text-2xl md:text-3xl font-black ${THEME.text(isLight)} transition-colors duration-300`}>{t.longTermGoals}</h2>
                        <p className={`${THEME.textDim(isLight)} font-medium mt-1 text-sm md:text-base`}>{t.longTermGoalsDesc}</p>
                    </div>
                    <button 
                        onClick={() => {
                            setGoalForm({ title: '', deadline: '', description: '', targetValue: '', completed: false });
                            setShowAddGoal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20 flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <Icons.Plus className="w-5 h-5" />
                        {t.addGoal}
                    </button>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.length > 0 ? goals.map(goal => (
                        <Card key={goal.id} isLight={isLight} className={`relative p-6 group transition-all duration-300 ${goal.completed ? 'opacity-60' : ''}`}>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className={`font-bold text-lg ${THEME.text(isLight)} ${goal.completed ? 'line-through' : ''}`}>{goal.title}</h3>
                                        
                                        {goal.targetValue && (
                                            <div className={`text-2xl font-black ${THEME.text(isLight)} mt-1`}>
                                                {goal.targetValue}
                                            </div>
                                        )}

                                        {goal.deadline && (
                                            <div className={`flex items-center gap-1.5 text-xs font-bold ${THEME.textDim(isLight)} mt-1`}>
                                                <Icons.Calendar className="w-3.5 h-3.5" />
                                                {new Date(goal.deadline).toLocaleDateString(getLocale(language), { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => onToggleGoal(goal.id)}
                                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${goal.completed ? 'bg-green-500 border-green-500 text-white' : `${THEME.border(isLight)} text-transparent hover:border-blue-500`}`}
                                    >
                                        <Icons.Check className="w-6 h-6" />
                                    </button>
                                </div>
                                
                                {goal.description && <p className={`text-sm ${THEME.textDim(isLight)}`}>{goal.description}</p>}

                                <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                        onClick={() => {
                                            setGoalForm({ ...goal });
                                            setShowAddGoal(true);
                                        }}
                                        className={`p-2 rounded-xl ${THEME.hover(isLight, 'blue')} ${THEME.text(isLight, 'blue')}`}
                                    >
                                        <Icons.Pen className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => onDeleteGoal(goal.id)}
                                        className={`p-2 rounded-xl ${THEME.hover(isLight, 'red')} ${THEME.text(isLight, 'red')}`}
                                    >
                                        <Icons.Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    )) : (
                        <div className={`col-span-full py-20 flex flex-col items-center justify-center ${THEME.textDim(isLight)}`}>
                            <div className={`w-20 h-20 rounded-full ${THEME.bgSoft(isLight)} flex items-center justify-center mb-4`}>
                                <Icons.Trophy className="w-10 h-10 opacity-20" />
                            </div>
                            <p className="font-bold">{t.noGoals}</p>
                        </div>
                    )}
                </div>
            </div>

            {showAddGoal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card isLight={isLight} className="p-8 max-w-md w-full shadow-2xl !rounded-3xl">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className={`text-2xl font-black ${THEME.text(isLight)} transition-colors`}>
                                {goalForm.id ? t.editGoal : t.addGoal}
                            </h4>
                            <button onClick={() => { setShowAddGoal(false); setGoalForm({ title: '', deadline: '', description: '', targetValue: '', completed: false }); }} className="text-slate-500 hover:text-red-500 transition-colors">
                                <Icons.X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!goalForm.title) return;
                            if (goalForm.id) {
                                onUpdateGoal(goalForm.id, goalForm);
                            } else {
                                onAddGoal(goalForm);
                            }
                            setShowAddGoal(false);
                            setGoalForm({ title: '', deadline: '', description: '', targetValue: '', completed: false });
                        }} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.title}</label>
                                <input 
                                    type="text" 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={goalForm.title}
                                    onChange={e => setGoalForm({...goalForm, title: e.target.value})}
                                    placeholder={t.goalTitlePlaceholder}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.targetValue}</label>
                                <input 
                                    type="text" 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={goalForm.targetValue || ''}
                                    onChange={e => setGoalForm({...goalForm, targetValue: e.target.value})}
                                    placeholder={t.targetValuePlaceholder}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.deadline}</label>
                                <input 
                                    type="date" 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={goalForm.deadline}
                                    onChange={e => setGoalForm({...goalForm, deadline: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.description}</label>
                                <textarea 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all min-h-[100px]`}
                                    value={goalForm.description}
                                    onChange={e => setGoalForm({...goalForm, description: e.target.value})}
                                    placeholder={t.goalDescPlaceholder}
                                />
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button 
                                    type="button"
                                    onClick={() => { setShowAddGoal(false); setGoalForm({ title: '', deadline: '', description: '', targetValue: '', completed: false }); }} 
                                    className={`flex-1 px-6 py-4 rounded-2xl font-bold text-base ${THEME.buttonGhost(isLight)} transition-all active:scale-95`}
                                >
                                    {t.cancel}
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                                >
                                    {goalForm.id ? t.update : t.save}
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

const SchoolGradesView = ({ 
    schoolData, isLight, openSyncSettings, t, language,
    onAddSubject, onDeleteSubject, onUpdateSubjectTeacher, onUpdateSubjectSufficiency, onUpdateSubjectColor, onAddGrade, onUpdateGrade, onDeleteGrade,
    onAddTest, onUpdateTest, onDeleteTest, onUpdateSettings, onUpdateTargetAverage, onCompleteTest,
    onAddTask, onToggleTask, onDeleteTask, onUpdateTask, getLevelInfo,
    onAddSchedule, onUpdateSchedule, onDeleteSchedule
}) => {
    const [activeSchoolTab, setActiveSchoolTab] = useState('dashboard'); // 'dashboard', 'subjects', 'calendar', 'tests', 'tasks'
    const [semesterFilter, setSemesterFilter] = useState('all'); // 'all', '1', '2'
    const [newSubject, setNewSubject] = useState('');
    const [showAddTest, setShowAddTest] = useState(false);
    const [editingTestId, setEditingTestId] = useState(null);
    const [testForm, setTestForm] = useState({ subjectId: '', date: '', type: t.written, note: '' });
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [addingGradeTo, setAddingGradeTo] = useState(null); // ID della materia
    const [editingGradeId, setEditingGradeId] = useState(null); // ID del voto in modifica
    const [gradeForm, setGradeForm] = useState({ value: '', date: getTodayKey(), topic: '', weight: 1 });
    const [taskForm, setTaskForm] = useState({ title: '', dueDate: getTodayKey(), subjectId: '' });
    const [showAddTask, setShowAddTask] = useState(false);
    
    // New local state for Schedule
    const [showAddSchedule, setShowAddSchedule] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({ day: 'mon', subjectId: '', startTime: '08:00', endTime: '09:00', room: '' });

    const [showSettings, setShowSettings] = useState(false);
    const [testGrades, setTestGrades] = useState({});
    const [showCompletedTests, setShowCompletedTests] = useState(false);
    const [editingSubjectColorId, setEditingSubjectColorId] = useState(null);

    const colorOptions = [
        { name: 'Blue', class: 'bg-blue-500' },
        { name: 'Emerald', class: 'bg-emerald-500' },
        { name: 'Rose', class: 'bg-rose-500' },
        { name: 'Amber', class: 'bg-amber-500' },
        { name: 'Purple', class: 'bg-purple-500' },
        { name: 'Indigo', class: 'bg-indigo-500' },
        { name: 'Cyan', class: 'bg-cyan-500' },
        { name: 'Orange', class: 'bg-orange-500' }
    ];

    const isDateInSemester = useCallback((date) => {
        const { semester1Start, semester1End, semester2Start, semester2End } = schoolData;
        
        // Se il filtro è su 'all', mostriamo tutto
        if (semesterFilter === 'all') return true;
        
        if (!date) return true;
        const d = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        
        if (semesterFilter === '1') {
            if (!semester1Start && !semester1End) return true;
            return (!semester1Start || d >= semester1Start) && (!semester1End || d <= semester1End);
        }
        
        if (semesterFilter === '2') {
            if (!semester2Start && !semester2End) return true;
            return (!semester2Start || d >= semester2Start) && (!semester2End || d <= semester2End);
        }

        return true;
    }, [schoolData, semesterFilter]);

    const handleAddSubject = (e) => {
        e.preventDefault();
        onAddSubject(newSubject);
        setNewSubject('');
    };

    const handleAddTest = (e) => {
        e.preventDefault();
        if (editingTestId) {
            onUpdateTest(editingTestId, testForm);
            setEditingTestId(null);
        } else {
            onAddTest(testForm);
        }
        setTestForm({ subjectId: '', date: '', type: t.written, note: '' });
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

    const calculateAverage = (grades) => {
        if (!grades || grades.length === 0) return 0;
        const totalWeight = grades.reduce((acc, g) => {
            const w = parseFloat(g.weight);
            return acc + (isNaN(w) ? 1 : w);
        }, 0);
        if (totalWeight === 0) return 0;
        const weightedSum = grades.reduce((acc, g) => {
            const w = parseFloat(g.weight);
            return acc + (g.value * (isNaN(w) ? 1 : w));
        }, 0);
        return (weightedSum / totalWeight).toFixed(2);
    };

    const getGradeStyle = (value, max = 10, min = 0, isLight = false) => {
        const val = parseFloat(value);
        const m = parseFloat(max) || 10;
        const n = parseFloat(min) || 0;
        
        const fallback = {
            text: isLight ? 'text-slate-400 bg-slate-100 border-slate-200' : 'text-slate-500 bg-slate-800 border-slate-700',
            bar: isLight ? 'from-slate-400 to-slate-200' : 'from-slate-600 to-slate-400'
        };

        if (isNaN(val) || val === 0) return fallback;
        if (val >= m) return {
            text: isLight ? 'text-emerald-600 bg-emerald-100 border-emerald-200' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-emerald-900/10',
            bar: 'from-emerald-600 to-emerald-400'
        };
        
        const range = m - n;
        if (range <= 0) return fallback;
        
        const rel = (val - n) / range;
        
        if (rel <= 0) return { text: isLight ? 'text-red-600 bg-red-100 border-red-200' : 'text-red-500 bg-red-500/10 border-red-500/20 shadow-red-900/10', bar: 'from-red-600 to-red-400' };
        if (rel < 0.25) return { text: isLight ? 'text-red-500 bg-red-50 border-red-100' : 'text-red-400 bg-red-400/10 border-red-400/20 shadow-red-900/10', bar: 'from-red-500 to-red-300' };
        if (rel < 0.45) return { text: isLight ? 'text-orange-700 bg-orange-100 border-orange-200' : 'text-orange-600 bg-orange-600/10 border-orange-600/20 shadow-orange-900/10', bar: 'from-orange-700 to-orange-500' };
        if (rel < 0.60) return { text: isLight ? 'text-orange-500 bg-orange-50 border-orange-100' : 'text-orange-400 bg-orange-400/10 border-orange-400/20 shadow-orange-900/10', bar: 'from-orange-500 to-orange-300' };
        if (rel < 0.70) return { text: isLight ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-amber-900/10', bar: 'from-amber-500 to-amber-300' };
        if (rel < 0.80) return { text: isLight ? 'text-yellow-600 bg-yellow-50 border-yellow-100' : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20 shadow-yellow-900/10', bar: 'from-yellow-500 to-yellow-300' };
        if (rel < 0.88) return { text: isLight ? 'text-lime-600 bg-lime-50 border-lime-100' : 'text-lime-400 bg-lime-400/10 border-lime-400/20 shadow-lime-900/10', bar: 'from-lime-500 to-lime-300' };
        if (rel < 0.95) return { text: isLight ? 'text-green-600 bg-green-50 border-green-100' : 'text-green-500 bg-green-500/10 border-green-500/20 shadow-green-900/10', bar: 'from-green-600 to-green-400' };
        return { text: isLight ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-900/10', bar: 'from-emerald-600 to-emerald-400' };
    };

    const totalAveragePercent = useMemo(() => {
        const subjects = schoolData.subjects || [];
        const max = schoolData.maxGrade || 10;
        const base = schoolData.minGrade ?? 0;
        const range = max - base || 1;

        const percents = subjects
            .map(s => {
                const filteredGrades = (s.grades || []).filter(g => isDateInSemester(g.date));
                const avg = parseFloat(calculateAverage(filteredGrades));
                return avg > 0 ? ((avg - base) / range) : null;
            })
            .filter(p => p !== null);
        if (percents.length === 0) return 0;
        return (percents.reduce((a, b) => a + b, 0) / percents.length);
    }, [schoolData.subjects, schoolData.maxGrade, schoolData.minGrade, isDateInSemester]);

    const stats = useMemo(() => {
        const max = schoolData.maxGrade || 10;
        const base = schoolData.minGrade ?? 0;
        const range = max - base || 1;

        const subjectsWithRelativeAvg = (schoolData.subjects || [])
            .map(s => {
                const filteredGrades = (s.grades || []).filter(g => isDateInSemester(g.date));
                const avg = parseFloat(calculateAverage(filteredGrades));
                return { ...s, avg, relative: (avg - base) / range };
            })
            .filter(s => s.avg > 0);
        
        const best = subjectsWithRelativeAvg.length > 0 
            ? [...subjectsWithRelativeAvg].sort((a, b) => b.relative - a.relative)[0] 
            : null;
        
        const worst = subjectsWithRelativeAvg.length > 0 
            ? [...subjectsWithRelativeAvg].sort((a, b) => a.relative - b.relative)[0] 
            : null;

        return { best, worst };
    }, [schoolData.subjects, schoolData.maxGrade, schoolData.minGrade, isDateInSemester]);

    const totalAverageDisplay = (totalAveragePercent * (schoolData.maxGrade - (schoolData.minGrade ?? 0)) + (schoolData.minGrade ?? 0)).toFixed(2);

    const upcomingTests = useMemo(() => {
        const now = getTodayKey();
        const tests = schoolData.tests || [];
        return tests
            .filter(t => t.date >= now && isDateInSemester(t.date))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [schoolData.tests, isDateInSemester]);

    const renderDashboard = () => {
        const max = schoolData.maxGrade ?? 10;
        const base = schoolData.minGrade ?? 0;
        const sufficiency = schoolData.sufficiency ?? 6;
        const subjects = schoolData.subjects || [];
        const levelInfo = getLevelInfo(schoolData);
        
        // Prepara dati per il grafico (ultimi 10 voti in ordine cronologico con media progressiva)
        const allGradesSorted = subjects.flatMap(s => 
            (s.grades || [])
                .filter(g => isDateInSemester(g.date))
                .map(g => ({ ...g, subjectName: s.name }))
        ).sort((a, b) => a.date.localeCompare(b.date));

        let runningSum = 0;
        let runningCount = 0;
        const dataWithRunningAvg = allGradesSorted.map(g => {
            runningSum += g.value;
            runningCount++;
            return {
                ...g,
                runningAvg: parseFloat((runningSum / runningCount).toFixed(2))
            };
        });

        const chartData = dataWithRunningAvg.slice(-10).map(g => ({
            date: new Date(g.date).toLocaleDateString(getLocale(language), { day: '2-digit', month: '2-digit' }),
            value: g.value,
            average: g.runningAvg,
            subject: g.subjectName
        }));

        // Move Recharts initialization inside to avoid re-calculating on every render
        const Recharts = window.Recharts;
        const LChart = Recharts?.LineChart;
        const LLine = Recharts?.Line;
        const XA = Recharts?.XAxis;
        const YA = Recharts?.YAxis;
        const CGrid = Recharts?.CartesianGrid;
        const RTooltip = Recharts?.Tooltip;
        const RContainer = Recharts?.ResponsiveContainer;

        return (
            <div className="space-y-6">
                {/* Livello e XP */}
                <Card isLight={isLight} className={`p-6 md:p-8 !rounded-[2.5rem] text-white border-none shadow-xl transition-all duration-500 ${levelInfo.isNegative ? 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-900/20' : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-900/20'}`}>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative shrink-0">
                            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full backdrop-blur-md flex items-center justify-center border-4 shadow-2xl relative overflow-visible group transition-colors duration-500 ${levelInfo.isNegative ? 'bg-red-500/20 border-red-500/40' : 'bg-white/10 border-white/20'}`}>
                                 <span className="text-5xl md:text-7xl drop-shadow-lg transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                                     {levelInfo.emoji}
                                 </span>
                                 {/* Effetto alone luminoso dietro l'immagine */}
                                 <div className={`absolute inset-0 rounded-full blur-2xl opacity-30 -z-10 transition-colors duration-500 ${levelInfo.isNegative ? 'bg-red-600' : 'bg-yellow-400'}`}></div>
                             </div>
                        </div>
                        <div className="flex-1 w-full text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-4">
                                <div>
                                    <h3 className="text-xl md:text-3xl font-black mb-1">{levelInfo.rank}</h3>
                                    <p className="text-blue-100 text-[10px] md:text-sm font-bold opacity-80">
                                        {t.totalScore}: {levelInfo.totalXP} XP
                                    </p>
                                </div>
                                {levelInfo.xpToNext > 0 && (
                                    <div className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60">
                                        -{levelInfo.xpToNext} XP {t.toNextTitle}
                                    </div>
                                )}
                            </div>
                            <div className="h-3 md:h-4 w-full bg-black/20 rounded-full overflow-hidden p-0.5 md:p-1 border border-white/10">
                                <div 
                                    className={`h-full rounded-full shadow-inner transition-all duration-1000 ease-out ${levelInfo.isNegative ? 'bg-white' : 'bg-gradient-to-r from-yellow-300 to-yellow-500'}`}
                                    style={{ width: `${levelInfo.progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    <Card isLight={isLight} group className="relative">
                        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-blue-600/5 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                        <div className="relative">
                            <div className={`text-[10px] md:text-xs font-bold ${THEME.textMuted(isLight)} uppercase tracking-widest mb-1 transition-colors duration-300`}>{t.avg}</div>
                            <div className={`text-2xl md:text-4xl font-black ${THEME.text(isLight, parseFloat(totalAverageDisplay) >= sufficiency ? 'green' : (parseFloat(totalAverageDisplay) >= sufficiency - 1 ? 'orange' : 'red'))} transition-colors duration-300`}>
                                {totalAverageDisplay}
                            </div>
                            <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${THEME.textDim(isLight)} transition-colors duration-300`}>
                                <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${parseFloat(totalAverageDisplay) >= sufficiency ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {subjects.length} {t.subjects}
                            </div>
                        </div>
                    </Card>

                    <Card isLight={isLight} group className="relative">
                        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-purple-600/5 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                        <div className="relative">
                            <div className={`text-[10px] md:text-xs font-bold ${THEME.textMuted(isLight)} uppercase tracking-widest mb-1 transition-colors duration-300`}>{t.nextTest}</div>
                            <div className={`text-2xl md:text-4xl font-black ${THEME.text(isLight, 'purple')}`}>
                                {upcomingTests.length > 0 ? (
                                    <div className="flex items-baseline gap-2">
                                        <span>{new Date(upcomingTests[0].date).getDate()}</span>
                                        <span className="text-xs md:text-sm font-bold uppercase">{new Date(upcomingTests[0].date).toLocaleString(getLocale(language), { month: 'short' })}</span>
                                    </div>
                                ) : '0'}
                            </div>
                            <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${THEME.textDim(isLight)} transition-colors duration-300 truncate`}>
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-purple-500 shrink-0"></span>
                                <span className="truncate">{upcomingTests.length > 0 ? (schoolData.subjects.find(s => s.id === upcomingTests[0].subjectId)?.name || t.test) : t.noTests}</span>
                            </div>
                        </div>
                    </Card>

                    <Card isLight={isLight} group className="relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 ${isLight ? 'bg-blue-600/5' : 'bg-blue-400/5'} rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700`}></div>
                        <div className="relative">
                            <div className={`text-[10px] md:text-xs font-bold ${THEME.textMuted(isLight)} uppercase tracking-widest mb-1 transition-colors duration-300`}>{t.bestSubject}</div>
                            <div className={`text-lg md:text-2xl font-black ${THEME.text(isLight, 'blue')} truncate`}>
                                {stats.best ? stats.best.name : '-'}
                            </div>
                            <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${THEME.textDim(isLight)} transition-colors duration-300`}>
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500"></span>
                                {stats.best ? `${stats.best.avg}` : '0.00'}
                            </div>
                        </div>
                    </Card>

                    <Card isLight={isLight} group className="relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 ${isLight ? 'bg-red-600/5' : 'bg-red-400/5'} rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700`}></div>
                        <div className="relative">
                            <div className={`text-[10px] md:text-xs font-bold ${THEME.textMuted(isLight)} uppercase tracking-widest mb-1 transition-colors duration-300`}>{t.worstSubject}</div>
                            <div className={`text-lg md:text-2xl font-black ${THEME.text(isLight, 'red')} truncate`}>
                                {stats.worst ? stats.worst.name : '-'}
                            </div>
                            <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${THEME.textDim(isLight)} transition-colors duration-300`}>
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500"></span>
                                {stats.worst ? `${stats.worst.avg}` : '0.00'}
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Trend Chart */}
                    <Card isLight={isLight} className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-lg font-bold ${THEME.text(isLight)}`}>{t.gradeTrend}</h3>
                        </div>
                        <div className="h-[250px] md:h-[300px] w-full">
                            {LChart && chartData.length > 1 ? (
                                <RContainer width="100%" height="100%">
                                    <LChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                                        <CGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} vertical={false} />
                                        <XA 
                                            dataKey="date" 
                                            stroke="#64748b" 
                                            fontSize={window.innerWidth < 768 ? 8 : 10} 
                                            tickLine={false} 
                                            axisLine={false}
                                            tick={{ dy: 10 }}
                                            interval={window.innerWidth < 768 ? 'preserveStartEnd' : 0}
                                        />
                                        <YA 
                                            domain={[Math.floor(base), Math.ceil(max)]} 
                                            stroke="#64748b" 
                                            fontSize={window.innerWidth < 768 ? 8 : 10} 
                                            tickLine={false} 
                                            axisLine={false}
                                            tick={{ dx: -5 }}
                                        />
                                        <RTooltip 
                                            contentStyle={{ 
                                                backgroundColor: isLight ? '#fff' : '#0f172a', 
                                                border: 'none', 
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                fontSize: window.innerWidth < 768 ? '10px' : '12px',
                                                padding: window.innerWidth < 768 ? '8px' : '12px'
                                            }}
                                            labelStyle={{ color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}
                                            formatter={(value, name, props) => {
                                                if (name === t.grade) {
                                                    return [`${value} (${props.payload.subject})`, name];
                                                }
                                                return [value, name];
                                            }}
                                        />
                                        <LLine 
                                            type="monotone" 
                                            dataKey="value" 
                                            name={t.grade}
                                            stroke="#3b82f6" 
                                            strokeWidth={window.innerWidth < 768 ? 1.5 : 2} 
                                            dot={{ r: window.innerWidth < 768 ? 3 : 4, fill: '#3b82f6', strokeWidth: 2, stroke: isLight ? '#fff' : '#0f172a' }}
                                            activeDot={{ r: window.innerWidth < 768 ? 4 : 6, strokeWidth: 0 }}
                                        />
                                        <LLine 
                                            type="monotone" 
                                            dataKey="average" 
                                            name={t.average}
                                            stroke="#10b981" 
                                            strokeWidth={window.innerWidth < 768 ? 2 : 3} 
                                            dot={{ r: window.innerWidth < 768 ? 3 : 4, fill: '#10b981', strokeWidth: 2, stroke: isLight ? '#fff' : '#0f172a' }}
                                            activeDot={{ r: window.innerWidth < 768 ? 4 : 6, strokeWidth: 0 }}
                                        />
                                    </LChart>
                                </RContainer>
                            ) : (
                                <div className={`h-full flex items-center justify-center ${THEME.textDim(isLight)} font-medium`}>
                                    {!LChart ? t.loadingCharts : t.noGrades}
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card isLight={isLight}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-lg font-bold ${THEME.text(isLight)} transition-colors duration-300`}>{t.upcomingTests}</h3>
                            <button onClick={() => setActiveSchoolTab('tests')} className={`${isLight ? 'text-blue-600' : 'text-blue-400'} text-sm hover:underline`}>{t.viewAll}</button>
                        </div>
                        <div className="space-y-4">
                            {upcomingTests.slice(0, 4).map(test => {
                                const subject = schoolData.subjects.find(s => s.id === test.subjectId);
                                const locale = getLocale(language);
                                return (
                                    <div key={test.id} className={`flex items-center gap-4 p-3 ${THEME.bgSoft(isLight)} rounded-2xl transition-colors duration-300`}>
                                        <div className={`flex flex-col items-center justify-center w-10 h-10 shrink-0 ${isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-600/20 text-blue-400'} rounded-xl`}>
                                            <span className="text-[10px] font-bold uppercase">{new Date(test.date).toLocaleString(locale, { month: 'short' })}</span>
                                            <span className="text-lg font-black leading-none">{new Date(test.date).getDate()}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${subject?.color || 'bg-blue-500'} shrink-0`} />
                                                <div className={`font-bold text-sm ${THEME.text(isLight)} truncate`}>{subject?.name || t.subjectDeleted}</div>
                                            </div>
                                            <div className={`text-[10px] ${THEME.textMuted(isLight)} truncate`}>{test.type}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {upcomingTests.length === 0 && (
                                <div className={`text-center py-8 ${THEME.textDim(isLight)} italic text-sm`}>{t.noTestsPlanned}</div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Latest Averages Section */}
                <Card isLight={isLight}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-lg font-bold ${THEME.text(isLight)}`}>{t.latestAverages}</h3>
                        <button onClick={() => setActiveSchoolTab('subjects')} className={`${isLight ? 'text-blue-600' : 'text-blue-400'} text-sm hover:underline font-bold`}>{t.allSubjects}</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {schoolData.subjects.slice(0, 8).map(subject => {
                            const filteredGrades = (subject.grades || []).filter(g => isDateInSemester(g.date));
                            const avg = calculateAverage(filteredGrades);
                            return (
                                <div key={subject.id} className={`p-4 rounded-2xl ${THEME.bgSoft(isLight)} border ${THEME.border(isLight)} transition-all hover:scale-[1.02]`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 truncate mr-2">
                                            <div className={`w-2 h-2 rounded-full ${subject.color || 'bg-blue-500'} shrink-0`} />
                                            <span className={`font-bold text-sm ${THEME.text(isLight)} truncate`}>{subject.name}</span>
                                        </div>
                                        <span className={`font-black text-sm ${getGradeStyle(avg, max, base, isLight).text.split(' ')[0]}`}>{avg > 0 ? avg : '-'}</span>
                                    </div>
                                    <div className={`h-1.5 w-full ${isLight ? 'bg-slate-200' : 'bg-[#1e293b]'} rounded-full overflow-hidden`}>
                                        <div 
                                            className={`h-full transition-all duration-500 bg-gradient-to-r ${getGradeStyle(avg, max, base, isLight).bar}`}
                                            style={{ width: `${((parseFloat(avg) - base) / (max - base || 1)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        );
    };

    const calculateNeededGrade = (subject, target) => {
        const filteredGrades = (subject.grades || []).filter(g => isDateInSemester(g.date));
        const targetVal = parseFloat(target);
        if (!targetVal || isNaN(targetVal)) return null;

        const totalWeight = filteredGrades.reduce((acc, g) => {
            const w = parseFloat(g.weight);
            return acc + (isNaN(w) ? 1 : w);
        }, 0);
        const weightedSum = filteredGrades.reduce((acc, g) => {
            const w = parseFloat(g.weight);
            return acc + (g.value * (isNaN(w) ? 1 : w));
        }, 0);
        
        // Assumiamo che il prossimo voto abbia peso 1 (standard)
        const nextWeight = 1;
        const needed = (targetVal * (totalWeight + nextWeight)) - weightedSum;
        
        return needed;
    };

    const renderSubjects = () => {
        const max = schoolData.maxGrade ?? 10;
        const base = schoolData.minGrade ?? 0;
        const sufficiency = schoolData.sufficiency ?? 6;
        const targetAverages = schoolData.targetAverages || {};
        
        // Use Recharts components from window if available
        const Recharts = window.Recharts;
        const LChart = Recharts?.LineChart;
        const LLine = Recharts?.Line;
        const RContainer = Recharts?.ResponsiveContainer;
        
        return (
        <div className="space-y-8">
            <Card isLight={isLight} className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[2rem] shadow-xl">
                <div>
                    <h2 className={`text-3xl font-black ${THEME.text(isLight)} transition-colors duration-300`}>{t.schoolGrades}</h2>
                    <p className={`${THEME.textDim(isLight)} font-medium mt-1`}>{t.schoolGradesDesc}</p>
                </div>
                <button 
                    onClick={() => setActiveSchoolTab('dashboard')}
                    className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 px-6 py-3 rounded-2xl font-bold transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    {t.viewTrend}
                </button>
            </Card>

            <form onSubmit={handleAddSubject} className="flex gap-4">
                <input 
                    type="text" 
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder={t.addSubjectPlaceholder}
                    className={`flex-1 ${THEME.input(isLight)} border rounded-2xl px-6 py-4 focus:outline-none transition-all shadow-inner`}
                />
                <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    {t.addSubject}
                </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {(schoolData.subjects || []).map(subject => {
                    const filteredGrades = (subject.grades || []).filter(g => isDateInSemester(g.date)).sort((a, b) => a.date.localeCompare(b.date));
                    const avg = calculateAverage(filteredGrades);
                    const sparklineData = filteredGrades.slice(-5).map(g => ({ value: g.value }));
                    const subjectSufficiency = subject.sufficiency ?? sufficiency;

                    return (
                        <Card key={subject.id} isLight={isLight} group overflow={false} className="hover:shadow-xl relative duration-300 group">
                            {/* Linea laterale abbellita */}
                            <div className={`absolute top-4 left-0 w-1.5 h-[calc(100%-2rem)] rounded-r-full ${subject.color || 'bg-blue-600'} opacity-0 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_0_20px_rgba(0,0,0,0.2)]`}></div>
                            <div className="flex items-center justify-between mb-4 md:mb-6">
                                <div className="flex-1 min-w-0 mr-4 flex items-center gap-3">
                                    <div className="relative">
                                        <div 
                                            className={`w-4 h-4 rounded-full ${subject.color || 'bg-blue-500'} cursor-pointer hover:scale-125 transition-transform shadow-sm`}
                                            onClick={() => setEditingSubjectColorId(subject.id)}
                                        />
                                        {editingSubjectColorId === subject.id && (
                                            <div className={`absolute left-0 top-6 z-30 ${THEME.card(isLight)} border ${THEME.border(isLight)} rounded-xl p-2 flex flex-wrap gap-2 w-40 shadow-xl animate-in zoom-in-95 duration-200`}>
                                                {colorOptions.map(c => (
                                                    <button 
                                                        key={c.class} 
                                                        onClick={() => { onUpdateSubjectColor(subject.id, c.class); setEditingSubjectColorId(null); }} 
                                                        className={`w-6 h-6 rounded-full ${c.class} hover:scale-110 transition-transform ${subject.color === c.class ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                                                        title={c.name}
                                                    />
                                                ))}
                                                <button onClick={() => setEditingSubjectColorId(null)} className={`w-full text-center py-1 mt-1 text-[10px] font-bold uppercase ${isLight ? 'text-slate-400 hover:text-slate-600 bg-slate-50' : 'text-slate-400 hover:text-slate-200 bg-slate-700'} rounded-lg`}>{t.cancel}</button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className={`text-lg md:text-2xl font-black ${THEME.text(isLight)} group-hover:text-blue-400 transition-colors duration-300 truncate`}>{subject.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`text-[10px] md:text-xs font-bold ${THEME.textMuted(isLight)} uppercase tracking-widest`}>{filteredGrades.length} {t.gradesCount}</div>
                                            <span className={THEME.textMuted(isLight)}>•</span>
                                            <div className="flex items-center gap-1">
                                                <Icons.User className={`w-3 h-3 ${THEME.textMuted(isLight)}`} />
                                                <input 
                                                    type="text"
                                                    value={subject.teacher || ''}
                                                    onChange={(e) => onUpdateSubjectTeacher(subject.id, e.target.value)}
                                                    placeholder={t.teacherPlaceholder}
                                                    className={`text-[10px] md:text-xs font-bold bg-transparent border-none focus:ring-0 p-0 ${THEME.textDim(isLight)} placeholder:${isLight ? 'text-slate-300' : 'text-slate-600'} w-20 md:w-24 truncate transition-all`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            <div className="flex flex-col items-center gap-2 md:gap-4">
                                    <div className="flex items-center gap-2 md:gap-4">
                                        {sparklineData.length > 1 && LChart && (
                                            <div className="hidden sm:block w-16 h-8 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <RContainer width="100%" height="100%">
                                                    <LChart data={sparklineData}>
                                                        <LLine 
                                                            type="monotone" 
                                                            dataKey="value" 
                                                            stroke={parseFloat(avg) >= subjectSufficiency ? "#22c55e" : "#ef4444"} 
                                                            strokeWidth={2} 
                                                            dot={false} 
                                                            animationDuration={1000}
                                                        />
                                                    </LChart>
                                                </RContainer>
                                            </div>
                                        )}
                                        <div className={`text-base md:text-xl font-black px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl ${THEME.gradeColor(isLight, avg, max, base)}`}>
                                            {avg > 0 ? avg : '-'}
                                        </div>
                                        <button 
                                            onClick={() => onDeleteSubject(subject.id)}
                                            className={`text-slate-600 hover:text-red-400 p-2 transition-colors ${THEME.bgSoft(isLight)} rounded-xl`}
                                        >
                                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setAddingGradeTo(subject.id);
                                            setEditingGradeId(null);
                                            setGradeForm({ value: '', date: getTodayKey(), topic: '', weight: 1 });
                                        }}
                                        className="md:hidden w-full py-2 bg-blue-600/10 text-blue-500 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1"
                                    >
                                        <Icons.Plus className="w-3 h-3" />
                                        {t.addGradeTitle}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6 min-h-[40px] md:min-h-[48px] px-6 md:px-8">
                                {filteredGrades.map((grade) => (
                                    <div key={grade.id} className="relative group/grade">
                                        <button 
                                            onClick={() => {
                                                setAddingGradeTo(subject.id);
                                                setEditingGradeId(grade.id);
                                                setGradeForm({ value: grade.value, date: grade.date, topic: grade.topic || '', weight: grade.weight ?? 1 });
                                            }}
                                            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex flex-col items-center justify-center font-black text-xs md:text-sm border-2 transition-all hover:scale-110 shadow-lg ${THEME.gradeColor(isLight, grade.value, max, base)} relative`}
                                        >
                                            <span>{grade.value}</span>
                                            {grade.weight === 0 && (
                                                <div className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 shadow-sm border border-white dark:border-slate-900" title="Peso 0">
                                                    <Icons.Info className="w-2.5 h-2.5" />
                                                </div>
                                            )}
                                        </button>
                                        
                                        {/* Tooltip per data e argomento - Nascondi su mobile per evitare overlay fastidiosi */}
                                        <div className={`hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[150px] ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-800 border-slate-700 text-white'} text-[10px] p-2 rounded-xl opacity-0 group-hover/grade:opacity-100 transition-opacity pointer-events-none z-30 shadow-2xl border`}>
                                            <div className="font-bold text-blue-400 mb-1 border-b pb-1 border-blue-400/10 whitespace-nowrap text-center">{new Date(grade.date).toLocaleDateString(getLocale(language))}</div>
                                            {grade.topic && <div className={`${isLight ? 'text-slate-500' : 'text-slate-300'} italic leading-tight break-words text-center px-0.5`}>"{grade.topic}"</div>}
                                            {!grade.topic && <div className={`${THEME.textDim(isLight)} italic text-[9px] text-center`}>{t.noTopic}</div>}
                                            <div className={`absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent ${isLight ? 'border-t-white' : 'border-t-slate-800'}`}></div>
                                        </div>

                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteGrade(subject.id, grade.id);
                                            }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover/grade:opacity-100 transition-opacity shadow-xl z-10"
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
                                            setGradeForm({ value: '', date: getTodayKey(), topic: '', weight: 1 });
                                        }}
                                        className={`hidden md:flex w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl border-2 border-dashed ${THEME.border(isLight)} flex items-center justify-center ${THEME.textDim(isLight)} hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer group/add`}
                                    >
                                        <svg className="w-5 h-5 md:w-6 md:h-6 group-hover/add:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                )}
                            </div>

                            <div className={`h-1.5 md:h-2 w-full ${isLight ? 'bg-slate-100' : 'bg-[#1e293b]'} rounded-full overflow-hidden shadow-inner transition-colors duration-300`}>
                                <div 
                                    className={`h-full transition-all duration-1000 ease-out bg-gradient-to-r ${THEME.gradeBar(avg, max, base)}`}
                                    style={{ width: `${Math.min(100, Math.max(0, ((parseFloat(avg) - base) / (max - base || 1)) * 100))}%` }}
                                />
                            </div>

                            {/* Predittore Obiettivo Media */}
                            <div className={`mt-4 p-3 md:p-4 rounded-2xl ${isLight ? 'bg-slate-50' : 'bg-[#0f172a]'} transition-all duration-300`}>
                                <div className="flex flex-row items-center justify-between gap-2 md:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${THEME.textDim(isLight)} mb-0.5 md:mb-1`}>{t.targetAvg}</div>
                                        <input 
                                            type="number" step="0.1" min={base} max={max}
                                            value={targetAverages[subject.id] || ''}
                                            onChange={(e) => onUpdateTargetAverage(subject.id, e.target.value)}
                                            placeholder={avg > 0 ? avg : '8.0'}
                                            className={`w-full bg-transparent border-none p-0 text-xs md:text-sm font-bold focus:ring-0 ${isLight ? 'text-slate-700 placeholder:text-slate-300' : 'text-slate-200 placeholder:text-slate-600'}`}
                                        />
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${THEME.textDim(isLight)} mb-0.5 md:mb-1`}>{t.neededGrade}</div>
                                        <div className={`text-xs md:text-sm font-black transition-colors duration-300 ${(() => {
                                            const needed = calculateNeededGrade(subject, targetAverages[subject.id]);
                                            if (needed === null) return 'text-slate-400';
                                            if (needed > max) return 'text-red-500';
                                            if (needed < subjectSufficiency) return 'text-green-500';
                                            return 'text-blue-500';
                                        })()}`}>
                                            {(() => {
                                                const needed = calculateNeededGrade(subject, targetAverages[subject.id]);
                                                if (needed === null) return '-';
                                                if (needed > max) return t.notPossible;
                                                if (needed <= 0) return '≤ 0';
                                                return needed.toFixed(2);
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
    };

    const renderTests = () => {
        const max = schoolData.maxGrade || 10;
        const base = schoolData.minGrade ?? 0;
        
        const filteredTests = schoolData.tests
            .filter(t => isDateInSemester(t.date))
            .filter(t => showCompletedTests || !t.completed)
            .sort((a,b) => a.date.localeCompare(b.date));
        
        return (
        <div className="space-y-6">
            <Card isLight={isLight} className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-[2rem] shadow-xl">
                <div className="text-center md:text-left">
                    <h2 className={`text-2xl md:text-3xl font-black ${THEME.text(isLight)} transition-colors duration-300`}>{t.testRegistry}</h2>
                    <p className={`${THEME.textDim(isLight)} font-medium mt-1 text-sm md:text-base`}>{t.testRegistryDesc}</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <button 
                        onClick={() => setShowCompletedTests(!showCompletedTests)}
                        className={`px-6 py-4 rounded-2xl font-bold transition-all flex items-center gap-2 justify-center border-2 ${showCompletedTests ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20' : `${THEME.card(isLight)} ${THEME.textDim(isLight)} hover:border-blue-400`}`}
                    >
                        <Icons.History className="w-5 h-5" />
                        {showCompletedTests ? t.hideCompleted : t.showCompleted}
                    </button>
                    <button 
                        onClick={() => setShowAddTest(true)}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-purple-900/20 flex items-center gap-2 justify-center"
                    >
                        <Icons.Plus className="w-5 h-5" />
                        {t.newTest}
                    </button>
                </div>
            </Card>

            <div className="space-y-3 md:space-y-4">
        {filteredTests.map(test => {
            const subject = schoolData.subjects.find(s => s.id === test.subjectId);
            const isPastOrToday = test.date <= getTodayKey();
            const locale = getLocale(language);
            return (
                <Card key={test.id} isLight={isLight} className={`flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 ${test.completed ? (isLight ? 'bg-slate-100/50 opacity-75' : 'bg-slate-900/30 opacity-60') : (test.date < getTodayKey() ? (isLight ? 'border-red-200 bg-red-50/30' : 'border-red-900/30') : '')} hover:scale-[1.01]`}>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`flex flex-col items-center justify-center w-12 h-12 md:w-16 md:h-16 shrink-0 ${test.completed ? `${THEME.bgSoft(isLight)} ${THEME.textMuted(isLight)}` : (test.date < getTodayKey() ? (isLight ? 'bg-red-100 text-red-600' : 'bg-red-900/20 text-red-400') : `${subject?.color || 'bg-purple-600'} text-white`)} rounded-xl md:rounded-2xl transition-colors duration-300`}>
                            <span className="text-[9px] md:text-xs font-black uppercase">{new Date(test.date).toLocaleString(locale, { month: 'short' })}</span>
                            <span className="text-lg md:text-2xl font-black leading-none">{new Date(test.date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <h4 className={`text-base md:text-xl font-black ${THEME.text(isLight)} transition-colors duration-300 truncate ${test.completed ? 'line-through opacity-50' : ''}`}>{subject?.name || t.subjectDeleted}</h4>
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-wider ${test.completed ? `${THEME.bgSoft(isLight)} ${THEME.textMuted(isLight)}` : (test.type === t.written ? THEME.badge(isLight, 'blue') : THEME.badge(isLight, 'orange'))} transition-colors duration-300`}>
                                    {test.type}
                                </span>
                                {test.completed && (
                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-wider ${THEME.badge(isLight, 'green')}`}>
                                        {t.completed}
                                    </span>
                                )}
                            </div>
                            <p className={`text-[10px] md:text-sm ${THEME.textDim(isLight)} font-medium transition-colors duration-300 truncate`}>{test.note || t.noNotes}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full md:w-auto gap-2 border-t md:border-none pt-3 md:pt-0 ml-auto">
                        <div className="flex gap-1.5 md:gap-2">
                            <button onClick={() => startEditingTest(test)} className={`p-2.5 md:p-3 ${isLight ? 'bg-slate-100 text-slate-500 hover:text-blue-500 hover:bg-blue-50' : 'bg-slate-800/50 text-slate-500 hover:text-blue-400 hover:bg-blue-900/20'} rounded-xl md:rounded-2xl transition-all duration-300`}>
                                <Icons.Pen className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button onClick={() => onDeleteTest(test.id)} className={`p-2.5 md:p-3 ${isLight ? 'bg-slate-100 text-slate-500 hover:text-red-500 hover:bg-red-50' : 'bg-slate-800/50 text-slate-500 hover:text-red-400 hover:bg-red-900/20'} rounded-xl md:rounded-2xl transition-all duration-300`}>
                                <Icons.Trash className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>

                        {isPastOrToday && !test.completed && (
                            <div className={`flex items-center gap-1.5 md:gap-2 ${THEME.input(isLight)} p-1 rounded-xl md:rounded-2xl border transition-colors duration-300`}>
                                <input 
                                    type="number" step="0.5" min={base} max={max} placeholder={t.grade}
                                    className={`w-10 md:w-16 bg-transparent text-center font-black text-xs md:text-base ${THEME.text(isLight, 'blue')} focus:outline-none`}
                                    value={testGrades[test.id] || ''}
                                    onChange={e => setTestGrades(prev => ({ ...prev, [test.id]: e.target.value }))}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            onCompleteTest(test, testGrades[test.id]);
                                        }
                                    }}
                                />
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onCompleteTest(test, testGrades[test.id]);
                                    }} 
                                    className="bg-green-600 p-1.5 md:p-2 rounded-lg md:rounded-xl text-white hover:bg-green-500 transition-all duration-300"
                                >
                                    <Icons.Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </Card>
            );
        })}
                {schoolData.tests.length === 0 && (
                    <Card isLight={isLight} className="text-center py-20 border-dashed">
                        <p className={`font-bold ${THEME.textDim(isLight)}`}>{t.noTestsPlannedRegistry}</p>
                    </Card>
                )}
            </div>
        </div>
    );
    };

    const renderTasks = () => {
        const tasks = schoolData.tasks || [];
        const subjects = schoolData.subjects || [];
        
        return (
            <div className="space-y-6">
                <Card isLight={isLight} className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-[2rem] shadow-xl">
                    <div className="text-center md:text-left">
                        <h2 className={`text-2xl md:text-3xl font-black ${THEME.text(isLight)} transition-colors duration-300`}>{t.tasks}</h2>
                        <p className={`${THEME.textDim(isLight)} font-medium mt-1 text-sm md:text-base`}>{t.tasksDesc}</p>
                    </div>
                    <button 
                        onClick={() => {
                            setTaskForm({ title: '', dueDate: getTodayKey(), subjectId: subjects[0]?.id || '' });
                            setShowAddTask(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20 flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <Icons.Plus className="w-5 h-5" />
                        {t.addTask}
                    </button>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {tasks.filter(t => isDateInSemester(t.dueDate)).length > 0 ? (
                        tasks.filter(t => isDateInSemester(t.dueDate)).sort((a, b) => a.completed === b.completed ? a.dueDate.localeCompare(b.dueDate) : a.completed ? 1 : -1).map(task => {
                            const subject = subjects.find(s => s.id === task.subjectId);
                            const isOverdue = !task.completed && task.dueDate < getTodayKey();
                            
                            return (
                                <Card key={task.id} isLight={isLight} className={`relative overflow-hidden group ${task.completed ? 'opacity-60' : ''} p-4 md:p-6`}>
                                    <div className={`absolute top-0 left-0 w-1 h-full ${task.completed ? 'bg-green-500' : isOverdue ? 'bg-red-500' : (subject?.color || 'bg-blue-500')}`}></div>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-bold text-sm md:text-base ${THEME.text(isLight)} ${task.completed ? 'line-through' : ''} truncate`}>
                                                    {task.title}
                                                </h3>
                                                {subject && (
                                                    <div className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${subject.color ? subject.color.replace('bg-', 'text-') : THEME.text(isLight, 'blue')} mt-1`}>
                                                        {subject.name}
                                                    </div>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => onToggleTask(task.id)}
                                                className={`w-10 h-10 md:w-6 md:h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${task.completed ? 'bg-green-500 border-green-500 text-white' : `${THEME.border(isLight)} text-transparent hover:border-blue-500`}`}
                                            >
                                                <Icons.Check className="w-5 h-5 md:w-4 md:h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between mt-1 md:mt-2">
                                            <div className={`flex items-center gap-1.5 text-[10px] md:text-xs font-bold ${isOverdue ? 'text-red-500' : THEME.textDim(isLight)}`}>
                                                <Icons.Calendar className="w-3.5 h-3.5" />
                                                {new Date(task.dueDate).toLocaleDateString(getLocale(language), { day: 'numeric', month: 'short' })}
                                            </div>
                                            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={() => {
                                                        setTaskForm({ id: task.id, title: task.title, dueDate: task.dueDate, subjectId: task.subjectId });
                                                        setShowAddTask(true);
                                                    }}
                                                    className={`p-3 md:p-2 rounded-xl ${THEME.hover(isLight, 'blue')} ${THEME.text(isLight, 'blue')}`}
                                                >
                                                    <Icons.Pen className="w-5 h-5 md:w-4 md:h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => onDeleteTask(task.id)}
                                                    className={`p-3 md:p-2 rounded-xl ${THEME.hover(isLight, 'red')} ${THEME.text(isLight, 'red')}`}
                                                >
                                                    <Icons.Trash className="w-5 h-5 md:w-4 md:h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    ) : (
                        <div className={`col-span-full py-20 flex flex-col items-center justify-center ${THEME.textDim(isLight)}`}>
                            <div className={`w-20 h-20 rounded-full ${THEME.bgSoft(isLight)} flex items-center justify-center mb-4`}>
                                <Icons.Check className="w-10 h-10 opacity-20" />
                            </div>
                            <p className="font-bold">{t.noTasks}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderCalendar = () => {
        const max = schoolData.maxGrade || 10;
        const sufficiency = schoolData.sufficiency || 6;
        const base = schoolData.minGrade ?? 0;
        
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center justify-between md:justify-start gap-4">
                        <h3 className={`text-xl md:text-2xl font-black ${THEME.text(isLight)} capitalize transition-colors duration-300`}>
                            {calendarDate.toLocaleString(getLocale(language), { month: 'long', year: 'numeric' })}
                        </h3>
                        <Card isLight={isLight} noPadding overflow={true} className="flex !rounded-xl">
                            <button onClick={prevMonth} className={`p-2 ${THEME.hover(isLight)} ${THEME.buttonGhost(isLight)} transition-colors duration-300`}>
                                <Icons.ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={nextMonth} className={`p-2 ${THEME.hover(isLight)} ${THEME.buttonGhost(isLight)} transition-colors duration-300 border-l ${THEME.border(isLight)}`}>
                                <Icons.ChevronRight className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setCalendarDate(new Date())}
                                className={`px-3 py-1 text-[10px] font-black uppercase tracking-tighter ${THEME.hover(isLight)} ${THEME.textMuted(isLight)} transition-colors duration-300 border-l ${THEME.border(isLight)}`}
                            >
                                {t.today}
                            </button>
                        </Card>
                    </div>
                    <div className="flex flex-wrap gap-3 md:gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest overflow-x-auto no-scrollbar py-1">
                        <div className={`flex items-center gap-2 ${THEME.textDim(isLight)} transition-colors duration-300 whitespace-nowrap`}><span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-purple-500 rounded-full shadow-sm shadow-purple-900/20"></span> {t.test}</div>
                        <div className={`flex items-center gap-2 ${THEME.textDim(isLight)} transition-colors duration-300 whitespace-nowrap`}><span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-blue-600 rounded-full shadow-sm shadow-blue-900/20"></span> {t.tasks}</div>
                        <div className={`flex items-center gap-2 ${THEME.textDim(isLight)} transition-colors duration-300 whitespace-nowrap`}><span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full shadow-sm shadow-green-900/20"></span> {t.grade}</div>
                    </div>
                </div>

                <Card isLight={isLight} noPadding overflow className="shadow-2xl overflow-x-auto no-scrollbar">
                    <div className="min-w-[600px] md:min-w-full">
                        <div className={`grid grid-cols-7 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-[#1f2937] bg-[#1e293b]/50'} transition-colors duration-300`}>
                            {[t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun].map(d => (
                                <div key={d} className={`py-4 text-center text-[10px] font-black ${THEME.textMuted(isLight)} uppercase tracking-widest transition-colors duration-300`}>{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {days.map((date, i) => {
                                if (!date) return <div key={`empty-${i}`} className={`h-24 md:h-32 border-b border-r ${isLight ? 'border-slate-100 bg-slate-50/30' : 'border-[#1f2937] bg-[#0b1220]/30'} transition-colors duration-300`}></div>;
                                
                                const dateKey = formatDate(date);
                                const dayTests = schoolData.tests.filter(t => t.date === dateKey && isDateInSemester(t.date));
                                const dayTasks = (schoolData.tasks || []).filter(t => t.dueDate === dateKey && isDateInSemester(t.dueDate));
                                const dayGrades = schoolData.subjects.flatMap(s => (s.grades || []).filter(g => g.date === dateKey && isDateInSemester(g.date)).map(g => ({...g, subjectName: s.name, subjectId: s.id})));
                                
                                const isToday = dateKey === getTodayKey();

                                return (
                                    <div key={dateKey} className={`h-24 md:h-32 border-b border-r ${THEME.border(isLight)} p-1.5 md:p-2 relative transition-all duration-300 hover:bg-blue-500/5 ${isToday ? (isLight ? 'bg-blue-50' : 'bg-blue-600/5') : ''}`}>
                                        <span className={`text-xs md:text-sm font-black ${isToday ? 'bg-blue-600 text-white w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full shadow-lg shadow-blue-900/40' : THEME.text(isLight)} transition-all duration-300`}>
                                            {date.getDate()}
                                        </span>
                                        <div className="mt-1 space-y-0.5 md:space-y-1 overflow-y-auto max-h-[calc(100%-1.5rem)] no-scrollbar">
                                            {dayTests.map(t => {
                                                const subject = schoolData.subjects.find(s => s.id === t.subjectId);
                                                return (
                                                    <button 
                                                        key={t.id} 
                                                        onClick={() => startEditingTest(t)}
                                                        className={`w-full text-left text-[8px] md:text-[9px] font-bold ${subject?.color || 'bg-purple-600'} text-white p-0.5 md:p-1 rounded md:rounded-md truncate shadow-sm transition-all duration-300 hover:scale-105 active:scale-95`}
                                                    >
                                                        {t.type.charAt(0)}: {subject?.name}
                                                    </button>
                                                );
                                            })}
                                            {dayTasks.map(task => {
                                                const subject = schoolData.subjects.find(s => s.id === task.subjectId);
                                                return (
                                                    <button 
                                                        key={task.id} 
                                                        onClick={() => {
                                                            setTaskForm({ ...task });
                                                            setShowAddTask(true);
                                                        }}
                                                        className={`w-full text-left text-[8px] md:text-[9px] font-bold ${task.completed ? (isLight ? 'bg-slate-200 text-slate-500' : 'bg-slate-800 text-slate-500') : (subject?.color || 'bg-blue-600')} text-white p-0.5 md:p-1 rounded md:rounded-md truncate shadow-sm transition-all duration-300 hover:scale-105 active:scale-95`}
                                                    >
                                                        {task.title}
                                                    </button>
                                                );
                                            })}
                                            {dayGrades.map(g => {
                                                const subject = schoolData.subjects.find(s => s.id === g.subjectId);
                                                return (
                                                    <button 
                                                        key={g.id} 
                                                        onClick={() => {
                                                            setAddingGradeTo(g.subjectId);
                                                            setEditingGradeId(g.id);
                                                            setGradeForm({ value: g.value, date: g.date, topic: g.topic || '', weight: g.weight ?? 1 });
                                                        }}
                                                        className={`w-full text-left text-[8px] md:text-[9px] font-bold ${THEME.gradeColor(isLight, g.value, max, base)} p-0.5 md:p-1 rounded md:rounded-md truncate shadow-sm transition-all duration-300 hover:scale-105 active:scale-95`}
                                                    >
                                                        {g.value}: {g.subjectName}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            </div>
        );
    };

    const renderSchedule = () => {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const schedule = schoolData.schedule || { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
        
        // Calcola l'intervallo di tempo dinamico
        const lessons = Object.values(schedule).flat();
        let minHour = 8;
        let maxHour = 16;
        
        const allTimes = new Set();
        
        if (lessons.length > 0) {
            let absoluteMin = 24;
            let absoluteMax = 0;
            
            lessons.forEach(item => {
                allTimes.add(item.startTime);
                allTimes.add(item.endTime);
                
                const [sH, sM] = item.startTime.split(':').map(Number);
                const [eH, eM] = item.endTime.split(':').map(Number);
                const sVal = sH + (sM / 60);
                const eVal = eH + (eM / 60);
                
                if (sVal < absoluteMin) absoluteMin = sVal;
                if (eVal > absoluteMax) absoluteMax = eVal;
            });
            
            minHour = Math.floor(absoluteMin);
            maxHour = Math.ceil(absoluteMax);
        }
        
        // Ordina tutti gli orari unici inseriti dall'utente
        const sortedTimes = Array.from(allTimes).sort((a, b) => {
            const [h1, m1] = a.split(':').map(Number);
            const [h2, m2] = b.split(':').map(Number);
            return (h1 * 60 + m1) - (h2 * 60 + m2);
        });

        const rowHeight = 60; // pixel per ora
        const totalHeight = (maxHour - minHour) * rowHeight;

        const timeToTop = (timeStr) => {
            const [h, m] = timeStr.split(':').map(Number);
            return ((h - minHour) * 60 + m);
        };

        const durationInMinutes = (start, end) => {
            const [h1, m1] = start.split(':').map(Number);
            const [h2, m2] = end.split(':').map(Number);
            return (h2 * 60 + m2) - (h1 * 60 + m1);
        };

        return (
            <div className="space-y-6">
                <Card isLight={isLight} className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-[2rem] shadow-xl">
                    <div className="text-center md:text-left">
                        <h2 className={`text-2xl md:text-3xl font-black ${THEME.text(isLight)} transition-colors duration-300`}>{t.schedule}</h2>
                        <p className={`${THEME.textDim(isLight)} font-medium mt-1 text-sm md:text-base`}>{t.scheduleDesc}</p>
                    </div>
                    <button 
                        onClick={() => {
                            setScheduleForm({ day: 'mon', subjectId: schoolData.subjects[0]?.id || '', startTime: '08:00', endTime: '09:00', room: '' });
                            setShowAddSchedule(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20 flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <Icons.Plus className="w-5 h-5" />
                        {t.addSchedule}
                    </button>
                </Card>

                {/* Timetable View */}
                <div className={`overflow-x-auto rounded-3xl border ${THEME.border(isLight)} ${THEME.card(isLight)} shadow-xl no-scrollbar`}>
                    <div className="min-w-[800px] relative">
                        {/* Header Giorni */}
                        <div className={`grid grid-cols-[80px_repeat(7,1fr)] border-b ${THEME.border(isLight)} sticky top-0 z-20 ${isLight ? 'bg-white/80' : 'bg-[#0f172a]/80'} backdrop-blur-md`}>
                            <div className="h-12 border-r border-transparent"></div>
                            {days.map(day => (
                                <div key={day} className={`h-12 flex items-center justify-center font-black text-[10px] uppercase tracking-widest ${THEME.text(isLight)} border-r ${THEME.border(isLight)} last:border-0`}>
                                    {t[day]}
                                </div>
                            ))}
                        </div>

                        {/* Corpo Tabella */}
                        <div className="relative flex">
                            {/* Colonna Orari */}
                            <div className="w-[80px] flex-shrink-0 border-r border-dashed border-slate-300 dark:border-slate-700 relative" style={{ height: `${totalHeight}px` }}>
                                {sortedTimes.map((time) => (
                                    <div key={time} style={{ position: 'absolute', top: `${timeToTop(time)}px`, width: '100%' }} className="flex items-center">
                                        <span className={`w-full text-center text-[10px] font-black ${THEME.textMuted(isLight)} transform -translate-y-1/2`}>
                                            {time}
                                        </span>
                                        <div className={`absolute top-0 right-0 w-2 h-px ${THEME.border(isLight)}`}></div>
                                    </div>
                                ))}
                            </div>

                            {/* Griglia Lezioni */}
                            <div className="flex-1 grid grid-cols-7 relative">
                                {/* Linee Orizzontali basate sugli orari effettivi */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {sortedTimes.map((time) => (
                                        <div key={time} style={{ position: 'absolute', top: `${timeToTop(time)}px`, left: 0, right: 0 }} className={`border-b border-dashed ${THEME.border(isLight)} opacity-30`}></div>
                                    ))}
                                </div>

                                {days.map((day, dayIdx) => {
                                    const dayLessons = (schedule[day] || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
                                    
                                    // Funzione per trovare sovrapposizioni e calcolare posizioni
                                    const positionedLessons = [];
                                    const columns = []; // Array di array, ogni sotto-array è una colonna di lezioni che non si sovrappongono
                                    let currentGroup = [];
                                    let maxGroupEnd = 0;

                                    dayLessons.forEach(lesson => {
                                        const start = timeToTop(lesson.startTime);
                                        const end = start + durationInMinutes(lesson.startTime, lesson.endTime);

                                        // Se la lezione inizia dopo la fine del gruppo corrente, chiudiamo il gruppo
                                        if (start >= maxGroupEnd && currentGroup.length > 0) {
                                            // Assegna totalCols a tutte le lezioni nel gruppo
                                            const groupCols = columns.length;
                                            currentGroup.forEach(l => l.totalCols = groupCols);
                                            // Reset per il nuovo gruppo
                                            columns.length = 0;
                                            currentGroup = [];
                                        }

                                        let placed = false;
                                        for (let i = 0; i < columns.length; i++) {
                                            const lastLessonInCol = columns[i][columns[i].length - 1];
                                            const lastEnd = timeToTop(lastLessonInCol.startTime) + durationInMinutes(lastLessonInCol.startTime, lastLessonInCol.endTime);
                                            
                                            if (start >= lastEnd) {
                                                columns[i].push(lesson);
                                                const pLesson = { ...lesson, col: i };
                                                positionedLessons.push(pLesson);
                                                currentGroup.push(pLesson);
                                                placed = true;
                                                break;
                                            }
                                        }

                                        if (!placed) {
                                            columns.push([lesson]);
                                            const pLesson = { ...lesson, col: columns.length - 1 };
                                            positionedLessons.push(pLesson);
                                            currentGroup.push(pLesson);
                                        }

                                        if (end > maxGroupEnd) maxGroupEnd = end;
                                    });

                                    // Chiudi l'ultimo gruppo
                                    if (currentGroup.length > 0) {
                                        const groupCols = columns.length;
                                        currentGroup.forEach(l => l.totalCols = groupCols);
                                    }

                                    return (
                                        <div key={day} className={`relative border-r ${THEME.border(isLight)} last:border-0`} style={{ height: `${totalHeight}px` }}>
                                            {positionedLessons.map(item => {
                                                const subject = schoolData.subjects.find(s => s.id === item.subjectId);
                                                const top = timeToTop(item.startTime);
                                                const duration = durationInMinutes(item.startTime, item.endTime);
                                                const width = 100 / (item.totalCols || 1);
                                                const left = item.col * width;
                                                
                                                return (
                                                    <div 
                                                        key={item.id}
                                                        className="absolute rounded-xl shadow-md border overflow-hidden transition-all hover:z-10 group"
                                                        style={{ 
                                                            top: `${top}px`, 
                                                            height: `${duration}px`,
                                                            left: `${left}%`,
                                                            width: `${width}%`,
                                                            paddingLeft: '2px',
                                                            paddingRight: '2px',
                                                            backgroundColor: isLight ? `${subject?.color || '#3b82f6'}15` : `${subject?.color || '#3b82f6'}25`,
                                                            borderColor: subject?.color || '#3b82f6'
                                                        }}
                                                    >
                                                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: subject?.color || '#3b82f6' }}></div>
                                                    <div className="p-2 h-full flex flex-col justify-between overflow-hidden">
                                                        <div>
                                                            <div className={`text-[9px] font-black ${THEME.text(isLight)} opacity-70 leading-none mb-1`}>
                                                                {item.startTime} - {item.endTime}
                                                            </div>
                                                            <div className={`text-[11px] font-black ${THEME.text(isLight)} leading-tight truncate`}>
                                                                {subject?.name || 'Unknown'}
                                                            </div>
                                                            {item.room && (
                                                                <div className={`text-[9px] font-bold ${THEME.textDim(isLight)} mt-0.5 flex items-center gap-0.5 truncate`}>
                                                                    <Icons.MapPin className="w-2.5 h-2.5" /> {item.room}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Pulsanti Azione */}
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1">
                                                            <button 
                                                                onClick={() => {
                                                                    setScheduleForm({ ...item, day });
                                                                    setShowAddSchedule(true);
                                                                }}
                                                                className={`p-1 rounded-md bg-white/80 dark:bg-slate-800/80 shadow-sm ${THEME.text(isLight, 'blue')}`}
                                                            >
                                                                <Icons.Pen className="w-2.5 h-2.5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => onDeleteSchedule(day, item.id)}
                                                                className={`p-1 rounded-md bg-white/80 dark:bg-slate-800/80 shadow-sm ${THEME.text(isLight, 'red')}`}
                                                            >
                                                                <Icons.Trash className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!schedule[day] || schedule[day].length === 0) && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                                <span className="text-[10px] font-black uppercase tracking-widest rotate-90 whitespace-nowrap">{t.noLessons}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

    return (
        <div className="max-w-5xl mx-auto pb-12 px-4">
            <div className="flex flex-col items-center gap-6 mb-8">
                {/* Header Compact */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-xl shadow-blue-900/30 transform transition-transform hover:rotate-3 duration-500">
                        <Icons.School className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className={`text-3xl md:text-5xl font-black ${isLight ? 'text-slate-800' : 'text-white'} tracking-tight`}>{t.schoolHub}</h2>
                        <p className={`${THEME.textDim(isLight)} font-medium text-sm md:text-base`}>{t.schoolDesc}</p>
                    </div>
                </div>

                {/* Filter and Settings Toggle */}
                <div className="flex flex-col items-center gap-4 w-full justify-center">
                    <div className={`${THEME.card(isLight)} border rounded-2xl p-1.5 flex items-center gap-1 shadow-inner w-full md:w-fit overflow-x-auto no-scrollbar`}>
                        <button 
                            onClick={() => setSemesterFilter('1')}
                            className={`flex-1 md:flex-none px-3 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 whitespace-nowrap ${semesterFilter === '1' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : `${THEME.textMuted(isLight)} hover:bg-blue-500/10`}`}
                        >
                            {t.semester1}
                        </button>
                        <button 
                            onClick={() => setSemesterFilter('2')}
                            className={`flex-1 md:flex-none px-3 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 whitespace-nowrap ${semesterFilter === '2' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : `${THEME.textMuted(isLight)} hover:bg-blue-500/10`}`}
                        >
                            {t.semester2}
                        </button>
                        <button 
                            onClick={() => setSemesterFilter('all')}
                            className={`flex-1 md:flex-none px-3 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 whitespace-nowrap ${semesterFilter === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : `${THEME.textMuted(isLight)} hover:bg-blue-500/10`}`}
                        >
                            {t.all}
                        </button>

                        <div className={`w-px h-4 mx-1 ${THEME.border(isLight)}`} />

                        <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2.5 rounded-xl transition-all duration-300 ${showSettings ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : `${THEME.textMuted(isLight)} hover:bg-blue-500/10 hover:text-blue-500`}`}
                        >
                            <Icons.Settings className={`w-4 h-4 ${showSettings ? 'animate-spin-slow' : ''}`} />
                        </button>
                        
                        <button 
                            onClick={() => setActiveSchoolTab('dashboard')}
                            className={`md:hidden p-2.5 rounded-xl transition-all duration-300 ${THEME.buttonGhost(isLight)}`}
                        >
                            <Icons.Home className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Collapsible Settings */}
                {showSettings && (
                    <div className={`w-full max-w-3xl animate-in fade-in slide-in-from-top-4 duration-300 p-6 rounded-3xl border ${THEME.card(isLight)} shadow-2xl`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Grades Settings */}
                            <div className="space-y-4">
                                <h3 className={`text-xs font-black uppercase tracking-widest ${THEME.textMuted(isLight)} mb-2`}>{t.grade} {t.settings}</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 h-4">
                                            <span className={`text-[10px] font-bold ${THEME.textDim(isLight)}`}>{t.min}</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={schoolData.minGrade ?? 2}
                                            onChange={(e) => onUpdateSettings('minGrade', parseFloat(e.target.value))}
                                            className={`w-full h-10 rounded-xl ${isLight ? 'bg-slate-50 text-red-600 border-slate-200' : 'bg-[#0f172a] text-red-400 border-slate-800'} border text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all`}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 h-4">
                                            <span className={`text-[10px] font-bold ${THEME.textDim(isLight)}`}>{t.sufficiency}</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={schoolData.sufficiency ?? 6}
                                            onChange={(e) => onUpdateSettings('sufficiency', parseFloat(e.target.value))}
                                            className={`w-full h-10 rounded-xl ${isLight ? 'bg-slate-50 text-yellow-600 border-slate-200' : 'bg-[#0f172a] text-yellow-400 border-slate-800'} border text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all`}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 h-4">
                                            <span className={`text-[10px] font-bold ${THEME.textDim(isLight)}`}>{t.max}</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={schoolData.maxGrade ?? 10}
                                            onChange={(e) => onUpdateSettings('maxGrade', parseFloat(e.target.value))}
                                            className={`w-full h-10 rounded-xl ${isLight ? 'bg-slate-50 text-green-600 border-slate-200' : 'bg-[#0f172a] text-green-400 border-slate-800'} border text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all`}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Semester Dates */}
                            <div className="space-y-4">
                                <h3 className={`text-xs font-black uppercase tracking-widest ${THEME.textMuted(isLight)} mb-2`}>{t.semesterDates}</h3>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <span className={`text-[10px] font-bold ${THEME.textDim(isLight)}`}>{t.semester1}</span>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="date" 
                                                value={schoolData.semester1Start || ''}
                                                onChange={(e) => onUpdateSettings('semester1Start', e.target.value)}
                                                className={`flex-1 h-10 rounded-xl border ${THEME.input(isLight)} text-[10px] font-bold px-3 focus:outline-none transition-all`}
                                            />
                                            <span className="text-slate-400">-</span>
                                            <input 
                                                type="date" 
                                                value={schoolData.semester1End || ''}
                                                onChange={(e) => onUpdateSettings('semester1End', e.target.value)}
                                                className={`flex-1 h-10 rounded-xl border ${THEME.input(isLight)} text-[10px] font-bold px-3 focus:outline-none transition-all`}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className={`text-[10px] font-bold ${THEME.textDim(isLight)}`}>{t.semester2}</span>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="date" 
                                                value={schoolData.semester2Start || ''}
                                                onChange={(e) => onUpdateSettings('semester2Start', e.target.value)}
                                                className={`flex-1 h-10 rounded-xl border ${THEME.input(isLight)} text-[10px] font-bold px-3 focus:outline-none transition-all`}
                                            />
                                            <span className="text-slate-400">-</span>
                                            <input 
                                                type="date" 
                                                value={schoolData.semester2End || ''}
                                                onChange={(e) => onUpdateSettings('semester2End', e.target.value)}
                                                className={`flex-1 h-10 rounded-xl border ${THEME.input(isLight)} text-[10px] font-bold px-3 focus:outline-none transition-all`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={`flex p-1.5 ${THEME.card(isLight)} border rounded-[2rem] md:rounded-3xl mb-8 w-full md:w-fit mx-auto overflow-x-auto no-scrollbar shadow-inner transition-all duration-300`}>
                {[
                    { id: 'dashboard', label: t.home, icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                    { id: 'subjects', label: t.subjects, icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                    { id: 'tests', label: t.tests, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
                    { id: 'tasks', label: t.tasks, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                    { id: 'schedule', label: t.schedule, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { id: 'calendar', label: t.calendar, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveSchoolTab(tab.id)}
                        className={`flex flex-1 items-center justify-center gap-2 px-3 md:px-6 py-3.5 rounded-[1.5rem] md:rounded-2xl text-[11px] md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeSchoolTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : THEME.buttonGhost(isLight) + ' hover:text-slate-800 hover:bg-slate-100'}`}
                    >
                        <svg className="w-5 h-5 md:w-5 md:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={tab.icon} /></svg>
                        <span className="hidden md:inline">{tab.label}</span>
                        <span className="md:inline lg:hidden">{activeSchoolTab === tab.id ? tab.label : ''}</span>
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeSchoolTab === 'dashboard' && renderDashboard()}
                {activeSchoolTab === 'subjects' && renderSubjects()}
                {activeSchoolTab === 'tests' && renderTests()}
                {activeSchoolTab === 'tasks' && renderTasks()}
                {activeSchoolTab === 'schedule' && renderSchedule()}
                {activeSchoolTab === 'calendar' && renderCalendar()}
            </div>

            {addingGradeTo && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card isLight={isLight} className="p-8 max-w-md w-full shadow-2xl !rounded-3xl">
                        <div className="flex justify-between items-center mb-6">
                                <h4 className={`text-2xl font-black ${THEME.text(isLight)} transition-colors`}>
                                    {editingGradeId ? t.editGrade : t.addGradeTitle}
                                </h4>
                                <button 
                                    onClick={() => {
                                        setAddingGradeTo(null);
                                        setEditingGradeId(null);
                                    }} 
                                    className="text-slate-500 hover:text-red-500 transition-colors"
                                >
                                    <Icons.X className="w-6 h-6" />
                                </button>
                            </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.grade}</label>
                                    <input 
                                        type="number" step="0.5" min={schoolData.minGrade ?? 0} max={schoolData.maxGrade || 10}
                                        className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                        value={gradeForm.value}
                                        onChange={e => setGradeForm({...gradeForm, value: e.target.value})}
                                        placeholder={`${t.max}: ${schoolData.maxGrade ?? 10}`}
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.weight}</label>
                                    <input 
                                        type="number" step="0.1" min="0"
                                        className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                        value={gradeForm.weight}
                                        onChange={e => setGradeForm({...gradeForm, weight: e.target.value})}
                                        placeholder="1.0"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.date}</label>
                                <input 
                                    type="date" 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={gradeForm.date}
                                    onChange={e => setGradeForm({...gradeForm, date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.topicOptional}</label>
                                <input 
                                    type="text" 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={gradeForm.topic}
                                    onChange={e => setGradeForm({...gradeForm, topic: e.target.value})}
                                    placeholder={t.topicPlaceholder}
                                />
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button 
                                    onClick={() => {
                                        setAddingGradeTo(null);
                                        setEditingGradeId(null);
                                    }} 
                                    className={`flex-1 px-6 py-4 rounded-2xl font-bold text-base ${THEME.buttonGhost(isLight)} transition-all active:scale-95`}
                                >
                                    {t.cancel}
                                </button>
                                <button 
                                    onClick={() => {
                                        if (editingGradeId) {
                                            onUpdateGrade(addingGradeTo, editingGradeId, gradeForm.value, gradeForm.date, gradeForm.topic, gradeForm.weight);
                                        } else {
                                            onAddGrade(addingGradeTo, gradeForm.value, gradeForm.date, gradeForm.topic, gradeForm.weight);
                                        }
                                        setAddingGradeTo(null);
                                        setEditingGradeId(null);
                                        setGradeForm({ value: '', date: getTodayKey(), topic: '', weight: 1 });
                                    }}
                                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                                >
                                    {editingGradeId ? t.update : t.save}
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {showAddSchedule && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card isLight={isLight} className="p-8 max-w-md w-full shadow-2xl !rounded-3xl">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className={`text-2xl font-black ${THEME.text(isLight)} transition-colors`}>
                                {scheduleForm.id ? t.editSchedule : t.addSchedule}
                            </h4>
                            <button onClick={() => { setShowAddSchedule(false); setScheduleForm({}); }} className="text-slate-500 hover:text-red-500 transition-colors">
                                <Icons.X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!scheduleForm.subjectId) return;
                            if (scheduleForm.id) {
                                onUpdateSchedule(scheduleForm.day, scheduleForm.id, scheduleForm);
                            } else {
                                onAddSchedule(scheduleForm.day, scheduleForm);
                            }
                            setShowAddSchedule(false);
                            setScheduleForm({});
                        }} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.day}</label>
                                <select 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={scheduleForm.day}
                                    onChange={e => setScheduleForm({...scheduleForm, day: e.target.value})}
                                    required
                                >
                                    <option value="mon">{t.mon}</option>
                                    <option value="tue">{t.tue}</option>
                                    <option value="wed">{t.wed}</option>
                                    <option value="thu">{t.thu}</option>
                                    <option value="fri">{t.fri}</option>
                                    <option value="sat">{t.sat}</option>
                                    <option value="sun">{t.sun}</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.subject}</label>
                                <select 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={scheduleForm.subjectId}
                                    onChange={e => setScheduleForm({...scheduleForm, subjectId: e.target.value})}
                                    required
                                >
                                    <option value="">{t.selectSubject}</option>
                                    {schoolData.subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.startTime}</label>
                                    <input 
                                        type="time" 
                                        className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                        value={scheduleForm.startTime}
                                        onChange={e => setScheduleForm({...scheduleForm, startTime: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.endTime}</label>
                                    <input 
                                        type="time" 
                                        className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                        value={scheduleForm.endTime}
                                        onChange={e => setScheduleForm({...scheduleForm, endTime: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.room}</label>
                                <input 
                                    type="text" 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={scheduleForm.room}
                                    onChange={e => setScheduleForm({...scheduleForm, room: e.target.value})}
                                    placeholder={t.roomPlaceholder}
                                />
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button 
                                    type="button"
                                    onClick={() => { setShowAddSchedule(false); setScheduleForm({}); }} 
                                    className={`flex-1 px-6 py-4 rounded-2xl font-bold text-base ${THEME.buttonGhost(isLight)} transition-all active:scale-95`}
                                >
                                    {t.cancel}
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                                >
                                    {scheduleForm.id ? t.update : t.save}
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {showAddTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card isLight={isLight} className="p-8 max-w-md w-full shadow-2xl !rounded-3xl">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className={`text-2xl font-black ${THEME.text(isLight)} transition-colors`}>
                                {taskForm.id ? t.editTask : t.addTask}
                            </h4>
                            <button onClick={() => { setShowAddTask(false); setTaskForm({ title: '', dueDate: getTodayKey(), subjectId: '' }); }} className="text-slate-500 hover:text-red-500 transition-colors">
                                <Icons.X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!taskForm.title) return;
                            if (taskForm.id) {
                                onUpdateTask(taskForm.id, { title: taskForm.title, dueDate: taskForm.dueDate, subjectId: taskForm.subjectId });
                            } else {
                                onAddTask(taskForm);
                            }
                            setShowAddTask(false);
                            setTaskForm({ title: '', dueDate: getTodayKey(), subjectId: '' });
                        }} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.tasks}</label>
                                <input 
                                    type="text" 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={taskForm.title}
                                    onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                                    placeholder={t.taskPlaceholder}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.dueDate}</label>
                                <input 
                                    type="date" 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={taskForm.dueDate}
                                    onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.subjects}</label>
                                <select 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={taskForm.subjectId}
                                    onChange={e => setTaskForm({...taskForm, subjectId: e.target.value})}
                                    required
                                >
                                    <option value="">{t.selectSubject}</option>
                                    {(schoolData.subjects || []).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button 
                                    type="button"
                                    onClick={() => { setShowAddTask(false); setTaskForm({ title: '', dueDate: getTodayKey(), subjectId: '' }); }} 
                                    className={`flex-1 px-6 py-4 rounded-2xl font-bold text-base ${THEME.buttonGhost(isLight)} transition-all active:scale-95`}
                                >
                                    {t.cancel}
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                                >
                                    {taskForm.id ? t.update : t.save}
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {showAddTest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card isLight={isLight} className="p-8 max-w-md w-full shadow-2xl !rounded-3xl">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className={`text-2xl font-black ${THEME.text(isLight)} transition-colors`}>
                                {editingTestId ? t.editTest : t.newTest}
                            </h4>
                            <button onClick={() => { setShowAddTest(false); setEditingTestId(null); setTestForm({ subjectId: '', date: '', type: t.written, note: '' }); }} className="text-slate-500 hover:text-red-500 transition-colors">
                                <Icons.X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (editingTestId) {
                                onUpdateTest(editingTestId, testForm);
                            } else {
                                onAddTest(testForm);
                            }
                            setShowAddTest(false);
                            setEditingTestId(null);
                            setTestForm({ subjectId: '', date: '', type: t.written, note: '' });
                        }} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.subjects}</label>
                                <select 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={testForm.subjectId}
                                    onChange={e => setTestForm({...testForm, subjectId: e.target.value})}
                                    required
                                >
                                    <option value="">{t.selectSubject}</option>
                                    {schoolData.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.date}</label>
                                <input 
                                    type="date" 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={testForm.date}
                                    onChange={e => setTestForm({...testForm, date: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.type}</label>
                                <div className="flex gap-2">
                                    {[t.written, t.oral, t.practical].map(type => (
                                        <button 
                                            key={type} type="button"
                                            onClick={() => setTestForm({...testForm, type})}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${testForm.type === type ? 'bg-purple-600 text-white' : THEME.hover(isLight) + ' ' + THEME.bgSoft(isLight) + ' ' + THEME.textMuted(isLight)}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.optionalNote}</label>
                                <input 
                                    type="text" 
                                    className={`w-full ${THEME.input(isLight)} border rounded-2xl px-4 py-3 focus:outline-none transition-all`}
                                    value={testForm.note}
                                    onChange={e => setTestForm({...testForm, note: e.target.value})}
                                    placeholder={t.notePlaceholder}
                                />
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => { setShowAddTest(false); setEditingTestId(null); setTestForm({ subjectId: '', date: '', type: t.written, note: '' }); }} className={`flex-1 px-6 py-4 rounded-2xl font-bold text-base ${THEME.buttonGhost(isLight)} transition-all active:scale-95`}>{t.cancel}</button>
                                <button type="submit" className="flex-1 px-6 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-purple-900/20 transition-all active:scale-95">{t.save}</button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

const App = () => {
    // 1. Language and Translations (Must be first to avoid ReferenceErrors)
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('tracker_language') || 'it';
    });
    const t = translations[language];
    const [showLangMenu, setShowLangMenu] = useState(false);

    const changeLanguage = (lang) => {
        setLanguage(lang);
        setShowLangMenu(false);
    };

    // 2. Fundamental state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState('tracker'); // 'tracker' o 'school'
    const importInputRef = useRef(null);
    const isRemoteUpdateRef = useRef(false);
    const isLocalChangeRef = useRef(false);
    const deviceIdRef = useRef(null);
    if (!deviceIdRef.current) {
        let nid = localStorage.getItem('tracker_device_id');
        if (!nid) {
            nid = 'dev-' + Math.random().toString(36).slice(2);
            localStorage.setItem('tracker_device_id', nid);
        }
        deviceIdRef.current = nid;
    }

    // 3. Data state
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
        const defaultData = { 
            subjects: [], tests: [], tasks: [], 
            schedule: {
                mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: []
            },
            longTermGoals: [],
            maxGrade: 10, minGrade: 2, sufficiency: 6, theme: 'dark',
            semester1Start: '', semester1End: '',
            semester2Start: '', semester2End: '',
            targetAverages: {}
        };
        try { 
            const parsed = saved ? JSON.parse(saved) : defaultData;
            // Migrazione se necessario
            if (parsed.semesterStart && !parsed.semester1Start) parsed.semester1Start = parsed.semesterStart;
            if (parsed.semesterEnd && !parsed.semester1End) parsed.semester1End = parsed.semesterEnd;
            
            // Ensure new fields exist
            if (!parsed.schedule) parsed.schedule = defaultData.schedule;
            if (!parsed.longTermGoals) parsed.longTermGoals = defaultData.longTermGoals;
            
            return { ...defaultData, ...parsed };
        } catch { return defaultData; }
    });

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Trigger a sync when coming back online
            if (isLocalChangeRef.current && syncCode) {
                syncWithServer('push').catch(console.error);
            }
        };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [syncCode, syncWithServer]);

    // 4. Sync state
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
    const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'
    const [syncError, setSyncError] = useState('');
    const [showSyncSettings, setShowSyncSettings] = useState(false);
    const [syncSettingsForm, setSyncSettingsForm] = useState({
        apiBase: '',
        supabaseUrl: '',
        supabaseKey: '',
        syncCode: '',
        syncWord: ''
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

    const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(!!window.supabase);
    useEffect(() => {
        if (isSupabaseAvailable) return;
        const interval = setInterval(() => {
            if (window.supabase) {
                setIsSupabaseAvailable(true);
                clearInterval(interval);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [isSupabaseAvailable]);

    const supabaseClient = useMemo(() => {
        try {
            if (apiBase === 'supabase://' && supabaseConfig.url && supabaseConfig.key && window.supabase) {
                return window.supabase.createClient(supabaseConfig.url, supabaseConfig.key);
            }
        } catch (e) {
            console.error(t.supabaseInitError, e);
        }
        return null;
    }, [apiBase, supabaseConfig, t, isSupabaseAvailable]);

    // 5. Handlers
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

    const toggleTheme = () => {
        updateSchoolDataState(prev => ({
            ...prev,
            theme: prev.theme === 'light' ? 'dark' : 'light'
        }));
    };
    
    useEffect(() => {
        const timeout = setTimeout(() => {
            localStorage.setItem('tracker_habits', JSON.stringify(habits));
            localStorage.setItem('tracker_mental', JSON.stringify(mentalState));
            localStorage.setItem('tracker_school', JSON.stringify(schoolData));
            localStorage.setItem('tracker_language', language);
            localStorage.setItem('tracker_updatedAt', String(updatedAt));
            if (syncCode) localStorage.setItem('tracker_sync_code', syncCode);
            else localStorage.removeItem('tracker_sync_code');
            if (syncWord) localStorage.setItem('tracker_sync_word', syncWord);
            else localStorage.removeItem('tracker_sync_word');
        }, 1000); // Debounce localStorage for 1 second
        return () => clearTimeout(timeout);
    }, [habits, mentalState, schoolData, updatedAt, syncCode, syncWord, language]);
    
    const processImport = (data, isHash = false) => {
        if (data && data.habits && data.mentalState) {
            setHabits(data.habits);
            setMentalState(data.mentalState);
            if (data.schoolData) setSchoolData(data.schoolData);
            alert(isHash ? t.importSuccessLink : t.importSuccess);
            return true;
        }
        if (!isHash) alert(t.invalidFile);
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

    // 6. Centralized Sync Logic
    const syncWithServer = useCallback(async (action = 'fetch', customPayload = null) => {
        if (!syncCode) return null;
        const safeCode = syncCode.replace(/[^a-z0-9-_]/gi, '').toLowerCase();
        // Usiamo updatedAt dallo stato per garantire coerenza tra locale e remoto
        const payload = customPayload || { 
            habits, 
            mentalState, 
            schoolData, 
            updatedAt: updatedAt || Date.now(), 
            deviceId: deviceIdRef.current 
        };

        try {
            let srv = null;
            if (supabaseClient) {
                if (action === 'fetch') {
                    const { data, error } = await supabaseClient
                        .from('sync_states')
                        .select('state')
                        .eq('code', safeCode)
                        .single();
                    if (error && error.code !== 'PGRST116') throw error;
                    srv = data ? data.state : { habits: [], mentalState: { logs: {} }, schoolData: { subjects: [] }, updatedAt: 0 };
                } else {
                    const { error } = await supabaseClient
                        .from('sync_states')
                        .upsert({ 
                            code: safeCode, 
                            state: payload
                        }, { onConflict: 'code' });
                    if (error) throw error;
                    srv = payload;
                }
            } else {
                if (apiBase === 'supabase://') {
                    if (action === 'push') throw new Error(t.supabaseNotConfiguredShort);
                    return null;
                }
                const fullUrl = getSyncUrl(apiBase, safeCode, syncWord);
                if (action === 'fetch') {
                    const res = await fetch(fullUrl, { cache: 'no-store' });
                    if (res.ok) srv = await res.json();
                    else {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || `Errore server: ${res.status}`);
                    }
                } else {
                    const res = await fetch(fullUrl, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify(payload) 
                    });
                    if (!res.ok) throw new Error(`Errore server: ${res.status}`);
                    srv = payload;
                }
            }

            if (action === 'push') {
                // Solo se non ci sono stati altri cambiamenti locali nel frattempo
                if (isLocalChangeRef.current <= payload.updatedAt) {
                    isLocalChangeRef.current = false;
                }
            }
            return srv;
        } catch (err) {
            console.error(`Sync ${action} error:`, err);
            throw err;
        }
    }, [syncCode, syncWord, apiBase, supabaseClient, habits, mentalState, schoolData, updatedAt, t]);

    useEffect(() => {
        let cancelled = false;
        const initSync = async () => {
            if (!syncCode) return;
            setSyncStatus('syncing');
            try {
                const srv = await syncWithServer('fetch');
                if (cancelled || !srv) return;
                
                setSyncError('');
                const su = Number(srv.updatedAt || 0);
                if (su > updatedAt && srv.habits && srv.mentalState) {
                    isRemoteUpdateRef.current = true;
                    setHabits(srv.habits);
                    setMentalState(srv.mentalState);
                    if (srv.schoolData) setSchoolData(srv.schoolData);
                    setUpdatedAt(su);
                    isLocalChangeRef.current = false;
                    setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
                } else if (su === 0 || (updatedAt > su)) {
                    await syncWithServer('push');
                }
                setSyncStatus('synced');
            } catch (err) {
                setSyncStatus('error');
                setSyncError(err.message || t.connectionError);
            }
        };
        initSync();
        return () => { cancelled = true; };
    }, [syncCode, syncWord, apiBase, supabaseClient, t]);

    useEffect(() => {
        if (!syncCode || isRemoteUpdateRef.current || !isLocalChangeRef.current) return;
        
        const t_sync = setTimeout(async () => {
            try {
                setSyncStatus('syncing');
                await syncWithServer('push');
                setSyncStatus('synced');
            } catch (err) {
                setSyncStatus('error');
                setSyncError(err.message || t.connectionError);
            }
        }, 800);
        return () => clearTimeout(t_sync);
    }, [habits, mentalState, schoolData, updatedAt, syncCode, syncWord, apiBase, t]);

    useEffect(() => {
        if (!syncCode) return;
        const interval = setInterval(async () => {
            if (isRemoteUpdateRef.current || isLocalChangeRef.current) return; 
            try {
                const srv = await syncWithServer('fetch');
                if (srv) {
                    const su = Number(srv.updatedAt || 0);
                    if (su > updatedAt && srv.habits && srv.mentalState) {
                        isRemoteUpdateRef.current = true;
                        setHabits(srv.habits);
                        setMentalState(srv.mentalState);
                        if (srv.schoolData) setSchoolData(srv.schoolData);
                        setUpdatedAt(su);
                        // Reset local change ref since we just synced with remote
                        isLocalChangeRef.current = false;
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
        const next = new Date(currentDate);
        if (months) next.setMonth(next.getMonth() + months);
        if (years) next.setFullYear(next.getFullYear() + years);
        setCurrentDate(next);
    };


    // Derived values for current month
    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const year = currentDate.getFullYear(), month = currentDate.getMonth();

    // Unified update handlers
    const updateHabits = (updater) => {
        const now = Date.now();
        setHabits(prev => typeof updater === 'function' ? updater(prev) : updater);
        setUpdatedAt(now);
        isLocalChangeRef.current = now;
    };

    const updateMentalStateData = (updater) => {
        const now = Date.now();
        setMentalState(prev => typeof updater === 'function' ? updater(prev) : updater);
        setUpdatedAt(now);
        isLocalChangeRef.current = now;
    };

    const updateSchoolDataState = (updater) => {
        const now = Date.now();
        setSchoolData(prev => typeof updater === 'function' ? updater(prev) : updater);
        setUpdatedAt(now);
        isLocalChangeRef.current = now;
    };

    const toggleHabit = useCallback((habitId, day) => {
        const dateKey = getDateKey(year, month, day);
        updateHabits(prev => prev.map(h => {
            if (h.id !== habitId) return h;
            const next = { ...h.completedDates };
            if (next[dateKey]) delete next[dateKey]; else next[dateKey] = true;
            return { ...h, completedDates: next };
        }));
    }, [year, month]);

    const updateField = (updater, field) => (id, value) => {
        updater(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const renameHabit = useCallback((id, value) => {
        updateField(updateHabits, 'name')(id, value);
    }, []);

    const updateHabitGoal = useCallback((id, value) => {
        updateField(updateHabits, 'goal')(id, value);
    }, []);

    const updateHabitIcon = useCallback((id, value) => {
        updateField(updateHabits, 'icon')(id, value);
    }, []);

    const updateHabitColor = useCallback((id, value) => {
        updateField(updateHabits, 'color')(id, value);
    }, []);

    const deleteHabit = useCallback((habitId) => {
        if (confirm(t.deleteHabitConfirm)) {
            updateHabits(prevHabits => prevHabits.filter(h => h.id !== habitId));
        }
    }, [t.deleteHabitConfirm]);

    const addHabit = useCallback(() => {
        updateHabits(prevHabits => {
            const newId = Math.max(0, ...prevHabits.map(h => h.id)) + 1;
            const newHabit = {
                id: newId,
                name: t.newHabitName,
                icon: "Check", 
                goal: 30, // Default goal
                completedDates: {}
            };
            return [...prevHabits, newHabit];
        });
    }, [t.newHabitName]);

    const updateMentalState = useCallback((dateKey, field, value) => {
        updateMentalStateData(prev => ({
            ...prev,
            logs: {
                ...prev.logs,
                [dateKey]: { ...(prev.logs[dateKey] || { mood: 0, motivation: 0 }), [field]: value }
            }
        }));
    }, []);

    // School update helpers
    const addSubject = (name) => {
        if (!name.trim()) return;
        updateSchoolDataState(prev => ({
            ...prev,
            subjects: [...prev.subjects, {
                id: Date.now().toString(),
                name: name.trim(),
                teacher: '',
                grades: []
            }]
        }));
    };

    const updateSubjectTeacher = (id, teacher) => {
        updateSchoolDataState(prev => ({
            ...prev,
            subjects: prev.subjects.map(s => s.id === id ? { ...s, teacher } : s)
        }));
    };

    const updateSubjectSufficiency = (id, value) => {
        updateSchoolDataState(prev => ({
            ...prev,
            subjects: prev.subjects.map(s => s.id === id ? { ...s, sufficiency: parseFloat(value) || null } : s)
        }));
    };

    const updateSubjectColor = (id, color) => {
        updateSchoolDataState(prev => ({
            ...prev,
            subjects: prev.subjects.map(s => s.id === id ? { ...s, color } : s)
        }));
    };

    const addTask = (task) => {
        if (!task.title.trim()) return;
        updateSchoolDataState(prev => ({
            ...prev,
            tasks: [...(prev.tasks || []), { 
                ...task, 
                id: Date.now().toString(), 
                completed: false,
                createdAt: Date.now()
            }]
        }));
    };

    const toggleTask = (taskId) => {
        updateSchoolDataState(prev => ({
            ...prev,
            tasks: (prev.tasks || []).map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        }));
    };

    const deleteTask = (taskId) => {
        updateSchoolDataState(prev => ({
            ...prev,
            tasks: (prev.tasks || []).filter(t => t.id !== taskId)
        }));
    };

    const updateTask = (taskId, updatedFields) => {
        updateSchoolDataState(prev => ({
            ...prev,
            tasks: (prev.tasks || []).map(t => t.id === taskId ? { ...t, ...updatedFields } : t)
        }));
    };

    const deleteSubject = (id) => {
        if (confirm(t.deleteSubjectConfirm)) {
            updateSchoolDataState(prev => ({
                ...prev,
                subjects: prev.subjects.filter(s => s.id !== id),
                tests: prev.tests.filter(t => t.subjectId !== id)
            }));
        }
    };

    const addGrade = (subjectId, value, date, topic, weight) => {
        const val = parseFloat(value);
        if (isNaN(val) || val < 0) return;
        
        updateSchoolDataState(prev => {
            const max = prev.maxGrade || 10;
            if (val > max) return prev;
            
            return {
                ...prev,
                subjects: prev.subjects.map(s => s.id === subjectId ? {
                    ...s,
                    grades: [...s.grades, { 
                        id: Date.now().toString(), 
                        value: val, 
                        date: date || getTodayKey(), 
                        topic: (topic || '').trim(),
                        weight: isNaN(parseFloat(weight)) ? 1 : parseFloat(weight)
                    }]
                } : s)
            };
        });
    };

    const updateGrade = (subjectId, gradeId, value, date, topic, weight) => {
        const val = parseFloat(value);
        if (isNaN(val) || val < 0) return;

        updateSchoolDataState(prev => {
            const max = prev.maxGrade || 10;
            if (val > max) return prev;

            return {
                ...prev,
                subjects: prev.subjects.map(s => s.id === subjectId ? {
                    ...s,
                    grades: s.grades.map(g => g.id === gradeId ? { 
                        ...g, 
                        value: val, 
                        date, 
                        topic: (topic || '').trim(),
                        weight: isNaN(parseFloat(weight)) ? 1 : parseFloat(weight)
                    } : g)
                } : s)
            };
        });
    };

    const deleteGrade = (subjectId, gradeId) => {
        updateSchoolDataState(prev => ({
            ...prev,
            subjects: prev.subjects.map(s => s.id === subjectId ? {
                ...s,
                grades: s.grades.filter(g => g.id !== gradeId)
            } : s)
        }));
    };

    const addTest = (test) => {
        if (!test.subjectId || !test.date) return;
        updateSchoolDataState(prev => ({
            ...prev,
            tests: [...prev.tests, { ...test, id: Date.now().toString(), completed: false }]
        }));
    };

    const updateTest = (testId, updatedTest) => {
        updateSchoolDataState(prev => ({
            ...prev,
            tests: prev.tests.map(t => t.id === testId ? { ...t, ...updatedTest } : t)
        }));
    };

    const deleteTest = (testId) => {
        updateSchoolDataState(prev => ({
            ...prev,
            tests: prev.tests.filter(t => t.id !== testId)
        }));
    };

    const updateSchoolSettings = (field, value) => {
        updateSchoolDataState(prev => ({ ...prev, [field]: value }));
    };

    const updateTargetAverage = (subjectId, value) => {
        updateSchoolDataState(prev => {
            const newTargets = {
                ...(prev.targetAverages || {}),
                [subjectId]: value
            };
            return {
                ...prev,
                targetAverages: newTargets
            };
        });
    };

    const addSchedule = (day, lesson) => {
        updateSchoolDataState(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: [...(prev.schedule[day] || []), { ...lesson, id: Date.now().toString() }]
            }
        }));
    };

    const updateSchedule = (day, lessonId, updatedLesson) => {
        updateSchoolDataState(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: prev.schedule[day].map(l => l.id === lessonId ? { ...l, ...updatedLesson } : l)
            }
        }));
    };

    const deleteSchedule = (day, lessonId) => {
        updateSchoolDataState(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [day]: prev.schedule[day].filter(l => l.id !== lessonId)
            }
        }));
    };

    const addGoal = (goal) => {
        updateSchoolDataState(prev => ({
            ...prev,
            longTermGoals: [...(prev.longTermGoals || []), { ...goal, id: Date.now().toString(), completed: false }]
        }));
    };

    const updateGoal = (goalId, updatedGoal) => {
        updateSchoolDataState(prev => ({
            ...prev,
            longTermGoals: prev.longTermGoals.map(g => g.id === goalId ? { ...g, ...updatedGoal } : g)
        }));
    };

    const toggleGoal = (goalId) => {
        updateSchoolDataState(prev => ({
            ...prev,
            longTermGoals: prev.longTermGoals.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g)
        }));
    };

    const deleteGoal = (goalId) => {
        updateSchoolDataState(prev => ({
            ...prev,
            longTermGoals: prev.longTermGoals.filter(g => g.id !== goalId)
        }));
    };

    const getLevelInfo = (schoolData) => {
        const t = translations[language] || translations['it'];
        const ranksData = t.ranks || translations['it'].ranks;
        let totalXP = 0;
        const globalSufficiency = schoolData?.sufficiency ?? 6;
        
        if (schoolData) {
            // 1. XP dai VOTI:
            schoolData.subjects?.forEach(s => {
                s.grades?.forEach(g => {
                    if (g.weight === 0) return;
                    const weight = g.weight || 1;
                    const val = g.value;
                    const subjectSufficiency = s.sufficiency ?? globalSufficiency;
                    
                    const diff = val - subjectSufficiency;
                    const multiplier = diff >= 0 ? 20 : 30;
                    totalXP += Math.floor(diff * multiplier * weight);
                });
            });
            
            // 2. XP dai COMPITI completati: 20 per ogni compito
            schoolData.tasks?.forEach(task => {
                if (task.completed) totalXP += 20;
            });
        }

        // Definiamo i ranghi
        const ranks = [
            { name: ranksData.zombie, minXP: -Infinity, emoji: "🧟" },
            { name: ranksData.naufrago, minXP: -500, emoji: "🏝️" },
            { name: ranksData.allarme, minXP: -200, emoji: "🚨" },
            { name: ranksData.limbo, minXP: -100, emoji: "☁️" },
            { name: ranksData.principiante, minXP: 0, emoji: "🥚" },
            { name: ranksData.esploratore, minXP: 200, emoji: "🧭" },
            { name: ranksData.promessa, minXP: 600, emoji: "🌱" },
            { name: ranksData.elite, minXP: 1500, emoji: "💎" },
            { name: ranksData.maestro, minXP: 3000, emoji: "🧙" },
            { name: ranksData.divinita, minXP: 6000, emoji: "🐲" }
        ];

        // Trova il rango attuale
        let currentRankIndex = ranks.findLastIndex(r => totalXP >= r.minXP);
        if (currentRankIndex === -1) currentRankIndex = 0;

        const currentRank = ranks[currentRankIndex];
        const nextRank = ranks[currentRankIndex + 1] || null;
        
        let progress = 100;
        let xpToNext = 0;

        if (nextRank) {
            const range = nextRank.minXP - currentRank.minXP;
            const currentProgress = totalXP - currentRank.minXP;
            progress = Math.max(0, Math.min(100, (currentProgress / range) * 100));
            xpToNext = nextRank.minXP - totalXP;
        }
        
        return { 
            rank: currentRank.name, 
            emoji: currentRank.emoji,
            progress, 
            xpToNext, 
            totalXP,
            isNegative: totalXP < 0 
        };
    };

    const completeTest = (test, gradeValue) => {
        const topic = [test.type, test.note].filter(Boolean).join(' - ');
        addGrade(test.subjectId, gradeValue, test.date, topic);
        updateTest(test.id, { completed: true });
    };

    // Calculate stats for current month
    const totalPossibleCompletions = habits.length * daysInMonth;
    
    const actualCompletions = useMemo(() => habits.reduce((acc, h) => {
        const dkBase = getDateKey(year, month, 1).slice(0, -2);
        for(let d=1; d<=daysInMonth; d++) {
            if(h.completedDates[dkBase + (d < 10 ? '0' + d : d)]) acc++;
        }
        return acc;
    }, 0), [habits, daysInMonth, year, month]);

    const dailyStats = useMemo(() => {
        const dkBase = getDateKey(year, month, 1).slice(0, -2);
        return Array.from({ length: daysInMonth }, (_, i) => {
            const dk = dkBase + (i + 1 < 10 ? '0' + (i + 1) : (i + 1));
            const done = habits.filter(h => h.completedDates[dk]).length;
            return { 
                day: i + 1, 
                done, 
                notDone: habits.length - done, 
                percentage: habits.length ? (done / habits.length) * 100 : 0 
            };
        });
    }, [habits, daysInMonth, year, month]);

    const weeklyPercents = useMemo(() => {
        const arr = [];
        const numWeeks = Math.ceil(daysInMonth / 7);
        for (let w = 0; w < numWeeks; w++) {
            const start = w * 7;
            const end = Math.min(daysInMonth, start + 7);
            let sum = 0;
            for (let d = start; d < end; d++) {
                sum += dailyStats[d].percentage || 0;
            }
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
                    title={t.tracker}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                </button>

                <button 
                    onClick={() => setActiveTab('school')}
                    className={`p-3 rounded-xl transition-all duration-200 ${activeTab === 'school' ? (isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-600/20 text-blue-400 shadow-inner') : (isLight ? 'text-slate-500 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]')}`}
                    title={t.school}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </button>

                <button 
                    onClick={() => setActiveTab('goals')}
                    className={`p-3 rounded-xl transition-all duration-200 ${activeTab === 'goals' ? (isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-600/20 text-blue-400 shadow-inner') : (isLight ? 'text-slate-500 hover:text-slate-600 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]')}`}
                    title={t.goals}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>

                <div className="mt-auto flex flex-col gap-4 items-center">
                    <div className="relative">
                        <button 
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'} ${showLangMenu ? (isLight ? 'bg-slate-100' : 'bg-slate-800') : ''}`}
                            title={t.switchLanguage}
                        >
                            <FlagIcon lang={language} />
                            <span className="font-black text-[10px] uppercase opacity-80">{language}</span>
                        </button>

                        {showLangMenu && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setShowLangMenu(false)}
                                />
                                <Card isLight={isLight} noPadding={true} className="absolute bottom-0 left-full ml-2 z-50 py-2 shadow-xl min-w-[140px]">
                                    <button 
                                        onClick={() => changeLanguage('it')}
                                        className={`w-full px-4 py-2 flex items-center gap-3 hover:${isLight ? 'bg-slate-50' : 'bg-slate-800'} transition-colors ${language === 'it' ? 'text-blue-500 font-bold' : (isLight ? 'text-slate-600' : 'text-slate-300')}`}
                                    >
                                        <FlagIcon lang="it" className="w-5 h-3.5" />
                                        <span className="flex-1 text-left">Italiano</span>
                                        <span className="text-[10px] opacity-50 font-mono">IT</span>
                                    </button>
                                    <button 
                                        onClick={() => changeLanguage('en')}
                                        className={`w-full px-4 py-2 flex items-center gap-3 hover:${isLight ? 'bg-slate-50' : 'bg-slate-800'} transition-colors ${language === 'en' ? 'text-blue-500 font-bold' : (isLight ? 'text-slate-600' : 'text-slate-300')}`}
                                    >
                                        <FlagIcon lang="en" className="w-5 h-3.5" />
                                        <span className="flex-1 text-left">English</span>
                                        <span className="text-[10px] opacity-50 font-mono">EN</span>
                                    </button>
                                    <button 
                                        onClick={() => changeLanguage('fr')}
                                        className={`w-full px-4 py-2 flex items-center gap-3 hover:${isLight ? 'bg-slate-50' : 'bg-slate-800'} transition-colors ${language === 'fr' ? 'text-blue-500 font-bold' : (isLight ? 'text-slate-600' : 'text-slate-300')}`}
                                    >
                                        <FlagIcon lang="fr" className="w-5 h-3.5" />
                                        <span className="flex-1 text-left">Français</span>
                                        <span className="text-[10px] opacity-50 font-mono">FR</span>
                                    </button>
                                    <button 
                                        onClick={() => changeLanguage('de')}
                                        className={`w-full px-4 py-2 flex items-center gap-3 hover:${isLight ? 'bg-slate-50' : 'bg-slate-800'} transition-colors ${language === 'de' ? 'text-blue-500 font-bold' : (isLight ? 'text-slate-600' : 'text-slate-300')}`}
                                    >
                                        <FlagIcon lang="de" className="w-5 h-3.5" />
                                        <span className="flex-1 text-left">Deutsch</span>
                                        <span className="text-[10px] opacity-50 font-mono">DE</span>
                                    </button>
                                </Card>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={openSyncSettings}
                        className={`p-3 rounded-xl transition-all duration-200 relative group ${syncCode ? 'text-blue-500 bg-blue-500/10' : (isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800')}`}
                        title={`${t.backendLabel}: ${apiBase || t.local}${syncError ? '\n' + t.error + ': ' + syncError : ''}\n${t.pcAcceso}: ${syncStatus === 'synced' ? t.pcOnStatus : t.pcOffStatus}\n${t.clickToConfig}`}
                    >
                        <svg className={`w-6 h-6 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full border-2 ${isLight ? 'border-white' : 'border-[#0f172a]'} ${syncStatus === 'synced' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : syncStatus === 'syncing' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                    </button>

                    <button 
                        onClick={toggleTheme}
                        className={`p-3 rounded-xl transition-all duration-200 ${isLight ? 'text-orange-500 hover:bg-orange-50' : 'text-yellow-400 hover:bg-yellow-400/10'}`}
                        title={isLight ? t.themeDarkTitle : t.themeLightTitle}
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
                        try { processImport(JSON.parse(reader.result)); } catch { alert(t.importError); }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                }} />

                <div className="max-w-[1400px] mx-auto">
                    {(() => {
                        const todayKey = getTodayKey();
                        const doneCount = habits.filter(h => h.completedDates[todayKey]).length;
                        
                        return (
                            <Header 
                                totalHabits={habits.length}
                                completedHabits={doneCount}
                                totalPossible={habits.length}
                                currentDate={currentDate}
                                onNext={() => adjustDate(1)}
                                onPrev={() => adjustDate(-1)}
                                onNextYear={() => adjustDate(0, 1)}
                                onPrevYear={() => adjustDate(0, -1)}
                                onExport={() => {
                                    const data = { habits, mentalState, schoolData };
                                    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `tracker-export-${getTodayKey()}.json`;
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
                                doneToday={doneCount}
                                notDoneToday={Math.max(0, habits.length - doneCount)}
                                totalTasks={habits.length}
                                saveCount={
                                    habits.reduce((acc, h) => acc + Object.keys(h.completedDates).length, 0) +
                                    Object.values(mentalState.logs).reduce((acc, l) => acc + ((l.mood || 0) > 0 || (l.motivation || 0) > 0 ? 1 : 0), 0)
                                }
                                t={t}
                                language={language}
                                isOnline={isOnline}
                            />
                        );
                    })()}

                    {showSyncSettings && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <Card isLight={isLight} noPadding={true} className="w-full max-w-md shadow-2xl transform scale-100">
                                <div className={`p-6 border-b ${THEME.border(isLight)} flex justify-between items-center bg-gradient-to-r ${isLight ? 'from-blue-50 to-indigo-50' : 'from-blue-900/20 to-indigo-900/20'}`}>
                                    <h2 className={`text-xl font-bold flex items-center gap-2 ${THEME.text(isLight)}`}>
                                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {t.syncSettings}
                                    </h2>
                                    <button onClick={() => setShowSyncSettings(false)} className={`p-2 rounded-full ${THEME.hover(isLight)} ${THEME.textDim(isLight)} transition-colors`}>
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <form onSubmit={saveSyncSettings} className="p-6 space-y-5">
                                    <div className="space-y-4">
                                        <div>
                                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${THEME.textMuted(isLight)}`}>{t.backendUrl}</label>
                                            <input 
                                                type="text" 
                                                placeholder={t.backendPlaceholder}
                                                className={`w-full px-4 py-2.5 rounded-xl border ${THEME.input(isLight)} focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-mono text-sm`}
                                                value={syncSettingsForm.apiBase}
                                                onChange={e => setSyncSettingsForm({...syncSettingsForm, apiBase: e.target.value})}
                                            />
                                            <p className={`mt-1 text-[10px] ${THEME.textDim(isLight)}`}>{t.supabaseDesc}</p>
                                        </div>

                                        {syncSettingsForm.apiBase === 'supabase://' && (
                                            <div className={`p-4 rounded-xl border ${isLight ? 'bg-blue-50/50 border-blue-100' : 'bg-blue-900/10 border-blue-900/30'} space-y-3`}>
                                                <div>
                                                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-blue-600/70' : 'text-blue-400/70'}`}>{t.supabaseUrl}</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="https://xyz.supabase.co"
                                                        className={`w-full px-3 py-2 rounded-lg border ${isLight ? 'bg-white border-blue-200 focus:ring-blue-500/20' : 'bg-slate-900 border-blue-900/50 focus:ring-blue-500/20'} focus:outline-none focus:ring-4 transition-all font-mono text-xs`}
                                                        value={syncSettingsForm.supabaseUrl}
                                                        onChange={e => setSyncSettingsForm({...syncSettingsForm, supabaseUrl: e.target.value})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-blue-600/70' : 'text-blue-400/70'}`}>{t.supabaseKey}</label>
                                                    <input 
                                                        type="password" 
                                                        placeholder={t.optional}
                                                        className={`w-full px-3 py-2 rounded-lg border ${isLight ? 'bg-white border-blue-200 focus:ring-blue-500/20' : 'bg-slate-900 border-blue-900/50 focus:ring-blue-500/20'} focus:outline-none focus:ring-4 transition-all font-mono text-xs`}
                                                        value={syncSettingsForm.supabaseKey}
                                                        onChange={e => setSyncSettingsForm({...syncSettingsForm, supabaseKey: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${THEME.textMuted(isLight)}`}>{t.syncCodeLabel}</label>
                                                <input 
                                                    type="text" 
                                                    placeholder={t.syncCodePlaceholder}
                                                    className={`w-full px-4 py-2.5 rounded-xl border ${THEME.input(isLight)} focus:outline-none font-mono text-sm`}
                                                    value={syncSettingsForm.syncCode}
                                                    onChange={e => setSyncSettingsForm({...syncSettingsForm, syncCode: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${THEME.textMuted(isLight)}`}>{t.password}</label>
                                                <input 
                                                    type="password" 
                                                    placeholder={t.optional}
                                                    className={`w-full px-4 py-2.5 rounded-xl border ${THEME.input(isLight)} focus:outline-none font-mono text-sm`}
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
                                            className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-all ${THEME.buttonGhost(isLight)}`}
                                        >
                                            {t.cancel}
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                                        >
                                            {t.save}
                                        </button>
                                    </div>
                                </form>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'tracker' ? (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                <Card isLight={isLight} className="h-[220px] !rounded-xl overflow-hidden" noPadding>
                                    <div className="p-4 h-full">
                                        <div className={`text-sm font-semibold ${THEME.text(isLight)} mb-2`}>{t.monthlyProgress}</div>
                                        <div className="h-[170px]">
                                            <SmartAreaChart 
                                                data={dailyStats} 
                                                values={dailyStats.map(s => s.percentage)} 
                                                color="#60A5FA" 
                                                maxY={100} 
                                                isLight={isLight} 
                                                showGrid={true}
                                            />
                                        </div>
                                    </div>
                                </Card>
                                <Card isLight={isLight} className="h-[220px] !rounded-xl overflow-hidden" noPadding>
                                    <div className="p-4 h-full">
                                        <div className={`text-sm font-semibold ${THEME.text(isLight)} mb-2`}>{t.completion}</div>
                                        <TwoToneDonutGauge percent={totalPossibleCompletions > 0 ? (actualCompletions / totalPossibleCompletions) * 100 : 0} isLight={isLight} />
                                    </div>
                                </Card>
                                <Card isLight={isLight} className="h-[220px] !rounded-xl overflow-hidden" noPadding>
                                    <div className="p-4 h-full">
                                        <div className={`text-sm font-semibold ${THEME.text(isLight)} mb-2`}>{t.weeklyAverages}</div>
                                        <WeeklyBarsSmall weeks={weeklyPercents} isLight={isLight} />
                                    </div>
                                </Card>
                            </div>

                            <HabitGrid 
                                habits={habits}
                                onToggle={toggleHabit}
                                onRename={renameHabit}
                                onUpdateGoal={updateHabitGoal}
                                onDelete={deleteHabit}
                                onAdd={addHabit}
                                onUpdateIcon={updateHabitIcon}
                                onUpdateColor={updateHabitColor}
                                currentDate={currentDate}
                                daysInMonth={daysInMonth}
                                dailyStats={dailyStats}
                                isLight={isLight}
                                t={t}
                                language={language}
                            />

                            <MentalStateGrid 
                                mentalState={mentalState}
                                onUpdate={updateMentalState}
                                currentDate={currentDate}
                                daysInMonth={daysInMonth}
                                isLight={isLight}
                                t={t}
                            />
                        </>
                    ) : activeTab === 'school' ? (
                        <SchoolGradesView 
                            schoolData={schoolData} 
                            isLight={isLight}
                            openSyncSettings={openSyncSettings}
                            t={t}
                            language={language}
                            onAddSubject={addSubject}
                            onDeleteSubject={deleteSubject}
                            onUpdateSubjectTeacher={updateSubjectTeacher}
                            onUpdateSubjectSufficiency={updateSubjectSufficiency}
                            onUpdateSubjectColor={updateSubjectColor}
                            onAddGrade={addGrade}
                            onUpdateGrade={updateGrade}
                            onDeleteGrade={deleteGrade}
                            onAddTest={addTest}
                            onUpdateTest={updateTest}
                            onDeleteTest={deleteTest}
                            onUpdateSettings={updateSchoolSettings}
                            onUpdateTargetAverage={updateTargetAverage}
                            onCompleteTest={completeTest}
                            onAddTask={addTask}
                            onToggleTask={toggleTask}
                            onDeleteTask={deleteTask}
                            onUpdateTask={updateTask}
                            getLevelInfo={getLevelInfo}
                            onAddSchedule={addSchedule}
                            onUpdateSchedule={updateSchedule}
                            onDeleteSchedule={deleteSchedule}
                        />
                    ) : activeTab === 'goals' ? (
                        <GoalsView 
                            schoolData={schoolData}
                            isLight={isLight}
                            t={t}
                            language={language}
                            onAddGoal={addGoal}
                            onUpdateGoal={updateGoal}
                            onToggleGoal={toggleGoal}
                            onDeleteGoal={deleteGoal}
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
