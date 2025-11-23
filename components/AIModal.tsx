import React, { useState } from 'react';
import { X, Sparkles, Loader2, Zap } from 'lucide-react';
import { generateSchedule } from '../services/geminiService';
import { AIPlanResponse } from '../types';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanGenerated: (plan: AIPlanResponse) => void;
}

const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, onPlanGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const plan = await generateSchedule(prompt);
      if (plan) {
        onPlanGenerated(plan);
        onClose();
        setPrompt('');
      } else {
        setError("No se pudo generar un plan. Intenta ser más específico.");
      }
    } catch (err) {
      setError("Error al conectar con el servicio de IA. Verifica tu conexión o API Key.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all scale-100 relative text-white">
        
        {/* Header with gradient */}
        <div className="relative p-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 opacity-90"></div>
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/10 mb-3 text-indigo-200">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span>Gemini AI Powered</span>
              </div>
              <h2 className="font-bold text-2xl mb-1">Planificador Mágico</h2>
              <p className="text-indigo-200 text-sm">Describe tu semana ideal y la IA la organizará por ti.</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-8 space-y-6 bg-[#252525]">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              ¿Qué quieres lograr?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: Quiero estudiar React 2 horas al día por las mañanas, ir al gimnasio Lunes y Miércoles a las 18:00, y descansar el fin de semana."
              className="w-full h-40 p-4 bg-black/30 border border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-slate-200 text-base transition-all placeholder-slate-600"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-900/20 text-red-400 text-sm rounded-xl border border-red-900/50 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className={`w-full relative overflow-hidden group flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-lg transition-all
              ${isLoading || !prompt.trim() 
                ? 'bg-white/5 text-slate-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-1'
              }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="animate-pulse">Diseñando tu semana...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 group-hover:animate-spin-slow" />
                Generar Plan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIModal;