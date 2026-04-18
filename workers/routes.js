/**
 * workers/routes.js
 * 
 * Módulo dedicado a la definición de rutas y sus handlers.
 * 
 * Estructura:
 * - Cada función maneja una ruta específica (upload, download, history, delete, health).
 * - Todas las funciones reciben (env, request, params) y devuelven Response.
 * - El index.js principal importa y delega a estas funciones.
 * 
 * Beneficios:
 * - Separación de responsabilidades.
 * - Código más limpio y legible.
 * - Fácil de testear unitariamente.
 * - Escalable para añadir nuevas rutas.
 */

// =========================================
// HELPERS COMUNES
// =========================================

/**
 * Genera headers CORS estándar.
 * @param {string} origin - Origen permitido (opcional).
 * @returns {Object} Headers object.
 */
export function getCorsHeaders(origin = '*') {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // 24 horas
    };
}

/**
 * Crea una respuesta JSON con headers CORS.
 * @param {Object} data - Datos a enviar.
 * @param {number} status - Código de estado HTTP.
 * @param {Object} corsHeaders - Headers CORS.
 * @returns {Response}
 */
export function jsonResponse(data, status = 200, corsHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

/**
 * Extrae el ID de una URL path (ej: /api/download/abc-123 -> abc-123).
 * @param {string} path - Path completo.
 * @returns {string|null}
 */
export function extractIdFromPath(path) {
    const parts = path.split('/');
    return parts[parts.length - 1] || null;
}

// =========================================
// HANDLERS DE RUTAS
// =========================================

/**
 * GET /api/health
 * Health check para monitoreo y load balancers.
 */
export async function handleHealth(env, request, corsHeaders) {
    return jsonResponse({
        status: 'ok',
        service: 'Mirai APA Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: env.ENVIRONMENT || 'development'
    }, 200, corsHeaders);
}

/**
 * POST /api/upload
 * Recibe archivo DOCX, lo guarda en R2 y registra en D1.
 */
export async function handleUpload(env, request, corsHeaders) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const metadataRaw = formData.get('metadata');

        if (!file) {
            return jsonResponse({ error: 'No file provided' }, 400, corsHeaders);
        }

        // Validar tipo de archivo
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip' // DOCX es técnicamente un ZIP
        ];
        
        if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.docx')) {
            return jsonResponse({ error: 'Invalid file type. Only .DOCX allowed.' }, 400, corsHeaders);
        }

        // Validar tamaño (máximo 25MB)
        const MAX_SIZE = 25 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return jsonResponse({ error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB.` }, 413, corsHeaders);
        }

        // Generar ID único
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
        await env.R2_BUCKET_NAME.put(fileId, file.stream(), {
            httpMetadata: { contentType: fileType },
            customMetadata: {
                originalName: fileName,
                uploadedAt: timestamp,
                ...metadata
            }
        });

        // 2. Registrar en D1
        const stmt = env.D1_DB_NAME.prepare(
            'INSERT INTO files (id, original_name, file_type, size, uploaded_at, user_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        
        await stmt.bind(fileId, fileName, fileType, fileSize, timestamp, metadata.userId || null, JSON.stringify(metadata)).run();

        return jsonResponse({
            success: true,
            fileId: fileId,
            message: 'Archivo guardado correctamente',
            downloadUrl: `/api/download/${fileId}`,
            fileName: fileName
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Upload error:', error);
        return jsonResponse({ error: 'Upload failed', message: error.message }, 500, corsHeaders);
    }
}

/**
 * GET /api/download/:id
 * Recupera archivo desde R2.
 */
export async function handleDownload(env, request, corsHeaders, fileId) {
    try {
        if (!fileId) {
            return jsonResponse({ error: 'File ID required' }, 400, corsHeaders);
        }

        const object = await env.R2_BUCKET_NAME.get(fileId);

        if (!object) {
            return jsonResponse({ error: 'File not found' }, 404, corsHeaders);
        }

        // Construir headers de respuesta
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('Content-Disposition', `attachment; filename="${object.customMetadata?.originalName || 'documento.docx'}"`);
        headers.set('Cache-Control', 'no-cache'); // Evitar caché para archivos dinámicos

        return new Response(object.body, {
            headers: { ...corsHeaders, ...headers }
        });

    } catch (error) {
        console.error('Download error:', error);
        return jsonResponse({ error: 'Download failed', message: error.message }, 500, corsHeaders);
    }
}

/**
 * GET /api/history
 * Lista archivos del usuario (o todos si no hay autenticación).
 */
export async function handleHistory(env, request, corsHeaders) {
    try {
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        // Query condicional según userId
        let query, bindings;
        if (userId) {
            query = 'SELECT id, original_name, file_type, size, uploaded_at FROM files WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT ? OFFSET ?';
            bindings = [userId, limit, offset];
        } else {
            query = 'SELECT id, original_name, file_type, size, uploaded_at FROM files ORDER BY uploaded_at DESC LIMIT ? OFFSET ?';
            bindings = [limit, offset];
        }

        const { results } = await env.D1_DB_NAME.prepare(query).bind(...bindings).all();

        // Formatear respuesta
        const files = results.map(row => ({
            id: row.id,
            fileName: row.original_name,
            fileType: row.file_type,
            size: row.size,
            uploadedAt: row.uploaded_at,
            downloadUrl: `/api/download/${row.id}`
        }));

        return jsonResponse({
            files,
            pagination: {
                limit,
                offset,
                total: results.length // En producción, harías COUNT(*) para el total real
            }
        }, 200, corsHeaders);

    } catch (error) {
        console.error('History error:', error);
        return jsonResponse({ error: 'History fetch failed', message: error.message }, 500, corsHeaders);
    }
}

/**
 * DELETE /api/delete/:id
 * Elimina archivo de R2 y D1.
 */
export async function handleDelete(env, request, corsHeaders, fileId) {
    try {
        if (!fileId) {
            return jsonResponse({ error: 'File ID required' }, 400, corsHeaders);
        }

        // 1. Eliminar de R2
        await env.R2_BUCKET_NAME.delete(fileId);

        // 2. Eliminar de D1
        const result = await env.D1_DB_NAME.prepare('DELETE FROM files WHERE id = ?').bind(fileId).run();

        if (result.changes === 0) {
            console.warn('Delete attempted but no record found in D1:', fileId);
        }

        return jsonResponse({ success: true, message: 'Archivo eliminado correctamente' }, 200, corsHeaders);

    } catch (error) {
        console.error('Delete error:', error);
        return jsonResponse({ error: 'Delete failed', message: error.message }, 500, corsHeaders);
    }
}

/**
 * GET /api/stats
 * Estadísticas generales del servicio (opcional, para admin).
 */
export async function handleStats(env, request, corsHeaders) {
    try {
        // Contar total de archivos
        const { results: totalResult } = await env.D1_DB_NAME.prepare('SELECT COUNT(*) as count FROM files').all();
        const totalFiles = totalResult[0]?.count || 0;

        // Calcular tamaño total en R2 (esto requiere listar objetos, puede ser costoso)
        // Para simplificar, solo retornamos el conteo de D1
        
        return jsonResponse({
            stats: {
                totalFiles,
                timestamp: new Date().toISOString()
            }
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Stats error:', error);
        return jsonResponse({ error: 'Stats fetch failed', message: error.message }, 500, corsHeaders);
    }
}

// =========================================
// EXPORTACIÓN DE RUTAS
// =========================================

/**
 * Mapa de rutas para fácil acceso desde index.js.
 * Las keys son los paths, los values son las funciones handler.
 */
export const ROUTES = {
    '/api/health': {
        methods: ['GET'],
        handler: handleHealth
    },
    '/api/upload': {
        methods: ['POST'],
        handler: handleUpload
    },
    '/api/download/:id': {
        methods: ['GET'],
        handler: handleDownload,
        hasParam: true
    },
    '/api/history': {
        methods: ['GET'],
        handler: handleHistory
    },
    '/api/delete/:id': {
        methods: ['DELETE'],
        handler: handleDelete,
        hasParam: true
    },
    '/api/stats': {
        methods: ['GET'],
        handler: handleStats
    }
};

/**
 * Obtiene el handler para una ruta específica.
 * @param {string} path - Path de la solicitud.
 * @param {string} method - Método HTTP.
 * @returns {{handler: Function, params: Object}|null}
 */
export function getRouteHandler(path, method) {
    for (const [routePath, routeConfig] of Object.entries(ROUTES)) {
        if (!routeConfig.methods.includes(method)) continue;

        // Verificar si es ruta con parámetro
        if (routeConfig.hasParam) {
            const pattern = routePath.replace('/:id', '([^/]+)');
            const regex = new RegExp(`^${pattern}$`);
            const match = path.match(regex);
            
            if (match) {
                return {
                    handler: routeConfig.handler,
                    params: { fileId: match[1] }
                };
            }
        } else {
            if (path === routePath) {
                return { handler: routeConfig.handler, params: {} };
            }
        }
    }

    return null;
}