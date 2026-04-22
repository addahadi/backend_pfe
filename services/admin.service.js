import sql from '../config/database.js';
import { NotFoundError } from '../utils/AppError.js';

const CLIENT_ROLE = 'CLIENT';

const ADMIN_USER_STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
];

function normaliseUserStatus(value) {
  const normalised = String(value || 'ACTIVE').trim().toLowerCase();
  if (['active', 'banned', 'suspended', 'inactive'].includes(normalised)) {
    return normalised;
  }
  return 'active';
}

function normalisePlanType(value) {
  return value ? String(value).trim().toUpperCase() : null;
}

function buildAdminUser(row) {
  const hasPlan =
    row.plan_name ||
    row.subscription_status ||
    row.plan_type ||
    row.subscription_id;

  return {
    id: row.user_id,
    name: row.user_name,
    email: row.email,
    role: row.role,
    status: normaliseUserStatus(row.user_status),
    joined_at: row.created_at,
    plan: hasPlan
      ? {
          id: row.plan_id ?? null,
          name: row.plan_name ?? null,
          type: normalisePlanType(row.plan_type),
          subscription_id: row.subscription_id ?? null,
          subscription_status: row.subscription_status ?? null,
          start_date: row.start_date ?? null,
          end_date: row.end_date ?? null,
        }
      : null,
    stats: {
      projects_count: row.projects_count ?? 0,
      likes_count: row.likes_count ?? 0,
      saves_count: row.saves_count ?? 0,
    },
  };
}

function buildUsersWhereClause({ status, search, plan }) {
  const conditions = [sql`u.role = ${CLIENT_ROLE}`];

  if (status && status !== 'ALL') {
    conditions.push(
      sql`LOWER(COALESCE(NULLIF(u.status, ''), 'ACTIVE')) = ${status}`
    );
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(sql`(u.name ILIKE ${like} OR u.email ILIKE ${like})`);
  }

  const planFilter = typeof plan === 'string' ? plan.trim() : '';
  if (planFilter && planFilter !== 'ALL') {
    if (planFilter === 'NO_PLAN') {
      conditions.push(sql`latest_sub.plan_name IS NULL`);
    } else {
      conditions.push(
        sql`LOWER(COALESCE(latest_sub.plan_name, '')) = ${planFilter.toLowerCase()}`
      );
    }
  }

  return sql`WHERE ${conditions.reduce((left, right) => sql`${left} AND ${right}`)}`;
}

