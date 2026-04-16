import { evaluator } from './evaluator.js';

/**
 * CalculationEngine
 *
 * Pipeline:
 * 1. Build vars from user field_values
 * 2. Evaluate the selected NON_MATERIAL formula only
 * → its outputs land in the variable context
 * 3. Resolve chained fields (source_formula_id)
 * 4. Inject coefficients for the selected config
 * 5. For each material in the catalog:
 * - Attempt to evaluate its MATERIAL formula against the current context
 * - If a variable is missing → skip gracefully, record in skipped_materials
 * - If evaluation succeeds → build cost line
 * 6. Roll up totals from successfully calculated lines only
 */
export class CalculationEngine {
  constructor(repo) {
    this.repo = repo;
  }

  async calculate(input) {
    this.validateInput(input);

    // ── 1. Build variable context from user inputs ────────────────────────────
    // جلب سعر الصرف من الـ repository مباشرة لتجنب أخطاء الاتصال اليدوي
    const latestRate = await this.repo.getLatestExchangeRate();
    console.log('📑 Exchange rate from DB:', latestRate);
    const vars = this.buildInitialVars(input.field_values);

    // ── 2. Evaluate the selected NON_MATERIAL formula only ───────────────────
    const selectedFormula = await this.repo.getFormula(input.selected_formula_id);
    this.assertFormulaType(selectedFormula, 'NON_MATERIAL');

    const outputs = await this.repo.getFormulaOutputs(selectedFormula.formula_id);
    const intermediateResults = await this.evaluateFormula(selectedFormula, outputs, vars);

    // Register outputs into vars so MATERIAL formulas can reference them
    for (const r of intermediateResults) {
      vars[r.output_key] = r.value;
    }

    // ── 3. Resolve chained fields (source_formula_id) ────────────────────────
    const fieldDefs = await this.repo.getFieldDefinitions(selectedFormula.formula_id);
    for (const field of fieldDefs) {
      if (field.source_formula_id && !(field.field_id in vars)) {
        const src = await this.repo.getFormula(field.source_formula_id);
        const srcOuts = await this.repo.getFormulaOutputs(field.source_formula_id);
        const res = await this.evaluateFormula(src, srcOuts, vars);
        for (const r of res) {
          vars[r.output_key] = r.value;
          vars[field.field_id] = r.value;
        }
      }
    }

    // ── 4. Inject coefficients ────────────────────────────────────────────────
    const coefficients = await this.repo.getCoefficients(
      input.category_id, input.selected_config_id,
    );
    for (const c of coefficients) vars[c.name] = c.value;

    // ── 5. Evaluate material formulas — skip if context is insufficient ───────
    const materials = await this.repo.getMaterialsForCategory(input.category_id);
    const matLines = [];
    const skippedMaterials = [];

    for (const mat of materials) {
      const mf = await this.repo.getFormula(mat.formula_id);
      this.assertFormulaType(mf, 'MATERIAL');

      let rawQty;
      try {
        rawQty = this.evalExpr(mf.expression, vars, mf);
      } catch (e) {
        skippedMaterials.push({
          material_id: mat.material_id,
          material_name: mat.material_name,
          reason: e.message,
        });
        continue;
      }

      if (rawQty < 0) throw new EngineError(
        `Negative quantity for material "${mat.material_name}" (got ${rawQty})`
      );

      const waste = mat.default_waste_factor;
      const qtyW = this.r4(rawQty * (1 + waste));

      // استعمال السعر المجلوب من الداتاباز (DZD)
      const mFactor = vars['market_factor'] || 1.7;
      const sub_dzd = this.r2(qtyW * mat.unit_price_usd * latestRate * mFactor);

      const unit = await this.repo.getUnit(mat.unit_id);

      matLines.push({
        material_id: mat.material_id,
        material_name: mat.material_name,
        material_type: mat.material_type,
        quantity: this.r4(rawQty),
        unit_symbol: unit.symbol,
        unit_price_usd: mat.unit_price_usd,
        unit_price_snapshot: mat.unit_price_usd,
        waste_factor: waste,
        waste_factor_snapshot: waste,
        applied_waste: this.r4(rawQty * waste),
        quantity_with_waste: qtyW,
        sub_total: sub_dzd,
      });
    }

    // ── 6. Roll up ────────────────────────────────────────────────────────────
    const primSub = this.r2(
      matLines
        .filter(m => m.material_type === 'PRIMARY')
        .reduce((s, m) => s + m.sub_total, 0)
    );
    const accSub = this.r2(
      matLines
        .filter(m => m.material_type === 'ACCESSORY')
        .reduce((s, m) => s + m.sub_total, 0)
    );

    return {
      category_id: input.category_id,
      selected_formula_id: input.selected_formula_id,
      selected_config_id: input.selected_config_id,
      formula_version_snapshot: selectedFormula.version,
      intermediate_results: intermediateResults,
      material_lines: matLines,
      skipped_materials: skippedMaterials,
      subtotal_primary: primSub,
      subtotal_accessory: accSub,
      total_cost: this.r2(primSub + accSub),
      computed_at: new Date().toISOString(),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  async evaluateFormula(formula, outputs, vars) {
    if (outputs.length === 0) {
      const value = this.evalExpr(formula.expression, vars, formula);
      const unit = await this.repo.getUnit(formula.output_unit_id);
      return [{
        formula_id: formula.formula_id,
        formula_version: formula.version,
        output_key: formula.name.toLowerCase().replace(/\s+/g, '_'),
        output_label: formula.name,
        value: this.r4(value),
        unit_symbol: unit.symbol,
      }];
    }

    const results = [];
    for (const out of outputs) {
      const expr = out.expression ?? formula.expression;
      const value = this.evalExpr(expr, vars, formula);
      const unit = await this.repo.getUnit(out.output_unit_id);
      results.push({
        formula_id: formula.formula_id,
        formula_version: formula.version,
        output_key: out.output_key,
        output_label: out.output_label,
        value: this.r4(value),
        unit_symbol: unit.symbol,
      });
    }
    return results;
  }

  evalExpr(expression, vars, formula) {
    try {
      return evaluator.evaluate(expression, vars);
    } catch (e) {
      throw new EngineError(
        `Formula "${formula.name}": ${e.message}`
      );
    }
  }

  buildInitialVars(fv) {
    const vars = {};
    for (const [k, v] of Object.entries(fv)) {
      if (typeof v !== 'number' || isNaN(v))
        throw new EngineError(`Invalid value for field "${k}"`);
      vars[k] = v;
    }
    return vars;
  }

  assertFormulaType(f, t) {
    if (f.formula_type !== t)
      throw new EngineError(
        `Formula "${f.name}" is "${f.formula_type}", expected "${t}"`
      );
  }

  validateInput(i) {
    if (!i.category_id) throw new EngineError('category_id is required');
    if (!i.selected_formula_id) throw new EngineError('selected_formula_id is required');
  }

  r2(v) { return Math.round(v * 100) / 100; }
  r4(v) { return Math.round(v * 10000) / 10000; }
}

export class EngineError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'EngineError';
  }
}