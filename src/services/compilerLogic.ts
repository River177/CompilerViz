import { Grammar, Production, FirstFollowResult, LRItem, CanonicalState, ParsingTable, AlgorithmType, FirstFollowStep, CCISStep, LRCollectionResult } from '../types';

export const EPSILON = 'ε';
export const EOF = '$';

// --- Grammar Parsing ---
export const parseGrammarInput = (input: string): Grammar => {
  const lines = input.split('\n').filter(l => l.trim().length > 0);
  const productions: Production[] = [];
  const nonTerminals = new Set<string>();
  const terminals = new Set<string>();
  let startSymbol = '';

  lines.forEach((line, idx) => {
    // Handle "S -> A B | C" format
    const [lhsRaw, rhsRaw] = line.split('->');
    if (!lhsRaw || !rhsRaw) return;

    const lhs = lhsRaw.trim();
    if (idx === 0) startSymbol = lhs;
    nonTerminals.add(lhs);

    const alternatives = rhsRaw.split('|');
    alternatives.forEach(alt => {
      const symbols = alt.trim().split(/\s+/);
      productions.push({ lhs, rhs: symbols });
      symbols.forEach(s => {
        if (s !== EPSILON) terminals.add(s);
      });
    });
  });

  // Cleanup terminals (remove NTs)
  const trueTerminals = new Set<string>();
  terminals.forEach(t => {
    if (!nonTerminals.has(t)) trueTerminals.add(t);
  });

  return { productions, nonTerminals, terminals: trueTerminals, startSymbol };
};

// --- First & Follow ---
export const computeFirstFollow = (grammar: Grammar): FirstFollowResult => {
  const first: Record<string, Set<string>> = {};
  const follow: Record<string, Set<string>> = {};
  const logs: string[] = [];
  const history: FirstFollowStep[] = [];

  const cloneRecord = (rec: Record<string, Set<string>>) => {
    const newRec: Record<string, Set<string>> = {};
    for (const key in rec) newRec[key] = new Set(rec[key]);
    return newRec;
  };

  const addSnapshot = (desc: string, activeSym?: string) => {
    history.push({
      stepIndex: history.length,
      description: desc,
      first: cloneRecord(first),
      follow: cloneRecord(follow),
      activeSymbol: activeSym
    });
  };

  // Initialize
  grammar.nonTerminals.forEach(nt => {
    first[nt] = new Set();
    follow[nt] = new Set();
  });
  grammar.terminals.forEach(t => {
    first[t] = new Set([t]);
  });
  first[EPSILON] = new Set([EPSILON]);
  follow[grammar.startSymbol].add(EOF);

  logs.push("Initialized sets. Start symbol gets $ in Follow.");
  addSnapshot("Initialized sets. First sets empty for NTs. Follow(Start) = {$}.", grammar.startSymbol);

  let changed = true;
  while (changed) {
    changed = false;
    
    // First Sets
    for (const prod of grammar.productions) {
      const { lhs, rhs } = prod;
      const countBefore = first[lhs].size;
      
      let allDeriveEpsilon = true;
      let addedFromThisProd = false;

      for (const symbol of rhs) {
        if (!first[symbol]) continue; // Safety
        
        // Add First(symbol) - {ε} to First(lhs)
        const firstSym = first[symbol];
        firstSym.forEach(f => {
          if (f !== EPSILON && !first[lhs].has(f)) {
            first[lhs].add(f);
            addedFromThisProd = true;
          }
        });

        if (!first[symbol].has(EPSILON)) {
          allDeriveEpsilon = false;
          break;
        }
      }

      if (allDeriveEpsilon) {
        if (!first[lhs].has(EPSILON)) {
          first[lhs].add(EPSILON);
          addedFromThisProd = true;
        }
      }

      if (first[lhs].size !== countBefore) {
        changed = true;
      }
      
      if (addedFromThisProd) {
          addSnapshot(`Updated First(${lhs}) using rule ${lhs} -> ${rhs.join(' ')}`, lhs);
      }
    }
  }
  
  addSnapshot("First sets computation converged.");

  changed = true;
  while (changed) {
    changed = false;
    // Follow Sets
    for (const prod of grammar.productions) {
      const { lhs, rhs } = prod;
      
      for (let i = 0; i < rhs.length; i++) {
        const B = rhs[i];
        if (!grammar.nonTerminals.has(B)) continue;

        const trailer = rhs.slice(i + 1);
        let trailerDerivesEpsilon = true;
        const countBefore = follow[B].size;
        let addedToFollow = false;

        // First(beta) part
        for (const sym of trailer) {
           const firstSym = first[sym] || new Set();
           firstSym.forEach(f => {
             if (f !== EPSILON && !follow[B].has(f)) {
               follow[B].add(f);
               addedToFollow = true;
             }
           });
           if (!firstSym.has(EPSILON)) {
             trailerDerivesEpsilon = false;
             break;
           }
        }

        // Follow(A) part
        if (trailerDerivesEpsilon) {
          follow[lhs].forEach(f => {
            if (!follow[B].has(f)) {
              follow[B].add(f);
              addedToFollow = true;
            }
          });
        }
        
        if (follow[B].size !== countBefore) {
            changed = true;
            // logs.push(`Updated Follow(${B}) from ${lhs} -> ...`);
        }

        if (addedToFollow) {
            addSnapshot(`Updated Follow(${B}) from rule context in ${lhs} -> ${rhs.join(' ')}`, B);
        }
      }
    }
  }

  addSnapshot("Follow sets computation converged. Finished.");
  logs.push("Fixed point iteration completed.");
  return { first, follow, logs, history };
};

