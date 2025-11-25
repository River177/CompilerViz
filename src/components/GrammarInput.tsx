import React, { useState, useEffect } from 'react';

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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const distance = Math.sqrt(Math.pow(e.clientX - dragStart.x, 2) + Math.pow(e.clientY - dragStart.y, 2));
      if (distance > 5) {
        setHasMoved(true);
      }
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          if (!hasMoved) setIsOpen(true);
        }}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-xl hover:bg-indigo-700 cursor-move"
        title="Open Grammar Input"
        onMouseDown={handleMouseDown}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    );
  }

  return (
    <div 
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      className="fixed bottom-6 right-6 z-50 w-[500px] bg-white p-6 rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-in fade-in slide-in-from-bottom-4"
    >
      <div 
        className="flex justify-between items-center mb-4 cursor-move select-none border-b border-slate-100 pb-2"
        onMouseDown={handleMouseDown}
      >
        <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Grammar Input
        </h2>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
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
        className="w-full h-48 p-3 font-mono text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 mb-4 resize-y"
        value={rawGrammar}
        onChange={(e) => setRawGrammar(e.target.value)}
        placeholder="Enter grammar here...&#10;S -> A B | C&#10;A -> a"
      />

      <button
        onClick={onParse}
        className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex justify-center items-center gap-2"
      >
        <span>Build Visualizations</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    </div>
  );
};

export default GrammarInput;