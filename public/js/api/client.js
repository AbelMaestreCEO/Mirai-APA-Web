/**
 * js/api/client.js
 * 
 * Módulo dedicado a la comunicación con el Backend (Cloudflare Workers).
 * 
 * Funciones principales:
 * - uploadFile: Sube el archivo procesado a R2 y registra metadatos en D1.
 * - getHistory: Recupera el historial de conversiones del usuario (si hay autenticación).
 * - downloadFile: Recupera un archivo previamente guardado desde R2.
 * 
 * Configuración:
 * - BASE_URL: La URL de tu Cloudflare Worker (ej. https://api.aberumirai.com).
 * 
 * Seguridad:
 * - Las claves de acceso a R2/D1 NUNCA deben estar en este archivo.
 * - El Worker valida las solicitudes y maneja la autenticación interna.
 */

// Configuración de la API
// En producción, esto debería venir de una variable de entorno o un archivo de config seguro
const API_BASE_URL = 'https://api.aberumirai.com'; // Ajusta esto a tu dominio de Worker

/**
 * Configuración común para las peticiones fetch.
 * Incluye headers para JSON y manejo de errores.
 */
const defaultHeaders = {
    'Content-Type': 'application/json',
    // 'Authorization': `Bearer ${getToken()}` // Si implementas autenticación futura
};

/**
 * Sube un archivo procesado a R2 y guarda los metadatos en D1.
 * 
 * @param {Blob} fileBlob - El Blob del archivo DOCX generado.
 * @param {string} fileName - El nombre original del archivo.
 * @param {Object} metadata - Metadatos adicionales (usuario, fecha, estadísticas).
 * @returns {Promise<Object>} Respuesta del servidor con la URL de descarga o ID.
 */
export async function uploadFile(fileBlob, fileName, metadata = {}) {
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('metadata', JSON.stringify({
        ...metadata,
        timestamp: new Date().toISOString(),
        fileSize: fileBlob.size
    }));

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            headers: {
                // No ponemos Content-Type aquí porque FormData lo setea automáticamente con boundary
                // 'Authorization': `Bearer ${getToken()}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
            throw new Error(errorData.message || `Error al subir: ${response.status}`);
        }

        const data = await response.json();
        console.log('[API Client]: Archivo subido correctamente.', data);
        return data;

    } catch (error) {
        console.error('[API Client]: Error en uploadFile:', error);
        throw error;
    }
}

/**
 * Recupera el historial de archivos guardados por el usuario.
 * 
 * @param {string} userId - ID del usuario (si hay autenticación).
 * @returns {Promise<Array>} Lista de archivos.
 */
export async function getHistory(userId = null) {
    const url = userId 
        ? `${API_BASE_URL}/api/history?userId=${encodeURIComponent(userId)}`
        : `${API_BASE_URL}/api/history`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: defaultHeaders
        });

        if (!response.ok) {
            throw new Error(`Error al obtener historial: ${response.status}`);
        }

        const data = await response.json();
        return data.files || [];

    } catch (error) {
        console.error('[API Client]: Error en getHistory:', error);
        return []; // Retornar array vacío en lugar de romper la app
    }
}

/**
 * Descarga un archivo específico desde R2.
 * 
 * @param {string} fileId - El ID único del archivo en R2/D1.
 * @returns {Promise<Blob>} El Blob del archivo.
 */
export async function downloadFile(fileId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/download/${encodeURIComponent(fileId)}`, {
            method: 'GET',
            headers: defaultHeaders
        });

        if (!response.ok) {
            throw new Error(`Error al descargar: ${response.status}`);
        }

        const blob = await response.blob();
        return blob;

    } catch (error) {
        console.error('[API Client]: Error en downloadFile:', error);
        throw error;
    }
}

/**
 * Elimina un archivo de R2 y su registro en D1.
 * 
 * @param {string} fileId - El ID del archivo.
 * @returns {Promise<boolean>} True si se eliminó correctamente.
 */
export async function deleteFile(fileId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/delete/${encodeURIComponent(fileId)}`, {
            method: 'DELETE',
            headers: defaultHeaders
        });

        if (!response.ok) {
            throw new Error(`Error al eliminar: ${response.status}`);
        }

        return true;

    } catch (error) {
        console.error('[API Client]: Error en deleteFile:', error);
        return false;
    }
}

/**
 * Verifica la salud del servicio (Health Check).
 * Útil para saber si el Worker está activo.
 * 
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            headers: defaultHeaders
        });
        return response.ok;
    } catch (error) {
        console.warn('[API Client]: Servicio no disponible.', error);
        return false;
    }
}

/**
 * Helper para manejar errores de red de forma genérica.
 * @param {Error} error
 * @returns {string} Mensaje amigable.
 */
export function getFriendlyErrorMessage(error) {
    if (error.message.includes('Failed to fetch')) {
        return 'No se pudo conectar con el servidor. Verifica tu internet.';
    }
    if (error.message.includes('401')) {
        return 'Sesión expirada. Por favor inicia sesión nuevamente.';
    }
    if (error.message.includes('413')) {
        return 'El archivo es demasiado grande.';
    }
    return error.message || 'Ocurrió un error inesperado.';
}