// --- LL(1) Table ---
export const buildLL1Table = (grammar: Grammar, { first, follow }: FirstFollowResult): ParsingTable => {
  const rows: Record<string, Record<string, string>> = {};
  const terminals = Array.from(grammar.terminals).concat(EOF);

  grammar.nonTerminals.forEach(nt => {
    rows[nt] = {};
  });

  grammar.productions.forEach(prod => {
    const { lhs, rhs } = prod;
    let firstAlpha = new Set<string>();
    
    // Calc First(alpha) for this production
    let allEpsilon = true;
    for (const s of rhs) {
      const fS = first[s] || new Set();
      fS.forEach(x => { if (x !== EPSILON) firstAlpha.add(x); });
      if (!fS.has(EPSILON)) {
        allEpsilon = false;
        break;
      }
    }
    if (allEpsilon) firstAlpha.add(EPSILON);

    firstAlpha.forEach(a => {
      if (a !== EPSILON) {
        rows[lhs][a] = `${lhs} -> ${rhs.join(' ')}`;
      } else {
        follow[lhs].forEach(b => {
           rows[lhs][b] = `${lhs} -> ${rhs.join(' ')}`;
        });
      }
    });
  });

  return { headers: terminals, rows };
};

// --- LR Items Helper ---
const itemToString = (item: LRItem) => {
  return `${item.lhs}->${item.rhs.join(' ')}.${item.dot}|${item.lookahead || ''}`;
};

const itemsEqual = (setA: LRItem[], setB: LRItem[]) => {
  if (setA.length !== setB.length) return false;
  const sA = new Set(setA.map(itemToString));
  const sB = new Set(setB.map(itemToString));
  if (sA.size !== sB.size) return false;
  for (const a of sA) if (!sB.has(a)) return false;
  return true;
};

// Closure Operation
const closure = (items: LRItem[], grammar: Grammar, first: Record<string, Set<string>>, type: AlgorithmType): LRItem[] => {
  const result = [...items];
  const added = new Set<string>(items.map(itemToString));
  
  let changed = true;
  while(changed) {
    changed = false;
    for(const item of result) {
      if (item.dot >= item.rhs.length) continue;
      const symbol = item.rhs[item.dot];
      if (grammar.nonTerminals.has(symbol)) {
        // Expand symbol
        grammar.productions.forEach((prod, pIdx) => {
          if (prod.lhs !== symbol) return;

          let lookaheads = new Set<string>();
          
          if (type === AlgorithmType.LR1) {
             // Lookahead calc: First(beta a)
             const beta = item.rhs.slice(item.dot + 1);
             let betaDerivesEpsilon = true;
             
             for (const bSym of beta) {
               const fS = first[bSym];
               fS.forEach(x => { if(x !== EPSILON) lookaheads.add(x); });
               if(!fS.has(EPSILON)) {
                 betaDerivesEpsilon = false;
                 break;
               }
             }
             if (betaDerivesEpsilon && item.lookahead) {
               lookaheads.add(item.lookahead);
             }
          } else {
            // LR0 / SLR1 doesn't care about item lookahead during closure for core items
             lookaheads.add(''); // Dummy
          }

          lookaheads.forEach(la => {
            const newItem: LRItem = {
              lhs: prod.lhs,
              rhs: prod.rhs,
              dot: 0,
              lookahead: la,
              index: pIdx
            };
            const s = itemToString(newItem);
            if (!added.has(s)) {
              added.add(s);
              result.push(newItem);
              changed = true;
            }
          });
        });
      }
    }
  }
  
  // Sort result by production index, then dot, then lookahead
  result.sort((a, b) => {
      if ((a.index ?? -2) !== (b.index ?? -2)) {
          return (a.index ?? -2) - (b.index ?? -2);
      }
      if (a.dot !== b.dot) return a.dot - b.dot;
      return (a.lookahead || '').localeCompare(b.lookahead || '');
  });

  return result;
};

const goto = (items: LRItem[], symbol: string, grammar: Grammar, first: Record<string, Set<string>>, type: AlgorithmType): LRItem[] => {
  const movedItems: LRItem[] = [];
  items.forEach(item => {
    if (item.dot < item.rhs.length && item.rhs[item.dot] === symbol) {
      movedItems.push({ ...item, dot: item.dot + 1 });
    }
  });
  if (movedItems.length === 0) return [];
  return closure(movedItems, grammar, first, type);
};

