/**
 * workers/r2Repository.js
 * 
 * Módulo dedicado a la gestión del almacenamiento de objetos R2.
 * 
 * Funciones principales:
 * - uploadFile: Sube un archivo (stream o blob) a R2 con metadatos.
 * - getFile: Recupera un objeto de R2 por su clave (ID).
 * - deleteFile: Elimina un objeto de R2.
 * - listFiles: Lista objetos en el bucket (con paginación opcional).
 * - getFilePublicUrl: Genera una URL pública temporal (si el bucket es público).
 * 
 * Características:
 * - Manejo de streams para eficiencia en archivos grandes.
 * - Gestión de metadatos personalizados (customMetadata).
 * - Validación de existencia de objetos.
 * - Tipado mediante JSDoc.
 */

/**
 * @typedef {Object} UploadOptions
 * @property {Object} [httpMetadata] - Metadata HTTP (contentType, cacheControl, etc.).
 * @property {Object} [customMetadata] - Metadata personalizada (key-value strings).
 * @property {string} [storageClass] - Clase de almacenamiento (STANDARD, INFREQUENT_ACCESS, etc.).
 */

/**
 * Sube un archivo a R2.
 * 
 * @param {Object} env - El entorno de Cloudflare (contiene R2_BUCKET_NAME).
 * @param {string} key - La clave (ID) única del objeto (ej. UUID).
 * @param {ReadableStream|Blob|ArrayBuffer} body - El contenido del archivo.
 * @param {UploadOptions} [options] - Opciones de subida.
 * @returns {Promise<Object>} Información de la subida (etag, size, etc.).
 */
export async function uploadFile(env, key, body, options = {}) {
    const {
        httpMetadata = {},
        customMetadata = {},
        storageClass = 'STANDARD'
    } = options;

    try {
        // Asegurar que el body sea un ReadableStream si es necesario
        let stream = body;
        if (body instanceof Blob) {
            stream = body.stream();
        } else if (body instanceof ArrayBuffer) {
            stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array(body));
                    controller.close();
                }
            });
        }

        const result = await env.R2_BUCKET_NAME.put(key, stream, {
            httpMetadata: {
                contentType: httpMetadata.contentType || 'application/octet-stream',
                cacheControl: httpMetadata.cacheControl || 'no-cache',
                ...httpMetadata
            },
            customMetadata: {
                ...customMetadata
            },
            storageClass: storageClass
        });

        console.log(`[R2 Repo]: Archivo subido: ${key} (${result.size} bytes)`);
        return {
            key: result.key,
            size: result.size,
            etag: result.httpEtag,
            uploaded: result.uploaded
        };

    } catch (error) {
        console.error('[R2 Repo]: Error al subir archivo:', error);
        throw new Error(`R2 upload failed: ${error.message}`);
    }
}

/**
 * Recupera un objeto de R2 por su clave.
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @param {string} key - La clave (ID) del objeto.
 * @returns {Promise<Object|null>} El objeto R2 o null si no existe.
 */
export async function getFile(env, key) {
    try {
        const object = await env.R2_BUCKET_NAME.get(key);
        
        if (!object) {
            return null;
        }

        return {
            key: object.key,
            size: object.size,
            etag: object.httpEtag,
            uploaded: object.uploaded,
            httpMetadata: object.httpMetadata,
            customMetadata: object.customMetadata,
            body: object.body, // ReadableStream
            text: async () => await new Response(object.body).text(),
            json: async () => await new Response(object.body).json(),
            arrayBuffer: async () => await new Response(object.body).arrayBuffer()
        };

    } catch (error) {
        console.error('[R2 Repo]: Error al obtener archivo:', error);
        throw new Error(`R2 get failed: ${error.message}`);
    }
}

/**
 * Elimina un objeto de R2 por su clave.
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @param {string} key - La clave del objeto.
 * @returns {Promise<void>}
 */
export async function deleteFile(env, key) {
    try {
        await env.R2_BUCKET_NAME.delete(key);
        console.log(`[R2 Repo]: Archivo eliminado: ${key}`);
    } catch (error) {
        console.error('[R2 Repo]: Error al eliminar archivo:', error);
        throw new Error(`R2 delete failed: ${error.message}`);
    }
}

