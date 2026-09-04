/* SEAN: Self-Funded — 存檔後端 (Cloudflare Pages Functions + D1)
 *   GET  /api/save  → 讀存檔
 *   PUT  /api/save  → 寫存檔
 *
 * 認證:每個請求帶 X-RPG-Key,跟 Cloudflare 上的密鑰 RPG_KEY 比對。
 * 重點:憑證只活在伺服器端。裝置上只留一組你自己記得住的通行碼,
 *      GitHub token 不再出現在任何一台裝置的瀏覽器裡。
 */

const SAVE_ID = 'sean';           // 單人面板,固定一列
const MAX_BYTES = 512 * 1024;     // 存檔大小上限,擋亂塞

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

/* 等長比較:不要用 === 直接比,避免用回應時間一個字一個字猜出通行碼 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authed(request, env) {
  const key = request.headers.get('X-RPG-Key') || '';
  return Boolean(env.RPG_KEY) && safeEqual(key, env.RPG_KEY);
}

export async function onRequestGet({ request, env }) {
  if (!authed(request, env)) return json({ error: 'unauthorized' }, 401);

  const row = await env.DB
    .prepare('SELECT data, updated_at FROM saves WHERE id = ?')
    .bind(SAVE_ID)
    .first();

  if (!row) return json({ save: null, updated_at: null });   // 還沒存過

  try {
    return json({ save: JSON.parse(row.data), updated_at: row.updated_at });
  } catch (e) {
    return json({ error: 'corrupt save' }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  if (!authed(request, env)) return json({ error: 'unauthorized' }, 401);

  let body;
  try { body = await request.json(); }
  catch (e) { return json({ error: 'bad json' }, 400); }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'bad payload' }, 400);
  }

  const text = JSON.stringify(body);
  if (text.length > MAX_BYTES) return json({ error: 'too large' }, 413);

  const now = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO saves (id, data, updated_at) VALUES (?, ?, ?) ' +
    'ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
  ).bind(SAVE_ID, text, now).run();

  return json({ ok: true, updated_at: now });
}