// --- Canonical Collection ---
export const buildLRCollection = (grammar: Grammar, type: AlgorithmType, firstFollow: FirstFollowResult): LRCollectionResult => {
  const history: CCISStep[] = [];
  
  const cloneStates = (states: CanonicalState[]) => {
      return states.map(s => ({
          ...s,
          items: [...s.items],
          transitions: { ...s.transitions }
      }));
  };

  const addSnapshot = (desc: string, states: CanonicalState[], activeStateId: number | null, activeSymbol: string | null, targetStateId: number | null) => {
      history.push({
          stepIndex: history.length,
          description: desc,
          states: cloneStates(states),
          activeStateId,
          activeSymbol,
          targetStateId
      });
  };

  // Augmented Grammar
  const augmentedStart = grammar.startSymbol + "'";
  const initialItem: LRItem = {
    lhs: augmentedStart,
    rhs: [grammar.startSymbol],
    dot: 0,
    lookahead: type === AlgorithmType.LR1 ? EOF : '',
    index: -1
  };

  const startStateItems = closure([initialItem], grammar, firstFollow.first, type);
  const states: CanonicalState[] = [{ id: 0, items: startStateItems, transitions: {} }];
  
  addSnapshot("Initialized State 0 (Closure of S' -> .S)", states, null, null, null);

  // Use a proper queue index to simulate BFS
  let processedIndex = 0;
  
  while(processedIndex < states.length) {
      const state = states[processedIndex];
      addSnapshot(`Processing State ${state.id}`, states, state.id, null, null);

      // Collect symbols in order of items to ensure deterministic "top-to-bottom" transitions
      const symbolsToProcess = new Set<string>();
      state.items.forEach(item => {
        if (item.dot < item.rhs.length) {
          symbolsToProcess.add(item.rhs[item.dot]);
        }
      });

      for(const symbol of symbolsToProcess) {
        if (state.transitions[symbol] !== undefined) continue;

        const nextItems = goto(state.items, symbol, grammar, firstFollow.first, type);
        if (nextItems.length === 0) continue;

        addSnapshot(`Calculated Goto(State ${state.id}, '${symbol}')`, states, state.id, symbol, null);

        // Check if state exists
        const existingStateIdx = states.findIndex(s => itemsEqual(s.items, nextItems));
        
        if (existingStateIdx !== -1) {
          state.transitions[symbol] = existingStateIdx;
          addSnapshot(`Linked State ${state.id} --(${symbol})--> Existing State ${existingStateIdx}`, states, state.id, symbol, existingStateIdx);
        } else {
          const newStateId = states.length;
          const newState = { id: newStateId, items: nextItems, transitions: {} };
          states.push(newState);
          state.transitions[symbol] = newStateId;
          addSnapshot(`Created New State ${newStateId}. Linked State ${state.id} --(${symbol})--> State ${newStateId}`, states, state.id, symbol, newStateId);
        }
      }
      processedIndex++;
  }
  
  addSnapshot("Canonical Collection construction complete.", states, null, null, null);

  // --- Build Table ---
  const headers = [...Array.from(grammar.terminals), EOF, ...Array.from(grammar.nonTerminals)];
  const rows: Record<string, Record<string, string>> = {};

  states.forEach(state => {
    rows[state.id] = {};
    
    // Action: Shift / Goto
    Object.entries(state.transitions).forEach(([symbol, nextStateId]) => {
      if (grammar.terminals.has(symbol)) {
        rows[state.id][symbol] = `s${nextStateId}`;
      } else {
        rows[state.id][symbol] = `${nextStateId}`; // Goto usually just number
      }
    });

    // Action: Reduce / Accept
    state.items.forEach(item => {
      if (item.dot === item.rhs.length) {
        if (item.lhs === augmentedStart) {
          if (type === AlgorithmType.LR1) {
             if (item.lookahead === EOF) rows[state.id][EOF] = 'acc';
          } else {
             rows[state.id][EOF] = 'acc';
          }
        } else {
           // Reduce
           const prodStr = `${item.lhs} -> ${item.rhs.join(' ')}`;
           const setReduce = (la: string) => {
              // Conflict check could be here
              const existing = rows[state.id][la];
              if (existing && existing.startsWith('s')) {
                rows[state.id][la] = `${existing}/r(${prodStr})`; // Shift/Reduce conflict
              } else if (existing && existing.startsWith('r') && existing !== `r(${prodStr})`) {
                rows[state.id][la] = `${existing}/r(${prodStr})`; // Reduce/Reduce conflict
              } else {
                rows[state.id][la] = `r(${prodStr})`;
              }
           };

           if (type === AlgorithmType.LR0) {
             // Reduce on ALL terminals + EOF
             [...grammar.terminals, EOF].forEach(t => setReduce(t));
           } else if (type === AlgorithmType.SLR1) {
             // Reduce on Follow(LHS)
             firstFollow.follow[item.lhs].forEach(t => setReduce(t));
           } else if (type === AlgorithmType.LR1) {
             // Reduce on item.lookahead
             if (item.lookahead) setReduce(item.lookahead);
           }
        }
      }
    });
  });

  return { states, gotoTable: { headers, rows }, history };
};
