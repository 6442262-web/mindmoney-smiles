// Mock Supabase backend (PostgREST + GoTrue + Functions) — in-memory
import http from 'node:http';
import crypto from 'node:crypto';

const tables = new Map(); // name -> rows[]
const getTable = (n) => { if (!tables.has(n)) tables.set(n, []); return tables.get(n); };

// ค่า DEFAULT ของคอลัมน์ตาม schema จริง (setup-fix.sql) — PostgREST คืนค่าเหล่านี้ตอน insert
// ถ้า mock ไม่เติมให้ UI ที่พึ่ง default (เช่น current_amount.toLocaleString) จะพังทั้งที่ของจริงไม่พัง
const COLUMN_DEFAULTS = {
  savings_goals: { current_amount: 0, icon: '🎯', color: '#6366f1', is_completed: false, deadline: null },
  liabilities: { is_active: true, interest_rate: null, monthly_payment: null, due_date: null, notes: null },
  liability_payments: { notes: null },
  categories: { is_default: false },
  transactions: { description: null, note: null, time: null, category_id: null, priority: 3 },
};

const USER_ID = '11111111-1111-4111-8111-111111111111';
const now = () => new Date().toISOString();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer, x-client-info, content-profile, accept-profile, x-supabase-api-version, range, x-supabase-info',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, PUT, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'content-range, x-supabase-api-version',
};

function json(res, code, body, extra = {}) {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json', ...CORS, ...extra });
  res.end(s);
}

function parseFilters(sp) {
  const filters = [];
  for (const [k, v] of sp.entries()) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    const m = v.match(/^(eq|neq|is)\.(.*)$/);
    if (m) filters.push({ col: k, op: m[1], val: m[2] });
  }
  return filters;
}

function applyFilters(rows, filters) {
  return rows.filter(r => filters.every(f => {
    const cell = r[f.col];
    if (f.op === 'eq') return String(cell) === f.val;
    if (f.op === 'neq') return String(cell) !== f.val;
    if (f.op === 'is') return f.val === 'null' ? (cell === null || cell === undefined) : String(cell) === f.val;
    return true;
  }));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const bodyRaw = Buffer.concat(chunks).toString();
  let body = null;
  try { body = bodyRaw ? JSON.parse(bodyRaw) : null; } catch { body = null; }

  console.log(`${req.method} ${url.pathname}${url.search}`);

  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  // ---- GoTrue ----
  if (url.pathname === '/auth/v1/user') {
    return json(res, 200, {
      id: USER_ID, aud: 'authenticated', role: 'authenticated',
      email: 'test@example.com', user_metadata: { full_name: 'Test User' },
      app_metadata: {}, created_at: now(),
    });
  }
  if (url.pathname === '/auth/v1/token') {
    const exp = Math.floor(Date.now() / 1000) + 86400;
    const jwt = [
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify({ sub: USER_ID, role: 'authenticated', exp })).toString('base64url'),
      'sig',
    ].join('.');
    return json(res, 200, {
      access_token: jwt, token_type: 'bearer', expires_in: 86400, expires_at: exp,
      refresh_token: 'mock-refresh',
      user: { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', user_metadata: { full_name: 'Test User' }, app_metadata: {}, created_at: now() },
    });
  }
  if (url.pathname.startsWith('/auth/v1/')) return json(res, 200, {});

  // ---- Edge Functions ----
  if (url.pathname.startsWith('/functions/v1/')) {
    const fn = url.pathname.split('/')[3];
    if (fn === 'yahoo-finance') return json(res, 200, { price: 0.0275, currency: 'USD', quotes: [] });
    return json(res, 200, { reply: 'mock', transaction: null });
  }

  // ---- PostgREST ----
  const m = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (m) {
    const table = getTable(m[1]);
    const filters = parseFilters(url.searchParams);

    if (req.method === 'GET' || req.method === 'HEAD') {
      let rows = applyFilters(table, filters);
      const limit = url.searchParams.get('limit');
      if (limit) rows = rows.slice(0, Number(limit));
      return json(res, 200, rows, { 'Content-Range': `0-${rows.length}/${rows.length}` });
    }
    if (req.method === 'POST') {
      const items = Array.isArray(body) ? body : [body];
      const defaults = COLUMN_DEFAULTS[m[1]] ?? {};
      const created = items.map(item => ({
        id: crypto.randomUUID(), created_at: now(), updated_at: now(), ...defaults, ...item,
      }));
      table.push(...created);
      const single = (req.headers.accept || '').includes('vnd.pgrst.object');
      return json(res, 201, single ? created[0] : created);
    }
    if (req.method === 'PATCH') {
      const rows = applyFilters(table, filters);
      rows.forEach(r => Object.assign(r, body, { updated_at: now() }));
      const single = (req.headers.accept || '').includes('vnd.pgrst.object');
      return json(res, 200, single ? (rows[0] ?? null) : rows);
    }
    if (req.method === 'DELETE') {
      const doomed = new Set(applyFilters(table, filters));
      tables.set(m[1], table.filter(r => !doomed.has(r)));
      return json(res, 200, []);
    }
  }

  json(res, 404, { message: 'not found: ' + url.pathname });
});

server.listen(54321, () => console.log('mock supabase on :54321'));
