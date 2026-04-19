/**
 * js/utils/validators.js
 * 
 * Módulo dedicado a la validación de datos de entrada.
 * 
 * Funciones principales:
 * - validateFile: Verifica que el archivo sea válido (tipo, tamaño, extensión).
 * - validateFileName: Comprueba que el nombre del archivo sea seguro.
 * - validateFileSize: Asegura que el archivo no exceda el límite.
 * - validateAPAContent: Verificaciones básicas de formato APA en el texto.
 * - sanitizeText: Limpia texto de caracteres problemáticos.
 * 
 * Objetivo: Prevenir errores antes del procesamiento y proporcionar mensajes claros al usuario.
 */

// =========================================
// CONSTANTES DE CONFIGURACIÓN
// =========================================

const VALIDATION_CONFIG = {
    MAX_FILE_SIZE_MB: 25, // 25 MB máximo (ajustable según límites de Cloudflare Workers)
    MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024,
    ALLOWED_EXTENSIONS: ['.docx'],
    MIN_FILE_SIZE_BYTES: 1024, // 1 KB mínimo (evitar archivos vacíos)
    MAX_FILENAME_LENGTH: 200,
    FORBIDDEN_CHARS: /[<>:"/\\|?*]/g,
    APA_REQUIRED_FIELDS: ['title', 'author', 'affiliation']
};

// =========================================
// VALIDACIÓN DE ARCHIVOS
// =========================================

/**
 * Valida un archivo completo (tipo, tamaño, extensión, nombre).
 * 
 * @param {File} file - El archivo a validar.
 * @returns {Object} { valid: boolean, errors: Array<string>, warnings: Array<string> }
 */
export function validateFile(file) {
    const result = {
        valid: true,
        errors: [],
        warnings: []
    };

    if (!file) {
        result.valid = false;
        result.errors.push('No se ha seleccionado ningún archivo.');
        return result;
    }

    // Validar extensión
    const extensionCheck = validateFileExtension(file.name);
    if (!extensionCheck.valid) {
        result.valid = false;
        result.errors.push(...extensionCheck.errors);
    }

    // Validar tamaño
    const sizeCheck = validateFileSize(file.size);
    if (!sizeCheck.valid) {
        result.valid = false;
        result.errors.push(...sizeCheck.errors);
    }

    // Validar nombre
    const nameCheck = validateFileName(file.name);
    if (!nameCheck.valid) {
        result.valid = false;
        result.errors.push(...nameCheck.errors);
    }

    // Advertencias (no bloquean, pero informan)
    if (file.size > VALIDATION_CONFIG.MAX_FILE_SIZE_BYTES * 0.8) {
        result.warnings.push('El archivo es muy grande. Podría fallar el procesamiento.');
    }

    if (file.name.length > 100) {
        result.warnings.push('El nombre del archivo es muy largo. Se podría recortar.');
    }

    return result;
}

/**
 * Valida la extensión del archivo.
 * 
 * @param {string} fileName - Nombre del archivo.
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateFileExtension(fileName) {
    const result = {
        valid: true,
        errors: []
    };

    if (!fileName) {
        result.valid = false;
        result.errors.push('El nombre del archivo está vacío.');
        return result;
    }

    const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    
    if (!VALIDATION_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
        result.valid = false;
        result.errors.push(
            `Formato no soportado: ${extension}. ` +
            `Solo se permiten archivos: ${VALIDATION_CONFIG.ALLOWED_EXTENSIONS.join(', ')}.`
        );
    }

    return result;
}

/**
 * Valida el tamaño del archivo.
 * 
 * @param {number} fileSize - Tamaño en bytes.
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateFileSize(fileSize) {
    const result = {
        valid: true,
        errors: []
    };

    if (fileSize === undefined || fileSize === null) {
        result.valid = false;
        result.errors.push('No se pudo determinar el tamaño del archivo.');
        return result;
    }

    if (fileSize < VALIDATION_CONFIG.MIN_FILE_SIZE_BYTES) {
        result.valid = false;
        result.errors.push('El archivo es demasiado pequeño (posiblemente vacío).');
    }

    if (fileSize > VALIDATION_CONFIG.MAX_FILE_SIZE_BYTES) {
        result.valid = false;
        result.errors.push(
            `El archivo excede el tamaño máximo permitido (${VALIDATION_CONFIG.MAX_FILE_SIZE_MB} MB).`
        );
    }

    return result;
}

/**
 * Valida el nombre del archivo (caracteres seguros, longitud).
 * 
 * @param {string} fileName - Nombre del archivo.
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateFileName(fileName) {
    const result = {
        valid: true,
        errors: []
    };

    if (!fileName) {
        result.valid = false;
        result.errors.push('El nombre del archivo está vacío.');
        return result;
    }

    // Longitud máxima
    if (fileName.length > VALIDATION_CONFIG.MAX_FILENAME_LENGTH) {
        result.valid = false;
        result.errors.push(
            `El nombre del archivo es demasiado largo (${fileName.length} caracteres). ` +
            `Máximo permitido: ${VALIDATION_CONFIG.MAX_FILENAME_LENGTH}.`
        );
    }

    // Caracteres prohibidos (pueden causar problemas en sistemas de archivos)
    const forbiddenMatch = fileName.match(VALIDATION_CONFIG.FORBIDDEN_CHARS);
    if (forbiddenMatch) {
        result.warnings = result.warnings || [];
        result.warnings.push(
            `El nombre contiene caracteres especiales: ${forbiddenMatch.join(', ')}. ` +
            `Podrían causar problemas en algunos sistemas.`
        );
    }

    // Extensión obligatoria
    if (!fileName.includes('.')) {
        result.valid = false;
        result.errors.push('El archivo no tiene extensión.');
    }

    return result;
}

/**
 * Valida que el archivo sea realmente un DOCX (magic number check).
 * Los DOCX son ZIP, así que los primeros bytes deberían ser "PK".
 * 
 * @param {File} file - El archivo.
 * @returns {Promise<Object>} { valid: boolean, errors: Array<string> }
 */
export async function validateDocxMagicNumber(file) {
    const result = {
        valid: true,
        errors: []
    };

    try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer.slice(0, 4));
        
        // Magic number de ZIP/DOCX: 0x50 0x4B 0x03 0x04 ("PK")
        const isZip = 
            uint8Array[0] === 0x50 && 
            uint8Array[1] === 0x4B;

        if (!isZip) {
            result.valid = false;
            result.errors.push(
                'El archivo no parece ser un documento DOCX válido. ' +
                'Podría estar corrupto o ser de otro formato.'
            );
        }
    } catch (error) {
        result.valid = false;
        result.errors.push('No se pudo verificar la integridad del archivo.');
    }

    return result;
}

