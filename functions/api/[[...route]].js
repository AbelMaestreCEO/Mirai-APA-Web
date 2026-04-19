// functions/api/[[...route]].js
// Cloudflare Pages Function — maneja todas las rutas /api/*

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    if (path === '/api/health' && method === 'GET') {
      return ok({ status: 'ok', service: 'Mirai APA' }, cors);
    }

    if (path === '/api/upload' && method === 'POST') {
      return await upload(request, env, cors);
    }

    if (path.startsWith('/api/download/') && method === 'GET') {
      const id = path.split('/api/download/')[1];
      return await download(id, env, cors);
    }

    if (path === '/api/history' && method === 'GET') {
      return await history(request, env, cors);
    }

    if (path.startsWith('/api/delete/') && method === 'DELETE') {
      const id = path.split('/api/delete/')[1];
      return await del(id, env, cors);
    }

    return err('Not Found', 404, cors);

  } catch (e) {
    console.error('Error:', e);
    return err(e.message, 500, cors);
  }
}

// ── Respuestas ──────────────────────────────────────────────

function ok(data, cors) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

function err(msg, status, cors) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

// ── Handlers ────────────────────────────────────────────────

async function upload(request, env, cors) {
  const form = await request.formData();
  const file = form.get('file');
  const meta = form.get('metadata');

  if (!file) return err('No file provided', 400, cors);
  if (!file.name.toLowerCase().endsWith('.docx')) return err('Solo se aceptan archivos .docx', 400, cors);
  if (file.size > 25 * 1024 * 1024) return err('Archivo demasiado grande (máx. 25MB)', 413, cors);

  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  let metadata = {};
  try { metadata = JSON.parse(meta || '{}'); } catch (_) {}

  await env.R2_BUCKET.put(id, file.stream(), {
    httpMetadata: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    customMetadata: { originalName: file.name, uploadedAt: ts }
  });

  await env.DB
    .prepare('INSERT INTO files (id, original_name, file_type, size, uploaded_at, user_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, file.name, file.type || 'application/docx', file.size, ts, null, JSON.stringify(metadata))
    .run();

  return ok({ success: true, fileId: id, downloadUrl: `/api/download/${id}`, fileName: file.name }, cors);
}

async function download(id, env, cors) {
  if (!id) return err('ID requerido', 400, cors);
  const obj = await env.R2_BUCKET.get(id);
  if (!obj) return err('Archivo no encontrado', 404, cors);

  const headers = new Headers(cors);
  obj.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `attachment; filename="${obj.customMetadata?.originalName || 'documento.docx'}"`);
  headers.set('Cache-Control', 'no-cache');
  return new Response(obj.body, { headers });
}

async function history(request, env, cors) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const { results } = await env.DB
    .prepare('SELECT id, original_name, file_type, size, uploaded_at FROM files ORDER BY uploaded_at DESC LIMIT ? OFFSET ?')
    .bind(limit, offset)
    .all();

  return ok({ files: results.map(r => ({ ...r, downloadUrl: `/api/download/${r.id}` })) }, cors);
}

async function del(id, env, cors) {
  if (!id) return err('ID requerido', 400, cors);
  await env.R2_BUCKET.delete(id);
  await env.DB.prepare('DELETE FROM files WHERE id = ?').bind(id).run();
  return ok({ success: true }, cors);
}
