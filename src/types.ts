export interface Production {
  lhs: string;
  rhs: string[]; // array of symbols, e.g. ['A', 'B'] or ['ε']
}

export interface Grammar {
  productions: Production[];
  nonTerminals: Set<string>;
  terminals: Set<string>;
  startSymbol: string;
}

export interface FirstFollowStep {
  stepIndex: number;
  description: string;
  first: Record<string, Set<string>>;
  follow: Record<string, Set<string>>;
  activeSymbol?: string; // The symbol currently being updated
}

export interface FirstFollowResult {
  first: Record<string, Set<string>>;
  follow: Record<string, Set<string>>;
  logs: string[]; // Steps for visualization
  history: FirstFollowStep[]; // Snapshots for step-by-step visualization
}

export interface LRItem {
  lhs: string;
  rhs: string[];
  dot: number;
  lookahead?: string; // For LR(1)
  id?: string; // Unique helper
}

export interface CanonicalState {
  id: number;
  items: LRItem[];
  transitions: Record<string, number>; // symbol -> stateId
}

export interface CCISStep {
  stepIndex: number;
  description: string;
  states: CanonicalState[];
  activeStateId: number | null;
  activeSymbol: string | null;
  targetStateId: number | null;
}

export interface LRCollectionResult {
  states: CanonicalState[];
  gotoTable: ParsingTable;
  history: CCISStep[];
}

export interface ParsingTable {
  headers: string[]; // Terminals + $
  rows: Record<string, Record<string, string>>; // State/NT -> Terminal -> Action
}

export enum AlgorithmType {
  LL1 = 'LL(1)',
  LR0 = 'LR(0)',
  SLR1 = 'SLR(1)',
  LR1 = 'LR(1)',
}

export interface ParseTreeNode {
  id: string;
  label: string;
  children?: ParseTreeNode[];
}
