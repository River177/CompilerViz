import React, { useState, useMemo } from 'react';
import GrammarInput from './components/GrammarInput';
import FirstFollowView from './components/FirstFollowView';
import LL1ParsingView from './components/LL1ParsingView';
import LRParsingView from './components/LRParsingView';
import { 
    parseGrammarInput, 
    computeFirstFollow, 
    buildLL1Table, 
    buildLRCollection,
} from './services/compilerLogic';
import { AlgorithmType, Grammar, FirstFollowResult, ParsingTable, CanonicalState, LRCollectionResult } from './types';

function App() {
  const [rawGrammar, setRawGrammar] = useState(`E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id`);
  const [grammar, setGrammar] = useState<Grammar | null>(null);
  const [activeTab, setActiveTab] = useState<'SETUP' | 'FIRST_FOLLOW' | 'LL1' | 'LR0' | 'SLR1' | 'LR1'>('SETUP');
  
  // Computed Data Storage
  const [firstFollow, setFirstFollow] = useState<FirstFollowResult | null>(null);
  const [ll1Table, setLl1Table] = useState<ParsingTable | null>(null);
  const [lrData, setLrData] = useState<{
      [key in AlgorithmType]?: LRCollectionResult
  }>({});

  const handleParse = () => {
    try {
      // 1. Parse Grammar
      const g = parseGrammarInput(rawGrammar);
      setGrammar(g);

      // 2. First & Follow
      const ff = computeFirstFollow(g);
      setFirstFollow(ff);

      // 3. LL(1) Table
      const ll1 = buildLL1Table(g, ff);
      setLl1Table(ll1);

      // 4. LR Collections
      const lr0 = buildLRCollection(g, AlgorithmType.LR0, ff);
      const slr1 = buildLRCollection(g, AlgorithmType.SLR1, ff); // Same items as LR0, different table logic
      const lr1 = buildLRCollection(g, AlgorithmType.LR1, ff);

      setLrData({
          [AlgorithmType.LR0]: lr0,
          [AlgorithmType.SLR1]: slr1,
          [AlgorithmType.LR1]: lr1,
      });

      setActiveTab('FIRST_FOLLOW');
    } catch (e) {
      console.error(e);
      alert("Error parsing grammar. Check console for details.");
    }
  };

  const tabs = [
    { id: 'SETUP', label: 'Grammar Input' },
    { id: 'FIRST_FOLLOW', label: 'First & Follow' },
    { id: 'LL1', label: 'LL(1) Table' },
    { id: 'LR0', label: 'LR(0) Table' },
    { id: 'SLR1', label: 'SLR(1) Table' },
    { id: 'LR1', label: 'LR(1) Table' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-500 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                 </div>
                 <div>
                    <h1 className="text-xl font-bold">CompilerViz</h1>
                    <p className="text-indigo-200 text-xs">Interactive Syntax Analysis Tool</p>
                 </div>
            </div>
            {grammar && (
                <div className="text-xs bg-indigo-800 px-3 py-1 rounded">
                    Non-Terminals: {grammar.nonTerminals.size} | Terminals: {grammar.terminals.size}
                </div>
            )}
        </div>
        
        {/* Navigation */}
        <div className="bg-indigo-800 text-indigo-100">
             <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto space-x-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        disabled={tab.id !== 'SETUP' && !grammar}
                        className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === tab.id 
                            ? 'border-white text-white' 
                            : 'border-transparent hover:text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
             </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        
        {activeTab === 'SETUP' && (
            <GrammarInput 
                rawGrammar={rawGrammar} 
                setRawGrammar={setRawGrammar} 
                onParse={handleParse} 
            />
        )}

        {activeTab === 'FIRST_FOLLOW' && firstFollow && (
            <FirstFollowView data={firstFollow} />
        )}

        {activeTab === 'LL1' && ll1Table && grammar && (
            <LL1ParsingView table={ll1Table} grammar={grammar} />
        )}

        {activeTab === 'LR0' && lrData[AlgorithmType.LR0] && grammar && (
            <LRParsingView 
                grammar={grammar}
                states={lrData[AlgorithmType.LR0]!.states} 
                gotoTable={lrData[AlgorithmType.LR0]!.gotoTable} 
                history={lrData[AlgorithmType.LR0]!.history}
                type={AlgorithmType.LR0}
            />
        )}

        {activeTab === 'SLR1' && lrData[AlgorithmType.SLR1] && grammar && (
             <LRParsingView 
                grammar={grammar}
                states={lrData[AlgorithmType.SLR1]!.states} 
                gotoTable={lrData[AlgorithmType.SLR1]!.gotoTable} 
                history={lrData[AlgorithmType.SLR1]!.history}
                type={AlgorithmType.SLR1}
            />
        )}

        {activeTab === 'LR1' && lrData[AlgorithmType.LR1] && grammar && (
             <LRParsingView 
                grammar={grammar}
                states={lrData[AlgorithmType.LR1]!.states} 
                gotoTable={lrData[AlgorithmType.LR1]!.gotoTable} 
                history={lrData[AlgorithmType.LR1]!.history}
                type={AlgorithmType.LR1}
            />
        )}
      </main>

      <footer className="bg-slate-800 text-slate-400 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
            <p>CompilerViz &copy; {new Date().getFullYear()} - Visualizing Syntax Analysis Algorithms</p>
        </div>
      </footer>
    </div>
  );
}

export default App;