/**
 * Lista objetos en el bucket con paginación.
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @param {Object} [options] - Opciones de listado.
 * @param {string} [options.prefix] - Prefijo para filtrar (ej. 'users/123/').
 * @param {string} [options.cursor] - Cursor de paginación.
 * @param {number} [options.limit] - Número máximo de objetos (max 1000).
 * @param {boolean} [options.delimited] - Si true, agrupa por prefijos (como directorios).
 * @returns {Promise<Object>} Resultado con objetos y cursor de continuación.
 */
export async function listFiles(env, options = {}) {
    const {
        prefix = '',
        cursor = undefined,
        limit = 100,
        delimited = false
    } = options;

    try {
        const result = await env.R2_BUCKET_NAME.list({
            prefix,
            cursor,
            limit,
            delimited
        });

        return {
            objects: result.objects.map(obj => ({
                key: obj.key,
                size: obj.size,
                uploaded: obj.uploaded,
                etag: obj.httpEtag,
                httpMetadata: obj.httpMetadata,
                customMetadata: obj.customMetadata
            })),
            truncated: result.truncated,
            cursor: result.cursor,
            delimitedPrefixes: result.delimitedPrefixes // Solo si delimited=true
        };

    } catch (error) {
        console.error('[R2 Repo]: Error al listar archivos:', error);
        throw new Error(`R2 list failed: ${error.message}`);
    }
}

/**
 * Verifica si un objeto existe en R2 (HEAD request).
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @param {string} key - La clave del objeto.
 * @returns {Promise<boolean>} True si existe, False si no.
 */
export async function fileExists(env, key) {
    try {
        const object = await env.R2_BUCKET_NAME.get(key, { onlyIf: { etag: '*' } });
        return !!object;
    } catch (error) {
        // Si hay error de red u otro, asumimos que no existe o hay problema
        console.warn('[R2 Repo]: Error verificando existencia:', error);
        return false;
    }
}

/**
 * Genera una URL pública temporal para un objeto (si el bucket tiene acceso público configurado).
 * Nota: R2 no tiene URLs públicas por defecto a menos que configures un sitio web o CORS.
 * Esta función asume que el bucket está configurado para servir contenido estático.
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @param {string} key - La clave del objeto.
 * @param {string} baseUrl - La URL base del bucket (ej. https://mi-bucket.r2.dev).
 * @returns {string} URL pública.
 */
export function getPublicUrl(env, key, baseUrl) {
    // En R2, la URL pública suele ser: https://<bucket-name>.<account-id>.r2.cloudflarestorage.com/<key>
    // O si usas un dominio personalizado configurado en Cloudflare Pages/R2.
    return `${baseUrl}/${encodeURIComponent(key)}`;
}

/**
 * Copia un objeto dentro del mismo bucket o a otro bucket.
 * 
 * @param {Object} env - El entorno de Cloudflare.
 * @param {string} sourceKey - Clave de origen.
 * @param {string} destinationKey - Clave de destino.
 * @param {string} [destinationBucketName] - Nombre del bucket de destino (opcional, mismo bucket si no se pasa).
 * @returns {Promise<void>}
 */
export async function copyFile(env, sourceKey, destinationKey, destinationBucketName = null) {
    try {
        const sourceBucket = env.R2_BUCKET_NAME;
        const destBucket = destinationBucketName ? env[destinationBucketName] : sourceBucket;

        if (!destBucket) {
            throw new Error('Bucket de destino no encontrado');
        }

        // R2 no tiene una operación "copy" directa en la API de JS, 
        // hay que leer y volver a escribir (o usar la API de REST si se tiene acceso).
        // Aquí implementamos la estrategia de leer-escribir para simplicidad.
        const object = await sourceBucket.get(sourceKey);
        
        if (!object) {
            throw new Error('Archivo origen no encontrado');
        }

        await destBucket.put(destinationKey, object.body, {
            httpMetadata: object.httpMetadata,
            customMetadata: object.customMetadata
        });

        console.log(`[R2 Repo]: Archivo copiado de ${sourceKey} a ${destinationKey}`);

    } catch (error) {
        console.error('[R2 Repo]: Error al copiar archivo:', error);
        throw new Error(`R2 copy failed: ${error.message}`);
    }
}