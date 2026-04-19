import { request } from 'node:http';

const results = {};

function httpReq(method, path, payload, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...extraHeaders,
      },
    };
    const req = request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const get  = (path, h = {}) => httpReq('GET',    path, null, h);
const post = (path, b, h = {}) => httpReq('POST', path, b,   h);
const del  = (path, b, h = {}) => httpReq('DELETE',path, b,   h);

// ── Use a real user UUID from the DB (or omit entirely) ──────────────────────
// Projects with user_id = null
const USER_HEADER = {};  // omit x-user-id entirely so it is undefined (null-safe path)

async function run() {
  console.log('\n=== TESTING ESTIMATION MODULE ENDPOINTS ===\n');

  // 1. ── Health ─────────────────────────────────────────────────────────────
  const health = await get('/api/estimation/health');
  results.health = health;
  console.log(`GET /api/estimation/health → ${health.status}`);
  console.log(JSON.stringify(health.body, null, 2));

  // 2. ── Root Categories ────────────────────────────────────────────────────
  const cats = await get('/api/estimation/categories');
  results.categories = cats;
  console.log(`\nGET /api/estimation/categories → ${cats.status}`);
  console.log(JSON.stringify(cats.body, null, 2));

  const firstCat = cats.body?.data?.[0];
  if (!firstCat) { console.error('No categories found'); process.exit(1); }
  const firstCatId = firstCat.category_id;

  // 3. ── Children ───────────────────────────────────────────────────────────
  const children = await get(`/api/estimation/categories/${firstCatId}/children`);
  results.children = children;
  console.log(`\nGET /api/estimation/categories/${firstCatId}/children → ${children.status}`);
  console.log(JSON.stringify(children.body, null, 2));

  // 4. ── Leaf ───────────────────────────────────────────────────────────────
  // Traverse: root → child → grandchild (leaf)
  let leafId = firstCatId;
  const child = children.body?.data?.[0];
  if (child) {
    const grandChildren = await get(`/api/estimation/categories/${child.category_id}/children`);
    const gc = grandChildren.body?.data?.[0];
    if (gc) {
      const ggc = await get(`/api/estimation/categories/${gc.category_id}/children`);
      leafId = ggc.body?.data?.[0]?.category_id ?? gc.category_id;
    } else {
      leafId = child.category_id;
    }
  }

  const leaf = await get(`/api/estimation/categories/${leafId}/leaf`);
  results.leaf = leaf;
  console.log(`\nGET /api/estimation/categories/${leafId}/leaf → ${leaf.status}`);
  console.log(JSON.stringify(leaf.body, null, 2));

  const formula = leaf.body?.data?.formulas?.[0];
  const config  = leaf.body?.data?.configs?.[0];

  // 5. ── Calculate ──────────────────────────────────────────────────────────
  // field_values must be { field_id: number }
  // The formula expression uses L, l, h - we use field_ids as keys
  // Try using default label characters as variable names is wrong; use field_ids
  if (formula) {
    const fieldValues = {};
    (formula.fields || []).forEach(f => {
      fieldValues[f.field_id] = f.default_value ?? 5;
    });

    const calcPayload = {
      category_id:          leafId,
      selected_formula_id:  formula.formula_id,
      selected_config_id:   config?.config_id ?? null,
      field_values:         fieldValues,
    };

    const calc = await post('/api/estimation/calculate', calcPayload);
    results.calculate = { payload: calcPayload, ...calc };
    console.log(`\nPOST /api/estimation/calculate → ${calc.status}`);
    console.log('Payload:', JSON.stringify(calcPayload, null, 2));
    console.log('Response:', JSON.stringify(calc.body, null, 2));
  }

  // 6. ── Create Project ─────────────────────────────────────────────────────
  const newProject = await post('/api/estimation/projects', {
    name: 'Test Project - API Contract Demo',
    description: 'Sample project created during API testing',
    budget_type: 'FLEXIBLE',
    total_budget: 500000,
  }, USER_HEADER);
  results.createProject = newProject;
  console.log(`\nPOST /api/estimation/projects → ${newProject.status}`);
  console.log(JSON.stringify(newProject.body, null, 2));

  const projectId = newProject.body?.data?.project_id;
  const estimationId = newProject.body?.data?.estimation_id;

  // 7. ── Get Projects List ──────────────────────────────────────────────────
  const projectsList = await get('/api/estimation/projects', USER_HEADER);
  results.projects = projectsList;
  console.log(`\nGET /api/estimation/projects → ${projectsList.status}`);
  console.log(JSON.stringify(projectsList.body, null, 2));

  // 8. ── Get Single Project ─────────────────────────────────────────────────
  if (projectId) {
    const singleProject = await get(`/api/estimation/projects/${projectId}`, USER_HEADER);
    results.getProject = singleProject;
    console.log(`\nGET /api/estimation/projects/${projectId} → ${singleProject.status}`);
    console.log(JSON.stringify(singleProject.body, null, 2));

    // 9. ── Get Estimation ──────────────────────────────────────────────────
    const estimation = await get(`/api/estimation/projects/${projectId}/estimation`);
    results.getEstimation = estimation;
    console.log(`\nGET /api/estimation/projects/${projectId}/estimation → ${estimation.status}`);
    console.log(JSON.stringify(estimation.body, null, 2));
  }

  // 10. ── Validation Error Example ─────────────────────────────────────────
  const badCalc = await post('/api/estimation/calculate', { category_id: 'not-a-uuid' });
  results.validationError = badCalc;
  console.log(`\nPOST /api/estimation/calculate (invalid) → ${badCalc.status}`);
  console.log(JSON.stringify(badCalc.body, null, 2));

  // 11. ── Not Found Example ─────────────────────────────────────────────────
  const notFound = await get('/api/estimation/projects/00000000-0000-0000-0000-000000000000');
  results.notFound = notFound;
  console.log(`\nGET /api/estimation/projects/00000000-... → ${notFound.status}`);
  console.log(JSON.stringify(notFound.body, null, 2));

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log('\n\n=====================================');
  console.log('FULL RESULTS JSON (for API contract):');
  console.log('=====================================\n');
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
