export enum TokenType {
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  RELOP = 'RELOP',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export interface Instruction {
  index: number;
  code: string;
  target?: number;
}

export interface BooleanAttributes {
  truelist: number[];
  falselist: number[];
  node?: ParseTreeNode;
}

export interface ParseTreeNode {
  id: string;
  type: 'OR' | 'AND' | 'NOT' | 'RELOP' | 'PAREN' | 'TRUE' | 'FALSE' | 'EXPR' | 'MARKER';
  value?: string;
  children?: ParseTreeNode[];
  truelist?: number[];
  falselist?: number[];
  instr?: number;
  position?: number;
}

export interface BackpatchStep {
  stepNumber: number;
  description: string;
  action: string;
  currentNode?: ParseTreeNode;
  instructions: Instruction[];
  nextinstr: number;
  computedNodeIds: Set<string>;
  details?: {
    list?: number[];
    target?: number;
    merged?: number[];
  };
}

export class BooleanExpressionParser {
  private tokens: Token[] = [];
  private current = 0;
  private nextinstr = 100;
  private instructions: Instruction[] = [];
  private steps: BackpatchStep[] = [];
  private computedNodeIds: Set<string> = new Set();
  private nodeIdCounter = 0;

  constructor(private input: string) {}

  private generateNodeId(): string {
    return `node_${this.nodeIdCounter++}`;
  }

  parse(): { tree: ParseTreeNode; instructions: Instruction[]; steps: BackpatchStep[] } {
    this.tokenize();
    this.current = 0;
    this.nextinstr = 100;
    this.instructions = [];
    this.steps = [];
    this.nodeIdCounter = 0;
    this.computedNodeIds.clear();

    const tree = this.parseExpression();
    
    this.addStep('完成解析', '回填所有真/假出口', tree.node);
    
    return {
      tree: tree.node!,
      instructions: this.instructions,
      steps: this.steps,
    };
  }

