const { useState, useEffect, useMemo, useRef, useCallback } = React;

// Suppress Recharts defaultProps warning in React 18
const originalConsoleError = console.error;
console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
        return;
    }
    originalConsoleError(...args);
};

// --- Hooks & Helpers ---
const useTableResizing = (initialLeft = 256, initialRight = 192) => {
    const [leftWidth, setLeftWidth] = useState(initialLeft);
    const [rightWidth, setRightWidth] = useState(initialRight);

    // Ref to track current widths for the handleResize closure without recreating it
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

    return { 
        leftWidth, rightWidth, 
        startResizing: handleResize(setLeftWidth, false), 
        startResizingRight: handleResize(setRightWidth, true) 
    };
};

const useGridTable = (daysInMonth, initialLeft = 256, initialRight = 192, minCellWidth = 24) => {
    const resizing = useTableResizing(initialLeft, initialRight);
    const scrollRef = useRef(null);
    const [cellWidth, setCellWidth] = useState(minCellWidth);
    const [scrollLeft, setScrollLeft] = useState(0);

    const recalcCellWidth = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const w = el.clientWidth;
        const cw = Math.max(minCellWidth, Math.floor(w / Math.max(1, daysInMonth)));
        setCellWidth(cw);
    }, [daysInMonth, minCellWidth]);

    // Setup listeners once or when recalc logic changes
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

    // Trigger recalculation when widths or days change
    useEffect(() => {
        recalcCellWidth();
    }, [recalcCellWidth, resizing.leftWidth, resizing.rightWidth]);

    return {
        ...resizing,
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

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const getChartPoints = (values, w, h, maxY) => {
    if (!Array.isArray(values)) return [];
    return values.map((v, i) => {
        const x = (i / Math.max(1, values.length - 1)) * w;
        const y = h - clamp(v, 0, maxY) / maxY * h;
        return [x, y];
    });
};

const getSmoothPath = (pts, tension = 0.9) => {
    if (!Array.isArray(pts) || pts.length === 0) return '';
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

const FlagIcon = React.memo(({ lang, className = "w-6 h-4" }) => {
    const baseClass = `${className} rounded-sm shadow-sm inline-block align-middle`;
    const flags = {
        it: (
            <svg className={baseClass} viewBox="0 0 3 2">
                <rect width="1" height="2" fill="#009246"/>
                <rect x="1" width="1" height="2" fill="#fff"/>
                <rect x="2" width="1" height="2" fill="#ce2b37"/>
            </svg>
        ),
        en: (
            <svg className={baseClass} viewBox="0 0 3 2">
                <rect width="3" height="2" fill="#012169"/>
                <path d="M0,0 L3,2 M3,0 L0,2" stroke="#fff" strokeWidth="0.3"/>
                <path d="M0,0 L3,2 M3,0 L0,2" stroke="#C8102E" strokeWidth="0.2"/>
                <path d="M1.5,0 v2 M0,1 h3" stroke="#fff" strokeWidth="0.5"/>
                <path d="M1.5,0 v2 M0,1 h3" stroke="#C8102E" strokeWidth="0.3"/>
            </svg>
        ),
        fr: (
            <svg className={baseClass} viewBox="0 0 3 2">
                <rect width="1" height="2" fill="#002395"/>
                <rect x="1" width="1" height="2" fill="#fff"/>
                <rect x="2" width="1" height="2" fill="#ed2939"/>
            </svg>
        ),
        de: (
            <svg className={baseClass} viewBox="0 0 5 3">
                <rect width="5" height="1" fill="#000"/>
                <rect y="1" width="5" height="1" fill="#D00"/>
                <rect y="2" width="5" height="1" fill="#FFCE00"/>
            </svg>
        )
    };
    return flags[lang] || null;
});

const Card = ({ children, className = "", isLight, noPadding = false, group = false, overflow = true }) => (
    <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937] shadow-xl'} border rounded-2xl md:rounded-3xl ${noPadding ? '' : 'p-4 md:p-6'} transition-all duration-300 ${group ? 'group' : ''} ${overflow ? 'overflow-hidden' : ''} ${className}`}>
        {children}
    </div>
);

const SimpleAreaChart = React.memo(({ values = [], color = "#10B981", maxY = 100, datasets = [], isLight }) => {
    const safeDatasets = Array.isArray(datasets) ? datasets : [];
    const activeDatasets = safeDatasets.length > 0 ? safeDatasets : [{ values: Array.isArray(values) ? values : [], color, id: 'def' }];
    const w = 1000, h = 100;
    
    const chartElements = useMemo(() => activeDatasets.map((ds, i) => {
        const dsValues = Array.isArray(ds?.values) ? ds.values : [];
        const pts = getChartPoints(dsValues, w, h, maxY);
        const topPath = getSmoothPath(pts, 0.85);
        return (
            <React.Fragment key={ds?.id || i}>
                <path d={`${topPath} L ${w},${h} L 0,${h} Z`} fill={`url(#grad-${ds?.id || i})`} className="transition-all duration-300" />
                <path d={topPath} fill="none" stroke={ds?.color || color} strokeWidth="3" strokeLinecap="round" style={{ vectorEffect: 'non-scaling-stroke' }} className="transition-all duration-300" />
            </React.Fragment>
        );
    }), [activeDatasets, color, maxY, isLight]);

    return (
        <div className="w-full h-full relative">
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%" className="block">
                <defs>
                    {activeDatasets.map((ds, i) => (
                        <linearGradient key={`grad-${ds?.id || i}`} id={`grad-${ds?.id || i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={ds?.color || color} stopOpacity={isLight ? 0.4 : 0.15}/>
                            <stop offset="95%" stopColor={ds?.color || color} stopOpacity="0"/>
                        </linearGradient>
                    ))}
                </defs>
                {chartElements}
            </svg>
        </div>
    );
});

const { 
    ResponsiveContainer, AreaChart, Area, LineChart, Line, 
    XAxis, YAxis, CartesianGrid, Tooltip: RechartsTooltip 
} = window.Recharts || {};

const SmartAreaChart = ({ data, values, color, maxY, isLight, showGrid = false, xKey = "day", yDomain = [0, 100], datasets = null }) => {
    if (ResponsiveContainer && AreaChart && Area) {
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
                            key={ds.id}
                            type="monotone" 
                            dataKey={ds.id} 
                            stroke={ds.color} 
                            fill={`url(#grad-${ds.id})`} 
                            strokeWidth={3}
                            animationDuration={1000}
                            dot={false}
                            activeDot={false}
                        />
                    )) : (
                        <Area 
                            type="monotone" 
                            dataKey="percentage" 
                            stroke={color} 
                            fill={`url(#grad-${color})`} 
                            strokeWidth={3}
                            animationDuration={1000}
                            dot={false}
                            activeDot={false}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        );
    }
    return <SimpleAreaChart values={values} color={color} maxY={maxY} datasets={datasets} isLight={isLight} />;
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
// --- Icons ---
const Icons = {
    Check: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>),
    Clock: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>),
    Dumbbell: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7.972-7.972a4 4 0 0 1 5.656 5.656L8.657 15.657"/><path d="m11 21-7.972-7.972a4 4 0 0 1 5.656-5.656L16.657 15.343"/></svg>),
    Book: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>),
    Calendar: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>),
    Dollar: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>),
    Briefcase: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>),
    XCircle: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>),
    Leaf: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 1.45 6"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>),
    Pen: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>),
    Trash: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>),
    Plus: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>),
    ChevronLeft: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>),
    ChevronRight: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>),
    Settings: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
    MoreVertical: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>),
    Globe: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>),
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
    Trash: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>),
    Plus: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>),
    User: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>),
    Info: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>),
    School: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>),
    X: React.memo(({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12" /></svg>),
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
        error: "Errore",
        clickToConfig: "Clicca per configurare",
        mentalState: "Stato Mentale",
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
        analysis: "Analisi",
        current: "Attuale",
        progress: "Progresso",
        clickToEditGoal: "Clicca per modificare obiettivo",
        pcOnStatus: "Sì",
        pcOffStatus: "No",
        supabaseInitError: "Errore inizializzazione Supabase:",
        databaseError: "Errore database: verifica URL e Key",
        supabaseNotConfigured: "Supabase non configurato. Clicca sul pallino per impostare URL e Key.",
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
        ranks: {
            zombie: "Zombi Scolastico",
            naufrago: "Naufrago dei Voti",
            allarme: "Allarme Rosso",
            limbo: "Studente nel Limbo",
            principiante: "Principiante Assoluto",
            esploratore: "Esploratore di Libri",
            promessa: "Studente Promessa",
            elite: "Elite Accademica",
            maestro: "Maestro Supremo",
            divinita: "Divinità del Registro"
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
        error: "Error",
        clickToConfig: "Click to configure",
        mentalState: "Mental State",
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
        analysis: "Analysis",
        current: "Current",
        progress: "Progress",
        clickToEditGoal: "Click to edit goal",
        pcOnStatus: "Yes",
        pcOffStatus: "No",
        supabaseInitError: "Supabase initialization error:",
        databaseError: "Database error: check URL and Key",
        supabaseNotConfigured: "Supabase not configured. Click the dot to set URL and Key.",
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
        ranks: {
            zombie: "School Zombie",
            naufrago: "Grade Castaway",
            allarme: "Red Alert",
            limbo: "Student in Limbo",
            principiante: "Absolute Beginner",
            esploratore: "Book Explorer",
            promessa: "Promising Student",
            elite: "Academic Elite",
            maestro: "Supreme Master",
            divinita: "Registry Deity"
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
        error: "Erreur",
        clickToConfig: "Cliquer pour configurer",
        mentalState: "État Mental",
        moodAvg: "Moyenne Humeur",
        motivationAvg: "Moyenne Motivation",
        week: "Semaine",
        schoolGrades: "Matières et Notes",
        schoolGradesDesc: "Gérez vos matières et vos progrès",
        addSubjectPlaceholder: "Exemple : Maths, Français...",
        gradesCount: "notes",
        noTopic: "Aucun sujet",
        testRegistry: "Registre des Évaluations",
        testRegistryDesc: "Planifiez et gérez vos épreuves",
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
        analysis: "Analyse",
        current: "Actuel",
        progress: "Progrès",
        clickToEditGoal: "Cliquer pour modifier l'objectif",
        pcOnStatus: "Oui",
        pcOffStatus: "Non",
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
        ranks: {
            zombie: "Zombie Scolaire",
            naufrago: "Naufragé des Notes",
            allarme: "Alerte Rouge",
            limbo: "Étudiant dans le Limbo",
            principiante: "Débutant Absolu",
            esploratore: "Explorateur de Livres",
            promessa: "Étudiant Prometteur",
            elite: "Élite Académique",
            maestro: "Maître Suprême",
            divinita: "Divinité du Registre"
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
        error: "Fehler",
        clickToConfig: "Zum Konfigurieren klicken",
        mentalState: "Mentaler Zustand",
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
        analysis: "Analyse",
        current: "Aktuell",
        progress: "Fortschritt",
        clickToEditGoal: "Klicken, um Ziel zu bearbeiten",
        pcOnStatus: "Ja",
        pcOffStatus: "Nein",
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
        ranks: {
            zombie: "Schul-Zombie",
            naufrago: "Noten-Schiffbrüchiger",
            allarme: "Roter Alarm",
            limbo: "Schüler im Limbo",
            principiante: "Absoluter Anfänger",
            esploratore: "Bücher-Entdecker",
            promessa: "Vielversprechender Schüler",
            elite: "Akademische Elite",
            maestro: "Oberster Meister",
            divinita: "Gottheit des Registers"
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


const ProgressBar = React.memo(({ value, max, colorClass = "bg-green-500", height = "h-2", isLight = false }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div className={`w-full ${isLight ? 'bg-slate-200' : 'bg-[#1f2937]'} rounded-full ${height}`}>
            <div className={`${colorClass} rounded-full ${height}`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
});

const Header = React.memo(({ totalHabits, completedHabits, totalPossible, currentDate, onNext, onPrev, onNextYear, onPrevYear, onExport, onImportClick, syncCode, setSyncCode, syncWord, setSyncWord, syncStatus, syncError, apiBase, setApiBase, supabaseConfig, setSupabaseConfig, isLight, openSyncSettings, doneToday, notDoneToday, totalTasks, saveCount, t, language }) => {
    const progress = totalPossible > 0 ? (completedHabits / totalPossible) * 100 : 0;
    const monthName = useMemo(() => getMonthName(currentDate.getFullYear(), currentDate.getMonth(), language), [currentDate, language]);
    const year = currentDate.getFullYear();
    
    return (
        <Card isLight={isLight} className="mb-6 flex flex-col gap-4 !rounded-xl" noPadding>
            <div className="p-5 flex flex-col gap-4">
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
                        <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.year}</span>
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
                        <button onClick={onExport} className={`px-3 py-1 rounded-full ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} text-xs font-bold transition-colors`}>{t.export}</button>
                        <button onClick={onImportClick} className={`px-3 py-1 rounded-full ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} text-xs font-bold transition-colors`}>{t.import}</button>
                    </div>
                </div>
            </div>

            <div className={`flex items-center justify-between flex-wrap gap-4 pt-4 border-t ${isLight ? 'border-slate-100' : 'border-[#1f2937]'}`}>
                <div className={`px-4 py-1.5 rounded-full ${isLight ? 'bg-blue-50 text-blue-600' : 'bg-blue-900/20 text-blue-400'} text-sm font-bold flex items-center gap-2 shadow-sm`}>
                    <Icons.Calendar />
                    {getTodayDisplay(language)}
                </div>

                <div className="flex items-center gap-6 md:gap-10">
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{t.done}</div>
                        <div className={`text-lg font-black ${isLight ? 'text-green-600' : 'text-green-400'}`}>{doneToday || 0}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{t.missing}</div>
                        <div className={`text-lg font-black ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>{notDoneToday || 0}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{t.total}</div>
                        <div className={`text-lg font-black ${isLight ? 'text-blue-500' : 'text-blue-400'}`}>{totalTasks || 0}</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{t.sync}</div>
                        <div className={`text-lg font-black ${isLight ? 'text-purple-500' : 'text-purple-400'}`}>{saveCount || 0}</div>
                    </div>
                </div>

                <div className="flex-1 max-w-xs ml-auto">
                    <div className="flex justify-between mb-1 items-center">
                        <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} uppercase font-bold tracking-wider`}>{t.dailyCompletion}</span>
                        <span className={`text-xs font-black ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{totalTasks > 0 ? ((doneToday / totalTasks) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                    <ProgressBar value={doneToday} max={totalTasks} height="h-2.5" isLight={isLight} />
                </div>
            </div>
        </div>
    </Card>
);
});


const HabitGrid = React.memo(({ habits, onToggle, onRename, onUpdateGoal, onDelete, onAdd, currentDate, daysInMonth, dailyStats, onUpdateIcon, isLight, t, language }) => {
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
    const iconOptions = ["Check", "Clock", "Dumbbell", "Book", "Calendar", "Dollar", "Briefcase", "XCircle", "Leaf", "Pen", "Droplet", "Heart", "Coffee", "Apple", "Bicycle", "Music", "Code", "Home", "Star", "Brain", "Yoga", "Sun", "Moon", "Target"];
    return (
        <Card isLight={isLight} noPadding overflow={true} className="flex flex-col !rounded-xl">
            <div className="flex">
                {/* Left Column: Habit Names */}
                <div className={`flex-shrink-0 border-r ${isLight ? 'border-slate-100 bg-white' : 'border-[#1f2937] bg-[#0f172a]'} z-10`} style={{ width: leftWidth }}>
                    <div className={`h-8 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0b1220] border-[#1f2937]'} border-b`}></div>
                    <div className={`h-12 ${isLight ? 'bg-slate-50 border-slate-100 text-slate-800' : 'bg-[#0b1220] border-[#1f2937] text-slate-200'} border-b flex items-center justify-center font-bold`}>
                        {t.habits}
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
                            <div className={`flex h-8 ${isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#0b1220] border-[#1f2937]'} border-b transition-colors duration-300`}>
                                {Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, i) => {
                                    const size = Math.min(7, daysInMonth - i * 7);
                                    const w = cellWidth * size;
                                    return (
                                        <div key={i} className={`flex-shrink-0 flex items-center justify-center border-r ${isLight ? 'border-slate-100 text-slate-500' : 'border-[#1f2937] text-slate-300'} text-[10px] font-bold transition-colors duration-300`} style={{ width: w }}>
                                            {`${t.week} ${i + 1}`}
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
                        const { actual, scaledGoal, percentage, currentStreak, bestStreak } = useMemo(() => {
                            let act = 0;
                            for (let d = 1; d <= daysInMonth; d++) {
                                const dk = getDateKey(year, month, d);
                                if (habit.completedDates[dk]) act++;
                            }
                            const goal = Math.round((habit.goal || 0) * daysInMonth / 31);
                            const den = Math.max(1, goal);
                            const perc = Math.round((act / den) * 100);
                            const streaks = calculateStreak(habit.completedDates);
                            return {
                                actual: act,
                                scaledGoal: goal,
                                percentage: perc,
                                currentStreak: streaks.current,
                                bestStreak: streaks.best
                            };
                        }, [habit.completedDates, habit.goal, daysInMonth, year, month]);
                        
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
            backgroundColor: isLight ? `hsl(${hue}, 60%, 85%)` : `hsl(${hue}, 60%, 15%)`,
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

const SchoolGradesView = ({ 
    schoolData, isLight, openSyncSettings, t, language,
    onAddSubject, onDeleteSubject, onUpdateSubjectTeacher, onUpdateSubjectSufficiency, onAddGrade, onUpdateGrade, onDeleteGrade,
    onAddTest, onUpdateTest, onDeleteTest, onUpdateSettings, onUpdateTargetAverage, onCompleteTest,
    onAddTask, onToggleTask, onDeleteTask, onUpdateTask, getLevelInfo
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
    const [showSettings, setShowSettings] = useState(false);

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
            s.grades
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

        // Use Recharts components from window if available
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
                            <div className={`text-[10px] md:text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-widest mb-1 transition-colors duration-300`}>{t.avg}</div>
                            <div className={`text-2xl md:text-4xl font-black ${getGradeStyle(totalAverageDisplay, max, base, isLight).text.split(' ')[0]} transition-colors duration-300`}>
                                {totalAverageDisplay}
                            </div>
                            <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}>
                                <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${parseFloat(totalAverageDisplay) >= sufficiency ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                {subjects.length} {t.subjects}
                            </div>
                        </div>
                    </Card>

                    <Card isLight={isLight} group className="relative">
                        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-purple-600/5 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                        <div className="relative">
                            <div className={`text-[10px] md:text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-widest mb-1 transition-colors duration-300`}>{t.nextTest}</div>
                            <div className={`text-2xl md:text-4xl font-black ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
                                {upcomingTests.length > 0 ? (
                                    <div className="flex items-baseline gap-2">
                                        <span>{new Date(upcomingTests[0].date).getDate()}</span>
                                        <span className="text-xs md:text-sm font-bold uppercase">{new Date(upcomingTests[0].date).toLocaleString(getLocale(language), { month: 'short' })}</span>
                                    </div>
                                ) : '0'}
                            </div>
                            <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300 truncate`}>
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-purple-500 shrink-0"></span>
                                <span className="truncate">{upcomingTests.length > 0 ? (schoolData.subjects.find(s => s.id === upcomingTests[0].subjectId)?.name || t.test) : t.noTests}</span>
                            </div>
                        </div>
                    </Card>

                    <Card isLight={isLight} group className="relative">
                        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-green-600/5 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                        <div className="relative">
                            <div className={`text-[10px] md:text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-widest mb-1 transition-colors duration-300`}>{t.bestSubject}</div>
                            <div className={`text-lg md:text-2xl font-black ${isLight ? 'text-green-600' : 'text-green-400'} truncate`}>
                                {stats.best ? stats.best.name : '-'}
                            </div>
                            <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}>
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500"></span>
                                {stats.best ? `${stats.best.avg}` : '0.00'}
                            </div>
                        </div>
                    </Card>

                    <Card isLight={isLight} group className="relative">
                        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-red-600/5 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                        <div className="relative">
                            <div className={`text-[10px] md:text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-widest mb-1 transition-colors duration-300`}>{t.worstSubject}</div>
                            <div className={`text-lg md:text-2xl font-black ${isLight ? 'text-red-600' : 'text-red-400'} truncate`}>
                                {stats.worst ? stats.worst.name : '-'}
                            </div>
                            <div className={`mt-2 md:mt-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}>
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
                            <h3 className={`text-lg font-bold ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>{t.gradeTrend}</h3>
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
                                <div className="h-full flex items-center justify-center text-slate-500 font-medium">
                                    {!LChart ? t.loadingCharts : t.noGrades}
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card isLight={isLight}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className={`text-lg font-bold ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300`}>{t.upcomingTests}</h3>
                            <button onClick={() => setActiveSchoolTab('tests')} className={`${isLight ? 'text-blue-600' : 'text-blue-400'} text-sm hover:underline`}>{t.viewAll}</button>
                        </div>
                        <div className="space-y-4">
                            {upcomingTests.slice(0, 4).map(test => {
                                const subject = schoolData.subjects.find(s => s.id === test.subjectId);
                                const locale = getLocale(language);
                                return (
                                    <div key={test.id} className={`flex items-center gap-4 p-3 ${isLight ? 'bg-slate-50' : 'bg-[#1e293b]/50'} rounded-2xl transition-colors duration-300`}>
                                        <div className={`flex flex-col items-center justify-center w-10 h-10 shrink-0 ${isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-600/20 text-blue-400'} rounded-xl`}>
                                            <span className="text-[10px] font-bold uppercase">{new Date(test.date).toLocaleString(locale, { month: 'short' })}</span>
                                            <span className="text-lg font-black leading-none">{new Date(test.date).getDate()}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`font-bold text-sm ${isLight ? 'text-slate-700' : 'text-slate-100'} truncate`}>{subject?.name || t.subjectDeleted}</div>
                                            <div className="text-[10px] text-slate-500 truncate">{test.type}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {upcomingTests.length === 0 && (
                                <div className="text-center py-8 text-slate-500 italic text-sm">{t.noTestsPlanned}</div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Latest Averages Section */}
                <Card isLight={isLight}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className={`text-lg font-bold ${isLight ? 'text-slate-700' : 'text-slate-100'}`}>{t.latestAverages}</h3>
                        <button onClick={() => setActiveSchoolTab('subjects')} className={`${isLight ? 'text-blue-600' : 'text-blue-400'} text-sm hover:underline font-bold`}>{t.allSubjects}</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {schoolData.subjects.slice(0, 8).map(subject => {
                            const filteredGrades = (subject.grades || []).filter(g => isDateInSemester(g.date));
                            const avg = calculateAverage(filteredGrades);
                            return (
                                <div key={subject.id} className={`p-4 rounded-2xl ${isLight ? 'bg-slate-50' : 'bg-[#1e293b]/30'} border ${isLight ? 'border-slate-100' : 'border-[#1f2937]'} transition-all hover:scale-[1.02]`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`font-bold text-sm ${isLight ? 'text-slate-700' : 'text-slate-200'} truncate mr-2`}>{subject.name}</span>
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
                    <h2 className={`text-3xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300`}>{t.schoolGrades}</h2>
                    <p className="text-slate-500 font-medium mt-1">{t.schoolGradesDesc}</p>
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
                    className={`flex-1 ${isLight ? 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400' : 'bg-[#0f172a] border-[#1f2937] text-slate-200 focus:border-blue-500'} border rounded-2xl px-6 py-4 focus:outline-none transition-all shadow-inner`}
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
                        <Card key={subject.id} isLight={isLight} group className="hover:shadow-xl relative duration-300">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center justify-between mb-4 md:mb-6">
                                <div className="flex-1 min-w-0 mr-4">
                                    <h3 className={`text-lg md:text-2xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} group-hover:text-blue-400 transition-colors duration-300 truncate`}>{subject.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">{filteredGrades.length} {t.gradesCount}</div>
                                        <span className="text-slate-600">•</span>
                                        <div className="flex items-center gap-1">
                                            <Icons.User className="w-3 h-3 text-slate-500" />
                                            <input 
                                                type="text"
                                                value={subject.teacher || ''}
                                                onChange={(e) => onUpdateSubjectTeacher(subject.id, e.target.value)}
                                                placeholder={t.teacherPlaceholder}
                                                className={`text-[10px] md:text-xs font-bold bg-transparent border-none focus:ring-0 p-0 ${isLight ? 'text-slate-500 placeholder:text-slate-300' : 'text-slate-400 placeholder:text-slate-600'} w-20 md:w-24 truncate transition-all`}
                                            />
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
                                        <div className={`text-base md:text-xl font-black px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl ${getGradeStyle(avg, max, subjectSufficiency, isLight).text}`}>
                                            {avg > 0 ? avg : '-'}
                                        </div>
                                        <button 
                                            onClick={() => onDeleteSubject(subject.id)}
                                            className={`text-slate-600 hover:text-red-400 p-2 transition-colors ${isLight ? 'bg-slate-100' : 'bg-[#1e293b]'} rounded-xl`}
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

                            <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6 min-h-[40px] md:min-h-[48px]">
                                {filteredGrades.map(grade => (
                                    <div key={grade.id} className="relative group/grade">
                                        <button 
                                            onClick={() => {
                                                setAddingGradeTo(subject.id);
                                                setEditingGradeId(grade.id);
                                                setGradeForm({ value: grade.value, date: grade.date, topic: grade.topic || '', weight: grade.weight ?? 1 });
                                            }}
                                            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex flex-col items-center justify-center font-black text-xs md:text-sm border-2 transition-all hover:scale-110 shadow-lg ${getGradeStyle(grade.value, max, subjectSufficiency, isLight).text} relative`}
                                        >
                                            <span>{grade.value}</span>
                                            {grade.weight === 0 && (
                                                <div className="absolute -top-1 -right-1 bg-slate-500 text-white rounded-full p-0.5 shadow-sm border border-white dark:border-slate-900" title="Peso 0">
                                                    <Icons.Info className="w-2.5 h-2.5" />
                                                </div>
                                            )}
                                        </button>
                                        
                                        {/* Tooltip per data e argomento - Nascondi su mobile per evitare overlay fastidiosi */}
                                        <div className={`hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 ${isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-800 border-slate-700 text-white'} text-[10px] p-2 rounded-xl opacity-0 group-hover/grade:opacity-100 transition-opacity pointer-events-none z-20 shadow-2xl border`}>
                                            <div className="font-bold text-blue-400 mb-1">{new Date(grade.date).toLocaleDateString(getLocale(language))}</div>
                                            {grade.weight !== 1 && <div className="text-purple-400 font-bold mb-1">{t.weight}: {grade.weight}</div>}
                                            {grade.topic && <div className={`${isLight ? 'text-slate-500' : 'text-slate-300'} italic leading-tight`}>"{grade.topic}"</div>}
                                            {!grade.topic && <div className="text-slate-500 italic text-[9px]">{t.noTopic}</div>}
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
                                        className={`hidden md:flex w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl border-2 border-dashed ${isLight ? 'border-slate-200' : 'border-[#1f2937]'} flex items-center justify-center text-slate-600 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer group/add`}
                                    >
                                        <svg className="w-5 h-5 md:w-6 md:h-6 group-hover/add:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                )}
                            </div>

                            <div className={`h-1.5 md:h-2 w-full ${isLight ? 'bg-slate-100' : 'bg-[#1e293b]'} rounded-full overflow-hidden shadow-inner transition-colors duration-300`}>
                                <div 
                                    className={`h-full transition-all duration-1000 ease-out bg-gradient-to-r ${getGradeStyle(avg, max, subjectSufficiency, isLight).bar}`}
                                    style={{ width: `${Math.min(100, Math.max(0, ((parseFloat(avg) - base) / (max - base || 1)) * 100))}%` }}
                                />
                            </div>

                            {/* Predittore Obiettivo Media */}
                            <div className={`mt-4 p-3 md:p-4 rounded-2xl ${isLight ? 'bg-slate-50' : 'bg-[#0f172a]'} transition-all duration-300`}>
                                <div className="flex flex-row items-center justify-between gap-2 md:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5 md:mb-1">{t.targetAvg}</div>
                                        <input 
                                            type="number" step="0.1" min={base} max={max}
                                            value={targetAverages[subject.id] || ''}
                                            onChange={(e) => onUpdateTargetAverage(subject.id, e.target.value)}
                                            placeholder={avg > 0 ? avg : '8.0'}
                                            className={`w-full bg-transparent border-none p-0 text-xs md:text-sm font-bold focus:ring-0 ${isLight ? 'text-slate-700 placeholder:text-slate-300' : 'text-slate-200 placeholder:text-slate-600'}`}
                                        />
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5 md:mb-1">{t.neededGrade}</div>
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
        
        return (
        <div className="space-y-6">
            <Card isLight={isLight} className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-[2rem] shadow-xl">
                <div className="text-center md:text-left">
                    <h2 className={`text-2xl md:text-3xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300`}>{t.testRegistry}</h2>
                    <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">{t.testRegistryDesc}</p>
                </div>
                <button 
                    onClick={() => setShowAddTest(true)}
                    className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-purple-900/20 flex items-center gap-2 justify-center"
                >
                    <Icons.Plus className="w-5 h-5" />
                    {t.newTest}
                </button>
            </Card>

            <div className="space-y-3 md:space-y-4">
        {schoolData.tests.filter(t => isDateInSemester(t.date)).sort((a,b) => a.date.localeCompare(b.date)).map(test => {
            const subject = schoolData.subjects.find(s => s.id === test.subjectId);
            const isPast = test.date < getTodayKey();
            const locale = getLocale(language);
            return (
                <Card key={test.id} isLight={isLight} className={`flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 ${isPast ? (isLight ? 'border-red-200 bg-red-50/30' : 'border-red-900/30') : ''} hover:scale-[1.01]`}>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`flex flex-col items-center justify-center w-12 h-12 md:w-16 md:h-16 shrink-0 ${isPast ? (isLight ? 'bg-red-100 text-red-600' : 'bg-red-900/20 text-red-400') : 'bg-purple-600/20 text-purple-400'} rounded-xl md:rounded-2xl transition-colors duration-300`}>
                            <span className="text-[9px] md:text-xs font-black uppercase">{new Date(test.date).toLocaleString(locale, { month: 'short' })}</span>
                            <span className="text-lg md:text-2xl font-black leading-none">{new Date(test.date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <h4 className={`text-base md:text-xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300 truncate`}>{subject?.name || t.subjectDeleted}</h4>
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-wider ${test.type === t.written ? (isLight ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/10 text-blue-400') : (isLight ? 'bg-orange-100 text-orange-600' : 'bg-orange-500/10 text-orange-400')} transition-colors duration-300`}>
                                    {test.type}
                                </span>
                            </div>
                            <p className={`text-[10px] md:text-sm ${isLight ? 'text-slate-500' : 'text-slate-500'} font-medium transition-colors duration-300 truncate`}>{test.note || t.noNotes}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full md:w-auto gap-2 border-t md:border-none pt-3 md:pt-0">
                        <div className="flex gap-1.5 md:gap-2">
                            <button onClick={() => startEditingTest(test)} className={`p-2.5 md:p-3 ${isLight ? 'bg-slate-100 text-slate-500 hover:text-blue-500 hover:bg-blue-50' : 'bg-slate-800/50 text-slate-500 hover:text-blue-400 hover:bg-blue-900/20'} rounded-xl md:rounded-2xl transition-all duration-300`}>
                                <Icons.Pen className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button onClick={() => onDeleteTest(test.id)} className={`p-2.5 md:p-3 ${isLight ? 'bg-slate-100 text-slate-500 hover:text-red-500 hover:bg-red-50' : 'bg-slate-800/50 text-slate-500 hover:text-red-400 hover:bg-red-900/20'} rounded-xl md:rounded-2xl transition-all duration-300`}>
                                <Icons.Trash className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        </div>

                        {isPast && (
                            <div className={`flex items-center gap-1.5 md:gap-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1e293b] border-[#1f2937]'} p-1 rounded-xl md:rounded-2xl border transition-colors duration-300 ml-auto`}>
                                <input 
                                    type="number" step="0.5" min={base} max={max} placeholder={t.grade}
                                    className={`w-10 md:w-16 bg-transparent text-center font-black text-xs md:text-base ${isLight ? 'text-blue-600' : 'text-blue-400'} focus:outline-none`}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            onCompleteTest(test, e.target.value);
                                        }
                                    }}
                                />
                                <button onClick={(e) => onCompleteTest(test, e.target.previousSibling.value)} className="bg-green-600 p-1.5 md:p-2 rounded-lg md:rounded-xl text-white hover:bg-green-500 transition-all duration-300">
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
                        <p className={`font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{t.noTestsPlannedRegistry}</p>
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
                        <h2 className={`text-2xl md:text-3xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors duration-300`}>{t.tasks}</h2>
                        <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">{t.tasksDesc}</p>
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
                                    <div className={`absolute top-0 left-0 w-1 h-full ${task.completed ? 'bg-green-500' : isOverdue ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-bold text-sm md:text-base ${isLight ? 'text-slate-700' : 'text-slate-100'} ${task.completed ? 'line-through' : ''} truncate`}>
                                                    {task.title}
                                                </h3>
                                                {subject && (
                                                    <div className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${isLight ? 'text-blue-600' : 'text-blue-400'} mt-1`}>
                                                        {subject.name}
                                                    </div>
                                                )}
                                            </div>
                                            <button 
                                                onClick={() => onToggleTask(task.id)}
                                                className={`w-10 h-10 md:w-6 md:h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${task.completed ? 'bg-green-500 border-green-500 text-white' : isLight ? 'border-slate-200 text-transparent hover:border-blue-500' : 'border-[#1f2937] text-transparent hover:border-blue-500'}`}
                                            >
                                                <Icons.Check className="w-5 h-5 md:w-4 md:h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between mt-1 md:mt-2">
                                            <div className={`flex items-center gap-1.5 text-[10px] md:text-xs font-bold ${isOverdue ? 'text-red-500' : isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                                <Icons.Calendar className="w-3.5 h-3.5" />
                                                {new Date(task.dueDate).toLocaleDateString(getLocale(language), { day: 'numeric', month: 'short' })}
                                            </div>
                                            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={() => {
                                                        setTaskForm({ id: task.id, title: task.title, dueDate: task.dueDate, subjectId: task.subjectId });
                                                        setShowAddTask(true);
                                                    }}
                                                    className={`p-3 md:p-2 rounded-xl ${isLight ? 'hover:bg-blue-50 text-blue-500' : 'hover:bg-blue-900/20 text-blue-400'}`}
                                                >
                                                    <Icons.Pen className="w-5 h-5 md:w-4 md:h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => onDeleteTask(task.id)}
                                                    className={`p-3 md:p-2 rounded-xl ${isLight ? 'hover:bg-red-50 text-red-500' : 'hover:bg-red-900/20 text-red-400'}`}
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
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500">
                            <div className={`w-20 h-20 rounded-full ${isLight ? 'bg-slate-100' : 'bg-[#1e293b]'} flex items-center justify-center mb-4`}>
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
                        <h3 className={`text-xl md:text-2xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} capitalize transition-colors duration-300`}>
                            {calendarDate.toLocaleString(getLocale(language), { month: 'long', year: 'numeric' })}
                        </h3>
                        <Card isLight={isLight} noPadding overflow={true} className="flex !rounded-xl">
                            <button onClick={prevMonth} className={`p-2 ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1e293b]'} ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300`}>
                                <Icons.ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={nextMonth} className={`p-2 ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1e293b]'} ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300 border-l ${isLight ? 'border-slate-200' : 'border-[#1f2937]'}`}>
                                <Icons.ChevronRight className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setCalendarDate(new Date())}
                                className={`px-3 py-1 text-[10px] font-black uppercase tracking-tighter ${isLight ? 'hover:bg-slate-50 text-slate-500' : 'hover:bg-[#1e293b] text-slate-500'} transition-colors duration-300 border-l ${isLight ? 'border-slate-200' : 'border-[#1f2937]'}`}
                            >
                                {t.today}
                            </button>
                        </Card>
                    </div>
                    <div className="flex flex-wrap gap-3 md:gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest overflow-x-auto no-scrollbar py-1">
                        <div className={`flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300 whitespace-nowrap`}><span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-purple-500 rounded-full shadow-sm shadow-purple-900/20"></span> {t.test}</div>
                        <div className={`flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300 whitespace-nowrap`}><span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-blue-600 rounded-full shadow-sm shadow-blue-900/20"></span> {t.tasks}</div>
                        <div className={`flex items-center gap-2 ${isLight ? 'text-slate-500' : 'text-slate-400'} transition-colors duration-300 whitespace-nowrap`}><span className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full shadow-sm shadow-green-900/20"></span> {t.grade}</div>
                    </div>
                </div>

                <Card isLight={isLight} noPadding overflow className="shadow-2xl overflow-x-auto no-scrollbar">
                    <div className="min-w-[600px] md:min-w-full">
                        <div className={`grid grid-cols-7 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-[#1f2937] bg-[#1e293b]/50'} transition-colors duration-300`}>
                            {[t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun].map(d => (
                                <div key={d} className={`py-4 text-center text-[10px] font-black ${isLight ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-widest transition-colors duration-300`}>{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {days.map((date, i) => {
                                if (!date) return <div key={`empty-${i}`} className={`h-24 md:h-32 border-b border-r ${isLight ? 'border-slate-100 bg-slate-50/30' : 'border-[#1f2937] bg-[#0b1220]/30'} transition-colors duration-300`}></div>;
                                
                                const dateKey = formatDate(date);
                                const dayTests = schoolData.tests.filter(t => t.date === dateKey && isDateInSemester(t.date));
                                const dayTasks = (schoolData.tasks || []).filter(t => t.dueDate === dateKey && isDateInSemester(t.dueDate));
                                const dayGrades = schoolData.subjects.flatMap(s => s.grades.filter(g => g.date === dateKey && isDateInSemester(g.date)).map(g => ({...g, subjectName: s.name, subjectId: s.id})));
                                
                                const isToday = dateKey === getTodayKey();

                                return (
                                    <div key={dateKey} className={`h-24 md:h-32 border-b border-r ${isLight ? 'border-slate-100' : 'border-[#1f2937]'} p-1.5 md:p-2 relative transition-all duration-300 hover:bg-blue-500/5 ${isToday ? (isLight ? 'bg-blue-50' : 'bg-blue-600/5') : ''}`}>
                                        <span className={`text-xs md:text-sm font-black ${isToday ? 'bg-blue-600 text-white w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full shadow-lg shadow-blue-900/40' : isLight ? 'text-slate-700' : 'text-slate-500'} transition-all duration-300`}>
                                            {date.getDate()}
                                        </span>
                                        <div className="mt-1 space-y-0.5 md:space-y-1 overflow-y-auto max-h-[calc(100%-1.5rem)] no-scrollbar">
                                            {dayTests.map(t => (
                                                <button 
                                                    key={t.id} 
                                                    onClick={() => startEditingTest(t)}
                                                    className={`w-full text-left text-[8px] md:text-[9px] font-bold bg-purple-600 text-white p-0.5 md:p-1 rounded md:rounded-md truncate shadow-sm transition-all duration-300 hover:scale-105 active:scale-95`}
                                                >
                                                    {t.type.charAt(0)}: {schoolData.subjects.find(s => s.id === t.subjectId)?.name}
                                                </button>
                                            ))}
                                            {dayTasks.map(task => (
                                                <button 
                                                    key={task.id} 
                                                    onClick={() => {
                                                        setTaskForm({ ...task });
                                                        setShowAddTask(true);
                                                    }}
                                                    className={`w-full text-left text-[8px] md:text-[9px] font-bold ${task.completed ? (isLight ? 'bg-slate-200 text-slate-500' : 'bg-slate-800 text-slate-500') : 'bg-blue-600 text-white'} p-0.5 md:p-1 rounded md:rounded-md truncate shadow-sm transition-all duration-300 hover:scale-105 active:scale-95`}
                                                >
                                                    {task.title}
                                                </button>
                                            ))}
                                            {dayGrades.map(g => {
                                                const subject = schoolData.subjects.find(s => s.id === g.subjectId);
                                                const subSufficiency = subject?.sufficiency ?? sufficiency;
                                                return (
                                                    <button 
                                                        key={g.id} 
                                                        onClick={() => {
                                                            setAddingGradeTo(g.subjectId);
                                                            setEditingGradeId(g.id);
                                                            setGradeForm({ value: g.value, date: g.date, topic: g.topic || '', weight: g.weight ?? 1 });
                                                        }}
                                                        className={`w-full text-left text-[8px] md:text-[9px] font-bold ${getGradeStyle(g.value, max, subSufficiency, isLight).text.split(' ')[1]} ${getGradeStyle(g.value, max, subSufficiency, isLight).text.split(' ')[0]} p-0.5 md:p-1 rounded md:rounded-md truncate shadow-sm transition-all duration-300 hover:scale-105 active:scale-95`}
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
                        <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} font-medium text-sm md:text-base`}>{t.schoolDesc}</p>
                    </div>
                </div>

                {/* Filter and Settings Toggle */}
                <div className="flex flex-col items-center gap-4 w-full justify-center">
                    <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#1e293b] border-slate-700'} border rounded-2xl p-1.5 flex items-center gap-1 shadow-inner w-full md:w-fit overflow-x-auto no-scrollbar`}>
                        <button 
                            onClick={() => setSemesterFilter('1')}
                            className={`flex-1 md:flex-none px-3 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 whitespace-nowrap ${semesterFilter === '1' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : (isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800')}`}
                        >
                            {t.semester1}
                        </button>
                        <button 
                            onClick={() => setSemesterFilter('2')}
                            className={`flex-1 md:flex-none px-3 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 whitespace-nowrap ${semesterFilter === '2' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : (isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800')}`}
                        >
                            {t.semester2}
                        </button>
                        <button 
                            onClick={() => setSemesterFilter('all')}
                            className={`flex-1 md:flex-none px-3 md:px-6 py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all duration-300 whitespace-nowrap ${semesterFilter === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : (isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800')}`}
                        >
                            {t.all}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                        <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-3 rounded-2xl border transition-all duration-300 ${showSettings ? 'bg-blue-600 border-blue-600 text-white' : (isLight ? 'bg-white border-slate-200 text-slate-400 hover:text-blue-600' : 'bg-[#1e293b] border-slate-700 text-slate-500 hover:text-blue-400')}`}
                        >
                            <Icons.Settings className={`w-5 h-5 ${showSettings ? 'animate-spin-slow' : ''}`} />
                        </button>
                        <button 
                            onClick={() => setActiveSchoolTab('dashboard')}
                            className={`md:hidden p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200 text-slate-400' : 'bg-[#1e293b] border-slate-700 text-slate-500'}`}
                        >
                            <Icons.Home className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Collapsible Settings */}
                {showSettings && (
                    <div className={`w-full max-w-3xl animate-in fade-in slide-in-from-top-4 duration-300 p-6 rounded-3xl border ${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-[#1e293b] border-slate-700 shadow-2xl shadow-black/20'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Grades Settings */}
                            <div className="space-y-4">
                                <h3 className={`text-xs font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'} mb-2`}>{t.grade} {t.settings}</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 h-4">
                                            <span className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.min}</span>
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
                                            <span className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.sufficiency}</span>
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
                                            <span className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.max}</span>
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
                                <h3 className={`text-xs font-black uppercase tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'} mb-2`}>{t.semesterDates}</h3>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <span className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.semester1}</span>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="date" 
                                                value={schoolData.semester1Start || ''}
                                                onChange={(e) => onUpdateSettings('semester1Start', e.target.value)}
                                                className={`flex-1 h-10 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#0f172a] border-slate-800 text-slate-200'} text-[10px] font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                                            />
                                            <span className="text-slate-400">-</span>
                                            <input 
                                                type="date" 
                                                value={schoolData.semester1End || ''}
                                                onChange={(e) => onUpdateSettings('semester1End', e.target.value)}
                                                className={`flex-1 h-10 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#0f172a] border-slate-800 text-slate-200'} text-[10px] font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.semester2}</span>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="date" 
                                                value={schoolData.semester2Start || ''}
                                                onChange={(e) => onUpdateSettings('semester2Start', e.target.value)}
                                                className={`flex-1 h-10 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#0f172a] border-slate-800 text-slate-200'} text-[10px] font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                                            />
                                            <span className="text-slate-400">-</span>
                                            <input 
                                                type="date" 
                                                value={schoolData.semester2End || ''}
                                                onChange={(e) => onUpdateSettings('semester2End', e.target.value)}
                                                className={`flex-1 h-10 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#0f172a] border-slate-800 text-slate-200'} text-[10px] font-bold px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className={`flex p-1.5 ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0f172a] border-[#1f2937]'} border rounded-[2rem] md:rounded-3xl mb-8 w-full md:w-fit mx-auto overflow-x-auto no-scrollbar shadow-inner transition-all duration-300`}>
                {[
                    { id: 'dashboard', label: t.home, icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                    { id: 'subjects', label: t.subjects, icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                    { id: 'tests', label: t.tests, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
                    { id: 'tasks', label: t.tasks, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                    { id: 'calendar', label: t.calendar, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveSchoolTab(tab.id)}
                        className={`flex flex-1 items-center justify-center gap-2 px-3 md:px-6 py-3.5 rounded-[1.5rem] md:rounded-2xl text-[11px] md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeSchoolTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1e293b]'}`}
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
                {activeSchoolTab === 'calendar' && renderCalendar()}
            </div>

            {addingGradeTo && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card isLight={isLight} className="p-8 max-w-md w-full shadow-2xl !rounded-3xl">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className={`text-2xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors`}>
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
                                        className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all`}
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
                                        className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all`}
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
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all`}
                                    value={gradeForm.date}
                                    onChange={e => setGradeForm({...gradeForm, date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.topicOptional}</label>
                                <input 
                                    type="text" 
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all`}
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
                                    className={`flex-1 px-6 py-4 rounded-2xl font-bold text-base ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'} transition-all active:scale-95`}
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

            {showAddTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card isLight={isLight} className="p-8 max-w-md w-full shadow-2xl !rounded-3xl">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className={`text-2xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors`}>
                                {taskForm.id ? t.editTask : t.addTask}
                            </h4>
                            <button onClick={() => { setShowAddTask(false); setTaskForm({ title: '', dueDate: getTodayKey(), subjectId: '' }); }} className="text-slate-500 hover:text-red-500 transition-colors">
                                <Icons.X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.tasks}</label>
                                <input 
                                    type="text" 
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all`}
                                    value={taskForm.title}
                                    onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                                    placeholder={t.taskPlaceholder}
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.dueDate}</label>
                                <input 
                                    type="date" 
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all`}
                                    value={taskForm.dueDate}
                                    onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.subjects}</label>
                                <select 
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all`}
                                    value={taskForm.subjectId}
                                    onChange={e => setTaskForm({...taskForm, subjectId: e.target.value})}
                                >
                                    <option value="">{t.selectSubject}</option>
                                    {(schoolData.subjects || []).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button 
                                    onClick={() => { setShowAddTask(false); setTaskForm({ title: '', dueDate: getTodayKey(), subjectId: '' }); }} 
                                    className={`flex-1 px-6 py-4 rounded-2xl font-bold text-base ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'} transition-all active:scale-95`}
                                >
                                    {t.cancel}
                                </button>
                                <button 
                                    onClick={() => {
                                        if (taskForm.id) {
                                            onUpdateTask(taskForm.id, { title: taskForm.title, dueDate: taskForm.dueDate, subjectId: taskForm.subjectId });
                                        } else {
                                            onAddTask(taskForm);
                                        }
                                        setShowAddTask(false);
                                        setTaskForm({ title: '', dueDate: getTodayKey(), subjectId: '' });
                                    }}
                                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                                >
                                    {taskForm.id ? t.update : t.save}
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {showAddTest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card isLight={isLight} className="max-w-md w-full shadow-2xl transform scale-100">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className={`text-2xl font-black ${isLight ? 'text-slate-700' : 'text-slate-100'} transition-colors`}>
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
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all`}
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
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all`}
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
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${testForm.type === type ? 'bg-purple-600 text-white' : isLight ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-[#1e293b] text-slate-400 hover:bg-slate-800'}`}
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
                                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#1e293b] border-[#1f2937] text-slate-200'} border rounded-2xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-all`}
                                    value={testForm.note}
                                    onChange={e => setTestForm({...testForm, note: e.target.value})}
                                    placeholder={t.notePlaceholder}
                                />
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => setShowAddTest(false)} className={`flex-1 px-6 py-4 rounded-2xl font-bold text-base ${isLight ? 'text-slate-500 hover:bg-slate-50' : 'text-slate-400 hover:bg-slate-800'} transition-all active:scale-95`}>{t.cancel}</button>
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
    const deviceIdRef = useRef(localStorage.getItem('tracker_device_id') || (() => {
        const nid = 'dev-' + Math.random().toString(36).slice(2);
        localStorage.setItem('tracker_device_id', nid);
        return nid;
    })());

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
            return { ...defaultData, ...parsed };
        } catch { return defaultData; }
    });

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

    const supabaseClient = useMemo(() => {
        try {
            if (apiBase === 'supabase://' && supabaseConfig.url && supabaseConfig.key && window.supabase) {
                return window.supabase.createClient(supabaseConfig.url, supabaseConfig.key);
            }
        } catch (e) {
            console.error(t.supabaseInitError, e);
        }
        return null;
    }, [apiBase, supabaseConfig, t]);

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
                        throw new Error(t.databaseError);
                    }
                } else {
                    if (apiBase === 'supabase://') {
                        throw new Error(t.supabaseNotConfigured);
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
                setSyncError(err.message || t.connectionError);
            }
        };
        fetchServer();
        return () => { cancelled = true; };
    }, [syncCode, syncWord, apiBase, supabaseClient, t]);

    useEffect(() => {
        if (!syncCode) return;
        if (isRemoteUpdateRef.current) return;
        if (!isLocalChangeRef.current) return;
        
        let t_sync = null;
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
                        throw new Error(t.supabaseNotConfiguredShort);
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
                setSyncError(err.message || t.connectionError);
            }
        };
        t_sync = setTimeout(push, 800);
        return () => { if (t_sync) clearTimeout(t_sync); };
    }, [habits, mentalState, schoolData, syncCode, syncWord, apiBase, t]);

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
        setHabits(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            return next;
        });
        setUpdatedAt(Date.now());
        isLocalChangeRef.current = true;
    };

    const updateMentalStateData = (updater) => {
        setMentalState(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            return next;
        });
        setUpdatedAt(Date.now());
        isLocalChangeRef.current = true;
    };

    const updateSchoolDataState = (updater) => {
        setSchoolData(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            return next;
        });
        setUpdatedAt(Date.now());
        isLocalChangeRef.current = true;
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

    const updateGoal = useCallback((id, value) => {
        updateField(updateHabits, 'goal')(id, value);
    }, []);

    const updateHabitIcon = useCallback((id, value) => {
        updateField(updateHabits, 'icon')(id, value);
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
        updateSchoolDataState(prev => {
            const tasks = prev.tasks || [];
            const task = tasks.find(t => t.id === taskId);
            const isNowCompleted = task ? !task.completed : false;
            
            // Assegna 50 XP se il compito viene completato (rimosso addXP statico)
            if (isNowCompleted) {
                // Il calcolo XP è ora puramente dinamico
            }
            
            return {
                ...prev,
                tasks: tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
            };
        });
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

    const getLevelInfo = (schoolData) => {
        const t = translations[language];
        // Calcolo XP puramente dinamico basato sullo stato attuale
        let totalXP = 0;
        const globalSufficiency = schoolData?.sufficiency ?? 6;
        const base = schoolData?.minGrade ?? 0;
        const max = schoolData?.maxGrade ?? 10;
        const todayKey = getTodayKey();
        
        if (schoolData) {
            // 1. XP dai VOTI (Formula Normalizzata):
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
            schoolData.tasks?.forEach(t => {
                if (t.completed) totalXP += 20;
            });
        }

        // Definiamo i ranghi con soglie ricalibrate per il nuovo sistema
        const ranks = [
            // --- CATEGORIA: NEGATIVI (I "Gironi dell'Inferno") ---
            { 
                name: t.ranks.zombie, 
                minXP: -Infinity, 
                emoji: "🧟" 
            },
            { 
                name: t.ranks.naufrago, 
                minXP: -500, 
                emoji: "🏝️" 
            },
            { 
                name: t.ranks.allarme, 
                minXP: -200, 
                emoji: "🚨" 
            },
            { 
                name: t.ranks.limbo, 
                minXP: -100, 
                emoji: "☁️" 
            },

            // --- CATEGORIA: NEUTRI (La "Zona di Confine") ---
            { 
                name: t.ranks.principiante, 
                minXP: 0, 
                emoji: "🥚" 
            },
            { 
                name: t.ranks.esploratore, 
                minXP: 200, 
                emoji: "🧭" 
            },

            // --- CATEGORIA: POSITIVI (L' "Olimpo degli Studenti") ---
            { 
                name: t.ranks.promessa, 
                minXP: 600, 
                emoji: "🌱" 
            },
            { 
                name: t.ranks.elite, 
                minXP: 1500, 
                emoji: "💎" 
            },
            { 
                name: t.ranks.maestro, 
                minXP: 3000, 
                emoji: "🧙" 
            },
            { 
                name: t.ranks.divinita, 
                minXP: 6000, 
                emoji: "🐲" 
            }
        ];

        // Trova il rango attuale
        let currentRankIndex = 0;
        for (let i = ranks.length - 1; i >= 0; i--) {
            if (totalXP >= ranks[i].minXP) {
                currentRankIndex = i;
                break;
            }
        }

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
        addGrade(test.subjectId, gradeValue, test.date);
        deleteTest(test.id);
    };

    // Calculate stats for current month
    const totalPossibleCompletions = habits.length * daysInMonth;
    
    const actualCompletions = useMemo(() => habits.reduce((acc, h) => {
        for(let d=1; d<=daysInMonth; d++) {
            if(h.completedDates[getDateKey(year, month, d)]) acc++;
        }
        return acc;
    }, 0), [habits, daysInMonth, year, month]);

    const dailyStats = useMemo(() => {
        const stats = Array.from({ length: daysInMonth }, (_, i) => {
            const dk = getDateKey(year, month, i + 1);
            let done = 0;
            for (let j = 0; j < habits.length; j++) {
                if (habits[j].completedDates[dk]) done++;
            }
            return { 
                day: i + 1, 
                done, 
                notDone: habits.length - done, 
                percentage: habits.length ? (done / habits.length) * 100 : 0 
            };
        });
        return stats;
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
                        const doneCount = habits.filter(h => !!h.completedDates[todayKey]).length;
                        
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
                                    Object.values(mentalState.logs).reduce((acc, l) => acc + ((l.mood || 0) > 0 || ((l.motivation || 0) > 0) ? 1 : 0), 0)
                                }
                                t={t}
                                language={language}
                            />
                        );
                    })()}

                    {showSyncSettings && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <Card isLight={isLight} noPadding={true} className="w-full max-w-md shadow-2xl transform scale-100">
                                <div className={`p-6 border-b ${isLight ? 'border-slate-100' : 'border-[#1f2937]'} flex justify-between items-center bg-gradient-to-r ${isLight ? 'from-blue-50 to-indigo-50' : 'from-blue-900/20 to-indigo-900/20'}`}>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {t.syncSettings}
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
                                            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.backendUrl}</label>
                                            <input 
                                                type="text" 
                                                placeholder={t.backendPlaceholder}
                                                className={`w-full px-4 py-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 focus:ring-blue-500/20' : 'bg-slate-900 border-slate-700 focus:ring-blue-500/20'} focus:outline-none focus:ring-4 transition-all font-mono text-sm`}
                                                value={syncSettingsForm.apiBase}
                                                onChange={e => setSyncSettingsForm({...syncSettingsForm, apiBase: e.target.value})}
                                            />
                                            <p className={`mt-1 text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{t.supabaseDesc}</p>
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
                                                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.syncCodeLabel}</label>
                                                <input 
                                                    type="text" 
                                                    placeholder={t.syncCodePlaceholder}
                                                    className={`w-full px-4 py-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-700'} focus:outline-none font-mono text-sm`}
                                                    value={syncSettingsForm.syncCode}
                                                    onChange={e => setSyncSettingsForm({...syncSettingsForm, syncCode: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{t.password}</label>
                                                <input 
                                                    type="password" 
                                                    placeholder={t.optional}
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
                                <Card isLight={isLight} className="h-[220px] !rounded-xl" noPadding>
                                    <div className="p-4 h-full">
                                        <div className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'} mb-2`}>{t.monthlyProgress}</div>
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
                                <Card isLight={isLight} className="h-[220px] !rounded-xl" noPadding>
                                    <div className="p-4 h-full">
                                        <div className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'} mb-2`}>{t.completion}</div>
                                        <TwoToneDonutGauge percent={totalPossibleCompletions > 0 ? (actualCompletions / totalPossibleCompletions) * 100 : 0} isLight={isLight} />
                                    </div>
                                </Card>
                                <Card isLight={isLight} className="h-[220px] !rounded-xl" noPadding>
                                    <div className="p-4 h-full">
                                        <div className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'} mb-2`}>{t.weeklyAverages}</div>
                                        <WeeklyBarsSmall weeks={weeklyPercents} isLight={isLight} />
                                    </div>
                                </Card>
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
