import React from 'react';
import { ParseTreeNode } from '../types';

interface Props {
  root?: ParseTreeNode | null;
  roots?: ParseTreeNode[]; // Support for forest (LR stack)
}

const TreeStyles = `
.tree ul {
    padding-top: 20px; position: relative;
    transition: all 0.5s;
    display: flex;
    justify-content: center;
}

.tree li {
    float: left; text-align: center;
    list-style-type: none;
    position: relative;
    padding: 20px 5px 0 5px;
    transition: all 0.5s;
}

/* Connectors */
.tree li::before, .tree li::after{
    content: '';
    position: absolute; top: 0; right: 50%;
    border-top: 1px solid #94a3b8;
    width: 50%; height: 20px;
}
.tree li::after{
    right: auto; left: 50%;
    border-left: 1px solid #94a3b8;
}

/* Remove connectors from single children */
.tree li:only-child::after, .tree li:only-child::before {
    display: none;
}
.tree li:only-child{ padding-top: 0;}

/* Remove left connector from first child and right from last child */
.tree li:first-child::before, .tree li:last-child::after{
    border: 0 none;
}
/* Add vertical line back for first/last nodes */
.tree li:last-child::before{
    border-right: 1px solid #94a3b8;
    border-radius: 0 5px 0 0;
}
.tree li:first-child::after{
    border-radius: 5px 0 0 0;
}

/* The node card */
.tree .node-card {
    display: inline-block;
    padding: 6px 12px;
    text-decoration: none;
    background: #fff;
    color: #333;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-family: monospace;
    font-size: 13px;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    transition: all 0.3s ease;
}

.tree .node-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    border-color: #6366f1;
}

.tree .node-card.leaf {
    background-color: #ecfdf5; /* green-50 */
    border-color: #6ee7b7;
    color: #047857;
}

.tree .node-card.non-terminal {
    background-color: #eef2ff; /* indigo-50 */
    border-color: #a5b4fc;
    color: #4338ca;
}

.tree ul ul::before{
    content: '';
    position: absolute; top: 0; left: 50%;
    border-left: 1px solid #94a3b8;
    width: 0; height: 20px;
}
`;

const TreeNode: React.FC<{ node: ParseTreeNode }> = ({ node }) => {
  const isLeaf = !node.children || node.children.length === 0;
  
  return (
    <li>
      <div className={`node-card ${isLeaf ? 'leaf' : 'non-terminal'}`}>
        {node.label}
      </div>
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
};

const ParseTreeView: React.FC<Props> = ({ root, roots }) => {
  const nodesToRender = roots || (root ? [root] : []);

  if (nodesToRender.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-4 pt-2">
      <style>{TreeStyles}</style>
      <div className="tree w-max mx-auto min-w-full flex justify-center gap-8">
        <ul>
          {nodesToRender.map((node) => (
            <TreeNode key={node.id} node={node} />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ParseTreeView;