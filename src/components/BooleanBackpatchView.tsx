import React, { useState, useMemo } from 'react';
import { BooleanExpressionParser, ParseTreeNode, BackpatchStep, Instruction } from '../services/booleanBackpatch';

interface BooleanBackpatchViewProps {}

const BooleanBackpatchView: React.FC<BooleanBackpatchViewProps> = () => {
  const [input, setInput] = useState('x < 100 || x > 200 && x != y');
  const [result, setResult] = useState<{
    tree: ParseTreeNode;
    instructions: Instruction[];
    steps: BackpatchStep[];
  } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleParse = () => {
    try {
      setError(null);
      const parser = new BooleanExpressionParser(input);
      const parsed = parser.parse();
      setResult(parsed);
      setCurrentStep(0);
    } catch (e: any) {
      setError(e.message);
      setResult(null);
    }
  };

  const currentStepData = useMemo(() => {
    if (!result || currentStep >= result.steps.length) return null;
    return result.steps[currentStep];
  }, [result, currentStep]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-2">布尔表达式拉链回填可视化</h2>
        <p className="text-purple-100">Boolean Expression Backpatching Visualization</p>
      </div>

      {/* Input Section */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          输入布尔表达式 (Boolean Expression)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如: x < 100 || x > 200 && x != y"
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          <button
            onClick={handleParse}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-md"
          >
            解析 Parse
          </button>
        </div>
        
        {/* Examples */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-slate-600 font-medium">示例:</span>
          {[
            'x < 100 || x > 200 && x != y',
            'a && b || c',
            '!(x > 5) && y < 10',
            'true || false && x == 0',
          ].map((example) => (
            <button
              key={example}
              onClick={() => setInput(example)}
              className="text-xs px-3 py-1 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
            >
              {example}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>错误:</strong> {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Current Step Info - Compact */}
          {currentStepData && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl shadow-md border border-indigo-200">
              <div className="flex items-start gap-4">
                <div className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                  {currentStepData.stepNumber}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-bold text-indigo-900">
                      {currentStepData.action}
                    </h4>
                    <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      nextinstr = {currentStepData.nextinstr}
                    </div>
                  </div>
                  <pre className="text-sm text-indigo-800 whitespace-pre-wrap font-mono bg-white/50 p-3 rounded-lg">
                    {currentStepData.description}
                  </pre>
                  {currentStepData.details && (
                    <div className="mt-2 text-sm text-indigo-700 bg-white/70 p-2 rounded-lg">
                      {currentStepData.details.list && (
                        <div><strong>列表:</strong> [{currentStepData.details.list.join(', ')}]</div>
                      )}
                      {currentStepData.details.target !== undefined && (
                        <div><strong>目标:</strong> {currentStepData.details.target}</div>
                      )}
                      {currentStepData.details.merged && (
                        <div><strong>合并结果:</strong> [{currentStepData.details.merged.join(', ')}]</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Parse Tree - Full Width */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              注释语法树 (Annotated Parse Tree)
            </h3>
            <div className="overflow-hidden" style={{ height: '500px' }}>
              <ParseTreeVisualization node={result.tree} currentStepData={currentStepData} />
            </div>
          </div>

          {/* Instructions Table - Full Width Below */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              三地址码指令 (Three-Address Code)
            </h3>
            <div className="overflow-auto max-h-[400px]">
              <InstructionTable instructions={currentStepData?.instructions || result.instructions} />
            </div>
          </div>

          {/* Grammar Rules Reference */}
          <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-24">
            <h3 className="text-lg font-bold text-slate-800 mb-4">语义规则参考 (Semantic Rules Reference)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <RuleCard
                title="OR 运算 (B → B1 || M B2)"
                rules={[
                  'backpatch(B1.falselist, M.instr)',
                  'B.truelist = merge(B1.truelist, B2.truelist)',
                  'B.falselist = B2.falselist',
                ]}
                description="B1 假才算 B2，真出口合并，假出口来自 B2"
              />
              <RuleCard
                title="AND 运算 (B → B1 && M B2)"
                rules={[
                  'backpatch(B1.truelist, M.instr)',
                  'B.truelist = B2.truelist',
                  'B.falselist = merge(B1.falselist, B2.falselist)',
                ]}
                description="B1 真才算 B2，真出口来自 B2，假出口合并"
              />
              <RuleCard
                title="NOT 运算 (B → !B1)"
                rules={[
                  'B.truelist = B1.falselist',
                  'B.falselist = B1.truelist',
                ]}
                description="真假出口对调"
              />
              <RuleCard
                title="关系表达式 (B → E1 relop E2)"
                rules={[
                  'B.truelist = makelist(nextinstr)',
                  'B.falselist = makelist(nextinstr + 1)',
                  'gen("if E1 relop E2 goto _")',
                  'gen("goto _")',
                ]}
                description="生成条件跳转和无条件跳转"
              />
            </div>
          </div>

          {/* Bottom Fixed Navigation Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-indigo-200 shadow-2xl z-50 px-4 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  ← 上一步
                </button>
                <button
                  onClick={() => setCurrentStep(Math.min(result.steps.length - 1, currentStep + 1))}
                  disabled={currentStep === result.steps.length - 1}
                  className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  下一步 →
                </button>
                <div className="text-sm font-semibold text-slate-700">
                  步骤 {currentStep + 1} / {result.steps.length}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="flex-1 max-w-md">
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className="bg-linear-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / result.steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface TreeNodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: ParseTreeNode;
}

const ParseTreeVisualization: React.FC<{ 
  node: ParseTreeNode; 
  depth?: number;
  currentStepData?: BackpatchStep | null;
}> = ({ node, depth = 0, currentStepData }) => {
  const [nodePositions, setNodePositions] = React.useState<TreeNodePosition[]>([]);
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    const positions = calculateNodePositions(node);
    setNodePositions(positions);
  }, [node]);

  const isNodeActive = (n: ParseTreeNode): boolean => {
    if (!currentStepData) return false;
    return currentStepData.currentNode === n;
  };

  const isNodeComputed = (n: ParseTreeNode): boolean => {
    if (!currentStepData) return false;
    return currentStepData.computedNodeIds.has(n.id);
  };

  const shouldHighlightAttribute = (n: ParseTreeNode, attr: 'truelist' | 'falselist' | 'instr'): boolean => {
    if (!currentStepData || !currentStepData.action) return false;
    
    const action = currentStepData.action;
    
    if (action.includes('回填') && currentStepData.details?.list) {
      if (attr === 'truelist' && n.truelist?.some(i => currentStepData.details?.list?.includes(i))) return true;
      if (attr === 'falselist' && n.falselist?.some(i => currentStepData.details?.list?.includes(i))) return true;
    }
    
    if (action.includes('OR') || action.includes('AND')) {
      return true;
    }
    
    if (action.includes('标记点') && attr === 'instr') {
      return n.type === 'MARKER';
    }
    
    return false;
  };

  const calculateNodePositions = (root: ParseTreeNode): TreeNodePosition[] => {
    const positions: TreeNodePosition[] = [];
    const nodeWidth = 220;
    const nodeHeight = 120;
    const horizontalGap = 60;
    const verticalGap = 150;
    
    let idCounter = 0;
    
    const traverse = (n: ParseTreeNode, depth: number, leftBound: number): { width: number; center: number } => {
      const nodeId = `node-${idCounter++}`;
      
      if (!n.children || n.children.length === 0) {
        const x = leftBound;
        const y = depth * verticalGap;
        positions.push({ id: nodeId, x, y, width: nodeWidth, height: nodeHeight, node: n });
        return { width: nodeWidth, center: x + nodeWidth / 2 };
      }
      
      let currentX = leftBound;
      const childCenters: number[] = [];
      
      for (const child of n.children) {
        const result = traverse(child, depth + 1, currentX);
        childCenters.push(result.center);
        currentX += result.width + horizontalGap;
      }
      
      const leftmost = childCenters[0];
      const rightmost = childCenters[childCenters.length - 1];
      const center = (leftmost + rightmost) / 2;
      const x = center - nodeWidth / 2;
      const y = depth * verticalGap;
      
      positions.push({ id: nodeId, x, y, width: nodeWidth, height: nodeHeight, node: n });
      
      return { width: currentX - leftBound - horizontalGap, center };
    };
    
    traverse(root, 0, 50);
    return positions;
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      OR: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-800' },
      AND: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-800' },
      NOT: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800' },
      RELOP: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-800' },
      MARKER: { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-700' },
      TRUE: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800' },
      FALSE: { bg: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-800' },
      EXPR: { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-800' },
    };
    return colors[type] || { bg: 'bg-slate-50', border: 'border-slate-400', text: 'text-slate-800' };
  };

  const getNodeLabel = (n: ParseTreeNode): string => {
    if (n.type === 'OR') return 'B → B₁ || M B₂';
    if (n.type === 'AND') return 'B → B₁ && M B₂';
    if (n.type === 'NOT') return 'B → !B₁';
    if (n.type === 'RELOP') return `B → ${n.value}`;
    if (n.type === 'MARKER') return 'M → ε';
    if (n.type === 'TRUE' || n.type === 'FALSE') return `B → ${n.value}`;
    if (n.type === 'EXPR') return `B → ${n.value}`;
    return n.type;
  };

  const renderConnections = () => {
    const connections: React.ReactElement[] = [];
    
    nodePositions.forEach((pos) => {
      if (pos.node.children) {
        const parentCenterX = pos.x + pos.width / 2;
        const parentBottomY = pos.y + pos.height;
        
        pos.node.children.forEach((child) => {
          const childPos = nodePositions.find(p => p.node === child);
          if (childPos) {
            const childCenterX = childPos.x + childPos.width / 2;
            const childTopY = childPos.y;
            
            connections.push(
              <line
                key={`${pos.id}-${childPos.id}`}
                x1={parentCenterX}
                y1={parentBottomY}
                x2={childCenterX}
                y2={childTopY}
                stroke="#94a3b8"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            );
          }
        });
      }
    });
    
    return connections;
  };

  const maxX = Math.max(...nodePositions.map(p => p.x + p.width), 0) + 100;
  const maxY = Math.max(...nodePositions.map(p => p.y + p.height), 0) + 100;

  const containerHeight = 500;
  const containerWidth = 1200;
  const scaleX = Math.min(1, containerWidth / maxX);
  const scaleY = Math.min(1, containerHeight / maxY);
  const scale = Math.min(scaleX, scaleY, 1);

  return (
    <div className="relative w-full h-full bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden">
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <svg
          ref={svgRef}
          width={maxX}
          height={maxY}
        >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>
        {renderConnections()}
      </svg>
      
      {nodePositions.map((pos) => {
        const colors = getNodeColor(pos.node.type);
        const isActive = isNodeActive(pos.node);
        const highlightTrue = shouldHighlightAttribute(pos.node, 'truelist');
        const highlightFalse = shouldHighlightAttribute(pos.node, 'falselist');
        const highlightInstr = shouldHighlightAttribute(pos.node, 'instr');
        
        return (
          <div
            key={pos.id}
            className={`absolute border-2 rounded-lg shadow-md ${colors.bg} ${colors.border} ${colors.text} p-3 transition-all duration-300 ${
              isActive ? 'ring-4 ring-yellow-400 scale-105 shadow-xl' : ''
            }`}
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: `${pos.width}px`,
              minHeight: `${pos.height}px`,
            }}
          >
            <div className="font-bold text-sm mb-2 border-b pb-2 border-current/20">
              {getNodeLabel(pos.node)}
            </div>
            <div className="text-xs space-y-1">
              {isNodeComputed(pos.node) && pos.node.truelist !== undefined && (
                <div className={`px-2 py-1 rounded transition-all duration-300 ${
                  highlightTrue ? 'bg-yellow-200 ring-2 ring-yellow-400 font-bold' : 'bg-white/50'
                }`}>
                  <span className="font-semibold">B.truelist:</span> {`{${pos.node.truelist.join(', ')}}`}
                </div>
              )}
              {isNodeComputed(pos.node) && pos.node.falselist !== undefined && (
                <div className={`px-2 py-1 rounded transition-all duration-300 ${
                  highlightFalse ? 'bg-yellow-200 ring-2 ring-yellow-400 font-bold' : 'bg-white/50'
                }`}>
                  <span className="font-semibold">B.falselist:</span> {`{${pos.node.falselist.join(', ')}}`}
                </div>
              )}
              {isNodeComputed(pos.node) && pos.node.instr !== undefined && (
                <div className={`px-2 py-1 rounded transition-all duration-300 ${
                  highlightInstr ? 'bg-yellow-200 ring-2 ring-yellow-400 font-bold' : 'bg-white/50'
                }`}>
                  <span className="font-semibold">M.instr:</span> {pos.node.instr}
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};

const InstructionTable: React.FC<{ instructions: Instruction[] }> = ({ instructions }) => {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-100 sticky top-0">
        <tr>
          <th className="px-4 py-2 text-left font-semibold text-slate-700 border-b-2 border-slate-300">
            地址
          </th>
          <th className="px-4 py-2 text-left font-semibold text-slate-700 border-b-2 border-slate-300">
            指令
          </th>
        </tr>
      </thead>
      <tbody>
        {instructions.map((instr, idx) => (
          <tr
            key={idx}
            className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors`}
          >
            <td className="px-4 py-2 font-mono text-slate-600 border-b border-slate-200">
              {instr.index}
            </td>
            <td className="px-4 py-2 font-mono text-slate-800 border-b border-slate-200">
              {instr.target !== undefined ? (
                <span>
                  {instr.code.replace('_', '')}
                  <span className="text-green-600 font-bold">{instr.target}</span>
                </span>
              ) : (
                <span>
                  {instr.code.includes('_') ? (
                    <>
                      {instr.code.split('_')[0]}
                      <span className="text-red-600 font-bold">_</span>
                    </>
                  ) : (
                    instr.code
                  )}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const RuleCard: React.FC<{ title: string; rules: string[]; description: string }> = ({
  title,
  rules,
  description,
}) => {
  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <h4 className="font-bold text-slate-800 mb-2">{title}</h4>
      <div className="space-y-1 mb-2">
        {rules.map((rule, idx) => (
          <div key={idx} className="font-mono text-xs text-slate-700 bg-white px-2 py-1 rounded">
            {rule}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600 italic">{description}</p>
    </div>
  );
};

export default BooleanBackpatchView;
