import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Plus, X, Home, ChevronLeft, ChevronRight, Settings, Wand2, Check, Calendar, Library, Target, Folder, FileText, Save, Pencil, Trash2, ArrowUp, ArrowDown, Activity, Palette, CalendarDays, CalendarRange, Clock, AlertTriangle, Image as ImageIcon, BarChart3, PieChart, Layout, Zap, Leaf, Monitor, Briefcase, GripVertical, Scale, BookOpen, Waves, CloudRain, Sun, Moon, Globe, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Task, DayOfWeek, DAYS_ORDER, AIPlanResponse } from './types';
import AIModal from './components/AIModal';
import { v4 as uuidv4 } from 'uuid';

// --- TYPES & THEMES ---

type Theme = 'tactical' | 'classic' | 'minimal' | 'cyber' | 'forest' | 'oceanic' | 'nebula' | 'sunset';

const THEMES_CONFIG: Record<Theme, { name: string; description: string; colors: string[]; icon: React.FC<any> }> = {
    tactical: {
        name: 'Táctico',
        description: 'Operativo. Estructura rígida, datos puros.',
        colors: ['#0f172a', '#f97316', '#1e293b'],
        icon: Target
    },
    classic: {
        name: 'Clásico',
        description: 'Cálido, madera, esquinas suaves.',
        colors: ['#281412', '#fb923c', '#4a2e2b'],
        icon: Calendar
    },
    minimal: {
        name: 'Minimalista',
        description: 'Limpio. Sin bordes, solo espacio y luz.',
        colors: ['#f8fafc', '#0f172a', '#ffffff'],
        icon: Briefcase
    },
    cyber: {
        name: 'Cyberpunk',
        description: 'Futuro. Ángulos rectos, neón, cristal.',
        colors: ['#09090b', '#d946ef', '#06b6d4'],
        icon: Zap
    },
    forest: {
        name: 'Bosque',
        description: 'Orgánico. Texturas naturales.',
        colors: ['#052e16', '#22c55e', '#14532d'],
        icon: Leaf
    },
    oceanic: {
        name: 'Océano',
        description: 'Fluido. Cristal líquido, muy redondeado.',
        colors: ['#082f49', '#0ea5e9', '#0c4a6e'],
        icon: Waves
    },
    nebula: {
        name: 'Nébula',
        description: 'Etéreo. Flotante, sin gravedad.',
        colors: ['#2e1065', '#a855f7', '#000000'],
        icon: Moon
    },
    sunset: {
        name: 'Atardecer',
        description: 'Energía. Bloques sólidos y cálidos.',
        colors: ['#451a03', '#f59e0b', '#7c2d12'],
        icon: Sun
    }
};

// --- Helper Functions ---

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0,0,0,0);
  return d;
}

const getWeekId = (date: Date) => {
  const d = getStartOfWeek(date);
  // Manual formatting to ensure browser compatibility (Safari/Chrome/Firefox consistency)
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekRangeString = (date: Date) => {
  const curr = new Date(date);
  // Correct logic for Monday start (Mon=0 ... Sun=6)
  const currentDayIndex = curr.getDay() === 0 ? 6 : curr.getDay() - 1;
  
  const firstDate = new Date(curr);
  firstDate.setDate(curr.getDate() - currentDayIndex);
  
  const lastDate = new Date(firstDate);
  lastDate.setDate(firstDate.getDate() + 6);

  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  
  const firstMonth = months[firstDate.getMonth()];
  const lastMonth = months[lastDate.getMonth()];
  
  if (firstMonth === lastMonth) {
    return `${firstDate.getDate()} - ${lastDate.getDate()} ${lastMonth}`;
  }
  return `${firstDate.getDate()} ${firstMonth} - ${lastDate.getDate()} ${lastMonth}`;
};

const getColumnDate = (dayName: string, referenceDate: Date): Date => {
  const dayIndex = DAYS_ORDER.indexOf(dayName as DayOfWeek);
  const curr = new Date(referenceDate);
  const currentDayIndex = curr.getDay() === 0 ? 6 : curr.getDay() - 1; // Adjust for Sunday=0
  
  const diff = dayIndex - currentDayIndex;
  const targetDate = new Date(curr);
  targetDate.setDate(curr.getDate() + diff);
  
  return targetDate;
};

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h:${m.toString().padStart(2, '0')}m`;
};

const formatDurationShort = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

// --- DATA: Syllabus Topics with COLORS ---
interface SyllabusTopic {
  id: number;
  title: string;
  color: string; // Added color property
  type: 'specific' | 'legislation'; // NEW: Category type
}

const DEFAULT_SYLLABUS_TOPICS: SyllabusTopic[] = [
  // Specific
  { id: 1, title: "Teoría del fuego", color: "#ef4444", type: 'specific' },
  { id: 2, title: "Agentes extintores", color: "#3b82f6", type: 'specific' },
  { id: 3, title: "Equipos de protección", color: "#eab308", type: 'specific' },
  { id: 4, title: "Herramientas", color: "#a855f7", type: 'specific' },
  { id: 5, title: "Construcción", color: "#f97316", type: 'specific' },
  { id: 6, title: "Sistemas protección", color: "#ec4899", type: 'specific' },
  { id: 7, title: "Intervenciones Ventilación", color: "#06b6d4", type: 'specific' },
  { id: 8, title: "Incendios forestales", color: "#22c55e", type: 'specific' },
  { id: 9, title: "Vehículos", color: "#6366f1", type: 'specific' },
  { id: 10, title: "Gases", color: "#14b8a6", type: 'specific' },
  { id: 11, title: "CTE", color: "#d946ef", type: 'specific' },
  { id: 12, title: "Electricidad", color: "#facc15", type: 'specific' },
  { id: 13, title: "MMPP", color: "#f43f5e", type: 'specific' },
  { id: 14, title: "Hidráulica", color: "#0ea5e9", type: 'specific' },
  { id: 15, title: "Protección civil", color: "#8b5cf6", type: 'specific' },
  { id: 16, title: "LPRL", color: "#84cc16", type: 'specific' },
  { id: 17, title: "Física", color: "#64748b", type: 'specific' },
  { id: 18, title: "Radiocomunicaciones", color: "#0284c7", type: 'specific' },
  { id: 19, title: "Socorrismo", color: "#10b981", type: 'specific' },
  { id: 20, title: "Ascensores", color: "#f59e0b", type: 'specific' },
  { id: 21, title: "Himenópteros", color: "#a3e635", type: 'specific' },
  // Legislation - UPDATED COLORS TO BE VISIBLE ON DARK BACKGROUNDS (High Contrast)
  { id: 101, title: "Constitución Española", color: "#e2e8f0", type: 'legislation' }, // Slate-200
  { id: 102, title: "Estatuto de Autonomía", color: "#cbd5e1", type: 'legislation' }, // Slate-300
  { id: 103, title: "Ley de Bases (LBRL)", color: "#94a3b8", type: 'legislation' }, // Slate-400
  { id: 104, title: "TREBEP", color: "#a5b4fc", type: 'legislation' }, // Indigo-300
  { id: 105, title: "Ley 39/2015 Procedimiento", color: "#bae6fd", type: 'legislation' }, // Sky-200
  { id: 106, title: "Ley 40/2015 Régimen J.", color: "#ddd6fe", type: 'legislation' }, // Violet-200
  { id: 107, title: "Ley de Igualdad", color: "#fbcfe8", type: 'legislation' }, // Pink-200
];

const TOPIC_COLORS_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", 
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", 
  "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e"
];


// --- Components ---

const ScrollableColumnSection: React.FC<{
    children: React.ReactNode;
    onClick: (e: React.MouseEvent) => void;
    label: string;
    className?: string;
    labelColorClass?: string;
    actionIcon?: React.ReactNode;
}> = ({ children, onClick, label, className, labelColorClass, actionIcon }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showArrow, setShowArrow] = useState(false);

    const checkOverflow = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            setShowArrow(scrollHeight > clientHeight && scrollTop + clientHeight < scrollHeight - 5);
        }
    };

    useLayoutEffect(() => {
        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [children]);

    return (
        <div 
            onClick={onClick}
            className={`flex-1 relative overflow-hidden flex flex-col ${className}`}
        >
            <span className={`absolute top-1 left-2 text-xs uppercase font-black tracking-widest z-10 pointer-events-none opacity-90 ${labelColorClass} drop-shadow-sm`}>
                {label}
            </span>
            
            <div 
                ref={scrollRef}
                onScroll={checkOverflow}
                className="flex-1 overflow-y-auto no-scrollbar pt-7 pb-2 px-2 relative z-0"
            >
                {children}
                
                {React.Children.count(children) === 0 && actionIcon && (
                    <div className="flex justify-center pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       {actionIcon}
                    </div>
                )}
            </div>

            <div className={`absolute bottom-0 left-0 right-0 h-6 flex justify-center items-end pointer-events-none transition-opacity duration-300 ${showArrow ? 'opacity-100' : 'opacity-0'}`}>
                <div className="animate-bounce bg-black/50 backdrop-blur rounded-full p-0.5">
                    <ArrowDown className="w-3 h-3 text-white" />
                </div>
            </div>
        </div>
    );
};

const TransitionLayer: React.FC = () => {
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${3 + Math.random() * 4}s`
  }));

  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const now = new Date();

  const getPastDate = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return {
      day: d.getDate(),
      month: months[d.getMonth()]
    };
  };

  const todayData = getPastDate(0);      
  const yesterdayData = getPastDate(1);  
  const twoDaysAgoData = getPastDate(2); 

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden perspective-container">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>

      {particles.map(p => (
        <div 
          key={p.id}
          className="absolute w-1 h-1 bg-white/30 rounded-full blur-[0.5px] animate-particle"
          style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.duration }}
        />
      ))}

      <div className="relative w-72 h-80 preserve-3d">
         <div className="absolute bottom-0 left-4 right-4 h-4 bg-black/50 blur-xl rounded-full translate-y-12"></div>
         <div className="absolute inset-0 bg-[#1e1e1e] rounded-xl shadow-2xl translate-z-[-2px] border border-white/10"></div>
         <div className="absolute -top-6 left-12 w-4 h-12 bg-gradient-to-b from-neutral-300 to-neutral-600 rounded-full z-50 shadow-md"></div>
         <div className="absolute -top-6 right-12 w-4 h-12 bg-gradient-to-b from-neutral-300 to-neutral-600 rounded-full z-50 shadow-md"></div>

         <div className="absolute inset-0 bg-[#121212] rounded-xl flex flex-col items-center justify-center border border-white/5 z-0 overflow-hidden">
             <div className="w-full h-2 bg-orange-500/20 absolute top-0"></div>
             <div className="text-orange-500/50 animate-pulse font-mono text-sm tracking-widest">CARGANDO SISTEMA...</div>
         </div>

         <div className="absolute inset-0 bg-[#e5e5e5] rounded-xl flex flex-col items-center pt-12 shadow-xl border-b-4 border-neutral-300 animate-tear-3 origin-top z-20">
            <span className="text-neutral-900 font-bold text-8xl font-serif tracking-tighter">{todayData.day}</span>
            <span className="text-red-600 font-bold text-2xl uppercase tracking-[0.5em] mt-2">{todayData.month}</span>
            <div className="absolute bottom-8 w-16 h-1 bg-neutral-200 rounded-full"></div>
         </div>

         <div className="absolute inset-0 bg-white rounded-xl flex flex-col items-center pt-12 shadow-2xl border-b-4 border-neutral-200 animate-tear-2 origin-top z-30">
            <span className="text-black font-bold text-8xl font-serif tracking-tighter">{yesterdayData.day}</span>
            <span className="text-red-600 font-bold text-2xl uppercase tracking-[0.5em] mt-2">{yesterdayData.month}</span>
            <div className="absolute bottom-8 w-16 h-1 bg-neutral-100 rounded-full"></div>
         </div>
         
         <div className="absolute inset-0 bg-white rounded-xl flex flex-col items-center pt-12 shadow-2xl border-b-4 border-neutral-200 animate-tear-1 origin-top z-40">
            <span className="text-black font-bold text-8xl font-serif tracking-tighter">{twoDaysAgoData.day}</span>
            <span className="text-red-600 font-bold text-2xl uppercase tracking-[0.5em] mt-2">{twoDaysAgoData.month}</span>
            <div className="absolute bottom-8 w-16 h-1 bg-neutral-100 rounded-full"></div>
         </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  theme: Theme;
}> = ({ isOpen, onClose, onConfirm, theme }) => {
  if (!isOpen) return null;

  const modalStyles = {
    tactical: 'bg-[#1e293b] border border-slate-700 text-slate-200 shadow-2xl rounded-sm font-mono',
    classic: 'bg-[#3a2826] border-red-900/30 text-orange-100 rounded-2xl',
    minimal: 'bg-white border border-zinc-200 text-zinc-800 shadow-2xl shadow-zinc-200 rounded-[2rem]',
    cyber: 'bg-black/90 backdrop-blur-xl border border-red-500/50 text-red-100 shadow-[0_0_30px_rgba(220,38,38,0.2)] rounded-none',
    forest: 'bg-[#052e16] border border-emerald-800 text-emerald-100 shadow-2xl shadow-black rounded-lg',
    oceanic: 'bg-[#0c4a6e] border border-sky-500/30 text-sky-100 shadow-2xl shadow-sky-900/50 rounded-3xl',
    nebula: 'bg-[#2e1065] border border-purple-500/30 text-purple-100 shadow-2xl shadow-purple-900/50 rounded-2xl',
    sunset: 'bg-[#7c2d12] border border-orange-500/30 text-orange-100 shadow-2xl shadow-orange-900/50 rounded-xl'
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className={`${modalStyles[theme]} max-w-sm w-full p-6 transform scale-100`}>
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold mb-2">¿Eliminar tarea?</h3>
            <p className="text-sm opacity-70">
              Esta acción no se puede deshacer. ¿Estás seguro de que quieres borrar esto?
            </p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button 
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 font-medium transition-colors text-sm"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/20 transition-colors text-sm"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickLinkConfigModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentUrl: string;
    onSave: (url: string) => void;
    theme: Theme;
}> = ({ isOpen, onClose, currentUrl, onSave, theme }) => {
    const [url, setUrl] = useState(currentUrl);

    useEffect(() => {
        if(isOpen) setUrl(currentUrl);
    }, [isOpen, currentUrl]);

    if (!isOpen) return null;

    // Reuse simplistic styles map
    const getModalStyles = () => {
        switch (theme) {
            case 'minimal': return { bg: 'bg-white border-zinc-200', text: 'text-zinc-900', input: 'bg-zinc-50 border-zinc-200 text-zinc-900' };
            case 'cyber': return { bg: 'bg-black/90 border-fuchsia-500/30', text: 'text-fuchsia-50', input: 'bg-black/50 border-fuchsia-900/50 text-cyan-400' };
            case 'classic': return { bg: 'bg-[#3a2826] border-orange-900/50', text: 'text-orange-100', input: 'bg-[#281412] border-orange-900/30 text-white' };
            default: return { bg: 'bg-[#1e293b] border-slate-700', text: 'text-slate-200', input: 'bg-[#0f172a] border-slate-600 text-slate-200' };
        }
    }
    const s = getModalStyles();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="absolute inset-0" onClick={onClose}></div>
             <div className={`${s.bg} border p-6 rounded-2xl w-full max-w-sm shadow-2xl transform scale-100 transition-all`}>
                 <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${s.text}`}>
                     <LinkIcon className="w-5 h-5" />
                     Configurar Enlace
                 </h3>
                 <div className="space-y-4">
                     <div>
                         <label className={`text-xs font-bold uppercase opacity-70 mb-1 block ${s.text}`}>URL Destino</label>
                         <input 
                            type="text" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://..."
                            className={`w-full p-3 rounded-lg outline-none border transition-all ${s.input}`}
                         />
                     </div>
                     <button 
                        onClick={() => { onSave(url); onClose(); }}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg"
                     >
                         Guardar Enlace
                     </button>
                 </div>
             </div>
        </div>
    )
}

const TimeEntriesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  day: DayOfWeek | null;
  tasks: Task[];
  onDelete: (id: string) => void;
  theme: Theme;
}> = ({ isOpen, onClose, day, tasks, onDelete, theme }) => {
  if (!isOpen || !day) return null;

  const timeEntries = tasks.filter(t => t.day === day && t.title.startsWith('⏱'));
  const totalMinutes = timeEntries.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);

  const getStyles = (t: Theme) => {
    switch (t) {
        case 'minimal': return { 
            bg: 'bg-white border-zinc-200 rounded-[2rem]', 
            text: 'text-zinc-900', 
            header: 'border-b border-zinc-100',
            item: 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100 rounded-xl',
            highlight: 'text-zinc-600',
            iconColor: 'text-zinc-400 hover:text-red-500 hover:bg-red-50'
        };
        case 'cyber': return { 
            bg: 'bg-[#09090b] border-fuchsia-900/50 shadow-[0_0_40px_rgba(217,70,239,0.2)] rounded-none', 
            text: 'text-fuchsia-50', 
            header: 'border-b border-fuchsia-500/20',
            item: 'bg-fuchsia-900/10 border-fuchsia-900/20 hover:bg-fuchsia-900/20 hover:border-fuchsia-500/40 rounded-none',
            highlight: 'text-cyan-400',
            iconColor: 'text-fuchsia-500/50 hover:text-red-400 hover:bg-red-900/20'
        };
        case 'forest': return { 
            bg: 'bg-[#052e16] border-emerald-800 rounded-lg', 
            text: 'text-emerald-50', 
            header: 'border-b border-emerald-800/50',
            item: 'bg-[#064e3b] border-emerald-700/50 hover:bg-[#065f46] rounded',
            highlight: 'text-emerald-400',
            iconColor: 'text-emerald-600 hover:text-red-300 hover:bg-red-900/20'
        };
        case 'oceanic': return { 
            bg: 'bg-[#082f49] border-sky-800 shadow-[0_0_30px_rgba(14,165,233,0.2)] rounded-3xl', 
            text: 'text-sky-50', 
            header: 'border-b border-sky-700/50',
            item: 'bg-sky-900/30 border-sky-800/50 hover:bg-sky-800/50 rounded-2xl',
            highlight: 'text-sky-300',
            iconColor: 'text-sky-400 hover:text-red-300 hover:bg-red-900/20'
        };
        case 'nebula': return { 
            bg: 'bg-[#2e1065] border-purple-800 shadow-[0_0_30px_rgba(168,85,247,0.2)] rounded-2xl', 
            text: 'text-purple-50', 
            header: 'border-b border-purple-700/50',
            item: 'bg-purple-900/30 border-purple-800/50 hover:bg-purple-800/50 rounded-xl',
            highlight: 'text-purple-300',
            iconColor: 'text-purple-400 hover:text-red-300 hover:bg-red-900/20'
        };
        case 'sunset': return { 
            bg: 'bg-[#451a03] border-orange-800 shadow-[0_0_30px_rgba(249,115,22,0.2)] rounded-xl', 
            text: 'text-orange-50', 
            header: 'border-b border-orange-700/50',
            item: 'bg-orange-900/30 border-orange-800/50 hover:bg-orange-800/50 rounded-lg',
            highlight: 'text-orange-300',
            iconColor: 'text-orange-400 hover:text-red-300 hover:bg-red-900/20'
        };
        case 'classic': return { 
            bg: 'bg-[#281412] border-orange-900/50 rounded-xl', 
            text: 'text-orange-100', 
            header: 'border-b border-orange-900/30',
            item: 'bg-[#3a2826] border-orange-900/20 hover:bg-[#4a2e2b] rounded-lg',
            highlight: 'text-orange-400',
            iconColor: 'text-orange-900 hover:text-red-300 hover:bg-red-900/20'
        };
        case 'tactical': default: return { 
            bg: 'bg-[#1e293b] border-slate-700 rounded-none font-mono', 
            text: 'text-slate-200', 
            header: 'border-b border-slate-700',
            item: 'bg-[#0f172a] border-slate-800 hover:bg-[#334155] rounded-none',
            highlight: 'text-blue-400',
            iconColor: 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
        };
    }
  }
  const s = getStyles(theme);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="absolute inset-0" onClick={onClose}></div>
        <div className={`w-full max-w-sm overflow-hidden border shadow-2xl ${s.bg}`}>
            <div className={`p-4 flex justify-between items-center ${s.header}`}>
                <div className="flex items-center gap-2">
                    <Clock className={`w-5 h-5 ${s.highlight}`} />
                    <h3 className={`font-bold ${s.text}`}>Registros de Tiempo</h3>
                </div>
                <button onClick={onClose} className={`p-1 rounded-full hover:bg-white/10 ${s.text}`}><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                {timeEntries.length === 0 ? (
                    <div className="py-8 text-center opacity-50 text-xs">No hay registros de tiempo individuales.</div>
                ) : (
                    timeEntries.map(t => (
                        <div key={t.id} className={`flex items-center justify-between p-3 border transition-all ${s.item}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-black/20 text-xs font-mono font-bold ${s.highlight}`}>
                                    HR
                                </div>
                                <span className={`font-bold font-mono text-lg ${s.text}`}>{t.title.replace('⏱ ', '')}</span>
                            </div>
                            <button 
                                onClick={() => onDelete(t.id)}
                                className={`p-2 rounded-full transition-colors ${s.iconColor}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className={`p-4 ${s.header} border-t bg-black/20 flex justify-between items-center`}>
                <span className={`text-xs uppercase font-bold opacity-70 ${s.text}`}>Total Diario</span>
                <span className={`text-xl font-black font-mono ${s.highlight}`}>{formatDuration(totalMinutes)}</span>
            </div>
        </div>
    </div>
  );
};

const ThemeSelectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
}> = ({ isOpen, onClose, currentTheme, onSelectTheme }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="absolute inset-0" onClick={onClose}></div>
        <div className="relative w-full max-w-4xl bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl p-8 flex flex-col gap-6 z-10 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <Layout className="w-6 h-6 text-orange-500" />
                    <h3 className="text-2xl font-bold text-white">Seleccionar Estilo Visual</h3>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.keys(THEMES_CONFIG) as Theme[]).map((key) => {
                    const theme = THEMES_CONFIG[key];
                    const isSelected = currentTheme === key;
                    const Icon = theme.icon;

                    // Styles for preview rendering
                    let previewBg = '';
                    let previewAccent = '';
                    let borderColor = isSelected ? 'border-orange-500 ring-2 ring-orange-500/30' : 'border-white/10 hover:border-white/30';
                    
                    if (key === 'tactical') { previewBg = 'bg-[#0f172a]'; previewAccent = 'bg-orange-600'; }
                    else if (key === 'classic') { previewBg = 'bg-[#281412]'; previewAccent = 'bg-orange-400'; }
                    else if (key === 'minimal') { previewBg = 'bg-slate-100'; previewAccent = 'bg-slate-900'; }
                    else if (key === 'cyber') { previewBg = 'bg-[#09090b]'; previewAccent = 'bg-fuchsia-600'; }
                    else if (key === 'forest') { previewBg = 'bg-[#052e16]'; previewAccent = 'bg-emerald-600'; }
                    else if (key === 'oceanic') { previewBg = 'bg-[#082f49]'; previewAccent = 'bg-sky-500'; }
                    else if (key === 'nebula') { previewBg = 'bg-[#2e1065]'; previewAccent = 'bg-purple-500'; }
                    else if (key === 'sunset') { previewBg = 'bg-[#451a03]'; previewAccent = 'bg-orange-500'; }

                    return (
                        <button 
                            key={key}
                            onClick={() => { onSelectTheme(key); onClose(); }}
                            className={`group relative h-48 rounded-xl border-2 overflow-hidden transition-all duration-300 ${borderColor} scale-100 hover:scale-[1.02]`}
                        >
                            <div className={`absolute inset-0 ${previewBg} flex flex-col items-center justify-center p-4`}>
                                <div className={`w-full h-full border border-white/10 rounded-lg p-3 flex flex-col gap-2 shadow-lg ${key === 'minimal' ? 'bg-white shadow-sm' : 'bg-black/20'}`}>
                                     <div className="h-4 w-full rounded bg-white/10 flex items-center px-2 gap-2">
                                         <div className={`w-2 h-2 rounded-full ${previewAccent}`}></div>
                                         <div className="w-10 h-1 rounded-full bg-white/20"></div>
                                     </div>
                                     <div className="flex gap-2 flex-1">
                                         <div className="w-1/3 h-full rounded bg-white/5"></div>
                                         <div className="flex-1 h-full rounded border border-white/10 bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
                                            <div className={`absolute top-2 left-2 w-12 h-2 rounded ${previewAccent} opacity-50`}></div>
                                         </div>
                                     </div>
                                </div>
                            </div>
                            
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent flex items-end justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Icon className={`w-4 h-4 ${isSelected ? 'text-orange-500' : 'text-white'}`} />
                                        <h4 className={`font-bold text-sm ${isSelected ? 'text-orange-500' : 'text-white'}`}>{theme.name}</h4>
                                    </div>
                                    <p className="text-slate-400 text-[10px] mt-0.5">{theme.description}</p>
                                </div>
                                {isSelected && (
                                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-black shadow-lg shadow-orange-500/50">
                                        <Check className="w-4 h-4 font-bold" />
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
  );
}

const StatsDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  viewedWeekMinutes: number; 
  tasks: Task[]; 
  theme: Theme;
  viewedWeekId: string;
  currentRealWeekId: string;
}> = ({ isOpen, onClose, viewedWeekMinutes, tasks, theme, viewedWeekId, currentRealWeekId }) => {
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    const dailyData = useMemo(() => {
        return DAYS_ORDER.map((day, index) => {
            const minutes = tasks
                .filter(t => t.day === day && (t.weekId === viewedWeekId || (!t.weekId && viewedWeekId === currentRealWeekId)))
                .reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
            
            return {
                id: index,
                name: day.substring(0, 2), 
                minutes: minutes,
                label: day.substring(0, 3),
                fullLabel: day
            };
        });
    }, [tasks, viewedWeekId, currentRealWeekId]);

    const weeklyData = useMemo(() => {
        const data = [];
        const current = new Date(); 
        
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);
        current.setDate(diff);
        current.setHours(0,0,0,0);

        const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        for (let i = 3; i >= 0; i--) {
            const monday = new Date(current);
            monday.setDate(monday.getDate() - (i * 7));
            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);
            
            // Replicate manual formatting from getWeekId
            const y = monday.getFullYear();
            const m = String(monday.getMonth() + 1).padStart(2, '0');
            const d = String(monday.getDate()).padStart(2, '0');
            const weekId = `${y}-${m}-${d}`;
            
            const startDay = monday.getDate();
            const endDay = sunday.getDate();
            const month = monthNamesShort[monday.getMonth()];
            const label = `${startDay}-${endDay} ${month}`;

            const minutes = tasks
                .filter(t => (t.weekId === weekId) || (!t.weekId && weekId === currentRealWeekId))
                .reduce((acc, t) => acc + (t.durationMinutes || 0), 0);

            data.push({
                name: `${startDay}-${endDay}`,
                label: label,
                minutes: minutes,
                active: i === 0 
            });
        }
        return data;
    }, [tasks, currentRealWeekId]);

    const monthlyData = useMemo(() => {
        const data = [];
        const today = new Date();
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthIndex = d.getMonth();
            const year = d.getFullYear();
            
            const label = monthNamesShort[monthIndex];
            const fullLabel = monthNames[monthIndex];

            const totalMinutes = tasks.reduce((acc, t) => {
                let taskDate: Date;
                if (t.weekId) {
                    const [y, m, day] = t.weekId.split('-').map(Number);
                    taskDate = new Date(y, m - 1, day);
                } else {
                    taskDate = new Date(); 
                }

                const dayOffset = DAYS_ORDER.indexOf(t.day);
                const finalTaskDate = new Date(taskDate);
                if (t.weekId) {
                   finalTaskDate.setDate(finalTaskDate.getDate() + dayOffset);
                } else {
                    const curr = new Date();
                    const d = curr.getDay();
                    const diff = curr.getDate() - d + (d === 0 ? -6 : 1);
                    const mon = new Date(curr);
                    mon.setDate(diff);
                    finalTaskDate.setTime(mon.getTime());
                    finalTaskDate.setDate(mon.getDate() + dayOffset);
                }
                
                if (finalTaskDate.getMonth() === monthIndex && finalTaskDate.getFullYear() === year) {
                    return acc + (t.durationMinutes || 0);
                }
                return acc;
            }, 0);

            data.push({
                name: label,
                label: fullLabel,
                minutes: totalMinutes,
                active: i === 0
            });
        }
        return data;
    }, [tasks]);


    if (!isOpen) return null;

    const getStyles = (t: Theme) => {
        switch (t) {
            case 'classic': return { bg: 'bg-[#3a2826] border-orange-900/50', text: 'text-white', barActive: '#f97316', barInactive: '#27272a' };
            case 'minimal': return { bg: 'bg-white border border-zinc-200 shadow-2xl shadow-black/10', text: 'text-zinc-900', barActive: '#18181b', barInactive: '#e4e4e7' };
            case 'cyber': return { bg: 'bg-[#050505]/95 backdrop-blur-xl border border-fuchsia-500/40 shadow-[0_0_40px_rgba(217,70,239,0.15)]', text: 'text-fuchsia-50 drop-shadow-lg', barActive: '#d946ef', barInactive: '#18181b' };
            case 'forest': return { bg: 'bg-[#022c22] border border-emerald-700/50 shadow-2xl', text: 'text-emerald-50', barActive: '#10b981', barInactive: '#064e3b' };
            case 'oceanic': return { bg: 'bg-[#0c4a6e] border border-sky-700/50 shadow-2xl', text: 'text-sky-50', barActive: '#0ea5e9', barInactive: '#075985' };
            case 'nebula': return { bg: 'bg-[#2e1065] border border-purple-700/50 shadow-2xl', text: 'text-purple-50', barActive: '#a855f7', barInactive: '#4c1d95' };
            case 'sunset': return { bg: 'bg-[#7c2d12] border border-orange-700/50 shadow-2xl', text: 'text-orange-50', barActive: '#f97316', barInactive: '#7c2d12' };
            case 'tactical': default: return { bg: 'bg-[#0f172a] border border-slate-700 shadow-2xl', text: 'text-slate-100', barActive: '#f97316', barInactive: '#1e293b' };
        }
    }
    const styles = getStyles(theme);
    
    let chartData: any[] = [];
    let title = "";
    
    if (viewMode === 'daily') {
        chartData = dailyData;
        title = "Rendimiento Diario";
    } else if (viewMode === 'weekly') {
        chartData = weeklyData;
        title = "Historial Semanal";
    } else {
        chartData = monthlyData;
        title = "Historial Mensual";
    }
    
    const totalDisplayed = chartData.reduce((acc, curr) => acc + curr.minutes, 0);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className={`w-full max-w-3xl ${styles.bg} rounded-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
                 <div className={`p-5 border-b flex justify-between items-center ${theme === 'minimal' ? 'bg-zinc-50/80 border-zinc-200' : theme === 'cyber' ? 'bg-black/50 border-fuchsia-500/20' : theme === 'forest' ? 'bg-[#022c22] border-emerald-800/30' : 'bg-slate-900/50 border-white/5'}`}>
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme === 'minimal' ? 'bg-zinc-200 text-zinc-800' : theme === 'cyber' ? 'bg-fuchsia-900/20 text-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.3)]' : 'bg-white/10 text-white'}`}>
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className={`${styles.text} font-bold text-lg`}>{title}</h3>
                            <p className={`${theme === 'minimal' ? 'text-zinc-500' : theme === 'cyber' ? 'text-fuchsia-400/60' : 'text-slate-400'} text-xs`}>Análisis de carga operativa</p>
                        </div>
                     </div>
                     <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                 </div>
                 
                 <div className="p-6 flex-1 flex flex-col">
                     <div className="flex justify-center mb-8">
                         <div className={`flex p-1 rounded-lg border w-full max-w-md ${theme === 'minimal' ? 'bg-zinc-100 border-zinc-200' : theme === 'cyber' ? 'bg-black border-fuchsia-900/30' : 'bg-black/20 border-white/5'}`}>
                             {['daily', 'weekly', 'monthly'].map((mode) => (
                                 <button 
                                    key={mode}
                                    onClick={() => setViewMode(mode as any)}
                                    className={`flex-1 py-2 rounded-md text-xs md:text-sm font-bold transition-all capitalize ${
                                        viewMode === mode 
                                            ? (theme === 'minimal' ? 'bg-white shadow text-zinc-900' : theme === 'cyber' ? 'bg-fuchsia-600 text-black shadow-[0_0_15px_rgba(217,70,239,0.5)]' : 'bg-white/10 text-white shadow') 
                                            : 'text-slate-500 hover:text-slate-400'
                                    }`}
                                 >
                                    {mode === 'daily' ? 'Día' : mode === 'weekly' ? 'Semana' : 'Mes'}
                                 </button>
                             ))}
                         </div>
                     </div>
                     
                     <div className="w-full h-64 md:h-80 relative">
                        {totalDisplayed === 0 && (
                             <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                 <p className="text-slate-500 text-sm font-mono uppercase">Sin datos registrados</p>
                             </div>
                        )}
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <XAxis 
                                    dataKey={viewMode === 'daily' ? "label" : "name"} 
                                    stroke={theme === 'minimal' ? '#a1a1aa' : '#52525b'} 
                                    tick={{fill: theme === 'minimal' ? '#71717a' : '#a1a1aa', fontSize: 10, fontWeight: 'bold'}} 
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                    interval={0}
                                />
                                <YAxis hide />
                                <RechartsTooltip 
                                    cursor={{fill: theme === 'minimal' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{
                                        backgroundColor: theme === 'minimal' ? '#fff' : '#18181b', 
                                        borderColor: theme === 'minimal' ? '#e2e8f0' : 'rgba(255,255,255,0.1)', 
                                        color: theme === 'minimal' ? '#0f172a' : '#fff', 
                                        borderRadius: '8px', 
                                        padding: '10px',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                    }}
                                    formatter={(value: number) => [`${formatDuration(value)}`, 'Tiempo']}
                                    labelStyle={{color: '#94a3b8', marginBottom: '5px', fontSize: '12px'}}
                                />
                                <Bar dataKey="minutes" radius={[6, 6, 0, 0]} barSize={viewMode === 'daily' ? 40 : 50}>
                                    {chartData.map((entry, index) => {
                                        let isActive = (viewMode === 'weekly' || viewMode === 'monthly') ? entry.active : true;
                                        return <Cell key={`cell-${index}`} fill={isActive && entry.minutes > 0 ? styles.barActive : styles.barInactive} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                     
                     <div className="mt-8 grid grid-cols-2 gap-4">
                         <div className={`rounded-xl p-4 border flex flex-col items-center ${theme === 'minimal' ? 'bg-zinc-50 border-zinc-200' : 'bg-white/5 border-white/5'}`}>
                             <span className="text-xs text-slate-500 font-bold uppercase">Total Periodo</span>
                             <span className={`text-xl font-black mt-1 ${styles.text}`}>
                                 {formatDuration(totalDisplayed)}
                             </span>
                         </div>
                         <div className={`rounded-xl p-4 border flex flex-col items-center ${theme === 'minimal' ? 'bg-zinc-50 border-zinc-200' : 'bg-white/5 border-white/5'}`}>
                             <span className="text-xs text-slate-500 font-bold uppercase">Tendencia</span>
                             <span className="text-xl font-black text-green-500 mt-1 flex items-center gap-1">
                                 {totalDisplayed > 0 ? <ArrowUp className="w-4 h-4" /> : <Activity className="w-4 h-4 text-slate-500" />}
                                 {totalDisplayed > 0 ? 'Positiva' : 'Neut'}
                             </span>
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    );
}

const TaskBubble: React.FC<{ 
  task: Task; 
  onEdit: (task: Task) => void; 
  onDelete: (id: string) => void; 
  theme: Theme;
}> = ({ task, onEdit, onDelete, theme }) => {
  
  if (task.sticker || task.title.startsWith('⏱')) {
    return null;
  }

  const getTaskStyles = () => {
      const isCustom = task.color.startsWith('#');
      const isPersonal = task.color === 'personal';

      switch (theme) {
          case 'minimal':
              return {
                  container: 'bg-white border-0 shadow-sm rounded-[1.5rem] hover:shadow-md hover:-translate-y-0.5',
                  text: 'text-zinc-800 font-sans',
                  delete: 'text-zinc-300 hover:text-red-500' 
              };
          case 'cyber':
              return {
                  container: 'bg-black/60 backdrop-blur-sm border-l-2 border-r-0 border-y-0 border-l-fuchsia-500 rounded-none hover:bg-black/80 hover:shadow-[0_0_15px_rgba(217,70,239,0.3)]',
                  text: 'text-fuchsia-50 font-mono tracking-tight',
                  delete: 'text-fuchsia-500/50 hover:text-cyan-400'
              };
          case 'forest':
              return {
                  container: 'bg-[#052e16]/80 border-l-4 border-l-emerald-600 border-y-0 border-r-0 rounded-r-lg hover:bg-[#064e3b] shadow-sm',
                  text: 'text-emerald-50 font-medium',
                  delete: 'text-emerald-700 hover:text-emerald-300'
              };
          case 'oceanic':
              return {
                  container: 'bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl shadow-lg hover:bg-white/20',
                  text: 'text-sky-50 font-medium tracking-wide',
                  delete: 'text-sky-300/50 hover:text-white'
              };
          case 'nebula':
               return {
                  container: 'bg-purple-900/30 backdrop-blur-sm border-0 shadow-[0_4px_20px_rgba(0,0,0,0.2)] rounded-2xl hover:bg-purple-900/50',
                  text: 'text-purple-50 font-bold',
                  delete: 'text-purple-400/50 hover:text-white'
              };
          case 'sunset':
               return {
                  container: 'bg-gradient-to-br from-[#7c2d12] to-[#451a03] border-t border-orange-500/30 rounded-xl shadow-md hover:translate-y-[-2px]',
                  text: 'text-orange-50 font-medium',
                  delete: 'text-orange-300/50 hover:text-white'
              };
          case 'classic':
              if (isPersonal) return { container: 'bg-[#ffe4e6] border-[#fda4af] rounded-2xl', text: 'text-rose-900', delete: 'text-rose-300' };
              return { container: 'bg-black border-white/10 rounded-2xl', text: 'text-white', delete: 'text-white/50 hover:text-white' };
          case 'tactical':
          default:
              if (isPersonal) return { container: 'bg-[#2a1515] border border-red-900/50 rounded-none', text: 'text-red-100 font-mono', delete: 'text-white/20' };
              return { container: 'bg-[#1e293b] border border-slate-700 rounded-none shadow-none', text: 'text-slate-300 font-mono', delete: 'text-white/20' };
      }
  }
  
  const styles = getTaskStyles();
  let finalStyle = {};

  if (task.color.startsWith('#')) {
     if (theme === 'minimal') {
         finalStyle = { backgroundColor: 'white', borderLeft: `4px solid ${task.color}` };
     } else if (theme === 'cyber') {
         finalStyle = { borderLeftColor: task.color, boxShadow: `inset 2px 0 0 0 ${task.color}20` };
     } else if (theme === 'oceanic') {
         finalStyle = { backgroundColor: `${task.color}20`, borderColor: `${task.color}40` };
     } else if (theme === 'tactical') {
         finalStyle = { borderLeft: `2px solid ${task.color}` };
     } else {
         finalStyle = { backgroundColor: `${task.color}20` };
     }
  }

  return (
    <div 
      className={`relative group w-full p-3 mb-2 cursor-pointer transition-all duration-200 ${styles.container}`}
      style={finalStyle}
    >
      <div className="pr-6 relative z-10">
        {task.topicTitle && (
           <p className={`text-[9px] font-extrabold uppercase tracking-wider mb-1 opacity-70 truncate ${theme === 'cyber' ? 'text-cyan-400' : ''}`} style={task.color.startsWith('#') ? { color: task.color } : {}}>
             {task.topicTitle}
           </p>
        )}
        <p className={`leading-snug text-sm ${styles.text}`}>
          {task.title}
        </p>
        {task.description && (
          <p className={`text-[10px] mt-1.5 opacity-80 leading-tight font-medium break-words whitespace-pre-wrap ${theme === 'minimal' ? 'text-zinc-500' : 'text-white/70'}`}>{task.description}</p>
        )}
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className={`p-1 rounded hover:bg-black/10 transition-all ${styles.delete}`}
            title="Editar"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className={`p-1 rounded hover:bg-black/10 transition-all ${styles.delete}`}
            title="Eliminar"
          >
            <X className="w-3 h-3" />
          </button>
      </div>
    </div>
  );
};

const AddTaskModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: Omit<Task, 'id' | 'isCompleted'>) => void;
  onUpdate: (id: string, task: Partial<Task>) => void;
  initialDay: DayOfWeek;
  theme: Theme;
  syllabus: SyllabusTopic[]; 
  taskToEdit?: Task | null;
  initialSection?: 'legislation' | 'specific';
}> = ({ isOpen, onClose, onAdd, onUpdate, initialDay, theme, syllabus, taskToEdit, initialSection }) => {
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [category, setCategory] = useState('work'); 
  const [topicId, setTopicId] = useState<string>('');
  const [stickerUrl, setStickerUrl] = useState('https://i.imgur.com/RQfOVj0.png');
  const [showCustomSticker, setShowCustomSticker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        if (taskToEdit.title.startsWith('⏱')) setTitle(''); 
        else setTitle(taskToEdit.title);
        const duration = taskToEdit.durationMinutes !== undefined ? taskToEdit.durationMinutes : 0;
        setHours(Math.floor(duration / 60));
        setMinutes(duration % 60);
        if (taskToEdit.sticker) setStickerUrl(taskToEdit.sticker);
        if (taskToEdit.color === 'personal') { setCategory('personal'); setTopicId(''); }
        else if (taskToEdit.color === 'transparent') { setCategory('work'); }
        else if (taskToEdit.color.startsWith('#')) {
            setCategory(taskToEdit.color);
            const foundTopic = syllabus.find(t => t.color === taskToEdit.color && t.title === taskToEdit.topicTitle);
            if (foundTopic) setTopicId(foundTopic.id.toString());
        } else { setCategory('work'); }
      } else {
        setTitle(''); 
        setHours(0); 
        setMinutes(0); 
        setStickerUrl('https://i.imgur.com/RQfOVj0.png'); 
        setShowCustomSticker(false);

        if (initialSection === 'specific') {
            const firstSpecific = syllabus.find(s => s.type === 'specific');
            if (firstSpecific) {
                setTopicId(firstSpecific.id.toString());
                setCategory(firstSpecific.color);
            }
        } else if (initialSection === 'legislation') {
             const firstLegislation = syllabus.find(s => s.type === 'legislation');
             if (firstLegislation) {
                 setTopicId(firstLegislation.id.toString());
                 setCategory(firstLegislation.color);
             } else {
                 setTopicId('');
                 setCategory('work');
             }
        } else {
            setTopicId('');
            setCategory('work');
        }
      }
    }
  }, [isOpen, taskToEdit, syllabus, initialSection]);

  if (!isOpen) return null;

  const getModalStyles = () => {
      switch (theme) {
          case 'minimal': return { bg: 'bg-white border-0 shadow-2xl shadow-zinc-900/10', input: 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-2 focus:ring-zinc-900/10', text: 'text-zinc-800' };
          case 'cyber': return { bg: 'bg-black/90 backdrop-blur-xl border border-fuchsia-500/30 shadow-[0_0_50px_rgba(217,70,239,0.2)]', input: 'bg-black/50 border-fuchsia-900/50 text-fuchsia-50 focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)]', text: 'text-fuchsia-50' };
          case 'forest': return { bg: 'bg-[#052e16] border border-emerald-800 shadow-2xl shadow-black/50', input: 'bg-[#022c22] border-emerald-800/50 text-emerald-50 focus:border-emerald-500', text: 'text-emerald-50' };
          case 'oceanic': return { bg: 'bg-[#0c4a6e] border border-sky-600 shadow-2xl shadow-sky-900/50', input: 'bg-[#075985] border-sky-600/50 text-sky-50 focus:border-sky-400', text: 'text-sky-50' };
          case 'nebula': return { bg: 'bg-[#2e1065] border border-purple-600 shadow-2xl shadow-purple-900/50', input: 'bg-[#4c1d95] border-purple-600/50 text-purple-50 focus:border-purple-400', text: 'text-purple-50' };
          case 'sunset': return { bg: 'bg-[#7c2d12] border border-orange-600 shadow-2xl shadow-orange-900/50', input: 'bg-[#451a03] border-orange-600/50 text-orange-50 focus:border-orange-400', text: 'text-orange-50' };
          case 'classic': return { bg: 'bg-[#3a2826] border-orange-900/50', input: 'bg-[#281412] border-orange-900/30 text-white', text: 'text-orange-100' };
          case 'tactical': default: return { bg: 'bg-[#0f172a] border border-slate-700 shadow-2xl', input: 'bg-[#1e293b] border-slate-600 text-slate-200 focus:border-orange-500', text: 'text-slate-200' };
      }
  }
  const styles = getModalStyles();

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const val = e.target.value;
     if (val === 'personal') { setCategory('personal'); setTopicId(''); } 
     else {
         const topic = syllabus.find(t => t.id.toString() === val);
         if (topic) { setCategory(topic.color); setTopicId(val); }
     }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    let topicTitle = undefined;
    if (topicId) {
        const topic = syllabus.find(t => t.id.toString() === topicId);
        if (topic) topicTitle = topic.title;
    }
    const totalMinutes = 0;
    if (taskToEdit) onUpdate(taskToEdit.id, { title, color: category, topicTitle, durationMinutes: totalMinutes });
    else onAdd({ title, description: '', day: initialDay, durationMinutes: totalMinutes, color: category, topicTitle: topicTitle, sticker: undefined });
    onClose();
  };
  
  const handleAddSticker = () => {
    onAdd({ title: 'Sticker', description: '', day: initialDay, durationMinutes: 0, color: 'transparent', sticker: stickerUrl });
    onClose();
  };
  
  const handleQuickSticker = () => {
      onAdd({ title: 'Sticker', description: '', day: initialDay, durationMinutes: 0, color: 'transparent', sticker: 'https://i.imgur.com/RQfOVj0.png' });
      onClose();
  }

  const handleConfirmTime = (e: React.MouseEvent) => {
    e.preventDefault();
    const totalMinutes = (hours * 60) + minutes;
    if (totalMinutes <= 0) return;
    if (taskToEdit) onUpdate(taskToEdit.id, { title: `⏱ ${formatDuration(totalMinutes)}`, durationMinutes: totalMinutes });
    else onAdd({ title: `⏱ ${formatDuration(totalMinutes)}`, description: '', day: initialDay, durationMinutes: totalMinutes, color: 'work', sticker: undefined });
    onClose();
  };
  
  const addTime = (m: number) => {
      let total = (hours * 60) + minutes + m;
      if (total < 0) total = 0;
      setHours(Math.floor(total / 60));
      setMinutes(total % 60);
  };

  const selectStyle = category.startsWith('#') ? { color: category, fontWeight: 'bold' } : {};
  const isEdit = !!taskToEdit;
  
  const showSpecific = initialSection === 'specific' || !initialSection;
  const showLegislation = initialSection === 'legislation' || !initialSection;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl transform scale-100`}>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
          
          <div className={`flex-1 ${styles.bg} rounded-xl overflow-hidden flex flex-col`}>
            <div className={`p-4 border-b flex justify-between items-center ${theme === 'minimal' ? 'bg-zinc-50 border-zinc-200' : theme === 'cyber' ? 'bg-fuchsia-900/10 border-fuchsia-500/20' : theme === 'forest' ? 'bg-emerald-900/20 border-emerald-800/30' : theme === 'oceanic' ? 'bg-sky-900/20 border-sky-700/50' : theme === 'nebula' ? 'bg-purple-900/20 border-purple-700/50' : theme === 'sunset' ? 'bg-orange-900/20 border-orange-700/50' : theme === 'tactical' ? 'bg-slate-800/50 border-slate-700' : 'border-white/5 bg-white/5'}`}>
              <h3 className={`font-bold text-sm tracking-wider uppercase flex items-center gap-2 ${theme === 'minimal' ? 'text-zinc-900' : theme === 'cyber' ? 'text-cyan-400' : theme === 'forest' ? 'text-emerald-400' : theme === 'oceanic' ? 'text-sky-400' : theme === 'nebula' ? 'text-purple-400' : theme === 'sunset' ? 'text-orange-400' : 'text-orange-500'}`}>
                {isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isEdit ? 'Editar Tarea' : 'Nueva Operación'}
              </h3>
              <div className="md:hidden">
                  <button type="button" onClick={onClose} className="opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="p-5 space-y-4 flex-1">
              <div>
                <label className="block text-[10px] font-bold opacity-50 uppercase tracking-wider mb-1.5" style={{ color: theme === 'minimal' ? '#000' : '#fff' }}>Nombre de Tarea</label>
                <input 
                  autoFocus={!isEdit}
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className={`w-full p-4 ${styles.input} rounded outline-none text-lg font-bold placeholder-white/20 transition-all`}
                  placeholder="Escribe aquí..."
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold opacity-50 uppercase tracking-wider mb-1.5" style={{ color: theme === 'minimal' ? '#000' : '#fff' }}>Tema / Categoría</label>
                <select 
                  onChange={handleCategoryChange}
                  className={`w-full p-3 ${styles.input} rounded outline-none text-sm appearance-none cursor-pointer`}
                  value={topicId || (category === 'personal' ? 'personal' : '')}
                  style={selectStyle}
                >
                  <option value="" disabled={initialSection === 'specific'}>-- Selecciona una opción --</option>
                  
                  {showLegislation && <option value="personal" style={{ color: theme === 'minimal' ? '#000' : '#fff' }}>🔴 Personal / Ocio</option>}
                  
                  {showSpecific && (
                      <optgroup label="ESPECÍFICO">
                        {syllabus.filter(t => t.type === 'specific').map(topic => (
                            <option key={topic.id} value={topic.id} style={{ color: topic.color }}>
                            ⚫ {topic.title}
                            </option>
                        ))}
                      </optgroup>
                  )}
                  
                  {showLegislation && (
                      <optgroup label="LEGISLACIÓN">
                        {syllabus.filter(t => t.type === 'legislation').map(topic => (
                            <option key={topic.id} value={topic.id} style={{ color: topic.color }}>
                            📜 {topic.title}
                            </option>
                        ))}
                      </optgroup>
                  )}
                </select>

                {!isEdit && (
                   <div className={`mt-4 p-3 rounded-lg border ${theme === 'minimal' ? 'bg-zinc-50 border-zinc-200' : theme === 'cyber' ? 'bg-black border-fuchsia-900/20' : theme === 'oceanic' ? 'bg-sky-900/10 border-sky-500/10' : 'bg-white/5 border-white/10'}`}>
                       <button
                        type="button"
                        onClick={handleQuickSticker}
                        className={`w-full py-2 font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 ${theme === 'cyber' ? 'bg-cyan-900/30 text-cyan-400 hover:bg-cyan-800/50' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                        >
                         <ImageIcon className="w-4 h-4" />
                         Añadir Sticker
                       </button>

                       {!showCustomSticker ? (
                            <button 
                                type="button"
                                onClick={() => setShowCustomSticker(true)}
                                className="mt-2 w-full text-[10px] opacity-50 hover:opacity-100 underline transition-all"
                                style={{ color: theme === 'minimal' ? '#000' : '#fff' }}
                            >
                                Añadir nuevos sticker
                            </button>
                       ) : (
                           <div className="mt-3 pt-3 border-t border-white/10 animate-in slide-in-from-top-2 fade-in duration-200">
                               <div className="flex gap-2 mb-2">
                                   <input 
                                      type="text" 
                                      value={stickerUrl}
                                      onChange={(e) => setStickerUrl(e.target.value)}
                                      className={`flex-1 p-2 ${styles.input} rounded text-xs outline-none`}
                                      placeholder="URL de imagen..."
                                   />
                               </div>
                               <button
                                type="button"
                                onClick={handleAddSticker}
                                className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded"
                                style={{ color: theme === 'minimal' ? '#000' : '#fff' }}
                                >
                                 Confirmar Nuevo Sticker
                               </button>
                           </div>
                       )}
                   </div>
                )}
              </div>
            </div>
            <div className="p-5 pt-0">
               <button 
                type="submit"
                disabled={!title.trim()}
                className={`w-full py-3 font-bold text-sm uppercase tracking-widest rounded shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${theme === 'minimal' ? 'bg-zinc-900 text-white hover:bg-zinc-800' : theme === 'cyber' ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-black shadow-[0_0_20px_rgba(217,70,239,0.4)]' : theme === 'forest' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50' : theme === 'oceanic' ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/50' : theme === 'nebula' ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50' : theme === 'sunset' ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/50' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}
              >
                {isEdit ? 'Guardar Cambios' : 'Confirmar Tarea'}
              </button>
            </div>
          </div>

          <div className={`flex-1 ${styles.bg} rounded-xl overflow-hidden flex flex-col`}>
             <div className={`p-4 border-b flex justify-between items-center ${theme === 'minimal' ? 'bg-zinc-50 border-zinc-200' : theme === 'cyber' ? 'bg-fuchsia-900/10 border-fuchsia-500/20' : theme === 'forest' ? 'bg-emerald-900/20 border-emerald-800/30' : theme === 'oceanic' ? 'bg-sky-900/20 border-sky-700/50' : theme === 'nebula' ? 'bg-purple-900/20 border-purple-700/50' : theme === 'sunset' ? 'bg-orange-900/20 border-orange-700/50' : theme === 'tactical' ? 'bg-slate-800/50 border-slate-700' : 'bg-white/5 border-white/5'}`}>
              <h3 className={`font-bold text-sm tracking-wider uppercase flex items-center gap-2 ${theme === 'minimal' ? 'text-blue-600' : theme === 'cyber' ? 'text-fuchsia-400' : theme === 'forest' ? 'text-emerald-400' : theme === 'oceanic' ? 'text-sky-400' : theme === 'nebula' ? 'text-purple-400' : theme === 'sunset' ? 'text-orange-400' : 'text-blue-400'}`}>
                <Clock className="w-4 h-4" /> 
                {isEdit ? 'Modificar Tiempo' : 'Registro de Tiempo'}
              </h3>
              <div className="hidden md:block">
                  <button type="button" onClick={onClose} className="opacity-50 hover:opacity-100 p-1 rounded"><X className="w-4 h-4" style={{ color: theme === 'minimal' ? '#000' : '#fff' }}/></button>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-center items-center gap-4">
               
               <div className="flex items-center justify-center gap-4 w-full">
                   <div className="relative flex-1">
                       <input 
                        type="number" 
                        min="0"
                        value={hours}
                        onChange={e => setHours(Math.max(0, Number(e.target.value)))}
                        onWheel={(e) => e.currentTarget.blur()}
                        className={`w-full p-6 ${styles.input} border rounded-xl outline-none text-5xl font-black text-center transition-all`}
                        />
                        <span className={`absolute right-4 bottom-3 text-[10px] font-bold tracking-widest opacity-50 ${styles.text}`}>HRS</span>
                   </div>
                   
                   <span className={`text-4xl font-black opacity-20 pb-2 ${styles.text}`}>:</span>

                   <div className="relative flex-1">
                       <input 
                        type="number" 
                        min="0"
                        max="59"
                        step="5"
                        value={minutes}
                        onChange={e => setMinutes(Math.max(0, Number(e.target.value)))}
                        onWheel={(e) => e.currentTarget.blur()}
                        className={`w-full p-6 ${styles.input} border rounded-xl outline-none text-5xl font-black text-center transition-all`}
                        />
                        <span className={`absolute right-4 bottom-3 text-[10px] font-bold tracking-widest opacity-50 ${styles.text}`}>MIN</span>
                   </div>
               </div>
               
               <div className="flex gap-2 w-full justify-center mt-2">
                 <button 
                    type="button" 
                    onClick={() => addTime(50)} 
                    className={`w-full py-3 rounded border text-sm font-bold transition-colors flex items-center justify-center gap-2 ${theme === 'minimal' ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200' : theme === 'cyber' ? 'bg-fuchsia-900/20 hover:bg-fuchsia-900/40 text-fuchsia-400 border-fuchsia-500/30' : theme === 'forest' ? 'bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/50' : theme === 'oceanic' ? 'bg-sky-900/30 hover:bg-sky-900/50 text-sky-300 border-sky-700/50' : theme === 'nebula' ? 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 border-purple-700/50' : theme === 'sunset' ? 'bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 border-orange-700/50' : 'bg-white/5 hover:bg-white/10 text-blue-400 border-white/10'}`}
                 >
                    <Plus className="w-4 h-4" />
                    Añadir 50 min (Sesión Estudio)
                 </button>
               </div>

               <button 
                onClick={handleConfirmTime}
                className={`w-full mt-4 py-3 font-bold text-sm uppercase tracking-widest rounded shadow-lg transition-all active:scale-[0.98] ${theme === 'minimal' ? 'bg-blue-600 hover:bg-blue-700 text-white' : theme === 'cyber' ? 'bg-cyan-600 hover:bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]' : theme === 'forest' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50' : theme === 'oceanic' ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/50' : theme === 'nebula' ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50' : theme === 'sunset' ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/50' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'}`}
              >
                {isEdit ? 'Guardar Tiempo' : 'Confirmar Tiempo'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

const TopicNoteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  topicTitle: string;
  initialNote: string;
  onSave: (note: string) => void;
  theme: Theme;
}> = ({ isOpen, onClose, topicTitle, initialNote, onSave, theme }) => {
  const [note, setNote] = useState(initialNote);
  const [isSaving, setIsSaving] = useState(false);

  // Update internal state if initialNote prop changes (e.g. switching topics without closing)
  useEffect(() => {
    setNote(initialNote);
  }, [initialNote]);

  useEffect(() => {
    if (!isOpen) return; // Prevent unnecessary saves when closed
    const timer = setTimeout(() => {
      if (note !== initialNote) {
        setIsSaving(true);
        onSave(note);
        setTimeout(() => setIsSaving(false), 500);
      }
    }, 1000); 
    return () => clearTimeout(timer);
  }, [note, isOpen, onSave, initialNote]);

  if (!isOpen) return null;

  const handleClose = () => {
    // Force save on close to ensure no data loss
    if (note !== initialNote) {
        onSave(note);
    }
    onClose();
  };

  const getModalStyles = () => {
      switch (theme) {
          case 'minimal': return { 
              overlay: 'bg-zinc-500/20',
              container: 'bg-white border border-zinc-200 shadow-2xl rounded-[2rem]', 
              header: 'bg-zinc-50 border-b border-zinc-200', 
              title: 'text-zinc-900', 
              closeBtn: 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900',
              textAreaBg: 'bg-white',
              textAreaText: 'text-zinc-900 placeholder-zinc-400', 
              footer: 'bg-zinc-50 border-t border-zinc-200',
              statusText: 'text-zinc-500',
              closeButtonMain: 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'
          };
          case 'cyber': return { 
              overlay: 'bg-black/90',
              container: 'bg-black border border-fuchsia-500/30 shadow-[0_0_50px_rgba(217,70,239,0.3)] rounded-none', 
              header: 'bg-fuchsia-900/10 border-b border-fuchsia-500/20', 
              title: 'text-fuchsia-400', 
              closeBtn: 'text-fuchsia-500/50 hover:text-cyan-400',
              textAreaBg: 'bg-black/50',
              textAreaText: 'text-fuchsia-50 placeholder-fuchsia-900/50', 
              footer: 'bg-black border-t border-fuchsia-500/20',
              statusText: 'text-cyan-500/70',
              closeButtonMain: 'bg-fuchsia-900/20 text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-900/40'
          };
          case 'forest': return { 
              overlay: 'bg-[#022c22]/80',
              container: 'bg-[#052e16] border border-emerald-800 shadow-2xl rounded-lg', 
              header: 'bg-[#022c22] border-b border-emerald-800/50', 
              title: 'text-emerald-400', 
              closeBtn: 'text-emerald-600 hover:text-emerald-300',
              textAreaBg: 'bg-[#064e3b]/20',
              textAreaText: 'text-emerald-50 placeholder-emerald-800', 
              footer: 'bg-[#022c22] border-t border-emerald-800/50',
              statusText: 'text-emerald-500',
              closeButtonMain: 'bg-emerald-900/50 text-emerald-100 hover:bg-emerald-800'
          };
          case 'oceanic': return { 
              overlay: 'bg-[#0c4a6e]/80',
              container: 'bg-[#082f49] border border-sky-800 shadow-2xl rounded-3xl', 
              header: 'bg-[#0c4a6e] border-b border-sky-800/50', 
              title: 'text-sky-400', 
              closeBtn: 'text-sky-600 hover:text-sky-300',
              textAreaBg: 'bg-[#0c4a6e]/20',
              textAreaText: 'text-sky-50 placeholder-sky-800',
              footer: 'bg-[#082f49] border-t border-sky-800/50',
              statusText: 'text-sky-500',
              closeButtonMain: 'bg-sky-900/50 text-sky-100 hover:bg-sky-800'
          };
          case 'nebula': return { 
              overlay: 'bg-[#2e1065]/80',
              container: 'bg-[#3b0764] border border-purple-800 shadow-2xl rounded-2xl', 
              header: 'bg-[#2e1065] border-b border-purple-800/50', 
              title: 'text-purple-400', 
              closeBtn: 'text-purple-600 hover:text-purple-300',
              textAreaBg: 'bg-[#4c1d95]/20',
              textAreaText: 'text-purple-50 placeholder-purple-800',
              footer: 'bg-[#3b0764] border-t border-purple-800/50',
              statusText: 'text-purple-500',
              closeButtonMain: 'bg-purple-900/50 text-purple-100 hover:bg-purple-800'
          };
          case 'sunset': return { 
              overlay: 'bg-[#451a03]/80',
              container: 'bg-[#451a03] border border-orange-800 shadow-2xl rounded-xl', 
              header: 'bg-[#451a03] border-b border-orange-800/50', 
              title: 'text-orange-400', 
              closeBtn: 'text-orange-600 hover:text-orange-300',
              textAreaBg: 'bg-[#7c2d12]/20',
              textAreaText: 'text-orange-50 placeholder-orange-800',
              footer: 'bg-[#451a03] border-t border-orange-800/50',
              statusText: 'text-orange-500',
              closeButtonMain: 'bg-orange-900/50 text-orange-100 hover:bg-orange-800'
          };
          case 'classic': return { 
              overlay: 'bg-black/80',
              container: 'bg-[#281412] border border-orange-900/50 shadow-2xl rounded-2xl', 
              header: 'bg-[#3a2826] border-b border-orange-900/30', 
              title: 'text-orange-400', 
              closeBtn: 'text-orange-900 hover:text-orange-200',
              textAreaBg: 'bg-[#281412]',
              textAreaText: 'text-white placeholder-white/20', 
              footer: 'bg-[#3a2826] border-t border-orange-900/30',
              statusText: 'text-orange-500',
              closeButtonMain: 'bg-orange-900/30 text-orange-200 hover:bg-orange-900/50'
          };
          case 'tactical': default: return { 
              overlay: 'bg-black/90',
              container: 'bg-[#18181b] border border-slate-700 shadow-2xl rounded-none font-mono', 
              header: 'bg-[#27272a] border-b border-slate-700', 
              title: 'text-orange-500', 
              closeBtn: 'text-slate-500 hover:text-white',
              textAreaBg: 'bg-[#0c0c0e]',
              textAreaText: 'text-slate-200 placeholder-slate-700', 
              footer: 'bg-[#18181b] border-t border-slate-700',
              statusText: 'text-slate-500',
              closeButtonMain: 'bg-white/10 text-white hover:bg-white/20'
          };
      }
  }

  const s = getModalStyles();

  return (
     <div className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200 ${s.overlay}`}>
      <div className="absolute inset-0" onClick={handleClose}></div>
      
      <div className={`relative w-full max-w-lg overflow-hidden flex flex-col h-[60vh] z-10 transition-colors ${s.container}`}>
        <div className={`p-4 flex justify-between items-center ${s.header}`}>
          <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 truncate pr-4 ${s.title}`}>
            <Folder className="w-4 h-4" />
            {topicTitle}
          </h3>
          <button onClick={handleClose} className={`p-1 rounded transition-colors ${s.closeBtn}`}><X className="w-4 h-4" /></button>
        </div>
        <div className={`flex-1 p-0 ${s.textAreaBg}`}>
          <textarea
            autoFocus
            className={`w-full h-full bg-transparent p-6 outline-none resize-none text-base leading-relaxed ${s.textAreaText}`}
            placeholder="// Escribe tus notas técnicas aquí..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className={`p-3 flex justify-between items-center ${s.footer}`}>
          <div className="px-2 flex items-center gap-2">
            <Activity className={`w-3 h-3 ${isSaving ? 'text-orange-500 animate-pulse' : s.statusText}`} />
            <span className={`text-[10px] font-mono uppercase ${s.statusText}`}>{isSaving ? 'Guardando...' : 'Auto-Guardado Activo'}</span>
          </div>
          <button
            onClick={handleClose}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${s.closeButtonMain}`}
          >
            <Save className="w-3 h-3" />
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main App ---

type ViewState = 'home' | 'planner' | 'syllabus';

function App() {
  const [view, setView] = useState<ViewState>('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [theme, setTheme] = useState<Theme>('classic');
  const [showWeekends, setShowWeekends] = useState(true);
  
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  const [timeManagementDay, setTimeManagementDay] = useState<DayOfWeek | null>(null);

  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Quick Link State
  const [quickLink, setQuickLink] = useState('https://www.google.com');
  const [isQuickLinkModalOpen, setIsQuickLinkModalOpen] = useState(false);

  // --- Long Press Logic ---
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handlePressStart = (e: React.TouchEvent | React.MouseEvent) => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        setIsQuickLinkModalOpen(true);
    }, 600); // 600ms hold time
  };

  const handlePressEnd = (e: React.MouseEvent | React.TouchEvent) => {
      if (pressTimer.current) {
          clearTimeout(pressTimer.current);
          pressTimer.current = null;
      }
  };

  const handleLinkClick = () => {
      if (!isLongPress.current) {
          window.open(quickLink, '_blank');
      }
  };

  const [syllabus, setSyllabus] = useState<SyllabusTopic[]>(() => {
    const saved = localStorage.getItem('syllabusData');
    return saved ? JSON.parse(saved) : DEFAULT_SYLLABUS_TOPICS;
  });
  const [completedTopics, setCompletedTopics] = useState<number[]>([]); 
  const [topicNotes, setTopicNotes] = useState<Record<number, string>>({});
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [isEditingSyllabus, setIsEditingSyllabus] = useState(false);
  
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState<DayOfWeek>(DayOfWeek.Monday);
  const [sectionForAdd, setSectionForAdd] = useState<'legislation' | 'specific'>('legislation');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [today] = useState(new Date()); 

  const currentRealWeekId = useMemo(() => getWeekId(new Date()), []);
  const viewedWeekId = useMemo(() => getWeekId(currentDate), [currentDate]);
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const currentRealWeekMinutes = useMemo(() => {
      return tasks
        .filter(t => (t.weekId === currentRealWeekId) || (!t.weekId && currentRealWeekId === viewedWeekId)) 
        .reduce((acc, task) => acc + (task.durationMinutes || 0), 0);
  }, [tasks, currentRealWeekId, viewedWeekId]);

  const prevRealWeekMinutes = useMemo(() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const id = getWeekId(d);
      return tasks.filter(t => t.weekId === id).reduce((acc, task) => acc + (task.durationMinutes || 0), 0);
  }, [tasks]);

  const twoWeeksAgoMinutes = useMemo(() => {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      const id = getWeekId(d);
      return tasks.filter(t => t.weekId === id).reduce((acc, task) => acc + (task.durationMinutes || 0), 0);
  }, [tasks]);

  useEffect(() => {
    const saved = localStorage.getItem('semanaSmartTasks');
    if (saved) { setTasks(JSON.parse(saved)); } else { setTasks([]); }
    
    const savedTopics = localStorage.getItem('completedTopics');
    if (savedTopics) { setCompletedTopics(JSON.parse(savedTopics)); }

    const savedNotes = localStorage.getItem('topicNotes');
    if (savedNotes) { setTopicNotes(JSON.parse(savedNotes)); }

    const savedTheme = localStorage.getItem('appTheme') as Theme;
    if (savedTheme) { setTheme(savedTheme); }

    const savedWeekends = localStorage.getItem('showWeekends');
    if (savedWeekends !== null) { setShowWeekends(JSON.parse(savedWeekends)); }

    const savedQuickLink = localStorage.getItem('quickLink');
    if (savedQuickLink) { setQuickLink(savedQuickLink); }
  }, []);

  useEffect(() => { localStorage.setItem('semanaSmartTasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('completedTopics', JSON.stringify(completedTopics)); }, [completedTopics]);
  useEffect(() => { localStorage.setItem('topicNotes', JSON.stringify(topicNotes)); }, [topicNotes]);
  useEffect(() => { localStorage.setItem('syllabusData', JSON.stringify(syllabus)); }, [syllabus]);
  useEffect(() => { localStorage.setItem('appTheme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('showWeekends', JSON.stringify(showWeekends)); }, [showWeekends]);
  useEffect(() => { localStorage.setItem('quickLink', quickLink); }, [quickLink]);

  const initiateDeleteTask = (id: string) => { setTaskToDeleteId(id); };
  const confirmDeleteTask = () => {
    if (taskToDeleteId) {
      setTasks(prev => prev.filter(t => t.id !== taskToDeleteId));
      setTaskToDeleteId(null);
    }
  };

  const deleteTimeEntry = (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAddTask = (taskData: Omit<Task, 'id' | 'isCompleted'>) => {
    if (taskData.sticker) {
        setTasks(prev => {
            const cleanPrev = prev.filter(t => {
                const isSameDay = t.day === taskData.day;
                const isSameWeek = t.weekId === viewedWeekId || (!t.weekId && viewedWeekId === currentRealWeekId);
                const isSticker = !!t.sticker;
                return !(isSameDay && isSameWeek && isSticker);
            });
            const newTask: Task = { id: uuidv4(), isCompleted: false, ...taskData, weekId: viewedWeekId };
            return [...cleanPrev, newTask];
        });
    } else {
        const newTask: Task = { id: uuidv4(), isCompleted: false, ...taskData, weekId: viewedWeekId };
        setTasks(prev => [...prev, newTask]);
    }
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleEditTask = (task: Task) => {
      setEditingTask(task);
      setSelectedDayForAdd(task.day); 
      setIsTaskModalOpen(true);
  };

  const handleAIPlanGenerated = (plan: AIPlanResponse) => {
    const newTasks: Task[] = plan.tasks.map(t => ({
       id: uuidv4(),
       title: t.title,
       description: t.description,
       // Robust day matching (case insensitive)
       day: Object.values(DayOfWeek).find(d => d.toLowerCase() === t.day.toLowerCase().trim()) || DayOfWeek.Monday,
       startTime: t.startTime,
       durationMinutes: t.durationMinutes,
       color: t.category,
       isCompleted: false,
       weekId: viewedWeekId 
    }));
    setTasks(prev => [...prev, ...newTasks]);
  };

  const handleColumnClick = (day: DayOfWeek, section: 'legislation' | 'specific') => {
    setEditingTask(null);
    setSelectedDayForAdd(day);
    setSectionForAdd(section);
    setIsTaskModalOpen(true);
  };

  const changeWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const goToToday = () => { setCurrentDate(new Date()); };
  const toggleTopicCompletion = (id: number) => { setCompletedTopics(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]); };
  const handleSaveNote = (note: string) => { if (editingTopicId !== null) { setTopicNotes(prev => ({ ...prev, [editingTopicId]: note })); } };

  const handleMoveTopic = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === syllabus.length - 1) return;
    const newSyllabus = [...syllabus];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newSyllabus[index], newSyllabus[swapIndex]] = [newSyllabus[swapIndex], newSyllabus[index]];
    setSyllabus(newSyllabus);
  };
  
  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
  };

  const handleDrop = (index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newSyllabus = [...syllabus];
    const [draggedItem] = newSyllabus.splice(draggedItemIndex, 1);
    newSyllabus.splice(index, 0, draggedItem);
    setSyllabus(newSyllabus);
    setDraggedItemIndex(null);
  };

  const handleDeleteTopic = (id: number) => { if (window.confirm("¿Eliminar tema?")) { setSyllabus(prev => prev.filter(t => t.id !== id)); } };
  
  const handleAddTopic = (type: 'specific' | 'legislation') => {
    const newId = Date.now();
    const randomColor = TOPIC_COLORS_PALETTE[Math.floor(Math.random() * TOPIC_COLORS_PALETTE.length)];
    const newTopic: SyllabusTopic = { id: newId, title: "Nuevo Tema", color: randomColor, type };
    setSyllabus([...syllabus, newTopic]);
  };

  const handleUpdateTopic = (id: number, newTitle: string) => { setSyllabus(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t)); };
  const handleEnterPlanner = () => { setIsTransitioning(true); setTimeout(() => { setView('planner'); setIsTransitioning(false); }, 2100); };
  const handleThemeSelect = (newTheme: Theme) => { setTheme(newTheme); }
  const toggleWeekends = () => { setShowWeekends(prev => !prev); }

  const displayedDays = showWeekends ? DAYS_ORDER : DAYS_ORDER.slice(0, 5);
  
  const getThemeStyles = () => {
      switch (theme) {
          case 'minimal': 
              return { 
                  appBg: 'bg-zinc-50', 
                  headerBg: 'bg-white border-b border-zinc-200 shadow-sm',
                  textMain: 'text-zinc-900', 
                  textMuted: 'text-zinc-500',
                  cardBg: 'bg-white border-0 shadow-xl shadow-zinc-200 hover:shadow-2xl hover:-translate-y-1',
                  accent: 'bg-zinc-900 text-white',
                  iconBg: 'bg-zinc-100',
                  iconColor: 'text-zinc-900',
                  columnBg: 'bg-white/50 border-0',
                  columnHeader: 'bg-white border-b border-zinc-100 text-zinc-600 font-bold',
                  columnActive: 'ring-2 ring-zinc-900 shadow-2xl bg-white',
                  radius: 'rounded-[2rem]',
                  shadow: 'shadow-lg',
                  font: 'font-sans'
              };
          case 'cyber':
              return {
                  appBg: 'bg-black bg-[radial-gradient(circle_at_50%_50%,_#1a0b1e_0%,_#000000_100%)]',
                  headerBg: 'bg-black/60 backdrop-blur-xl border-b border-fuchsia-900/50 shadow-[0_0_20px_rgba(217,70,239,0.1)]',
                  textMain: 'text-fuchsia-50 drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]',
                  textMuted: 'text-cyan-400/60',
                  cardBg: 'bg-black/40 backdrop-blur-md border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.1)] hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]',
                  accent: 'bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white shadow-[0_0_15px_rgba(217,70,239,0.6)]',
                  iconBg: 'bg-fuchsia-900/10',
                  iconColor: 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]',
                  columnBg: 'bg-black/40 border-l border-r border-fuchsia-900/30',
                  columnHeader: 'bg-black/60 border-b border-fuchsia-500/30 text-cyan-400 font-mono tracking-widest',
                  columnActive: 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)] bg-black/80',
                  radius: 'rounded-none',
                  shadow: 'shadow-[0_0_20px_rgba(0,0,0,0.5)]',
                  font: 'font-mono'
              };
          case 'forest':
              return {
                  appBg: 'bg-[#022c22] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-[#022c22] to-[#022c22]',
                  headerBg: 'bg-[#064e3b]/30 backdrop-blur-lg border-b border-emerald-800/50',
                  textMain: 'text-emerald-50',
                  textMuted: 'text-emerald-400/60',
                  cardBg: 'bg-[#065f46]/20 border border-emerald-700/40 shadow-lg hover:border-emerald-400/50 hover:bg-[#065f46]/40',
                  accent: 'bg-emerald-600 text-white shadow-lg shadow-emerald-900',
                  iconBg: 'bg-emerald-900/30',
                  iconColor: 'text-emerald-400',
                  columnBg: 'bg-[#064e3b]/10 border border-emerald-900/30',
                  columnHeader: 'bg-[#064e3b]/40 border-b border-emerald-800/40 text-emerald-300/80',
                  columnActive: 'border-emerald-500/60 ring-1 ring-emerald-500/20 bg-[#065f46]/20',
                  radius: 'rounded-lg',
                  shadow: 'shadow-md',
                  font: 'font-sans'
              };
          case 'oceanic':
              return {
                  appBg: 'bg-gradient-to-br from-[#0c4a6e] to-[#082f49]',
                  headerBg: 'bg-[#0c4a6e]/50 backdrop-blur-xl border-b border-sky-500/30 shadow-lg',
                  textMain: 'text-sky-50',
                  textMuted: 'text-sky-300/60',
                  cardBg: 'bg-[#0ea5e9]/10 backdrop-blur-md border border-sky-500/30 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] hover:bg-[#0ea5e9]/20 hover:border-sky-400/50',
                  accent: 'bg-sky-500 text-white shadow-lg shadow-sky-900/50',
                  iconBg: 'bg-sky-900/30',
                  iconColor: 'text-sky-300',
                  columnBg: 'bg-white/5 border border-white/5 backdrop-blur-sm',
                  columnHeader: 'bg-[#075985]/30 border-b border-sky-500/20 text-sky-100 font-bold tracking-wider',
                  columnActive: 'border-sky-400 ring-1 ring-sky-400/30 bg-[#0c4a6e]/40',
                  radius: 'rounded-3xl',
                  shadow: 'shadow-2xl',
                  font: 'font-sans'
              };
          case 'nebula':
              return {
                  appBg: 'bg-[#1e1b4b] bg-[radial-gradient(at_center_top,_#581c87,_#1e1b4b)]',
                  headerBg: 'bg-[#2e1065]/60 backdrop-blur-xl border-b border-purple-500/30',
                  textMain: 'text-purple-50',
                  textMuted: 'text-purple-300/60',
                  cardBg: 'bg-[#581c87]/20 backdrop-blur-md border border-purple-500/30 shadow-[0_0_30px_rgba(88,28,135,0.4)] hover:border-purple-400/60',
                  accent: 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]',
                  iconBg: 'bg-purple-900/40',
                  iconColor: 'text-purple-300',
                  columnBg: 'bg-[#2e1065]/30 border border-purple-500/20',
                  columnHeader: 'bg-[#4c1d95]/40 border-b border-purple-500/30 text-purple-200',
                  columnActive: 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-[#4c1d95]/60',
                  radius: 'rounded-2xl',
                  shadow: 'shadow-xl',
                  font: 'font-sans'
              };
          case 'sunset':
              return {
                  appBg: 'bg-gradient-to-br from-[#451a03] via-[#7c2d12] to-[#9a3412]',
                  headerBg: 'bg-[#451a03]/60 backdrop-blur-md border-b border-orange-500/30',
                  textMain: 'text-orange-50',
                  textMuted: 'text-orange-200/60',
                  cardBg: 'bg-[#9a3412]/20 backdrop-blur-sm border border-orange-500/30 shadow-xl hover:bg-[#9a3412]/30',
                  accent: 'bg-orange-500 text-white shadow-lg shadow-orange-900',
                  iconBg: 'bg-orange-900/40',
                  iconColor: 'text-orange-300',
                  columnBg: 'bg-[#7c2d12]/20 border border-orange-500/20',
                  columnHeader: 'bg-[#7c2d12]/40 border-b border-orange-500/30 text-orange-100 font-bold',
                  columnActive: 'border-orange-400 ring-1 ring-orange-400/30 bg-[#9a3412]/40',
                  radius: 'rounded-xl',
                  shadow: 'shadow-lg',
                  font: 'font-sans'
              };
          case 'classic': 
             return {
                  appBg: 'bg-[#281412]',
                  headerBg: 'bg-[#3a2826] border-b border-orange-900/30 shadow-lg rounded-b-xl md:rounded-full md:mb-4',
                  textMain: 'text-orange-100',
                  textMuted: 'text-orange-200/60',
                  cardBg: 'bg-gradient-to-br from-[#3a2826] to-[#2a1b19] border border-[#5e403c] hover:border-orange-500/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]',
                  accent: 'bg-orange-500 text-white',
                  iconBg: 'bg-orange-900/20',
                  iconColor: 'text-orange-400',
                  columnBg: 'bg-[#33201e] border-none hover:bg-[#3e2a28]',
                  columnHeader: 'bg-[#4a2e2b] text-orange-100/70 border-b border-orange-900/20',
                  columnActive: 'border-2 border-orange-400 bg-gradient-to-b from-orange-900/20 to-transparent',
                  radius: 'rounded-3xl',
                  shadow: 'shadow-2xl',
                  font: 'font-sans'
             };
          case 'tactical':
          default:
              return {
                  appBg: 'bg-[#0f172a]',
                  headerBg: 'bg-[#1e293b] border-b border-slate-700 shadow-md',
                  textMain: 'text-slate-100',
                  textMuted: 'text-slate-400',
                  cardBg: 'bg-[#1e293b] border border-slate-700 hover:border-orange-500/80 hover:shadow-orange-500/10 rounded-lg',
                  accent: 'bg-orange-600 text-white font-bold tracking-wider',
                  iconBg: 'bg-[#334155]',
                  iconColor: 'text-slate-300',
                  columnBg: 'bg-[#1e293b]/50 border border-slate-700/50',
                  columnHeader: 'bg-[#1e293b] text-slate-400 border-b border-slate-700 font-bold uppercase tracking-wider',
                  columnActive: 'border-orange-500 bg-[#1e293b] ring-1 ring-orange-500/20',
                  radius: 'rounded-none',
                  shadow: 'shadow-none',
                  font: 'font-mono'
              };
      }
  }

  const ts = getThemeStyles();

  const specificTopics = syllabus.filter(t => t.type === 'specific' || !t.type); 
  const legislationTopics = syllabus.filter(t => t.type === 'legislation');

  const renderSyllabusSection = (title: string, topics: SyllabusTopic[], type: 'specific' | 'legislation') => {
      return (
          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex justify-between items-center mb-4">
                 <h3 className={`text-sm font-bold uppercase tracking-widest ${ts.textMuted} flex items-center gap-2`}>
                     {type === 'specific' ? <Target className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
                     {title}
                 </h3>
                 {isEditingSyllabus && (
                    <button onClick={() => handleAddTopic(type)} className={`p-1.5 rounded hover:${ts.accent} transition-colors ${ts.textMuted}`}>
                        <Plus className="w-4 h-4" />
                    </button>
                 )}
             </div>
             
             <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pb-10">
                 {topics.map((topic, index) => {
                     const masterIndex = syllabus.findIndex(t => t.id === topic.id);
                     
                     if (isEditingSyllabus) {
                        return (
                          <div 
                            key={topic.id} 
                            draggable={true}
                            onDragStart={() => handleDragStart(masterIndex)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(masterIndex)}
                            className={`flex items-center gap-2 p-3 border ${ts.columnBg} ${theme === 'minimal' ? 'border-zinc-200' : 'border-white/5'} cursor-move`}
                          >
                            <GripVertical className="w-4 h-4 text-slate-500 cursor-move" />
                            <input type="text" value={topic.title} onChange={(e) => handleUpdateTopic(topic.id, e.target.value)} className={`flex-1 bg-transparent border-b outline-none px-2 py-1 text-sm font-mono ${ts.textMain} ${theme === 'minimal' ? 'border-zinc-300' : 'border-white/10'}`} />
                            
                            {/* Mobile reorder controls */}
                            <div className="flex flex-col gap-0.5 md:hidden">
                                <button onClick={() => handleMoveTopic(masterIndex, 'up')} className="p-1 hover:bg-white/10 rounded"><ArrowUp className="w-3 h-3 opacity-50" /></button>
                                <button onClick={() => handleMoveTopic(masterIndex, 'down')} className="p-1 hover:bg-white/10 rounded"><ArrowDown className="w-3 h-3 opacity-50" /></button>
                            </div>

                            <button onClick={() => handleDeleteTopic(topic.id)} className="p-2 hover:bg-red-900/20 rounded text-slate-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        );
                      }

                      const isCompleted = completedTopics.includes(topic.id);
                      return (
                        <div key={topic.id} className={`flex items-center justify-between group p-3 border transition-all duration-200 rounded-lg ${isCompleted ? (theme === 'minimal' ? 'bg-green-50 border-green-200' : 'bg-green-900/20 border-green-500/30') : `${theme === 'minimal' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-black/20 border-white/5'} hover:border-orange-500/30`}`}>
                          <div onClick={() => setEditingTopicId(topic.id)} className="flex-1 flex items-center gap-4 cursor-pointer">
                             <div className={`w-8 h-8 flex items-center justify-center font-mono text-xs font-bold border rounded ${isCompleted ? 'text-green-500 border-green-500' : `${ts.textMuted} ${theme === 'minimal' ? 'border-zinc-200' : 'border-white/10'}`}`}>
                                 {(topics.indexOf(topic) + 1).toString().padStart(2, '0')}
                             </div>
                            <div className="flex flex-col min-w-0">
                              <span className={`font-bold text-xs uppercase tracking-wide truncate ${isCompleted ? 'text-green-600' : ts.textMain}`}>{topic.title}</span>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); toggleTopicCompletion(topic.id); }} className={`flex-shrink-0 w-5 h-5 border flex items-center justify-center rounded transition-all ml-3 ${isCompleted ? 'bg-green-600 border-green-500 text-white' : 'border-slate-700 text-transparent'}`}><Check className="w-3 h-3" /></button>
                        </div>
                      );
                 })}
                 {topics.length === 0 && (
                     <div className={`text-center py-8 text-xs italic opacity-50 ${ts.textMuted}`}>No hay temas registrados</div>
                 )}
             </div>
          </div>
      )
  }

  return (
    <div className={`h-full w-full transition-colors duration-500 ${ts.appBg} ${ts.font}`}>
      {isTransitioning && <TransitionLayer />}

      {/* --- HOME VIEW --- */}
      {view === 'home' && !isTransitioning && (
        <div 
            className="h-full w-full flex flex-col items-center justify-center p-6 gap-10 animate-in fade-in duration-500 relative overflow-hidden"
            style={theme === 'classic' ? {
                backgroundImage: 'url("https://i.imgur.com/JmE9pZT.jpeg")',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            } : {}}
        >
          {theme === 'classic' && <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>}
          
          {/* QUICK LINK BUTTON (Long Press / Settings) */}
          <div 
            className="absolute top-6 right-6 z-50 flex items-center gap-2 group"
            onContextMenu={(e) => e.preventDefault()} // Disable safari context menu
          >
             <button
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                onClick={handleLinkClick}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${ts.iconBg} ${ts.iconColor} hover:scale-105 hover:text-white hover:bg-opacity-50 border border-white/5 backdrop-blur-md select-none`}
                style={{ WebkitTouchCallout: 'none' } as React.CSSProperties}
                title="Mantén pulsado para editar"
             >
                <Globe className="w-6 h-6" />
             </button>
             
             {/* Explicit option next to logo as requested */}
             <button 
                onClick={() => setIsQuickLinkModalOpen(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 opacity-50 hover:opacity-100 ${ts.iconBg} ${ts.textMuted} backdrop-blur-sm`}
                title="Configurar Enlace Directo"
             >
                <Settings className="w-4 h-4" />
             </button>
          </div>
          
          <div className="text-center space-y-2 relative z-10">
            <h1 className={`text-4xl md:text-5xl font-black tracking-tight ${ts.textMain}`}>
              CENTRO DE MANDO
            </h1>
            <p className={`${ts.textMuted} uppercase tracking-[0.3em] text-xs font-bold`}>Oposición Bomberos</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center items-center h-auto md:h-[320px] relative z-10">
            
            <button 
              onClick={handleEnterPlanner}
              className={`group w-full md:w-1/2 h-48 md:h-full relative flex flex-col items-center justify-center gap-6 overflow-hidden transition-all duration-300 active:scale-[0.98] ${ts.cardBg} ${ts.radius} ${ts.shadow}`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none"></div>
              <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <ArrowUp className={`w-6 h-6 rotate-45 transition-colors ${ts.iconColor}`} />
              </div>
              
              <div className={`p-6 shadow-inner transition-colors duration-300 z-10 rounded-2xl ${ts.iconBg} group-hover:${ts.accent.split(' ')[0]} group-hover:text-white`}>
                <Calendar className={`w-12 h-12 ${ts.iconColor} group-hover:text-white`} />
              </div>
              
              <div className="z-10 text-center">
                 <span className={`block text-2xl font-bold tracking-wide ${ts.textMain}`}>PLANIFICADOR</span>
                 <span className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${ts.textMuted}`}>Gestión Táctica</span>
              </div>
            </button>

            <button 
              onClick={() => setView('syllabus')}
              className={`group w-full md:w-1/2 h-48 md:h-full relative flex flex-col items-center justify-center gap-6 overflow-hidden transition-all duration-300 active:scale-[0.98] ${ts.cardBg} ${ts.radius} ${ts.shadow}`}
            >
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none"></div>
              <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                 <ArrowUp className={`w-6 h-6 rotate-45 transition-colors ${ts.iconColor}`} />
              </div>

              <div className={`p-6 shadow-inner transition-colors duration-300 z-10 rounded-2xl ${ts.iconBg} group-hover:${ts.accent.split(' ')[0]} group-hover:text-white`}>
                <Library className={`w-12 h-12 ${ts.iconColor} group-hover:text-white`} />
              </div>
              
              <div className="z-10 text-center">
                 <span className={`block text-2xl font-bold tracking-wide ${ts.textMain}`}>TEMARIO</span>
                 <span className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${ts.textMuted}`}>Base de Datos</span>
              </div>
            </button>
          </div>
          
          <div className={`absolute bottom-6 text-[10px] font-mono ${ts.textMuted} relative z-10`}>
            SYSTEM STATUS: ONLINE • V.2.6.1
          </div>
        </div>
      )}

      {view === 'syllabus' && (
        <div className="h-full w-full flex flex-col p-2 md:p-6 gap-4 select-none animate-in slide-in-from-right duration-300">
          <header className={`flex-none h-16 flex items-center justify-between px-6 shadow-lg border z-20 ${ts.headerBg} ${theme === 'classic' ? 'rounded-full' : 'rounded-xl'}`}>
            <button onClick={() => setView('home')} className={`flex items-center gap-3 ${ts.textMuted} hover:${ts.textMain} transition-colors group`}>
              <div className={`w-8 h-8 flex items-center justify-center rounded ${ts.iconBg}`}>
                <Home className="w-4 h-4" />
              </div>
              <span className="hidden md:inline font-bold text-xs uppercase tracking-wider">Panel Principal</span>
            </button>
            <h2 className={`text-xl font-black uppercase tracking-tighter ${ts.textMain}`}>Temario Oficial</h2>
            <button 
              onClick={() => setIsEditingSyllabus(!isEditingSyllabus)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors rounded ${isEditingSyllabus ? ts.accent : `${ts.iconBg} ${ts.textMuted}`}`}
            >
              {isEditingSyllabus ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              <span className="hidden md:inline">{isEditingSyllabus ? 'Finalizar' : 'Editar'}</span>
            </button>
          </header>

          <main className={`flex-1 w-full overflow-hidden p-6 md:p-8 border shadow-inner relative flex gap-8 ${ts.columnBg} ${theme === 'classic' ? 'rounded-3xl' : 'rounded-xl'}`}>
             <div className="w-full h-full flex flex-col md:flex-row gap-8">
                 {renderSyllabusSection("Específico", specificTopics, 'specific')}
                 
                 <div className={`w-px h-full opacity-20 hidden md:block ${theme === 'minimal' ? 'bg-zinc-300' : 'bg-white'}`}></div>
                 
                 {renderSyllabusSection("Legislación", legislationTopics, 'legislation')}
             </div>
          </main>
          <TopicNoteModal 
            key={editingTopicId || 'closed'} 
            isOpen={editingTopicId !== null} 
            onClose={() => setEditingTopicId(null)} 
            topicTitle={editingTopicId ? syllabus.find(t => t.id === editingTopicId)?.title || '' : ''} 
            initialNote={editingTopicId ? topicNotes[editingTopicId] || '' : ''} 
            onSave={handleSaveNote} 
            theme={theme}
          />
        </div>
      )}
      
      {view === 'planner' && !isTransitioning && (
        <div className="h-full w-full flex flex-col p-2 md:p-6 gap-4 select-none animate-reveal">
          <header className={`flex-none h-16 flex items-center justify-between px-4 shadow-lg z-20 transition-all relative ${ts.headerBg} ${theme === 'classic' ? 'rounded-full mb-4' : ''}`}>
            
            {/* Left Controls */}
            <div className="flex gap-2 items-center relative z-10">
              <button 
                onClick={() => setView('home')}
                className={`w-10 h-10 flex items-center justify-center ${ts.iconBg} ${ts.textMuted} hover:${ts.accent} transition-colors rounded-full`}
              >
                <Home className="w-4 h-4" />
              </button>
              <button 
                onClick={goToToday}
                className={`w-10 h-10 flex items-center justify-center ${ts.iconBg} ${ts.textMuted} hover:bg-white/10 hover:${ts.textMain} transition-colors rounded-full`}
              >
                <Target className="w-4 h-4" />
              </button>
              
                <div 
                    onClick={() => setIsStatsOpen(true)}
                    className={`flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 ml-2 border hover:border-white/20 cursor-pointer transition-all rounded ${theme === 'minimal' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-black/20 border-white/5'}`}
                >
                    <div className="hidden sm:flex flex-col items-end leading-none">
                        <span className={`text-[10px] font-bold uppercase ${ts.textMuted}`}>Ant-2</span>
                        <span className={`text-xs font-mono ${ts.textMuted}`}>{formatDurationShort(twoWeeksAgoMinutes)}</span>
                    </div>
                    <div className={`hidden sm:block h-6 w-[1px] ${theme === 'minimal' ? 'bg-zinc-200' : 'bg-white/10'}`}></div>
                    
                    <div className="flex flex-col items-end leading-none">
                        <span className={`text-[10px] font-bold uppercase ${ts.textMuted}`}>Ant-1</span>
                        <span className={`text-xs font-mono ${ts.textMuted}`}>{formatDurationShort(prevRealWeekMinutes)}</span>
                    </div>
                    
                    <div className={`h-6 w-[1px] ${theme === 'minimal' ? 'bg-zinc-200' : 'bg-white/10'}`}></div>
                    
                    <div className="flex flex-col items-end leading-none">
                        <span className={`text-[10px] font-bold uppercase ${theme === 'minimal' ? 'text-blue-600' : theme === 'cyber' ? 'text-cyan-400' : theme === 'forest' ? 'text-emerald-400' : theme === 'oceanic' ? 'text-sky-400' : theme === 'nebula' ? 'text-purple-400' : theme === 'sunset' ? 'text-orange-400' : 'text-orange-500'}`}>Esta</span>
                        <span className={`text-sm font-mono font-bold ${ts.textMain}`}>{formatDurationShort(currentRealWeekMinutes)}</span>
                    </div>
                    <BarChart3 className={`w-4 h-4 ml-1 ${ts.textMuted}`} />
                </div>
            </div>

            {/* Center Title (Absolute Center for Desktop & Mobile) */}
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 px-4 py-1.5 border rounded-full ${theme === 'minimal' ? 'bg-white border-zinc-200 shadow-sm' : 'bg-black/20 border-white/5 backdrop-blur-md'} z-0`}>
              <button onClick={() => changeWeek('prev')} className={`${ts.textMuted} hover:${ts.textMain} transition-colors`}><ChevronLeft className="w-4 h-4 md:w-5 md:h-5" /></button>
              <div className="text-center min-w-[120px] md:min-w-[160px]">
                <h2 className={`text-sm md:text-lg font-bold tracking-tight ${ts.textMain}`}>{getWeekRangeString(currentDate)}</h2>
                <span className={`text-[8px] md:text-[10px] font-mono uppercase tracking-widest block ${theme === 'minimal' ? 'text-blue-500' : theme === 'cyber' ? 'text-fuchsia-400' : theme === 'forest' ? 'text-emerald-400' : theme === 'oceanic' ? 'text-sky-400' : theme === 'nebula' ? 'text-purple-400' : theme === 'sunset' ? 'text-orange-400' : 'text-orange-500/70'}`}>Semana Operativa</span>
              </div>
              <button onClick={() => changeWeek('next')} className={`${ts.textMuted} hover:${ts.textMain} transition-colors`}><ChevronRight className="w-4 h-4 md:w-5 md:h-5" /></button>
            </div>

            {/* Right Controls */}
            <div className="flex gap-2 relative z-10">
               <button 
                  onClick={toggleWeekends}
                  className={`w-10 h-10 flex items-center justify-center ${ts.iconBg} ${ts.textMuted} hover:bg-white/10 transition-all rounded-full`}
                  title={showWeekends ? 'Ocultar Fines de Semana' : 'Mostrar Fines de Semana'}
               >
                  {showWeekends ? <CalendarDays className="w-5 h-5" /> : <CalendarRange className="w-5 h-5" />}
               </button>
               <button 
                  onClick={() => setIsThemeModalOpen(true)}
                  className={`w-10 h-10 flex items-center justify-center ${ts.iconBg} ${ts.textMuted} hover:bg-white/10 transition-all rounded-full`}
                  title="Cambiar Estilo Visual"
               >
                  <Palette className="w-5 h-5" />
               </button>
            </div>
          </header>

          <main className="flex-1 w-full h-full overflow-hidden">
            <div className={`h-full w-full grid grid-cols-1 ${showWeekends ? 'md:grid-cols-7' : 'md:grid-cols-5'} gap-3 overflow-y-hidden`}>
              {displayedDays.map((day, index) => {
                const colDate = getColumnDate(day, currentDate);
                const isToday = colDate.getDate() === today.getDate() && colDate.getMonth() === today.getMonth() && colDate.getFullYear() === today.getFullYear();
                const dayTasks = tasks.filter(t => t.day === day && (t.weekId === viewedWeekId || (!t.weekId && viewedWeekId === currentRealWeekId)));
                const totalMinutes = dayTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
                const dayNum = colDate.getDate();
                
                const specificTasks: Task[] = [];
                const legislationTasks: Task[] = [];
                let stickerTask: Task | undefined;

                dayTasks.forEach(t => {
                    if (t.title.startsWith('⏱')) {
                        return;
                    }
                    if (t.sticker) {
                        stickerTask = t;
                        return;
                    }

                    if (t.topicTitle) {
                         const topic = syllabus.find(s => s.title === t.topicTitle);
                         if (topic) {
                             if (topic.type === 'specific') {
                                 specificTasks.push(t);
                             } else {
                                 legislationTasks.push(t);
                             }
                         } else {
                             legislationTasks.push(t);
                         }
                    } else {
                        legislationTasks.push(t);
                    }
                });
                
                let colClass = ts.columnBg;
                let headerClass = ts.columnHeader;
                
                if (isToday) {
                    colClass = `${ts.columnBg} ${ts.columnActive} z-10`;
                    if (theme === 'classic') {
                         headerClass = 'bg-gradient-to-r from-[#ff5f40] to-[#ff8f40] text-white shadow-lg';
                    } else if (theme === 'minimal') {
                        headerClass = 'bg-zinc-900 text-white font-bold shadow-lg';
                    } else if (theme === 'cyber') {
                        headerClass = 'bg-cyan-950/80 text-cyan-400 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]';
                    } else if (theme === 'forest') {
                        headerClass = 'bg-emerald-900/80 text-emerald-400 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
                    } else if (theme === 'oceanic') {
                        headerClass = 'bg-sky-900/80 text-sky-300 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.4)]';
                    } else if (theme === 'nebula') {
                        headerClass = 'bg-purple-900/80 text-purple-300 border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.4)]';
                    } else if (theme === 'sunset') {
                        headerClass = 'bg-orange-900/80 text-orange-200 border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.4)]';
                    } else {
                        headerClass = 'bg-orange-600 text-white font-bold tracking-wider';
                    }
                }

                return (
                  <div 
                    key={day} 
                    className={`h-full flex flex-col overflow-hidden cursor-pointer transition-all duration-300 relative group ${colClass} ${ts.radius} ${ts.shadow}`}
                  >
                    <div 
                        onClick={() => handleColumnClick(day, 'legislation')}
                        className={`flex-none h-20 flex flex-col items-center justify-center gap-1 relative transition-colors overflow-hidden ${headerClass}`}
                    >
                      {stickerTask && (
                          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                              <img 
                                src={stickerTask.sticker} 
                                alt="Sticker" 
                                className="h-24 w-24 object-contain opacity-40" 
                              />
                              <button 
                                 onClick={(e) => { e.stopPropagation(); initiateDeleteTask(stickerTask!.id); }}
                                 className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-auto"
                              >
                                <X className="w-3 h-3" />
                              </button>
                          </div>
                      )}

                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80 z-10 relative drop-shadow-md">{day}</span>
                      <span className="text-3xl font-black leading-none z-10 relative drop-shadow-md">{dayNum}</span>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 relative">
                        
                        <ScrollableColumnSection
                            label="Legislación"
                            onClick={(e) => { e.stopPropagation(); handleColumnClick(day, 'legislation'); }}
                            className={`border-b cursor-pointer ${theme === 'minimal' ? 'border-zinc-100 hover:bg-zinc-50' : theme === 'cyber' ? 'border-fuchsia-900/30' : theme === 'oceanic' ? 'border-sky-500/10' : 'border-white/10 hover:bg-white/5'}`}
                            labelColorClass={ts.textMuted}
                            actionIcon={
                                legislationTasks.length === 0 ? <Plus className={`w-4 h-4 ${theme === 'minimal' ? 'text-slate-300' : 'text-white/10'}`} /> : null
                            }
                        >
                             {legislationTasks.map(task => (
                                <TaskBubble key={task.id} task={task} onEdit={handleEditTask} onDelete={initiateDeleteTask} theme={theme} />
                            ))}
                        </ScrollableColumnSection>

                        <ScrollableColumnSection
                            label="Específico"
                            onClick={(e) => { e.stopPropagation(); handleColumnClick(day, 'specific'); }}
                            className={`cursor-pointer ${theme === 'minimal' ? 'hover:bg-zinc-50' : 'hover:bg-white/5'}`}
                            labelColorClass={ts.textMuted}
                        >
                             {specificTasks.map(task => (
                                <TaskBubble key={task.id} task={task} onEdit={handleEditTask} onDelete={initiateDeleteTask} theme={theme} />
                            ))}
                        </ScrollableColumnSection>

                    </div>

                    <div 
                        onClick={(e) => { e.stopPropagation(); setTimeManagementDay(day); }}
                        className="mt-auto pt-2 pb-2 px-2 z-10 flex justify-center items-end bg-gradient-to-t from-black/20 to-transparent cursor-pointer hover:backdrop-brightness-110 transition-all"
                    >
                        <span className={`text-3xl font-black tracking-tighter leading-none ${ts.textMuted} opacity-30`}>
                            {Math.floor(totalMinutes / 60)}
                        </span>
                        <span className={`text-[10px] font-bold uppercase mb-1 ml-0.5 ${ts.textMuted} opacity-30`}>H</span>
                        
                        {totalMinutes % 60 > 0 && (
                            <>
                                <span className={`text-xl font-black tracking-tighter leading-none ml-2 ${ts.textMuted} opacity-30`}>
                                    {totalMinutes % 60}
                                </span>
                                <span className={`text-[10px] font-bold uppercase mb-1 ml-0.5 ${ts.textMuted} opacity-30`}>M</span>
                            </>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
          <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} onPlanGenerated={handleAIPlanGenerated} />
          <AddTaskModal 
            isOpen={isTaskModalOpen} 
            onClose={() => setIsTaskModalOpen(false)} 
            onAdd={handleAddTask}
            onUpdate={handleUpdateTask}
            initialDay={selectedDayForAdd} 
            theme={theme} 
            syllabus={syllabus}
            taskToEdit={editingTask}
            initialSection={sectionForAdd}
          />
          <StatsDetailModal 
             isOpen={isStatsOpen}
             onClose={() => setIsStatsOpen(false)}
             viewedWeekMinutes={currentRealWeekMinutes} 
             tasks={tasks}
             theme={theme}
             viewedWeekId={viewedWeekId}
             currentRealWeekId={currentRealWeekId}
          />
          <TimeEntriesModal 
             isOpen={!!timeManagementDay} 
             onClose={() => setTimeManagementDay(null)}
             day={timeManagementDay}
             tasks={tasks}
             onDelete={deleteTimeEntry}
             theme={theme}
          />
          <DeleteConfirmModal 
             isOpen={!!taskToDeleteId} 
             onClose={() => setTaskToDeleteId(null)}
             onConfirm={confirmDeleteTask}
             theme={theme}
          />
        </div>
      )}

       <ThemeSelectionModal 
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={theme}
        onSelectTheme={handleThemeSelect}
      />
      <QuickLinkConfigModal 
        isOpen={isQuickLinkModalOpen}
        onClose={() => setIsQuickLinkModalOpen(false)}
        currentUrl={quickLink}
        onSave={(url) => setQuickLink(url)}
        theme={theme}
      />
    </div>
  );
}

export default App;