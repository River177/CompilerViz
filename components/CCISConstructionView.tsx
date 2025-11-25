import React, { useState, useEffect, useRef } from 'react';
import { CCISStep, LRItem, AlgorithmType, CanonicalState } from '../types';

interface Props {
  history: CCISStep[];
  type: AlgorithmType;
}

const CCISConstructionView: React.FC<Props> = ({ history, type }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  const maxStep = history.length - 1;
  const currentStep = history[stepIndex];

  useEffect(() => {
      setStepIndex(0);
      setIsPlaying(false);
  }, [history]);

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
      }, 800);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, maxStep]);

  const renderItem = (item: LRItem) => {
      return (
        <div className="font-mono text-xs whitespace-nowrap">
            {item.lhs} &rarr; 
            {item.rhs.map((s, i) => (
                <span key={i}>
                {i === item.dot ? <span className="text-red-500 font-bold mx-0.5">•</span> : ' '}
                {s}
                </span>
            ))}
            {item.dot === item.rhs.length ? <span className="text-red-500 font-bold mx-0.5">•</span> : ''}
            {type === AlgorithmType.LR1 && <span className="text-cyan-600 ml-1">[{item.lookahead}]</span>}
        </div>
      );
  };

  const renderStateRows = (state: CanonicalState) => {
      const isActiveState = state.id === currentStep.activeStateId;
      
      // 1. Group items by next symbol (the symbol after dot)
      const groups: Record<string, LRItem[]> = {};
      const reductions: LRItem[] = [];
      
      state.items.forEach(item => {
          if (item.dot < item.rhs.length) {
              const sym = item.rhs[item.dot];
              if (!groups[sym]) groups[sym] = [];
              groups[sym].push(item);
          } else {
              reductions.push(item);
          }
      });

      // 2. Identify all rows needed (Transitions + Reductions)
      const transitionKeys = Object.keys(state.transitions);
      const itemKeys = Object.keys(groups);
      // Union of symbols found in items and symbols found in known transitions
      const allSyms = Array.from(new Set([...transitionKeys, ...itemKeys])).sort();

      interface RowData {
          type: 'transition' | 'reduction';
          symbol: string | null;
          items: LRItem[];
          targetId: number | undefined;
      }

      const rows: RowData[] = [];

      allSyms.forEach(sym => {
          rows.push({
              type: 'transition',
              symbol: sym,
              items: groups[sym] || [],
              targetId: state.transitions[sym]
          });
      });

      if (reductions.length > 0) {
          rows.push({
              type: 'reduction',
              symbol: null,
              items: reductions,
              targetId: undefined
          });
      }
      
      if (rows.length === 0) {
           return (
              <tr key={state.id}>
                <td className="px-4 py-3 align-top font-bold text-slate-700 border-b border-slate-200">I<sub>{state.id}</sub></td>
                <td colSpan={3} className="px-4 py-3 text-slate-400 italic border-b border-slate-200">Empty State</td>
              </tr>
           );
      }

      return rows.map((row, idx) => {
        const isFirst = idx === 0;
        
        // Visualization Highlight Logic
        const isActiveRow = isActiveState && (
            (row.type === 'transition' && currentStep.activeSymbol === row.symbol)
        );
        const isTargetMatch = isActiveRow && row.targetId === currentStep.targetStateId;

        return (
            <tr key={`${state.id}-${row.symbol ?? 'RED'}`} className={isActiveState ? 'bg-yellow-50/30' : 'hover:bg-slate-50'}>
                {isFirst && (
                    <td className="px-4 py-3 align-top font-bold text-slate-700 border-r border-slate-200 border-b border-slate-200 bg-white" rowSpan={rows.length}>
                        <div className="sticky top-0">
                            I<sub>{state.id}</sub>
                            {isActiveState && <span className="ml-2 inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>}
                        </div>
                    </td>
                )}
                
                {/* Items corresponding to this row */}
                <td className={`px-4 py-2 align-top border-r border-slate-100 border-b border-slate-100 ${isActiveRow ? 'bg-yellow-100/50' : ''}`}>
                    <div className="space-y-1">
                        {row.items.map((item, i) => (
                             <div key={i}>{renderItem(item)}</div>
                        ))}
                        {row.items.length === 0 && <span className="text-slate-300 italic text-xs">No explicit items</span>}
                    </div>
                </td>

                {/* Next Symbol */}
                <td className={`px-4 py-2 align-middle border-b border-slate-100 font-mono text-center ${isActiveRow ? 'bg-indigo-100 font-bold text-indigo-700' : ''}`}>
                    {row.symbol ? (
                        <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600">{row.symbol}</span>
                    ) : (
                        <span className="text-slate-300">-</span>
                    )}
                </td>

                {/* Next State */}
                <td className={`px-4 py-2 align-middle border-b border-slate-100 ${isTargetMatch ? 'bg-emerald-100' : ''}`}>
                    {row.targetId !== undefined ? (
                         <div className={`inline-flex items-center px-2 py-1 rounded border ${isTargetMatch ? 'bg-emerald-200 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-700'}`}>
                             <span className="font-bold mr-1">I<sub>{row.targetId}</sub></span>
                             <svg className="w-3 h-3 ml-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                         </div>
                    ) : (
                        row.type === 'reduction' ? (
                            <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded bg-slate-50">Reduce</span>
                        ) : (
                            <span className="text-slate-300 text-sm">...</span>
                        )
                    )}
                </td>
            </tr>
        );
      });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
             <button onClick={() => setStepIndex(0)} disabled={stepIndex === 0} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30">
               <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
             </button>
             <button onClick={() => setStepIndex(Math.max(0, stepIndex - 1))} disabled={stepIndex === 0} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30">
               <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
             </button>
             <button onClick={() => setIsPlaying(!isPlaying)} className={`px-3 py-1 rounded text-white text-sm font-medium ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
               {isPlaying ? 'Pause' : 'Play'}
             </button>
             <button onClick={() => setStepIndex(Math.min(maxStep, stepIndex + 1))} disabled={stepIndex === maxStep} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30">
               <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </button>
             <button onClick={() => setStepIndex(maxStep)} disabled={stepIndex === maxStep} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30">
               <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
             </button>
        </div>
        <div className="flex-1 mx-4">
             <input type="range" min="0" max={maxStep} value={stepIndex} onChange={(e) => setStepIndex(parseInt(e.target.value))} className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
        </div>
        <div className="text-sm font-mono text-slate-500 whitespace-nowrap">
            Step {stepIndex + 1} / {maxStep + 1}
        </div>
      </div>

      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded text-sm text-indigo-900 font-medium">
          {currentStep.description}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                  <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider w-20">State</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider">Grouped Items</th>
                      <th className="px-4 py-3 text-center font-bold text-slate-600 uppercase tracking-wider w-32">Next Symbol</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider w-40">Next State</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                  {currentStep.states.map(state => renderStateRows(state))}
              </tbody>
          </table>
      </div>
    </div>
  );
};

export default CCISConstructionView;