// Vercel Serverless Function - Database operations via Supabase
// Service key is protected as environment variable, never exposed to browser

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabaseQuery(table, method, body = null, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const { action, table, id, data, ids } = req.body || {};

  try {
    switch (action) {

      // Load all records from a table
      case 'loadAll': {
        const rows = await supabaseQuery(table, 'GET', null, '?select=id,data&order=updated_at.asc');
        const result = rows.map(r => r.data);
        return res.json({ ok: true, data: result });
      }

      // Save one record (upsert)
      case 'save': {
        await supabaseQuery(table, 'POST', { id, data, updated_at: new Date().toISOString() });
        return res.json({ ok: true });
      }

      // Save many records at once
      case 'saveMany': {
        if (!Array.isArray(data) || data.length === 0) return res.json({ ok: true });
        const rows = data.map(item => ({ id: item.id, data: item, updated_at: new Date().toISOString() }));
        await supabaseQuery(table, 'POST', rows);
        return res.json({ ok: true });
      }

      // Delete one record
      case 'delete': {
        await supabaseQuery(table, 'DELETE', null, `?id=eq.${encodeURIComponent(id)}`);
        return res.json({ ok: true });
      }

      // Load app state value
      case 'getState': {
        const rows = await supabaseQuery('app_state', 'GET', null, `?key=eq.${encodeURIComponent(id)}&select=value`);
        return res.json({ ok: true, data: rows.length ? rows[0].value : null });
      }

      // Save app state value
      case 'setState': {
        await supabaseQuery('app_state', 'POST', { key: id, value: data, updated_at: new Date().toISOString() });
        return res.json({ ok: true });
      }

      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ error: err.message });
  }
}
