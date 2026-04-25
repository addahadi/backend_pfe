/**
 * FormulaEvaluator
 *
 * Safely evaluates formula expressions stored as strings in the database.
 * Supports: arithmetic operators, Math functions, ceil/floor/round,
 * and named variables from field_values or chained formula outputs.
 *
 * Deliberately avoids eval() — uses a recursive descent parser so only
 * whitelisted operations can execute regardless of what is stored in the DB.
 *
 * Supported syntax:
 * Literals:       42, 3.14
 * Variables:      L, W, D, S, h, volume_beton, foundation.volume, ...
 * Operators:      + - * / ^ (power)
 * Grouping:       ( )
 * Functions:      ceil(x), floor(x), round(x), sqrt(x), abs(x), min(a,b), max(a,b), pi()
 * Constants:      PI, E
 */

export class FormulaEvaluator {
  constructor() {
    this.pos = 0;
    this.expr = '';
    this.vars = {};
  }

  evaluate(expression, variables) {
    this.expr = expression.trim();
    this.pos = 0;
    this.vars = variables;
    const result = this.parseAddSub();
    if (this.pos < this.expr.length) {
      throw new EvalError(`Unexpected token at position ${this.pos}: "${this.expr[this.pos]}"`);
    }
    return this.round(result, 6);
  }

  // ── Grammar: addSub > mulDiv > power > unary > primary ──────────────────

  parseAddSub() {
    let left = this.parseMulDiv();
    while (this.pos < this.expr.length) {
      this.skipWs();
      const op = this.expr[this.pos];
      if (op === '+') { this.pos++; left += this.parseMulDiv(); }
      else if (op === '-') { this.pos++; left -= this.parseMulDiv(); }
      else break;
    }
    return left;
  }

  parseMulDiv() {
    let left = this.parsePower();
    while (this.pos < this.expr.length) {
      this.skipWs();
      const op = this.expr[this.pos];
      if (op === '*') { this.pos++; left *= this.parsePower(); }
      else if (op === '/') {
        this.pos++;
        const divisor = this.parsePower();
        if (divisor === 0) throw new EvalError('Division by zero');
        left /= divisor;
      }
      else break;
    }
    return left;
  }

  parsePower() {
    const base = this.parseUnary();
    this.skipWs();
    if (this.pos < this.expr.length && this.expr[this.pos] === '^') {
      this.pos++;
      return Math.pow(base, this.parseUnary());
    }
    return base;
  }

  parseUnary() {
    this.skipWs();
    if (this.expr[this.pos] === '-') { this.pos++; return -this.parsePrimary(); }
    if (this.expr[this.pos] === '+') { this.pos++; return this.parsePrimary(); }
    return this.parsePrimary();
  }

  parsePrimary() {
    this.skipWs();
    const ch = this.expr[this.pos];

    // Grouped expression
    if (ch === '(') {
      this.pos++;
      const val = this.parseAddSub();
      this.skipWs();
      if (this.expr[this.pos] !== ')') throw new EvalError('Expected closing parenthesis');
      this.pos++;
      return val;
    }

    // Number literal
    if (ch >= '0' && ch <= '9' || ch === '.') {
      return this.parseNumber();
    }

    // Identifier: variable, constant, or function call
    if (/[a-zA-Z_]/.test(ch)) {
      return this.parseIdentifier();
    }

    throw new EvalError(`Unexpected character: "${ch}" at position ${this.pos}`);
  }

  parseNumber() {
    let s = '';
    while (this.pos < this.expr.length && /[0-9.]/.test(this.expr[this.pos])) {
      s += this.expr[this.pos++];
    }
    const n = parseFloat(s);
    if (isNaN(n)) throw new EvalError(`Invalid number: "${s}"`);
    return n;
  }

  parseIdentifier() {
    let name = '';
    // UPDATED: Added dot (.) to the regex to support namespaced variables
    while (this.pos < this.expr.length && /[a-zA-Z0-9_.]/.test(this.expr[this.pos])) {
      name += this.expr[this.pos++];
    }
    this.skipWs();

    // Function call
    if (this.pos < this.expr.length && this.expr[this.pos] === '(') {
      this.pos++;
      const args = [];
      while (true) {
        this.skipWs();
        if (this.expr[this.pos] === ')') { this.pos++; break; }
        args.push(this.parseAddSub());
        this.skipWs();
        if (this.expr[this.pos] === ',') this.pos++;
      }
      return this.callFunction(name, args);
    }

    // Named constant
    if (name === 'PI') return Math.PI;
    if (name === 'E')  return Math.E;

    // Variable lookup
    if (name in this.vars) return this.vars[name];
    throw new EvalError(`Unknown variable: "${name}". Available: ${Object.keys(this.vars).join(', ')}`);
  }

  callFunction(name, args) {
    const requireArgs = (n) => {
      if (args.length !== n) throw new EvalError(`${name}() requires ${n} argument(s), got ${args.length}`);
    };
    switch (name) {
      case 'ceil':  requireArgs(1); return Math.ceil(args[0]);
      case 'floor': requireArgs(1); return Math.floor(args[0]);
      case 'round': requireArgs(1); return Math.round(args[0]);
      case 'sqrt':  requireArgs(1); return Math.sqrt(args[0]);
      case 'abs':   requireArgs(1); return Math.abs(args[0]);
      case 'min':   if (args.length < 2) throw new EvalError('min() requires at least 2 args'); return Math.min(...args);
      case 'max':   if (args.length < 2) throw new EvalError('max() requires at least 2 args'); return Math.max(...args);
      case 'pi':    requireArgs(0); return Math.PI;
      default: throw new EvalError(`Unknown function: "${name}()"`);
    }
  }

  skipWs() {
    while (this.pos < this.expr.length && this.expr[this.pos] === ' ') this.pos++;
  }

  round(val, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
export const evaluator = new FormulaEvaluator();