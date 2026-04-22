import sql from '../../config/database.js';

export class PostgresEngineRepository {

  async getFormula(formula_id) {
    const rows = await sql`
      SELECT
        formula_id,
        category_id,
        formula_type,
        COALESCE(name_en, name_ar, 'Unnamed Formula') AS name,
        name_en,
        name_ar,
        expression,
        output_unit AS output_unit_id,
        version
      FROM formulas
      WHERE formula_id = ${formula_id}
    `;
    if (!rows[0]) throw new RepositoryError(`Formula not found: ${formula_id}`);
    return rows[0];
  }

  async getFormulaOutputs(formula_id) {
    return sql`
      SELECT
        output_id,
        formula_id,
        output_key,
        COALESCE(output_label_en, output_label_ar, output_key) AS output_label,
        output_label_en,
        output_label_ar,
        output_unit_id
      FROM formula_output
      WHERE formula_id = ${formula_id}
      ORDER BY output_id
    `;
  }

  async getFieldDefinitions(formula_id) {
    return sql`
      SELECT
        field_id,
        formula_id,
        field_type_id,
        unit_id,
        source_formula_id,
        label_en       AS label,
        label_ar,
        variable_name,
        required,
        default_value,
        sort_order
      FROM field_definitions
      WHERE formula_id = ${formula_id}
      ORDER BY sort_order
    `;
  }

  async getMaterialsForCategory(category_id) {
    return sql`
      SELECT
        material_id,
        category_id,
        unit_id,
        formula_id,
        material_type,
        material_name_en,
        material_name_ar,
        COALESCE(material_name_en, material_name_ar, 'Unnamed Material') AS material_name,
        unit_price_usd,
        default_waste_factor
      FROM resource_catalog
      WHERE category_id = ${category_id}
      ORDER BY material_type DESC, material_name_en
    `;
  }

  async getCoefficients(category_id, config_group_id) {
    return sql`
      SELECT
        coefficient_id,
        category_id,
        unit_id,
        config_group_id,
        name_en AS name,
        value
      FROM coefficients
      WHERE category_id = ${category_id}
        AND (
          config_group_id = ${config_group_id}
          OR config_group_id IS NULL
        )
    `;
  }

  async getUnit(unit_id) {
    const rows = await sql`
      SELECT unit_id, name_en AS name, symbol
      FROM units
      WHERE unit_id = ${unit_id}
    `;
    if (!rows[0]) throw new RepositoryError(`Unit not found: ${unit_id}`);
    return rows[0];
  }

  async getLatestExchangeRate() {
    const rows = await sql`
      SELECT official_rate AS rate
      FROM exchange_rate_log
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return rows[0]?.rate || 134.0;
  }

  async getMarketFactor() {
    const rows = await sql`
      SELECT market_factor
      FROM financial_settings
      LIMIT 1
    `;
    if (!rows[0]) throw new RepositoryError('Market factor not found in financial_settings');
    return rows[0].market_factor;
  }

  async getProjectDetails(projectId) {
    const rows = await sql`
      SELECT
        pd.results,
        pd.values,
        c.name_en AS category_name
      FROM project_details pd
      JOIN categories c ON pd.category_id = c.category_id
      WHERE pd.project_id = ${projectId}
      LIMIT 1
    `;
    return rows[0];
  }
}

export class RepositoryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RepositoryError';
  }
}
