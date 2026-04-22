import sql from '../../config/database.js';
import { CalculationEngine } from '../engine/engine.js';
import { PostgresEngineRepository } from './repository.js';

const repo = new PostgresEngineRepository();
const engine = new CalculationEngine(repo);

// ─── Calculation (stateless) ──────────────────────────────────────────────────

export async function runCalculation(input) {
  return engine.calculate(input);
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProjects(user_id) {
  return sql`
    SELECT
      p.project_id,
      p.name,
      p.description,
      p.status,
      p.created_at,
      p.image_url,
      e.estimation_id,
      COALESCE(e.total_budget, 0)::float AS total_cost,
      COUNT(pd.id)::int                  AS leaf_count
    FROM projects p
    LEFT JOIN estimation e       ON e.project_id   = p.project_id
    LEFT JOIN project_details pd ON pd.estimation_id = e.estimation_id
    WHERE p.user_id = ${user_id}::uuid
    GROUP BY p.project_id, e.estimation_id, e.total_budget
    ORDER BY p.created_at DESC
  `;
}

export async function getProjectById(project_id, user_id) {
  const rows = await sql`
    SELECT
      p.project_id,
      p.user_id,
      p.name,
      p.description,
      p.status,
      p.created_at,
      p.image_url,
      e.estimation_id,
      COALESCE(e.total_budget, 0)::float AS total_cost
    FROM projects p
    LEFT JOIN estimation e ON e.project_id = p.project_id
    WHERE p.project_id = ${project_id}
      AND p.user_id = ${user_id}::uuid
  `;
  return rows[0] ?? null;
}

export async function createProject(user_id, dto) {
  return sql.begin(async (tx) => {
    const [project] = await tx`
      INSERT INTO projects (user_id, name, description, status, image_url, subscription_id)
      VALUES (
        ${user_id ?? null},
        ${dto.name},
        ${dto.description ?? null},
        'ACTIVE',
        ${dto.image_url ?? null},
        ${dto.subscription_id ?? null}
      )
      RETURNING project_id, name, description, status, created_at, image_url, subscription_id
    `;

    const [estimation] = await tx`
      INSERT INTO estimation (project_id, budget_type, total_budget, subscription_id)
      VALUES (${project.project_id}, ${dto.budget_type}, ${dto.total_budget ?? 0}, ${dto.subscription_id ?? null})
      RETURNING estimation_id, budget_type, total_budget
    `;

    return { ...project, estimation_id: estimation.estimation_id };
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getRootCategories() {
  return sql`
    SELECT category_id, name_en, name_ar, icon, sort_order
    FROM   categories
    WHERE  category_level = 'ROOT' AND is_active = true
    ORDER  BY sort_order, name_en
  `;
}

export async function getChildCategories(parent_id) {
  return sql`
    SELECT category_id, parent_id, category_level, name_en, name_ar, icon, sort_order
    FROM   categories
    WHERE  parent_id = ${parent_id} AND is_active = true
    ORDER  BY sort_order, name_en
  `;
}

export async function getCategoryTree() {
  const categories = await sql`
    SELECT category_id, parent_id, category_level, name_en, name_ar, icon, sort_order
    FROM categories
    WHERE is_active = true
    ORDER BY sort_order, name_en
  `;

  // Build tree
  const map = {};
  const roots = [];

  for (const cat of categories) {
    map[cat.category_id] = { ...cat, children: [] };
  }

  for (const cat of categories) {
    if (cat.parent_id) {
      if (map[cat.parent_id]) {
        map[cat.parent_id].children.push(map[cat.category_id]);
      }
    } else {
      roots.push(map[cat.category_id]);
    }
  }

  return roots;
}

export async function getCategoryWithFormulas(category_id) {
  const [category, formulas, configs] = await Promise.all([
    sql`
      SELECT category_id, parent_id, category_level, name_en, name_ar, description_en, description_ar, icon
      FROM   categories
      WHERE  category_id = ${category_id} AND is_active = true
    `,
    sql`
      SELECT
        f.formula_id,
        COALESCE(f.name_en, f.name_ar, 'Unnamed Formula') AS name,
        f.name_en,
        f.name_ar,
        f.expression,
        f.version,
        u.symbol AS output_unit_symbol,
        COALESCE(
          json_agg(
            json_build_object(
              'field_id',       fd.field_id,
              'label',          fd.label_en,
              'label_ar',       fd.label_ar,
              'variable_name',  fd.variable_name,
              'required',       fd.required,
              'default_value',  fd.default_value,
              'sort_order',     fd.sort_order,
              'unit_symbol',    fu.symbol,
              'is_computed',    (fd.source_formula_id IS NOT NULL)
            ) ORDER BY fd.sort_order
          ) FILTER (WHERE fd.field_id IS NOT NULL),
          '[]'
        ) AS fields
      FROM formulas f
      JOIN units u ON u.unit_id = f.output_unit
      LEFT JOIN field_definitions fd ON fd.formula_id = f.formula_id
      LEFT JOIN units fu             ON fu.unit_id     = fd.unit_id
      WHERE f.category_id  = ${category_id}
        AND f.formula_type = 'NON_MATERIAL'
      GROUP BY f.formula_id, u.symbol
      ORDER BY COALESCE(f.name_en, f.name_ar, 'Unnamed Formula')
    `,
    sql`
      SELECT config_id, name, description
      FROM   material_config
      WHERE  category_id = ${category_id}
      ORDER  BY name
    `,
  ]);

  if (!category[0]) return null;
  return { ...category[0], formulas, configs };
}

// ─── Estimation ───────────────────────────────────────────────────────────────

export async function getEstimationByProject(project_id) {
  const [estimation] = await sql`
    SELECT estimation_id, project_id, budget_type, total_budget, created_at
    FROM   estimation
    WHERE  project_id = ${project_id}
  `;
  if (!estimation) return null;

  const leaves = await sql`
    SELECT
      pd.id                    AS project_details_id,
      pd.category_id,
      c.name_en                AS category_name_en,
      c.name_ar                AS category_name_ar,
      pd.selected_formula_id,
      COALESCE(f.name_en, f.name_ar, 'Unnamed Formula') AS formula_name,
      f.name_en                AS formula_name_en,
      f.name_ar                AS formula_name_ar,
      pd.selected_config_id,
      mc.name                  AS config_name,
      pd.formula_version_snapshot,
      pd.values                AS field_values,
      pd.results,
      pd.created_at,
      COALESCE(SUM(edm.sub_total), 0)::float AS leaf_total
    FROM project_details pd
    JOIN categories c            ON c.category_id  = pd.category_id
    JOIN formulas f              ON f.formula_id   = pd.selected_formula_id
    LEFT JOIN material_config mc ON mc.config_id   = pd.selected_config_id
    LEFT JOIN estimation_detail_material edm
           ON edm.project_details_id = pd.id
    WHERE pd.estimation_id = ${estimation.estimation_id}
    GROUP BY pd.id, c.name_en, c.name_ar, f.name_en, f.name_ar, mc.name
    ORDER BY pd.created_at
  `;

  const leafIds = leaves.map(l => l.project_details_id);
  const allLines = leafIds.length > 0
    ? await sql`
        SELECT
          edm.detail_id,
          edm.project_details_id,
          edm.material_id,
          rc.material_name_en AS material_name_en,
          rc.material_name_ar AS material_name_ar,
          COALESCE(rc.material_name_en, rc.material_name_ar, 'Unnamed Material') AS material_name,
          rc.material_type,
          u.symbol            AS unit_symbol,
          edm.quantity,
          edm.applied_waste,
          edm.quantity_with_waste,
          edm.unit_price_snapshot,
          edm.waste_factor_snapshot,
          edm.sub_total
        FROM estimation_detail_material edm
        JOIN resource_catalog rc ON rc.material_id = edm.material_id
        JOIN units u             ON u.unit_id       = rc.unit_id
        WHERE edm.project_details_id = ANY(${leafIds})
        ORDER BY rc.material_type DESC, rc.material_name_en
      `
    : [];

  const linesByLeaf = allLines.reduce((acc, line) => {
    const key = line.project_details_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(line);
    return acc;
  }, {});

  const leafCalculations = leaves.map(leaf => ({
    ...leaf,
    material_lines: linesByLeaf[leaf.project_details_id] ?? [],
  }));

  return { ...estimation, leaf_calculations: leafCalculations };
}

// ─── Save leaf result ─────────────────────────────────────────────────────────

export async function saveLeafResult(dto) {
  return sql.begin(async (tx) => {

    const [est] = await tx`
      SELECT estimation_id
      FROM   estimation
      WHERE  project_id = ${dto.project_id}
    `;
    if (!est) throw new Error(`No estimation found for project ${dto.project_id}`);
    const estimationId = est.estimation_id;

    let projectDetailsId;

    if (dto.project_details_id) {
      // Recalculation — update existing leaf
      const [updated] = await tx`
        UPDATE project_details
        SET
          selected_formula_id      = ${dto.selected_formula_id},
          selected_config_id       = ${dto.selected_config_id},
          formula_version_snapshot = ${dto.formula_version_snapshot},
          values                   = ${dto.field_values},
          results                  = ${dto.results},
          updated_at               = NOW()
        WHERE id            = ${dto.project_details_id}
          AND estimation_id = ${estimationId}
        RETURNING id
      `;
      if (!updated) throw new Error(`ProjectDetails ${dto.project_details_id} not found`);
      projectDetailsId = updated.id;

      await tx`
        DELETE FROM estimation_detail_material
        WHERE project_details_id = ${projectDetailsId}
      `;
    } else {
      // First save — insert new leaf
      const [inserted] = await tx`
        INSERT INTO project_details (
          project_id,
          estimation_id,
          category_id,
          user_id,
          selected_formula_id,
          selected_config_id,
          formula_version_snapshot,
          values,
          results
        ) VALUES (
          ${dto.project_id},
          ${estimationId},
          ${dto.category_id},
          (SELECT user_id FROM projects WHERE project_id = ${dto.project_id}),
          ${dto.selected_formula_id},
          ${dto.selected_config_id},
          ${dto.formula_version_snapshot},
          ${dto.field_values},
          ${dto.results}
        )
        RETURNING id
      `;
      projectDetailsId = inserted.id;
    }

    if (dto.material_lines.length > 0) {
      await tx`
        INSERT INTO estimation_detail_material ${tx(
        dto.material_lines.map(m => ({
          estimation_id: estimationId,
          project_details_id: projectDetailsId,
          material_id: m.material_id,
          quantity: m.quantity,
          applied_waste: m.applied_waste,
          quantity_with_waste: m.quantity_with_waste,
          unit_price_snapshot: m.unit_price_snapshot,
          waste_factor_snapshot: m.waste_factor_snapshot,
          sub_total: m.sub_total,
        }))
      )}
      `;
    }

    // Recompute total from ALL leaves in this estimation
    await tx`
      UPDATE estimation
      SET total_budget = (
        SELECT COALESCE(SUM(sub_total), 0)
        FROM   estimation_detail_material
        WHERE  estimation_id = ${estimationId}
      )
      WHERE estimation_id = ${estimationId}
    `;

    const [finalEst] = await tx`
      SELECT total_budget
      FROM   estimation
      WHERE  estimation_id = ${estimationId}
    `;

    return {
      estimation_id: estimationId,
      project_details_id: projectDetailsId,
      total_budget: finalEst.total_budget,
    };
  });
}

// ─── Remove a leaf ────────────────────────────────────────────────────────────

export async function removeLeaf(project_details_id) {
  return sql.begin(async (tx) => {
    const [pd] = await tx`
      SELECT id, estimation_id
      FROM   project_details
      WHERE  id = ${project_details_id}
    `;
    if (!pd) throw new Error(`ProjectDetails ${project_details_id} not found`);

    await tx`
      DELETE FROM estimation_detail_material
      WHERE project_details_id = ${project_details_id}
    `;

    await tx`
      DELETE FROM project_details
      WHERE id = ${project_details_id}
    `;

    await tx`
      UPDATE estimation
      SET total_budget = (
        SELECT COALESCE(SUM(sub_total), 0)
        FROM   estimation_detail_material
        WHERE  estimation_id = ${pd.estimation_id}
      )
      WHERE estimation_id = ${pd.estimation_id}
    `;

    const [finalEst] = await tx`
      SELECT total_budget
      FROM   estimation
      WHERE  estimation_id = ${pd.estimation_id}
    `;

    return {
      estimation_id: pd.estimation_id,
      total_budget: finalEst.total_budget,
    };
  });
}

// ─── Export helpers ───────────────────────────────────────────────────────────

export async function getExportData(project_id, user_id) {
  const project = await getProjectById(project_id, user_id);

  const [estimation] = await sql`
    SELECT * FROM estimation
    WHERE project_id = ${project_id}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  let details = [];
  if (estimation) {
    details = await sql`
      SELECT
        pd.*,
        c.name_en AS category_name_en,
        c.name_ar AS category_name_ar
      FROM project_details pd
      LEFT JOIN categories c ON c.category_id = pd.category_id
      WHERE pd.estimation_id = ${estimation.estimation_id}
    `;
  }

  return { project, estimation, details };
}
