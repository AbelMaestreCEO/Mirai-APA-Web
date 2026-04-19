// functions/api/[[...route]].js
// Cloudflare Pages Functions - maneja /api/* cuando se despliega en Pages

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!path.startsWith('/api/')) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    // Re-usar la misma lógica del worker
    // En Pages Functions, los bindings tienen los mismos nombres que en wrangler.toml
    const method = request.method;

    // Health
    if (path === '/api/health' && method === 'GET') {
      return json({ status: 'ok', service: 'Mirai APA Backend' }, 200, corsHeaders);
    }

    // Upload
    if (path === '/api/upload' && method === 'POST') {
      return await handleUpload(request, env, corsHeaders);
    }

    // Download
    if (path.startsWith('/api/download/') && method === 'GET') {
      const fileId = path.replace('/api/download/', '');
      return await handleDownload(fileId, env, corsHeaders);
    }

    // History
    if (path === '/api/history' && method === 'GET') {
      return await handleHistory(request, env, corsHeaders);
    }

    // Delete
    if (path.startsWith('/api/delete/') && method === 'DELETE') {
      const fileId = path.replace('/api/delete/', '');
      return await handleDelete(fileId, env, corsHeaders);
    }

    return json({ error: 'Not Found' }, 404, corsHeaders);

  } catch (error) {
    console.error('Function error:', error);
    // corsHeaders ya está en scope aquí — este era el bug original
    return json({ error: 'Internal Server Error', message: error.message }, 500, corsHeaders);
  }
}

// ─── Helpers ────────────────────────────────────────────────

function json(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ─── Handlers (duplicados aquí para Pages Functions) ────────

async function handleUpload(request, env, corsHeaders) {
  const formData = await request.formData();
  const file = formData.get('file');
  const metadataRaw = formData.get('metadata');

  if (!file) return json({ error: 'No file provided' }, 400, corsHeaders);
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return json({ error: 'Invalid file type. Only .DOCX allowed.' }, 400, corsHeaders);
  }

  const MAX_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_SIZE) return json({ error: 'File too large. Maximum 25MB.' }, 413, corsHeaders);

  const fileId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  let metadata = {};
  try { metadata = JSON.parse(metadataRaw || '{}'); } catch (_) {}

  await env.R2_BUCKET.put(fileId, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    customMetadata: { originalName: file.name, uploadedAt: timestamp }
  });

  await env.DB
    .prepare('INSERT INTO files (id, original_name, file_type, size, uploaded_at, user_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(fileId, file.name, file.type, file.size, timestamp, metadata.userId || null, JSON.stringify(metadata))
    .run();

  return json({ success: true, fileId, downloadUrl: `/api/download/${fileId}`, fileName: file.name }, 200, corsHeaders);
}

async function handleDownload(fileId, env, corsHeaders) {
  if (!fileId) return json({ error: 'File ID required' }, 400, corsHeaders);
  const object = await env.R2_BUCKET.get(fileId);
  if (!object) return json({ error: 'File not found' }, 404, corsHeaders);

  const headers = new Headers(corsHeaders);
  object.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `attachment; filename="${object.customMetadata?.originalName || 'documento.docx'}"`);
  headers.set('Cache-Control', 'no-cache');
  return new Response(object.body, { headers });
}

async function handleHistory(request, env, corsHeaders) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query, bindings;
  if (userId) {
    query = 'SELECT id, original_name, file_type, size, uploaded_at FROM files WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT ? OFFSET ?';
    bindings = [userId, limit, offset];
  } else {
    query = 'SELECT id, original_name, file_type, size, uploaded_at FROM files ORDER BY uploaded_at DESC LIMIT ? OFFSET ?';
    bindings = [limit, offset];
  }

  const { results } = await env.DB.prepare(query).bind(...bindings).all();
  return json({ files: results.map(r => ({ ...r, downloadUrl: `/api/download/${r.id}` })) }, 200, corsHeaders);
}

async function handleDelete(fileId, env, corsHeaders) {
  if (!fileId) return json({ error: 'File ID required' }, 400, corsHeaders);
  await env.R2_BUCKET.delete(fileId);
  await env.DB.prepare('DELETE FROM files WHERE id = ?').bind(fileId).run();
  return json({ success: true, message: 'Archivo eliminado correctamente' }, 200, corsHeaders);
}