  private tokenize(): void {
    const patterns = [
      { type: TokenType.TRUE, regex: /^true\b/ },
      { type: TokenType.FALSE, regex: /^false\b/ },
      { type: TokenType.AND, regex: /^&&/ },
      { type: TokenType.OR, regex: /^\|\|/ },
      { type: TokenType.RELOP, regex: /^(<=|>=|==|!=|<|>)/ },
      { type: TokenType.NOT, regex: /^!/ },
      { type: TokenType.LPAREN, regex: /^\(/ },
      { type: TokenType.RPAREN, regex: /^\)/ },
      { type: TokenType.NUMBER, regex: /^\d+/ },
      { type: TokenType.IDENTIFIER, regex: /^[a-zA-Z_][a-zA-Z0-9_]*/ },
    ];

    let pos = 0;
    while (pos < this.input.length) {
      if (/^\s/.test(this.input[pos])) {
        pos++;
        continue;
      }

      let matched = false;
      for (const pattern of patterns) {
        const match = this.input.slice(pos).match(pattern.regex);
        if (match) {
          this.tokens.push({
            type: pattern.type,
            value: match[0],
            position: pos,
          });
          pos += match[0].length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        throw new Error(`Unexpected character at position ${pos}: ${this.input[pos]}`);
      }
    }

    this.tokens.push({ type: TokenType.EOF, value: '', position: pos });
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private advance(): Token {
    return this.tokens[this.current++];
  }

  private parseExpression(): BooleanAttributes {
    return this.parseOrExpression();
  }

  private parseOrExpression(): BooleanAttributes {
    let left = this.parseAndExpression();

    while (this.peek().type === TokenType.OR) {
      this.advance();
      
      const markerInstr = this.nextinstr;

      const markerNode: ParseTreeNode = {
        id: this.generateNodeId(),
        type: 'MARKER',
        value: 'ε',
        instr: markerInstr,
      };

      this.addStep(
        '标记点 M',
        `记录 B2 入口位置: M.instr = ${markerInstr}`,
        markerNode,
        { target: markerInstr }
      );

      const right = this.parseAndExpression();

      this.backpatch(left.falselist, markerInstr);
      this.addStep(
        '回填 B1.falselist',
        `backpatch(B1.falselist, M.instr): 将 ${JSON.stringify(left.falselist)} 回填到 ${markerInstr}`,
        undefined,
        { list: left.falselist, target: markerInstr }
      );

      const truelist = this.merge(left.truelist, right.truelist);
      const falselist = right.falselist;

      const node: ParseTreeNode = {
        id: this.generateNodeId(),
        type: 'OR',
        value: '||',
        children: [left.node!, markerNode, right.node!],
        truelist,
        falselist,
      };

      this.addStep(
        'OR 运算',
        `B.truelist = merge(B1.truelist, B2.truelist)\nB.falselist = B2.falselist`,
        node,
        { merged: truelist }
      );

      left = { truelist, falselist, node };
    }

    return left;
  }

  private parseAndExpression(): BooleanAttributes {
    let left = this.parseUnaryExpression();

    while (this.peek().type === TokenType.AND) {
      this.advance();

      const markerInstr = this.nextinstr;

      const markerNode: ParseTreeNode = {
        id: this.generateNodeId(),
        type: 'MARKER',
        value: 'ε',
        instr: markerInstr,
      };

      this.addStep(
        '标记点 M',
        `记录 B2 入口位置: M.instr = ${markerInstr}`,
        markerNode,
        { target: markerInstr }
      );

      const right = this.parseUnaryExpression();

      this.backpatch(left.truelist, markerInstr);
      this.addStep(
        '回填 B1.truelist',
        `backpatch(B1.truelist, M.instr): 将 ${JSON.stringify(left.truelist)} 回填到 ${markerInstr}`,
        undefined,
        { list: left.truelist, target: markerInstr }
      );

      const truelist = right.truelist;
      const falselist = this.merge(left.falselist, right.falselist);

      const node: ParseTreeNode = {
        id: this.generateNodeId(),
        type: 'AND',
        value: '&&',
        children: [left.node!, markerNode, right.node!],
        truelist,
        falselist,
      };

      this.addStep(
        'AND 运算',
        `B.truelist = B2.truelist\nB.falselist = merge(B1.falselist, B2.falselist)`,
        node,
        { merged: falselist }
      );

      left = { truelist, falselist, node };
    }

    return left;
  }

  private parseUnaryExpression(): BooleanAttributes {
    if (this.peek().type === TokenType.NOT) {
      this.advance();
      const operand = this.parseUnaryExpression();

      const node: ParseTreeNode = {
        id: this.generateNodeId(),
        type: 'NOT',
        value: '!',
        children: [operand.node!],
        truelist: operand.falselist,
        falselist: operand.truelist,
      };

      this.addStep(
        'NOT 运算',
        `B.truelist = B1.falselist\nB.falselist = B1.truelist (真假对调)`,
        node
      );

      return {
        truelist: operand.falselist,
        falselist: operand.truelist,
        node,
      };
    }

    return this.parsePrimaryExpression();
  }

  private parsePrimaryExpression(): BooleanAttributes {
    const token = this.peek();

    if (token.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpression();
      if (this.peek().type !== TokenType.RPAREN) {
        throw new Error('Expected )');
      }
      this.advance();

      const node: ParseTreeNode = {
        id: this.generateNodeId(),
        type: 'PAREN',
        value: '( )',
        children: [expr.node!],
        truelist: expr.truelist,
        falselist: expr.falselist,
      };

      this.addStep(
        '括号表达式',
        `B.truelist = B1.truelist\nB.falselist = B1.falselist`,
        node
      );

      return { ...expr, node };
    }

    if (token.type === TokenType.TRUE) {
      this.advance();
      const truelist = this.makelist(this.nextinstr);
      this.gen(`goto _`);

      const node: ParseTreeNode = {
        id: this.generateNodeId(),
        type: 'TRUE',
        value: 'true',
        truelist,
        falselist: [],
      };

      this.addStep(
        '常量 true',
        `B.truelist = makelist(${this.nextinstr - 1})\n生成: goto _`,
        node,
        { list: truelist }
      );

      return { truelist, falselist: [], node };
    }

    if (token.type === TokenType.FALSE) {
      this.advance();
      const falselist = this.makelist(this.nextinstr);
      this.gen(`goto _`);

      const node: ParseTreeNode = {
        id: this.generateNodeId(),
        type: 'FALSE',
        value: 'false',
        truelist: [],
        falselist,
      };

      this.addStep(
        '常量 false',
        `B.falselist = makelist(${this.nextinstr - 1})\n生成: goto _`,
        node,
        { list: falselist }
      );

      return { truelist: [], falselist, node };
    }

    return this.parseRelationalExpression();
  }

  private parseRelationalExpression(): BooleanAttributes {
    const left = this.parseOperand();
    
    if (this.peek().type === TokenType.RELOP) {
      const op = this.advance();
      const right = this.parseOperand();

      const truelist = this.makelist(this.nextinstr);
      const falselist = this.makelist(this.nextinstr + 1);
      
      this.gen(`if ${left} ${op.value} ${right} goto _`);
      this.gen(`goto _`);

      const node: ParseTreeNode = {
        id: this.generateNodeId(),
        type: 'RELOP',
        value: `${left} ${op.value} ${right}`,
        truelist,
        falselist,
      };

      this.addStep(
        '关系表达式',
        `B.truelist = makelist(${truelist[0]})\nB.falselist = makelist(${falselist[0]})\n生成条件跳转和无条件跳转`,
        node,
        { list: truelist }
      );

      return { truelist, falselist, node };
    }

    const truelist = this.makelist(this.nextinstr);
    const falselist = this.makelist(this.nextinstr + 1);
    
    this.gen(`if ${left} != 0 goto _`);
    this.gen(`goto _`);

    const node: ParseTreeNode = {
      id: this.generateNodeId(),
      type: 'EXPR',
      value: left,
      truelist,
      falselist,
    };

    this.addStep(
      '表达式转布尔',
      `B.truelist = makelist(${truelist[0]})\nB.falselist = makelist(${falselist[0]})\n生成: if ${left} != 0 goto _`,
      node,
      { list: truelist }
    );

    return { truelist, falselist, node };
  }

  private parseOperand(): string {
    const token = this.peek();
    if (token.type === TokenType.IDENTIFIER || token.type === TokenType.NUMBER) {
      this.advance();
      return token.value;
    }
    throw new Error(`Expected operand, got ${token.type}`);
  }

  private makelist(instr: number): number[] {
    return [instr];
  }

  private merge(list1: number[], list2: number[]): number[] {
    return [...list1, ...list2];
  }

  private backpatch(list: number[], target: number): void {
    for (const instr of list) {
      if (this.instructions[instr - 100]) {
        this.instructions[instr - 100].target = target;
        this.instructions[instr - 100].code = this.instructions[instr - 100].code.replace('_', target.toString());
      }
    }
  }

  private gen(code: string): void {
    this.instructions.push({
      index: this.nextinstr,
      code,
    });
    this.nextinstr++;
  }

  private addStep(action: string, description: string, node?: ParseTreeNode, details?: any): void {
    if (node) {
      this.computedNodeIds.add(node.id);
    }
    
    this.steps.push({
      stepNumber: this.steps.length + 1,
      description,
      action,
      currentNode: node,
      instructions: JSON.parse(JSON.stringify(this.instructions)),
      nextinstr: this.nextinstr,
      computedNodeIds: new Set(this.computedNodeIds),
      details,
    });
  }
}