export async function getDashboardStats() {
  const start = Date.now();
  console.log('[DEBUG] Running stats queries in parallel...');
  
  const [
    usersResult,
    activeSubsResult,
    revenueResult,
    projectsResult,
    aiResult,
    planBreakdownResult,
    newUsersResult,
    monthlyRevenueResult,
    recentActivityResult,
    aiBreakdownResult,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM users`.then(r => { console.log('[DEBUG] usersResult done'); return r; }),
    sql`SELECT COUNT(*)::int AS count FROM subscriptions WHERE status = 'ACTIVE'`.then(r => { console.log('[DEBUG] activeSubsResult done'); return r; }),
    sql`
      SELECT COALESCE(SUM(p.price), 0)::float AS total
      FROM subscriptions s
      JOIN plans p ON p.plan_id = s.plan_id
      WHERE s.status = 'ACTIVE'
        AND date_trunc('month', s.created_at) = date_trunc('month', NOW())
    `.then(r => { console.log('[DEBUG] revenueResult done'); return r; }),
    sql`SELECT COUNT(*)::int AS count FROM projects`.then(r => { console.log('[DEBUG] projectsResult done'); return r; }),
    sql`SELECT COUNT(*)::int AS count FROM ai_usage_history`.then(r => { console.log('[DEBUG] aiResult done'); return r; }),
    sql`
      SELECT p.name_en AS plan_name, COUNT(s.subscription_id)::int AS count
      FROM plans p
      LEFT JOIN subscriptions s ON s.plan_id = p.plan_id AND s.status = 'ACTIVE'
      GROUP BY p.plan_id, p.name_en
      ORDER BY count DESC
    `.then(r => { console.log('[DEBUG] planBreakdownResult done'); return r; }),
    sql`
      SELECT
        TO_CHAR(gs.day, 'DD') AS d,
        COUNT(u.id)::int AS v
      FROM generate_series(
        (CURRENT_DATE - INTERVAL '29 days'),
        CURRENT_DATE,
        INTERVAL '1 day'
      ) AS gs(day)
      LEFT JOIN users u ON DATE(u.created_at) = gs.day
      GROUP BY gs.day
      ORDER BY gs.day
    `.then(r => { console.log('[DEBUG] newUsersResult done'); return r; }),
    sql`
      SELECT
        TO_CHAR(gs.month, 'Mon') AS m,
        COALESCE(SUM(p.price), 0)::float AS v
      FROM generate_series(
        date_trunc('month', NOW() - INTERVAL '5 months'),
        date_trunc('month', NOW()),
        INTERVAL '1 month'
      ) AS gs(month)
      LEFT JOIN subscriptions s
        ON date_trunc('month', s.created_at) = gs.month
       AND s.status = 'ACTIVE'
      LEFT JOIN plans p ON p.plan_id = s.plan_id
      GROUP BY gs.month
      ORDER BY gs.month
    `.then(r => { console.log('[DEBUG] monthlyRevenueResult done'); return r; }),
    sql`
      SELECT 'project' AS type, p.name AS entity, u.name AS actor, p.created_at AS ts
      FROM projects p
      JOIN users u ON u.id = p.user_id
      UNION ALL
      SELECT 'subscription', pl.name_en, u.name, s.created_at
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      JOIN plans pl ON pl.plan_id = s.plan_id
      WHERE s.status = 'ACTIVE'
      UNION ALL
      SELECT 'user', u.email, u.name, u.created_at
      FROM users u
      ORDER BY ts DESC
      LIMIT 8
    `.then(r => { console.log('[DEBUG] recentActivityResult done'); return r; }),
    sql`
      SELECT usage_type::text AS type, COUNT(*)::int AS count
      FROM ai_usage_history
      GROUP BY usage_type
    `.then(r => { console.log('[DEBUG] aiBreakdownResult done'); return r; }),
  ]);

  console.log(`[DEBUG] Dashboard stats finished in ${Date.now() - start}ms`);

  return {
    kpis: {
      total_users: usersResult[0]?.count ?? 0,
      active_subs: activeSubsResult[0]?.count ?? 0,
      monthly_revenue: revenueResult[0]?.total ?? 0,
      total_projects: projectsResult[0]?.count ?? 0,
      total_ai_calls: aiResult[0]?.count ?? 0,
    },
    plan_breakdown: planBreakdownResult,
    new_users_30d: newUsersResult,
    monthly_revenue: monthlyRevenueResult,
    recent_activity: recentActivityResult,
    ai_breakdown: aiBreakdownResult,
  };
}

export async function getSubscribersAdmin({ status, search, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const conditions = [];

  if (status && status !== 'ALL') conditions.push(sql`s.status = ${status}`);
  if (search) {
    const like = `%${search}%`;
    conditions.push(sql`(u.name ILIKE ${like} OR u.email ILIKE ${like})`);
  }

  const whereClause = conditions.length
    ? sql`WHERE ${conditions.reduce((left, right) => sql`${left} AND ${right}`)}`
    : sql``;

  const [rows, countResult] = await Promise.all([
    sql`
      SELECT
        s.subscription_id,
        s.status,
        s.start_date,
        s.end_date,
        s.created_at,
        u.id AS user_id,
        u.name AS user_name,
        u.email,
        p.plan_id,
        p.name_en AS plan_name,
        p.price,
        p.duration,
        pt.name_en AS plan_type
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      JOIN plans p ON p.plan_id = s.plan_id
      LEFT JOIN plan_types pt ON pt.plan_type_id = p.plan_type_id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*)::int AS total
      FROM subscriptions s
      JOIN users u ON u.id = s.user_id
      ${whereClause}
    `,
  ]);

  return {
    data: rows.map((row) => ({
      id: row.subscription_id,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      created_at: row.created_at,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.email,
      },
      plan: {
        id: row.plan_id,
        name: row.plan_name,
        price: row.price,
        duration: row.duration,
        type: row.plan_type,
      },
    })),
    pagination: {
      total: countResult[0]?.total ?? 0,
      page,
      limit,
      total_pages: Math.ceil((countResult[0]?.total ?? 0) / limit),
    },
  };
}

export async function getUsersAdmin({ status, plan, search, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const whereClause = buildUsersWhereClause({ status, search, plan });
  const usersFrom = sql`
    FROM users u
    LEFT JOIN LATERAL (
      SELECT
        s.subscription_id,
        s.status AS subscription_status,
        s.start_date,
        s.end_date,
        p.plan_id,
        p.name_en AS plan_name,
        pt.name_en AS plan_type
      FROM subscriptions s
      LEFT JOIN plans p ON p.plan_id = s.plan_id
      LEFT JOIN plan_types pt ON pt.plan_type_id = p.plan_type_id
      WHERE s.user_id = u.id
      ORDER BY
        CASE WHEN s.status = 'ACTIVE' THEN 0 ELSE 1 END,
        COALESCE(s.end_date, s.start_date) DESC,
        s.created_at DESC
      LIMIT 1
    ) latest_sub ON TRUE
    ${whereClause}
  `;

  const [rows, countResult, totalUsersResult, planOptionsResult] = await Promise.all([
    sql`
      SELECT
        u.id AS user_id,
        u.name AS user_name,
        u.email,
        u.role,
        u.status AS user_status,
        u.created_at,
        latest_sub.subscription_id,
        latest_sub.subscription_status,
        latest_sub.start_date,
        latest_sub.end_date,
        latest_sub.plan_id,
        latest_sub.plan_name,
        latest_sub.plan_type,
        (
          SELECT COUNT(*)::int
          FROM projects p
          WHERE p.user_id = u.id
        ) AS projects_count,
        (
          SELECT COUNT(*)::int
          FROM likes l
          WHERE l.user_id = u.id
        ) AS likes_count,
        (
          SELECT COUNT(*)::int
          FROM saves s
          WHERE s.user_id = u.id
        ) AS saves_count
      ${usersFrom}
      ORDER BY u.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*)::int AS total
      ${usersFrom}
    `,
    sql`
      SELECT COUNT(*)::int AS total
      FROM users
      WHERE role = ${CLIENT_ROLE}
    `,
    sql`
      SELECT DISTINCT name_en
      FROM plans
      WHERE name_en IS NOT NULL
      ORDER BY name_en ASC
    `,
  ]);

  const filteredTotal = countResult[0]?.total ?? 0;
  const totalUsers = totalUsersResult[0]?.total ?? 0;

  return {
    data: rows.map(buildAdminUser),
    pagination: {
      total: filteredTotal,
      page,
      limit,
      total_pages: Math.max(1, Math.ceil(filteredTotal / limit)),
    },
    summary: {
      total_users: totalUsers,
      filtered_users: filteredTotal,
    },
    filters: {
      statuses: ADMIN_USER_STATUS_OPTIONS,
      plans: [
        { value: 'ALL', label: 'All plans' },
        { value: 'NO_PLAN', label: 'No plan' },
        ...planOptionsResult.map((planRow) => ({
          value: planRow.name_en,
          label: planRow.name_en,
        })),
      ],
    },
  };
}

export async function getUserAdminById(userId) {
  const [profileRows, likedRows, savedRows, projectRows] = await Promise.all([
    sql`
      SELECT
        u.id AS user_id,
        u.name AS user_name,
        u.email,
        u.role,
        u.status AS user_status,
        u.created_at,
        u.updated_at,
        latest_sub.subscription_id,
        latest_sub.subscription_status,
        latest_sub.start_date,
        latest_sub.end_date,
        latest_sub.plan_id,
        latest_sub.plan_name,
        latest_sub.plan_type,
        (
          SELECT COUNT(*)::int
          FROM projects p
          WHERE p.user_id = u.id
        ) AS projects_count,
        (
          SELECT COUNT(*)::int
          FROM likes l
          WHERE l.user_id = u.id
        ) AS likes_count,
        (
          SELECT COUNT(*)::int
          FROM saves s
          WHERE s.user_id = u.id
        ) AS saves_count,
        (
          SELECT COUNT(*)::int
          FROM ai_usage_history h
          WHERE h.user_id = u.id
        ) AS ai_calls_count
      FROM users u
      LEFT JOIN LATERAL (
        SELECT
          s.subscription_id,
          s.status AS subscription_status,
          s.start_date,
          s.end_date,
          p.plan_id,
          p.name_en AS plan_name,
          pt.name_en AS plan_type
        FROM subscriptions s
        LEFT JOIN plans p ON p.plan_id = s.plan_id
        LEFT JOIN plan_types pt ON pt.plan_type_id = p.plan_type_id
        WHERE s.user_id = u.id
        ORDER BY
          CASE WHEN s.status = 'ACTIVE' THEN 0 ELSE 1 END,
          COALESCE(s.end_date, s.start_date) DESC,
          s.created_at DESC
        LIMIT 1
      ) latest_sub ON TRUE
      WHERE u.id = ${userId}
        AND u.role = ${CLIENT_ROLE}
      LIMIT 1
    `,
    sql`
      SELECT
        a.article_id AS id,
        COALESCE(a.title_en, a.title_ar, 'Untitled article') AS title,
        l.created_at
      FROM likes l
      JOIN articles a ON a.article_id = l.article_id
      WHERE l.user_id = ${userId}
      ORDER BY l.created_at DESC
      LIMIT 5
    `,
    sql`
      SELECT
        a.article_id AS id,
        COALESCE(a.title_en, a.title_ar, 'Untitled article') AS title,
        s.created_at
      FROM saves s
      JOIN articles a ON a.article_id = s.article_id
      WHERE s.user_id = ${userId}
      ORDER BY s.created_at DESC
      LIMIT 5
    `,
    sql`
      SELECT
        project_id AS id,
        name,
        status,
        created_at
      FROM projects
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 5
    `,
  ]);

  if (!profileRows.length) {
    throw new NotFoundError('User not found');
  }

  const baseProfile = buildAdminUser(profileRows[0]);
  const hasPlan =
    profileRows[0].plan_name ||
    profileRows[0].subscription_status ||
    profileRows[0].plan_type ||
    profileRows[0].subscription_id;

  return {
    id: baseProfile.id,
    name: baseProfile.name,
    email: baseProfile.email,
    role: baseProfile.role,
    status: baseProfile.status,
    joined_at: baseProfile.joined_at,
    updated_at: profileRows[0].updated_at,
    plan: hasPlan
      ? {
          id: profileRows[0].plan_id ?? null,
          name: profileRows[0].plan_name ?? null,
          type: normalisePlanType(profileRows[0].plan_type),
          subscription_id: profileRows[0].subscription_id ?? null,
          subscription_status: profileRows[0].subscription_status ?? null,
          start_date: profileRows[0].start_date ?? null,
          end_date: profileRows[0].end_date ?? null,
        }
      : null,
    stats: {
      projects_count: profileRows[0].projects_count ?? 0,
      likes_count: profileRows[0].likes_count ?? 0,
      saves_count: profileRows[0].saves_count ?? 0,
      ai_calls_count: profileRows[0].ai_calls_count ?? 0,
    },
    engagement: {
      liked_articles: likedRows.map((row) => ({
        id: row.id,
        title: row.title,
        created_at: row.created_at,
      })),
      saved_articles: savedRows.map((row) => ({
        id: row.id,
        title: row.title,
        created_at: row.created_at,
      })),
      recent_projects: projectRows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        created_at: row.created_at,
      })),
    },
  };
}

export async function updateAdminUserStatus({ userId, status }) {
  const nextStatus = String(status || 'active').trim().toUpperCase();
  const rows = await sql`
    UPDATE users
    SET
      status = ${nextStatus},
      updated_at = NOW()
    WHERE id = ${userId}
      AND role = ${CLIENT_ROLE}
    RETURNING id, name, email, role, status, created_at, updated_at
  `;

  if (!rows.length) {
    throw new NotFoundError('User not found');
  }

  return {
    id: rows[0].id,
    name: rows[0].name,
    email: rows[0].email,
    role: rows[0].role,
    status: normaliseUserStatus(rows[0].status),
    joined_at: rows[0].created_at,
    updated_at: rows[0].updated_at,
  };
}
