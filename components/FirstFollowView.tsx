import React, { useState, useEffect, useRef } from 'react';
import { FirstFollowResult } from '../types';

interface Props {
  data: FirstFollowResult;
}

const FirstFollowView: React.FC<Props> = ({ data }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const timerRef = useRef<number | null>(null);

  const maxStep = data.history.length - 1;
  const currentStep = data.history[stepIndex];
  const prevStep = stepIndex > 0 ? data.history[stepIndex - 1] : null;

  useEffect(() => {
    // Reset when data changes
    setStepIndex(0);
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [data]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        setStepIndex(prev => {
          if (prev >= maxStep) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, maxStep, playbackSpeed]);

  const hasChanged = (
    dict: Record<string, Set<string>>, 
    prevDict: Record<string, Set<string>> | undefined, 
    key: string
  ) => {
    if (!prevDict) return false;
    const currentSet = dict[key];
    const prevSet = prevDict[key];
    if (currentSet.size !== prevSet.size) return true;
    for (const val of currentSet) {
      if (!prevSet.has(val)) return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 sticky top-20 z-10">
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setStepIndex(0)} 
             disabled={stepIndex === 0}
             className="p-2 hover:bg-slate-100 rounded disabled:opacity-30 text-slate-600"
             title="Restart"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
           </button>
           <button 
             onClick={() => setStepIndex(Math.max(0, stepIndex - 1))} 
             disabled={stepIndex === 0}
             className="p-2 hover:bg-slate-100 rounded disabled:opacity-30 text-slate-600"
             title="Previous Step"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
           </button>
           
           <button 
             onClick={() => setIsPlaying(!isPlaying)}
             className={`px-4 py-2 rounded text-white font-medium shadow-sm transition-colors ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
           >
             {isPlaying ? 'Pause' : 'Play'}
           </button>

           <button 
             onClick={() => setStepIndex(Math.min(maxStep, stepIndex + 1))} 
             disabled={stepIndex === maxStep}
             className="p-2 hover:bg-slate-100 rounded disabled:opacity-30 text-slate-600"
             title="Next Step"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
           </button>
           <button 
             onClick={() => setStepIndex(maxStep)} 
             disabled={stepIndex === maxStep}
             className="p-2 hover:bg-slate-100 rounded disabled:opacity-30 text-slate-600"
             title="Jump to End"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
           </button>
        </div>

        <div className="flex items-center gap-4 flex-1">
             <input 
               type="range" 
               min="0" 
               max={maxStep} 
               value={stepIndex} 
               onChange={(e) => setStepIndex(parseInt(e.target.value))}
               className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
             />
             <div className="text-sm font-mono whitespace-nowrap text-slate-500">
               Step {stepIndex + 1} / {maxStep + 1}
             </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded shadow-sm">
         <p className="text-indigo-900 font-medium">{currentStep.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Set */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 relative overflow-hidden">
          <h3 className="text-lg font-bold mb-4 text-indigo-600 border-b pb-2 flex justify-between items-center">
            First Sets
            <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded">Accumulating</span>
          </h3>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-2">Symbol</th>
                <th className="px-4 py-2">First(X)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(currentStep.first).map(([symbol, set], idx) => {
                 const isChanged = hasChanged(currentStep.first, prevStep?.first, symbol);
                 const isActive = currentStep.activeSymbol === symbol;
                 return (
                  <tr key={symbol} className={`transition-colors duration-300 ${isActive ? 'bg-yellow-50 ring-2 ring-yellow-200' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-4 py-2 font-mono font-bold text-slate-700">{symbol}</td>
                    <td className="px-4 py-2 font-mono">
                      <span className={`transition-all duration-300 ${isChanged ? 'text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded' : 'text-slate-600'}`}>
                         {'{ ' + Array.from(set).join(', ') + ' }'}
                      </span>
                    </td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        </div>

        {/* Follow Set */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 relative overflow-hidden">
          <h3 className="text-lg font-bold mb-4 text-purple-600 border-b pb-2 flex justify-between items-center">
            Follow Sets
             <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded">Accumulating</span>
          </h3>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-2">Non-Terminal</th>
                <th className="px-4 py-2">Follow(A)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(currentStep.follow).map(([symbol, set], idx) => {
                 const isChanged = hasChanged(currentStep.follow, prevStep?.follow, symbol);
                 const isActive = currentStep.activeSymbol === symbol;
                 return (
                  <tr key={symbol} className={`transition-colors duration-300 ${isActive ? 'bg-yellow-50 ring-2 ring-yellow-200' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-4 py-2 font-mono font-bold text-slate-700">{symbol}</td>
                    <td className="px-4 py-2 font-mono">
                      <span className={`transition-all duration-300 ${isChanged ? 'text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded' : 'text-slate-600'}`}>
                        {'{ ' + Array.from(set).join(', ') + ' }'}
                      </span>
                    </td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Logs (static history) */}
       <div className="bg-slate-800 text-slate-300 p-4 rounded-lg shadow-inner font-mono text-xs max-h-32 overflow-y-auto opacity-80">
        <h4 className="font-bold text-slate-400 mb-2 sticky top-0 bg-slate-800">Computation Log Preview:</h4>
        {data.logs.map((log, i) => (
          <div key={i} className="mb-1 border-b border-slate-700 pb-1 last:border-0">{`> ${log}`}</div>
        ))}
      </div>
    </div>
  );
};

export default FirstFollowView;