// =========================================
// VALIDACIÓN DE METADATOS
// =========================================

/**
 * Valida los metadatos del documento (título, autor, etc.).
 * 
 * @param {Object} metadata - Objeto con metadatos.
 * @returns {Object} { valid: boolean, errors: Array<string>, warnings: Array<string> }
 */
export function validateMetadata(metadata) {
    const result = {
        valid: true,
        errors: [],
        warnings: []
    };

    if (!metadata) {
        result.warnings.push('No se proporcionaron metadatos. Se usarán valores por defecto.');
        return result;
    }

    // Validar campos requeridos
    VALIDATION_CONFIG.APA_REQUIRED_FIELDS.forEach(field => {
        if (!metadata[field] || metadata[field].trim() === '') {
            result.warnings.push(
                `Campo "${field}" está vacío. Se recomienda proporcionarlo para la portada.`
            );
        }
    });

    // Validar longitud de campos
    if (metadata.title && metadata.title.length > 100) {
        result.warnings.push('El título es muy largo. Se recomienda acortarlo para la portada.');
    }

    // Validar fecha
    if (metadata.date) {
        const dateCheck = validateDate(metadata.date);
        if (!dateCheck.valid) {
            result.errors.push(...dateCheck.errors);
        }
    }

    return result;
}

/**
 * Valida una fecha (debe ser válida y no futura).
 * 
 * @param {string|Date} date - La fecha a validar.
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateDate(date) {
    const result = {
        valid: true,
        errors: []
    };

    if (!date) {
        result.valid = false;
        result.errors.push('La fecha no puede estar vacía.');
        return result;
    }

    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        result.valid = false;
        result.errors.push('La fecha proporcionada no es válida.');
        return result;
    }

    // Advertencia si es futura (podría ser un error)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateObj > today) {
        result.warnings = result.warnings || [];
        result.warnings.push('La fecha es futura. ¿Es correcto?');
    }

    return result;
}

// =========================================
// VALIDACIÓN DE CONTENIDO APA
// =========================================

/**
 * Realiza verificaciones básicas de formato APA en el texto.
 * (Esto es limitado sin NLP, pero puede detectar problemas obvios).
 * 
 * @param {string} text - El texto a validar.
 * @returns {Object} { issues: Array<string>, suggestions: Array<string> }
 */
