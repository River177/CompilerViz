import React, { useState } from 'react';

interface Props {
  rawGrammar: string;
  setRawGrammar: (s: string) => void;
  onParse: () => void;
}

const DEFAULT_GRAMMAR = `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`;

const LR1_GRAMMAR = `S -> C b B A
A -> A a b
A -> a b
B -> c
B -> D b
C -> a
D -> a`;

const LR0_GRAMMAR = `S -> A
S -> B
A -> a A b
A -> C
B -> a B b
B -> d`;

const GrammarInput: React.FC<Props> = ({ rawGrammar, setRawGrammar, onParse }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-36 z-50 bg-indigo-600 text-white p-3 rounded-l-lg shadow-lg hover:bg-indigo-700 transition-all duration-300 ${
          isOpen ? 'right-[320px]' : 'right-0'
        }`}
        title={isOpen ? "Close Grammar Input" : "Open Grammar Input"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          )}
        </svg>
      </button>

      {/* Sidebar Panel */}
      <div 
        className={`fixed top-32 right-0 bottom-0 z-40 w-[320px] bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 flex flex-col h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Grammar Input
            </h2>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
            <button 
              onClick={() => setRawGrammar(DEFAULT_GRAMMAR)}
              className="text-xs text-blue-500 hover:underline"
            >
              Load Expression
            </button>
            <button 
              onClick={() => setRawGrammar(`S -> A A\nA -> a A | b`)}
              className="text-xs text-blue-500 hover:underline"
            >
              Load S-&gt;AA
            </button>
            <button 
              onClick={() => setRawGrammar(LR1_GRAMMAR)}
              className="text-xs text-blue-500 hover:underline"
            >
              Load LR(1) Example
            </button>
            <button 
              onClick={() => setRawGrammar(LR0_GRAMMAR)}
              className="text-xs text-blue-500 hover:underline"
            >
              Load LR(0) Example
            </button>
          </div>

          <textarea
            className="w-full h-64 p-3 font-mono text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 mb-6 resize-y"
            value={rawGrammar}
            onChange={(e) => setRawGrammar(e.target.value)}
            placeholder="Enter grammar here...&#10;S -> A B | C&#10;A -> a"
          />

          <button
            onClick={onParse}
            className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex justify-center items-center gap-2 mb-4"
          >
            <span>Build Visualizations</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
          
          <div className="mt-auto pt-6 border-t border-slate-100 text-xs text-slate-400">
            <p>Enter your context-free grammar above. Use '-&gt;' for productions and '|' for alternatives. Use 'ε' (or \\varepsilon / \\epsilon) for epsilon productions. 'id' is a common terminal.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default GrammarInput;
