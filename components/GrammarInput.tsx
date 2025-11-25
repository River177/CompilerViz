import React, { useState } from 'react';

interface Props {
  rawGrammar: string;
  setRawGrammar: (s: string) => void;
  onParse: () => void;
}

const DEFAULT_GRAMMAR = `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`;

const GrammarInput: React.FC<Props> = ({ rawGrammar, setRawGrammar, onParse }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
      <h2 className="text-xl font-bold mb-4 text-indigo-700 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Grammar Input
      </h2>
      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => setRawGrammar(DEFAULT_GRAMMAR)}
          className="text-xs text-blue-500 hover:underline"
        >
          Load Expression Grammar
        </button>
        <button 
          onClick={() => setRawGrammar(`S -> A A\nA -> a A | b`)}
          className="text-xs text-blue-500 hover:underline"
        >
          Load S->AA Grammar
        </button>
      </div>
      <textarea
        className="w-full h-48 p-3 font-mono text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
        value={rawGrammar}
        onChange={(e) => setRawGrammar(e.target.value)}
        placeholder="Enter grammar here...&#10;S -> A B | C&#10;A -> a"
      />
      <div className="flex gap-3 mt-4">
        <button
          onClick={onParse}
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Build Visualizations
        </button>
      </div>
    </div>
  );
};

export default GrammarInput;