export function validateAPAContent(text) {
    const result = {
        issues: [],
        suggestions: []
    };

    if (!text) return result;

    // Detectar posibles citas sin formato
    const citationPattern = /\([A-Z][a-z]+\s+(?:et al\.)?\d{4}\)/g;
    const matches = text.match(citationPattern);
    
    if (matches) {
        result.suggestions.push(
            `Se detectaron ${matches.length} citas que podrían necesitar revisión de formato. ` +
            `Asegúrate de que tengan la coma correcta: (Autor, Año).`
        );
    }

    // Detectar posibles referencias mal formateadas
    const refPattern = /^[A-Z][a-z]+,\s+[A-Z]\.\s+\(\d{4}\)/gm;
    const refMatches = text.match(refPattern);
    
    if (refMatches && refMatches.length > 5) {
        result.suggestions.push(
            `Se detectaron ${refMatches.length} posibles referencias. ` +
            `Verifica que tengan sangría francesa y orden alfabético.`
        );
    }

    // Detectar texto justificado (APA prefiere alineación izquierda)
    // Esto es difícil de detectar en texto plano, pero podemos advertir si hay muchos espacios
    const excessiveSpaces = (text.match(/\s{5,}/g) || []).length;
    if (excessiveSpaces > 10) {
        result.suggestions.push(
            'Se detectó mucho espacio en blanco. Considera usar tabulaciones o tablas en lugar de espacios.'
        );
    }

    return result;
}

// =========================================
// SANITIZACIÓN DE TEXTO
// =========================================

/**
 * Limpia texto de caracteres problemáticos para DOCX.
 * 
 * @param {string} text - Texto a limpiar.
 * @returns {string} Texto sanitizado.
 */
export function sanitizeText(text) {
    if (!text) return '';

    let sanitized = text;

    // Eliminar caracteres nulos
    sanitized = sanitized.replace(/\0/g, '');

    // Normalizar saltos de línea
    sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Eliminar espacios múltiples consecutivos (opcional, depende de preferencia)
    // sanitized = sanitized.replace(/  +/g, ' ');

    // Recortar extremos
    sanitized = sanitized.trim();

    return sanitized;
}

/**
 * Escapa caracteres HTML especiales si se va a insertar en HTML.
 * 
 * @param {string} text - Texto a escapar.
 * @returns {string} Texto escapado.
 */
export function escapeHtml(text) {
    if (!text) return '';

    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, m => map[m]);
}

// =========================================
// UTILIDADES DE FORMATO
// =========================================

/**
 * Formatea bytes a una cadena legible (KB, MB, GB).
 * 
 * @param {number} bytes - Tamaño en bytes.
 * @returns {string} Tamaño formateado.
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Genera un nombre de archivo seguro para descarga.
 * 
 * @param {string} originalName - Nombre original.
 * @param {string} suffix - Suffix a añadir (ej. '_APA').
 * @returns {string} Nuevo nombre seguro.
 */
export function generateSafeFileName(originalName, suffix = '_APA') {
    if (!originalName) return `documento${suffix}.docx`;

    // Extraer nombre y extensión
    const lastDotIndex = originalName.lastIndexOf('.');
    const name = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
    const ext = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '.docx';

    // Limpiar nombre
    const cleanName = name.replace(VALIDATION_CONFIG.FORBIDDEN_CHARS, '_');

    // Añadir suffix y limitar longitud
    const newName = `${cleanName}${suffix}`.substring(0, VALIDATION_CONFIG.MAX_FILENAME_LENGTH - ext.length);

    return `${newName}${ext}`;
}

/**
 * Valida un email (si se necesita para contacto).
 * 
 * @param {string} email - Email a validar.
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateEmail(email) {
    const result = {
        valid: true,
        errors: []
    };

    if (!email) {
        result.valid = false;
        result.errors.push('El email no puede estar vacío.');
        return result;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        result.valid = false;
        result.errors.push('El formato del email no es válido.');
    }

    return result;
}