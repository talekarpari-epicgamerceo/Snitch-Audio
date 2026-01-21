import React, { useState } from 'react';
import { Sparkles, AlertCircle, Mic2, FileText, ChevronRight } from 'lucide-react';

interface AnalysisPanelProps {
  report: string | null;
  isLoading: boolean;
  error: string | null;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ report, isLoading, error }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="h-full w-full bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-600" />
          <h3 className="text-sm font-semibold text-slate-700">AI Forensic Analysis</h3>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 text-sm relative">
        
        {/* Initial State: Button to Reveal */}
        {!isRevealed && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
             <div className="bg-purple-50 p-4 rounded-full">
                <Mic2 size={32} className="text-purple-400" />
             </div>
             <div>
               <p className="text-slate-600 font-medium mb-1">Audio Content Analysis</p>
               <p className="text-xs text-slate-400 max-w-[200px] mx-auto">
                 Gemini AI has analyzed the spectrum for music, noise, and anomalies.
               </p>
             </div>
             
             <button
               onClick={() => setIsRevealed(true)}
               className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
             >
               <FileText size={16} />
               View Analysis Report
             </button>
          </div>
        )}

        {/* Revealed State: Loading or Report */}
        {isRevealed && (
          <div className="h-full">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 animate-in fade-in duration-300">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 text-xs">Finalizing report...</p>
              </div>
            )}

            {error && !isLoading && (
              <div className="flex items-start gap-3 text-red-600 bg-red-50 p-4 rounded-lg border border-red-100">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-xs">Analysis Failed</p>
                  <p className="text-xs opacity-90">{error}</p>
                </div>
              </div>
            )}

            {report && !isLoading && (
              <div className="animate-in slide-in-from-bottom-2 duration-300">
                <div className="prose prose-sm prose-slate max-w-none">
                  <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {report}
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                   <button 
                     onClick={() => setIsRevealed(false)} 
                     className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                   >
                     Close Report <ChevronRight size={12} />
                   </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};