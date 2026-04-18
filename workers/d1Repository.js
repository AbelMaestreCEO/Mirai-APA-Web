/**
 * workers/d1Repository.js
 * 
 * Módulo dedicado a la gestión de la Base de Datos D1.
 * 
 * Funciones principales:
 * - saveFile: Inserta un nuevo registro de archivo.
 * - getFileById: Recupera un archivo por su ID.
 * - getUserFiles: Recupera el historial de archivos de un usuario.
 * - deleteFile: Elimina un archivo y su registro.
 * - getFileStats: Obtiene estadísticas generales.
 * 
 * Características:
 * - Uso de Prepared Statements para seguridad (evita SQL Injection).
 * - Manejo de errores consistente.
 * - Tipado mediante JSDoc para mejor autocompletado en VS Code.
 */

/**
 * @typedef {Object} FileRecord
 * @property {string} id - UUID del archivo.
 * @property {string} original_name - Nombre original del archivo.
 * @property {string} file_type - MIME type.
 * @property {number} size - Tamaño en bytes.
 * @property {string} uploaded_at - Timestamp ISO.
 * @property {string|null} user_id - ID del usuario (nullable).
 * @property {string} metadata_json - JSON string con metadatos adicionales.
 */

/**
 * Guarda un nuevo registro de archivo en D1.
 * 
 * @param {Object} env - El entorno de Cloudflare (contiene D1_DB_NAME).
 * @param {Object} fileData - Datos del archivo a guardar.
 * @returns {Promise<void>}
 */
export async function saveFile(env, fileData) {
    const {
        id,
        original_name,
        file_type,
        size,
        uploaded_at,
        user_id = null,
        metadata_json = '{}'
    } = fileData;

    const query = `
        INSERT INTO files (id, original_name, file_type, size, uploaded_at, user_id, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await env.D1_DB_NAME
            .prepare(query)
            .bind(id, original_name, file_type, size, uploaded_at, user_id, metadata_json)
            .run();
        
        console.log(`[D1 Repo]: Archivo guardado: ${id}`);
    } catch (error) {
        console.error('[D1 Repo]: Error al guardar archivo:', error);
        throw new Error(`Database save failed: ${error.message}`);
    }
}

/**
 * Recupera un archivo por su ID único.
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @param {string} fileId - El UUID del archivo.
 * @returns {Promise<FileRecord|null>} El registro encontrado o null.
 */
export async function getFileById(env, fileId) {
    const query = `
        SELECT id, original_name, file_type, size, uploaded_at, user_id, metadata_json
        FROM files
        WHERE id = ?
    `;

    try {
        const result = await env.D1_DB_NAME
            .prepare(query)
            .bind(fileId)
            .first();
        
        return result; // Retorna el objeto o null si no existe
    } catch (error) {
        console.error('[D1 Repo]: Error al obtener archivo por ID:', error);
        throw new Error(`Database get failed: ${error.message}`);
    }
}

/**
 * Recupera una lista paginada de archivos para un usuario específico.
 * Si user_id es null, retorna archivos públicos (o todos si no hay autenticación).
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @param {string|null} userId - ID del usuario (opcional).
 * @param {number} limit - Número máximo de registros.
 * @param {number} offset - Desplazamiento para paginación.
 * @returns {Promise<Array<FileRecord>>} Lista de archivos.
 */
export async function getUserFiles(env, userId = null, limit = 10, offset = 0) {
    let query;
    let bindings;

    if (userId) {
        query = `
            SELECT id, original_name, file_type, size, uploaded_at, user_id, metadata_json
            FROM files
            WHERE user_id = ?
            ORDER BY uploaded_at DESC
            LIMIT ? OFFSET ?
        `;
        bindings = [userId, limit, offset];
    } else {
        query = `
            SELECT id, original_name, file_type, size, uploaded_at, user_id, metadata_json
            FROM files
            ORDER BY uploaded_at DESC
            LIMIT ? OFFSET ?
        `;
        bindings = [limit, offset];
    }

    try {
        const { results } = await env.D1_DB_NAME
            .prepare(query)
            .bind(...bindings)
            .all();
        
        return results;
    } catch (error) {
        console.error('[D1 Repo]: Error al obtener historial:', error);
        throw new Error(`Database query failed: ${error.message}`);
    }
}

/**
 * Elimina un archivo de la base de datos por su ID.
 * Nota: Esto NO elimina el archivo de R2. Debe llamarse después de borrar de R2.
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @param {string} fileId - El UUID del archivo.
 * @returns {Promise<{changes: number}>} Resultado de la operación.
 */
export async function deleteFileRecord(env, fileId) {
    const query = `DELETE FROM files WHERE id = ?`;

    try {
        const result = await env.D1_DB_NAME
            .prepare(query)
            .bind(fileId)
            .run();
        
        console.log(`[D1 Repo]: Registro eliminado: ${fileId}, cambios: ${result.changes}`);
        return result;
    } catch (error) {
        console.error('[D1 Repo]: Error al eliminar registro:', error);
        throw new Error(`Database delete failed: ${error.message}`);
    }
}

/**
 * Obtiene estadísticas generales de la base de datos.
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @returns {Promise<{totalFiles: number, totalSize: number}>}
 */
export async function getStats(env) {
    const query = `
        SELECT COUNT(*) as totalFiles, COALESCE(SUM(size), 0) as totalSize
        FROM files
    `;

    try {
        const result = await env.D1_DB_NAME
            .prepare(query)
            .first();
        
        return {
            totalFiles: result.totalFiles || 0,
            totalSize: result.totalSize || 0
        };
    } catch (error) {
        console.error('[D1 Repo]: Error al obtener estadísticas:', error);
        throw new Error(`Database stats failed: ${error.message}`);
    }
}

/**
 * Actualiza los metadatos de un archivo existente.
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @param {string} fileId - El UUID del archivo.
 * @param {Object} newMetadata - Nuevo objeto de metadatos (será stringificado).
 * @returns {Promise<void>}
 */
export async function updateFileMetadata(env, fileId, newMetadata) {
    const query = `UPDATE files SET metadata_json = ? WHERE id = ?`;
    const metadataJson = typeof newMetadata === 'string' ? newMetadata : JSON.stringify(newMetadata);

    try {
        await env.D1_DB_NAME
            .prepare(query)
            .bind(metadataJson, fileId)
            .run();
        
        console.log(`[D1 Repo]: Metadatos actualizados para: ${fileId}`);
    } catch (error) {
        console.error('[D1 Repo]: Error al actualizar metadatos:', error);
        throw new Error(`Database update failed: ${error.message}`);
    }
}

/**
 * Verifica si la tabla 'files' existe. Si no, intenta crearla (útil para migraciones simples).
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @returns {Promise<boolean>} True si existe o se creó, False si falla.
 */
export async function ensureTableExists(env) {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            original_name TEXT NOT NULL,
            file_type TEXT,
            size INTEGER,
            uploaded_at TEXT NOT NULL,
            user_id TEXT,
            metadata_json TEXT
        )
    `;

    try {
        await env.D1_DB_NAME.prepare(createTableSQL).run();
        return true;
    } catch (error) {
        console.error('[D1 Repo]: Error al asegurar existencia de tabla:', error);
        return false;
    }
}