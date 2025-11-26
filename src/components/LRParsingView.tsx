import React, { useState, useEffect, useRef } from 'react';
import { ParsingTable, Grammar, CanonicalState, AlgorithmType, ParseTreeNode, CCISStep } from '../types';
import { EPSILON } from '../services/compilerLogic';
import ParseTreeView from './ParseTreeView';
import CCISConstructionView from './CCISConstructionView';

interface Props {
  grammar: Grammar;
  states: CanonicalState[];
  gotoTable: ParsingTable;
  history: CCISStep[];
  type: AlgorithmType;
}

interface StepSnapshot {
    stack: string[];
    symbols: string[];
    input: string[];
    action: string;
    forest: ParseTreeNode[];
}

const LRParsingView: React.FC<Props> = ({ grammar, states, gotoTable, history: ccisHistory, type }) => {
  const [viewMode, setViewMode] = useState<'CONSTRUCTION' | 'TABLE' | 'SIMULATION'>('CONSTRUCTION');

  const [inputStr, setInputStr] = useState('id + id * id');
  const [history, setHistory] = useState<StepSnapshot[]>([]);
  
  // Playback
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  const parseInput = () => {
     const input = inputStr.trim().split(/\s+/).concat('$');
     const stack = [0]; // State stack
     const symbolStack = ['$']; // Symbol stack
     
     // Tree building
     let nodeIdCounter = 0;
     const nextId = () => `node-${nodeIdCounter++}`;
     // Stack to hold subtrees/nodes corresponding to symbols.
     // null acts as a placeholder for the initial state/boundary
     const nodeStack: (ParseTreeNode | null)[] = [null]; 

     let ip = 0;
     const newHistory: StepSnapshot[] = [];
     let steps = 0;

     // Helper to clone the current forest (non-null nodes)
     const snapshotForest = (stackNodes: (ParseTreeNode | null)[]): ParseTreeNode[] => {
         const roots = stackNodes.filter(n => n !== null) as ParseTreeNode[];
         return JSON.parse(JSON.stringify(roots));
     };

     // Initial snapshot
     newHistory.push({
         stack: stack.map(String),
         symbols: [...symbolStack],
         input: input.slice(ip),
         action: 'Start',
         forest: snapshotForest(nodeStack)
     });

     while(steps < 200) {
       const currentState = stack[stack.length - 1];
       const currentInput = input[ip];
       let actionDesc = '';
       let shouldBreak = false;

       const actionRaw = gotoTable.rows[currentState]?.[currentInput];

       if (!actionRaw) {
         actionDesc = 'Error: No transition';
         shouldBreak = true;
       } else {
            // Handle conflicts simply by taking first
            const action = actionRaw.split('/')[0]; 

            if (action.startsWith('s')) {
                // Shift
                const nextState = parseInt(action.substring(1));
                actionDesc = `Shift ${currentInput} to ${nextState}`;
                stack.push(nextState);
                symbolStack.push(currentInput);
                
                // Create leaf node and push to forest stack
                nodeStack.push({ id: nextId(), label: currentInput, children: [] });
                
                ip++;
            } else if (action.startsWith('r')) {
                // Reduce
                const prodContent = action.substring(2, action.length - 1); // Remove r( ... )
                actionDesc = `Reduce ${prodContent}`;
                
                const [lhs, rhsRaw] = prodContent.split(' -> ');
                const isEpsilon = rhsRaw === EPSILON || rhsRaw.trim().length === 0;
                const rhsLen = isEpsilon ? 0 : rhsRaw.split(' ').length;

                const children: ParseTreeNode[] = [];

                // Pop items from stacks
                for(let k=0; k<rhsLen; k++) {
                    stack.pop();
                    symbolStack.pop();
                    const node = nodeStack.pop();
                    if (node) children.unshift(node);
                }
                
                // Handle Epsilon Node
                if (isEpsilon) {
                    children.push({ id: nextId(), label: EPSILON, children: [] });
                }

                const topState = stack[stack.length - 1];
                const gotoStateRaw = gotoTable.rows[topState]?.[lhs];
                
                if (gotoStateRaw) {
                    const gotoState = parseInt(gotoStateRaw);
                    stack.push(gotoState);
                    symbolStack.push(lhs);

                    // Create new Parent Node
                    const newNode: ParseTreeNode = {
                        id: nextId(),
                        label: lhs,
                        children: children
                    };
                    nodeStack.push(newNode);
                } else {
                    actionDesc += " (Error during goto)";
                    shouldBreak = true;
                }

            } else if (action === 'acc') {
                actionDesc = 'ACCEPT';
                shouldBreak = true;
            } else {
                actionDesc = "Error: Invalid action on terminal";
                shouldBreak = true;
            }
       }

       newHistory.push({
         stack: stack.map(String),
         symbols: [...symbolStack],
         input: input.slice(ip),
         action: actionDesc,
         forest: snapshotForest(nodeStack)
       });

       if (shouldBreak) break;
       steps++;
     }

     setHistory(newHistory);
     setStepIndex(0);
     setIsPlaying(false);
  };

  // Playback logic for parser
  useEffect(() => {
    if (isPlaying && viewMode === 'SIMULATION') {
      timerRef.current = window.setInterval(() => {
        setStepIndex(prev => {
          if (prev >= history.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, history.length, viewMode]);

  const currentStep = history[stepIndex];

  return (
    <div className="space-y-6">
      
      {/* Sub Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
          <button 
             onClick={() => setViewMode('CONSTRUCTION')}
             className={`pb-2 font-medium text-sm transition-colors ${viewMode === 'CONSTRUCTION' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
             Item Sets Construction
          </button>
          <button 
             onClick={() => setViewMode('TABLE')}
             className={`pb-2 font-medium text-sm transition-colors ${viewMode === 'TABLE' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
             Parsing Table & States
          </button>
          <button 
             onClick={() => setViewMode('SIMULATION')}
             className={`pb-2 font-medium text-sm transition-colors ${viewMode === 'SIMULATION' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
             Parsing Simulator
          </button>
      </div>

      {/* VIEW: CONSTRUCTION */}
      {viewMode === 'CONSTRUCTION' && (
          <div className="animate-fade-in">
              <h3 className="text-xl font-bold text-indigo-700 mb-4">Canonical Collection Construction ({type})</h3>
              <CCISConstructionView history={ccisHistory} type={type} />
          </div>
      )}

      {/* VIEW: TABLE & STATES */}
      {viewMode === 'TABLE' && (
        <div className="space-y-8 animate-fade-in">
            {/* Canonical Collection Grid */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-indigo-700">Final Item Sets (States)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto border p-2 rounded bg-slate-50">
                {states.map(state => (
                    <div 
                    key={state.id} 
                    className="border rounded-lg p-3 shadow-sm bg-white hover:bg-slate-50 transition-all"
                    >
                    <div className="flex justify-between border-b pb-1 mb-2">
                        <span className="font-bold text-slate-700">State {state.id}</span>
                    </div>
                    <ul className="text-xs font-mono space-y-1 mb-2 text-slate-600">
                        {state.items.map((item, idx) => (
                        <li key={idx} className="whitespace-nowrap overflow-x-auto">
                            {item.lhs} &rarr; 
                            {item.rhs.map((s, i) => (
                            <span key={i}>
                                {i === item.dot ? <span className="text-red-500 font-bold mx-0.5">•</span> : ' '}
                                {s}
                            </span>
                            ))}
                            {item.dot === item.rhs.length ? <span className="text-red-500 font-bold mx-0.5">•</span> : ''}
                            {type === AlgorithmType.LR1 && <span className="text-cyan-600 ml-2">[{item.lookahead}]</span>}
                        </li>
                        ))}
                    </ul>
                    {Object.keys(state.transitions).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Transitions</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(state.transitions).map(([sym, dest]) => (
                                    <span key={sym} className="text-[10px] px-1.5 py-0.5 bg-slate-200 rounded text-slate-700">
                                        {sym} &rarr; {dest}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    </div>
                ))}
                </div>
            </div>

            {/* Parsing Table */}
            <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
                <h3 className="text-lg font-bold mb-4 text-indigo-600">Parsing Table ({type})</h3>
                <table className="min-w-full text-xs border-collapse">
                    <thead>
                        <tr>
                            <th className="border p-2 bg-slate-100">State</th>
                            {gotoTable.headers.map(h => (
                                <th key={h} className="border p-2 bg-slate-100 font-mono">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {states.map(s => (
                            <tr key={s.id}>
                                <td className="border p-2 font-bold bg-slate-50">{s.id}</td>
                                {gotoTable.headers.map(h => {
                                    const val = gotoTable.rows[s.id]?.[h];
                                    let cellClass = "border p-2 font-mono whitespace-nowrap ";
                                    if (val?.includes('/')) cellClass += "bg-red-100 text-red-800 font-bold"; // Conflict
                                    else if (val === 'acc') cellClass += "bg-green-100 text-green-800 font-bold";
                                    return (
                                        <td key={h} className={cellClass}>{val || ''}</td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* VIEW: SIMULATION */}
      {viewMode === 'SIMULATION' && (
        <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
            <h3 className="text-lg font-bold mb-4 text-emerald-600">LR Parser Simulator</h3>
            <div className="flex gap-2 mb-6">
            <input 
                type="text" 
                value={inputStr}
                onChange={(e) => setInputStr(e.target.value)}
                className="flex-1 p-2 border border-slate-300 rounded font-mono"
                placeholder="Input string (space separated tokens)"
            />
            <button 
                onClick={parseInput}
                className="px-6 py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700"
            >
                Run Parser
            </button>
            </div>
            
            {history.length > 0 && (
            <div className="space-y-4">
                {/* Controls */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between sticky top-20 z-10">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setStepIndex(0)} disabled={stepIndex === 0}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        </button>
                        <button 
                            onClick={() => setStepIndex(Math.max(0, stepIndex - 1))} disabled={stepIndex === 0}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`px-4 py-1 rounded text-white font-medium text-sm transition-colors ${isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
                        <button 
                            onClick={() => setStepIndex(Math.min(history.length - 1, stepIndex + 1))} disabled={stepIndex === history.length - 1}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <button 
                            onClick={() => setStepIndex(history.length - 1)} disabled={stepIndex === history.length - 1}
                            className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    <div className="text-sm font-mono text-slate-600">
                        Step {stepIndex + 1} / {history.length}
                    </div>
                    <input 
                    type="range" min="0" max={history.length - 1} value={stepIndex} 
                    onChange={(e) => setStepIndex(parseInt(e.target.value))}
                    className="w-1/3 accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* State View */}
                    <div className="space-y-4">
                        <div className="bg-slate-800 text-white p-4 rounded-lg shadow-inner font-mono text-sm">
                            <div className="flex justify-between border-b border-slate-600 pb-2 mb-2">
                                <span className="text-slate-400">Action:</span>
                                <span className={`font-bold ${currentStep.action.includes('Error') ? 'text-red-400' : currentStep.action === 'ACCEPT' ? 'text-emerald-400' : 'text-indigo-300'}`}>
                                    {currentStep.action}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <span className="text-slate-400">State Stack:</span>
                                    <span className="break-all">{currentStep.stack.join(' ')}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <span className="text-slate-400">Symbol Stack:</span>
                                    <span className="break-all">{currentStep.symbols.join(' ')}</span>
                                </div>
                                <div className="grid grid-cols-[100px_1fr] gap-2">
                                    <span className="text-slate-400">Input:</span>
                                    <span className="break-all">{currentStep.input.join(' ')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Trace Table */}
                        <div className="overflow-y-auto max-h-64 border rounded bg-white">
                            <table className="min-w-full text-xs text-left font-mono">
                                <thead className="bg-slate-100 sticky top-0">
                                    <tr>
                                        <th className="p-2 border-b">#</th>
                                        <th className="p-2 border-b">Action</th>
                                        <th className="p-2 border-b">Stack Top</th>
                                        <th className="p-2 border-b">Input</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((step, i) => (
                                        <tr 
                                            key={i} 
                                            className={`cursor-pointer hover:bg-indigo-50 ${i === stepIndex ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-300' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                                            onClick={() => { setStepIndex(i); setIsPlaying(false); }}
                                        >
                                            <td className="p-2 border-b">{i + 1}</td>
                                            <td className="p-2 border-b text-indigo-700 font-bold">{step.action.split(' ')[0]}</td>
                                            <td className="p-2 border-b truncate max-w-[100px]">{step.stack[step.stack.length - 1]}</td>
                                            <td className="p-2 border-b truncate max-w-[100px]">{step.input.join(' ')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Tree View */}
                    <div className="border rounded-lg p-4 bg-slate-50 overflow-auto min-h-[400px] flex flex-col relative shadow-inner">
                        <h4 className="font-bold text-slate-700 mb-2 sticky top-0 left-0 bg-slate-50/90 backdrop-blur-sm p-1 z-10 w-full border-b flex justify-between">
                            <span>Parse Tree Construction</span>
                            <span className="text-xs font-normal text-slate-500">Forest Roots: {currentStep.forest.length}</span>
                        </h4>
                        <div className="flex-1 flex items-end justify-center pb-10">
                            {/* Render the Forest of nodes on stack */}
                            <ParseTreeView roots={currentStep.forest} />
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
      )}

    </div>
  );
};

export default LRParsingView;
