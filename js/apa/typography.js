/**
 * js/apa/typography.js
 * 
 * Módulo dedicado a la configuración tipográfica según APA 7.
 * 
 * Normas APA 7:
 * - Fuente: Times New Roman (12pt), Arial (11pt), Calibri (11pt), Georgia (11pt), etc.
 * - Color: Negro (#000000)
 * - No se usan negritas ni cursivas en el cuerpo del texto (salvo énfasis específico).
 * 
 * Dependencias: Ninguna externa.
 */

// Configuración por defecto (Times New Roman 12pt)
const DEFAULT_FONT_FAMILY = "Times New Roman";
const DEFAULT_FONT_SIZE = 24; // En la librería 'docx', el tamaño se define en "media units" (1/2 punto). 12pt = 24.

// Alternativas permitidas por APA 7
const ALLOWED_FONTS = {
    "Times New Roman": 24, // 12pt
    "Arial": 22,           // 11pt
    "Calibri": 22,         // 11pt
    "Georgia": 22,         // 11pt
    "Lucida Sans Unicode": 20 // 10pt
};

/**
 * Obtiene la configuración de fuente predeterminada para APA 7.
 * @returns {Object} Objeto con fontFamily y fontSize.
 */
export function getDefaultTypography() {
    return {
        family: DEFAULT_FONT_FAMILY,
        size: DEFAULT_FONT_SIZE,
        color: "000000" // Negro puro
    };
}

/**
 * Aplica la tipografía estándar a un objeto de estilo o run.
 * 
 * @param {Object} runProperties - El objeto RunProperties de la librería docx.
 * @param {string} [fontFamily] - Nombre de la fuente a usar (opcional, usa default si no se pasa).
 * @param {number} [fontSize] - Tamaño en puntos (opcional, usa default si no se pasa).
 * @returns {Object} El objeto modificado.
 */
export function applyStandardTypography(runProperties, fontFamily = DEFAULT_FONT_FAMILY, fontSize = DEFAULT_FONT_SIZE) {
    if (!runProperties) {
        console.warn('[APA Typography]: No se proporcionaron propiedades de ejecución (RunProperties).');
        return null;
    }

    // Validar que la fuente sea una de las permitidas (opcional, pero recomendado)
    // Nota: En docx, a veces se necesita especificar fuentes alternativas para compatibilidad cross-platform.
    const validFont = ALLOWED_FONTS.hasOwnProperty(fontFamily) ? fontFamily : DEFAULT_FONT_FAMILY;
    const validSize = ALLOWED_FONTS[validFont] || DEFAULT_FONT_SIZE;

    // Configuración de la fuente
    // En docx, se suele usar .setFamily() y .setSize()
    if (typeof runProperties.setFamily === 'function') {
        runProperties.setFamily(validFont);
    } else {
        runProperties.family = validFont;
    }

    if (typeof runProperties.setSize === 'function') {
        runProperties.setSize(validSize);
    } else {
        runProperties.size = validSize;
    }

    // Color negro (hex sin #)
    if (typeof runProperties.setColor === 'function') {
        runProperties.setColor("000000");
    } else {
        runProperties.color = "000000";
    }

    // Resetear estilos de énfasis (negrita/cursiva) en el cuerpo base
    // APA no pide negrita/cursiva en el texto normal
    if (typeof runProperties.setBold === 'function') {
        runProperties.setBold(false);
    } else {
        runProperties.bold = false;
    }

    if (typeof runProperties.setItalic === 'function') {
        runProperties.setItalic(false);
    } else {
        runProperties.italic = false;
    }

    console.log(`[APA Typography]: Fuente aplicada: ${validFont} (${validSize / 2}pt)`);
    return runProperties;
}

/**
 * Configura una fuente específica para títulos o encabezados si se desea diferenciar.
 * APA 7 permite usar la misma fuente para todo, pero a veces se desea un peso diferente.
 * 
 * @param {Object} runProperties - Propiedades de ejecución.
 * @param {boolean} isBold - Si debe ser negrita (para títulos).
 * @returns {Object} Propiedades modificadas.
 */
export function applyHeadingTypography(runProperties, isBold = true) {
    const baseConfig = getDefaultTypography();
    
    // Aplicar base
    applyStandardTypography(runProperties, baseConfig.family, baseConfig.size);
    
    // Aplicar negrita si es título
    if (typeof runProperties.setBold === 'function') {
        runProperties.setBold(isBold);
    } else {
        runProperties.bold = isBold;
    }

    return runProperties;
}

/**
 * Verifica si una fuente es válida según APA 7.
 * @param {string} fontName - Nombre de la fuente.
 * @returns {boolean}
 */
export function isValidAPAFont(fontName) {
    return ALLOWED_FONTS.hasOwnProperty(fontName);
}

/**
 * Convierte puntos (pt) a unidades de docx (media units).
 * @param {number} points - Tamaño en puntos.
 * @returns {number} Tamaño en media units.
 */
export function pointsToDocxUnits(points) {
    return points * 2;
}

/**
 * Convierte unidades de docx a puntos.
 * @param {number} docxUnits - Tamaño en media units.
 * @returns {number} Tamaño en puntos.
 */
export function docxUnitsToPoints(docxUnits) {
    return docxUnits / 2;
}