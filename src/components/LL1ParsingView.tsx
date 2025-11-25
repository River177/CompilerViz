import React, { useState, useEffect, useRef } from 'react';
import { ParsingTable, Grammar, ParseTreeNode } from '../types';
import ParseTreeView from './ParseTreeView';

interface Props {
  table: ParsingTable;
  grammar: Grammar;
}

interface StepSnapshot {
  stack: string[];
  input: string[];
  action: string;
  tree: ParseTreeNode | null;
}

const LL1ParsingView: React.FC<Props> = ({ table, grammar }) => {
  const [inputStr, setInputStr] = useState('id + id * id');
  const [history, setHistory] = useState<StepSnapshot[]>([]);
  
  // Playback state
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  const parseInput = () => {
    const input = inputStr.trim().split(/\s+/).concat('$');
    // Logic for stack now includes tree nodes
    let nodeIdCounter = 0;
    const nextId = () => `node-${nodeIdCounter++}`;

    const rootNode: ParseTreeNode = { id: nextId(), label: grammar.startSymbol, children: [] };
    
    // Stack items: { symbol, node }. Node is null for terminals or $
    // We maintain a reference to the tree nodes to build the tree structure
    let currentStack: { symbol: string, node: ParseTreeNode | null }[] = [
        { symbol: '$', node: null },
        { symbol: grammar.startSymbol, node: rootNode }
    ];

    let ip = 0;
    const newHistory: StepSnapshot[] = [];
    let treeResult = rootNode;

    // Helper to clone tree for snapshot
    const snapshotTree = (node: ParseTreeNode): ParseTreeNode => JSON.parse(JSON.stringify(node));

    // Initial snapshot
    newHistory.push({
        stack: currentStack.map(i => i.symbol),
        input: input.slice(ip),
        action: 'Start',
        tree: snapshotTree(treeResult)
    });

    let steps = 0;
    while(currentStack.length > 0 && steps < 100) {
      const topItem = currentStack[currentStack.length - 1];
      const top = topItem.symbol;
      const currentInput = input[ip];
      
      let action = '';
      
      if (top === '$' && currentInput === '$') {
        action = 'ACCEPT';
        newHistory.push({
            stack: currentStack.map(i => i.symbol),
            input: input.slice(ip),
            action,
            tree: snapshotTree(treeResult)
        });
        break;
      }

      if (top === currentInput) {
        action = `Match ${top}`;
        currentStack.pop();
        ip++;
      } else if (grammar.terminals.has(top) || top === '$') {
        action = 'Error: Terminal Mismatch';
        newHistory.push({
            stack: currentStack.map(i => i.symbol),
            input: input.slice(ip),
            action,
            tree: snapshotTree(treeResult)
        });
        break;
      } else {
        // Non-terminal
        const rule = table.rows[top]?.[currentInput];
        if (rule) {
          action = `Output ${rule}`;
          currentStack.pop(); // Remove NT
          
          const [lhs, rhsStr] = rule.split(' -> ');
          const parentNode = topItem.node;

          if (rhsStr !== 'ε') {
             const rhs = rhsStr.split(' ');
             // Create children nodes
             const childNodes = rhs.map(s => ({ id: nextId(), label: s, children: [] }));
             
             if (parentNode) {
                 parentNode.children = childNodes;
             }

             // Push to stack in reverse
             for (let i = rhs.length - 1; i >= 0; i--) {
               currentStack.push({ symbol: rhs[i], node: childNodes[i] });
             }
          } else {
              // Epsilon case
              const epsilonNode = { id: nextId(), label: 'ε', children: [] };
              if (parentNode) {
                  parentNode.children = [epsilonNode];
              }
          }
        } else {
          action = 'Error: No entry in table';
          newHistory.push({
            stack: currentStack.map(i => i.symbol),
            input: input.slice(ip),
            action,
            tree: snapshotTree(treeResult)
          });
          break;
        }
      }
      
      newHistory.push({
          stack: currentStack.map(i => i.symbol),
          input: input.slice(ip),
          action,
          tree: snapshotTree(treeResult)
      });
      steps++;
    }

    setHistory(newHistory);
    setStepIndex(0);
    setIsPlaying(false);
  };

  // Playback logic
  useEffect(() => {
    if (isPlaying) {
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
  }, [isPlaying, history.length]);

  const currentStep = history[stepIndex];

  return (
    <div className="space-y-6">
      {/* Table Section */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h3 className="text-lg font-bold mb-4 text-indigo-600">LL(1) Parsing Table</h3>
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-slate-100">NT \ T</th>
              {table.headers.map(h => (
                <th key={h} className="border p-2 bg-slate-100 font-mono">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(table.rows).map(nt => (
              <tr key={nt}>
                <td className="border p-2 font-bold font-mono">{nt}</td>
                {table.headers.map(h => (
                  <td key={h} className="border p-2 font-mono text-slate-600 whitespace-nowrap">
                    {table.rows[nt][h] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Simulator Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-bold mb-4 text-emerald-600">Parser Simulator</h3>
        
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
            className="px-6 py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition-colors"
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
                        <div className="grid grid-cols-[80px_1fr] gap-2">
                            <span className="text-slate-400">Stack:</span>
                            <span className="break-all">{currentStep.stack.join(' ')}</span>
                            
                            <span className="text-slate-400">Input:</span>
                            <span className="break-all">{currentStep.input.join(' ')}</span>
                        </div>
                    </div>

                    {/* Trace Table */}
                    <div className="overflow-y-auto max-h-64 border rounded bg-white">
                        <table className="min-w-full text-xs text-left font-mono">
                            <thead className="bg-slate-100 sticky top-0">
                                <tr>
                                    <th className="p-2 border-b">#</th>
                                    <th className="p-2 border-b">Stack</th>
                                    <th className="p-2 border-b">Input</th>
                                    <th className="p-2 border-b">Action</th>
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
                                        <td className="p-2 border-b max-w-[100px] truncate">{step.stack.join(' ')}</td>
                                        <td className="p-2 border-b max-w-[100px] truncate">{step.input.join(' ')}</td>
                                        <td className="p-2 border-b">{step.action}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            
                {/* Tree View */}
                <div className="border rounded-lg p-4 bg-slate-50 overflow-auto min-h-[400px] flex flex-col relative shadow-inner">
                    <h4 className="font-bold text-slate-700 mb-2 sticky top-0 left-0 bg-slate-50/90 backdrop-blur-sm p-1 z-10 w-full border-b">
                        Parse Tree Construction
                    </h4>
                    <div className="flex-1 flex items-center justify-center">
                        {currentStep.tree ? (
                            <ParseTreeView root={currentStep.tree} />
                        ) : (
                            <div className="text-slate-400">Ready</div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LL1ParsingView;