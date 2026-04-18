/**
 * workers/index.js
 * 
 * Cloudflare Worker Backend para Mirai APA.
 * 
 * Funciones principales:
 * - POST /api/upload: Recibe el archivo DOCX procesado, lo guarda en R2 y registra en D1.
 * - GET /api/download/:id: Recupera el archivo desde R2.
 * - GET /api/history: Lista los archivos de un usuario (si hay autenticación).
 * - DELETE /api/delete/:id: Elimina el archivo de R2 y D1.
 * - GET /api/health: Health check.
 * 
 * Configuración requerida en wrangler.toml:
 * - R2_BUCKET_NAME: Nombre de tu bucket R2.
 * - D1_DB_NAME: Nombre de tu base de datos D1.
 * 
 * Seguridad:
 * - En producción, deberías añadir validación de CORS y autenticación (JWT/API Key).
 * - Por ahora, es abierto para facilitar el desarrollo.
 */

// Configuración de nombres (deben coincidir con wrangler.toml)
const R2_BUCKET_NAME = 'mirai-apa-files'; // Cambia esto por tu bucket real
const D1_DB_NAME = 'mirai-apa-db';        // Cambia esto por tu DB real

/**
 * Manejador principal de solicitudes.
 */
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Habilitar CORS para desarrollo (ajustar en producción)
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*', // O tu dominio específico: 'https://format.aberumirai.com'
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        // Manejo de preflight CORS
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Rutas
            if (path === '/api/upload' && request.method === 'POST') {
                return await handleUpload(request, env, corsHeaders);
            }

            if (path.startsWith('/api/download/') && request.method === 'GET') {
                const fileId = path.split('/').pop();
                return await handleDownload(fileId, env, corsHeaders);
            }

            if (path === '/api/history' && request.method === 'GET') {
                return await handleHistory(env, corsHeaders);
            }

            if (path.startsWith('/api/delete/') && request.method === 'DELETE') {
                const fileId = path.split('/').pop();
                return await handleDelete(fileId, env, corsHeaders);
            }

            if (path === '/api/health' && request.method === 'GET') {
                return new Response(JSON.stringify({ status: 'ok', service: 'Mirai APA Backend' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // 404
            return new Response(JSON.stringify({ error: 'Not Found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } catch (error) {
            console.error('Worker Error:', error);
            return new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    }
};

/**
 * Maneja la subida de archivos (POST /api/upload).
 * Guarda en R2 y registra en D1.
 */
async function handleUpload(request, env, corsHeaders) {
    const formData = await request.formData();
    const file = formData.get('file');
    const metadataRaw = formData.get('metadata');

    if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        // Generar ID único para el archivo
        const fileId = crypto.randomUUID();
        const fileName = file.name;
        const fileType = file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const fileSize = file.size;
        const timestamp = new Date().toISOString();

        // Parsear metadata
        let metadata = {};
        try {
            metadata = JSON.parse(metadataRaw || '{}');
        } catch (e) {
            console.warn('Metadata parse error:', e);
        }

        // 1. Subir a R2
        await env[R2_BUCKET_NAME].put(fileId, file.stream(), {
            httpMetadata: { contentType: fileType },
            customMetadata: {
                originalName: fileName,
                uploadedAt: timestamp,
                ...metadata
            }
        });

        // 2. Registrar en D1
        // Asumimos una tabla: files (id, original_name, file_type, size, uploaded_at, user_id, metadata_json)
        const stmt = env[D1_DB_NAME].prepare(
            'INSERT INTO files (id, original_name, file_type, size, uploaded_at, user_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        
        // Nota: user_id es null por ahora (sin autenticación). Si la añades, cámbialo.
        await stmt.bind(fileId, fileName, fileType, fileSize, timestamp, null, JSON.stringify(metadata)).run();

        return new Response(JSON.stringify({
            success: true,
            fileId: fileId,
            message: 'Archivo guardado correctamente',
            downloadUrl: `/api/download/${fileId}`
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({ error: 'Upload failed', message: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Maneja la descarga de archivos (GET /api/download/:id).
 * Recupera desde R2.
 */
async function handleDownload(fileId, env, corsHeaders) {
    try {
        const object = await env[R2_BUCKET_NAME].get(fileId);

        if (!object) {
            return new Response(JSON.stringify({ error: 'File not found' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Obtener metadatos
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('Content-Disposition', `attachment; filename="${object.customMetadata.originalName || 'documento.docx'}"`);

        return new Response(object.body, {
            headers: { ...corsHeaders, ...headers }
        });

    } catch (error) {
        console.error('Download error:', error);
        return new Response(JSON.stringify({ error: 'Download failed', message: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Maneja el historial (GET /api/history).
 * Devuelve lista de archivos desde D1.
 */
async function handleHistory(env, corsHeaders) {
    try {
        // Consulta simple: obtener los últimos 10 archivos
        // Si añades autenticación, filtra por user_id
        const { results } = await env[D1_DB_NAME].prepare(
            'SELECT id, original_name, file_type, size, uploaded_at FROM files ORDER BY uploaded_at DESC LIMIT 10'
        ).all();

        return new Response(JSON.stringify({ files: results }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('History error:', error);
        return new Response(JSON.stringify({ error: 'History fetch failed', message: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Maneja la eliminación (DELETE /api/delete/:id).
 * Elimina de R2 y D1.
 */
async function handleDelete(fileId, env, corsHeaders) {
    try {
        // 1. Eliminar de R2
        await env[R2_BUCKET_NAME].delete(fileId);

        // 2. Eliminar de D1
        await env[D1_DB_NAME].prepare('DELETE FROM files WHERE id = ?').bind(fileId).run();

        return new Response(JSON.stringify({ success: true, message: 'Archivo eliminado' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete error:', error);
        return new Response(JSON.stringify({ error: 'Delete failed', message: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}