/**
 * js/apa/margins.js
 * 
 * Módulo dedicado a la configuración de márgenes de página según APA 7.
 * Norma: 2.54 cm (1 pulgada) en todos los lados (Superior, Inferior, Izquierdo, Derecho).
 * 
 * Dependencias: Ninguna externa (usa tipos nativos de la librería docx si se importa globalmente).
 */

// Constantes de conversión (Emus: English Metric Units, unidad interna de Office Open XML)
// 1 pulgada = 914400 EMUs
const MARGIN_1_INCH_EMU = 914400;

/**
 * Aplica los márgenes estándar de APA 7 a una sección del documento.
 * 
 * @param {Object} sectionProperties - El objeto SectionProperties de la librería docx.
 * @returns {Object} - El objeto SectionProperties modificado con los nuevos márgenes.
 * 
 * Nota: Si estás usando la librería 'docx' directamente, esta función se usaría
 * dentro de la configuración de la sección:
 * new docx.Section({
 *   properties: applyAPAMargins(new docx.SectionProperties())
 * })
 */
export function applyAPAMargins(sectionProperties) {
    if (!sectionProperties) {
        console.warn('[APA Margins]: No se proporcionaron propiedades de sección.');
        return null;
    }

    // En la librería 'docx', los márgenes se definen en la propiedad 'margins'
    // dentro de las propiedades de la sección.
    // Si el objeto ya tiene una estructura de propiedades, accedemos a ella.
    
    // Creamos o sobrescribimos la configuración de márgenes
    const marginsConfig = {
        top: MARGIN_1_INCH_EMU,    // 2.54 cm
        right: MARGIN_1_INCH_EMU,  // 2.54 cm
        bottom: MARGIN_1_INCH_EMU, // 2.54 cm
        left: MARGIN_1_INCH_EMU,   // 2.54 cm
        header: 0,                 // Se ajustará en el módulo headers.js si es necesario
        footer: 0                  // Se ajustará en el módulo headers.js si es necesario
    };

    // Asignamos los márgenes al objeto de propiedades de la sección
    // Nota: La estructura exacta depende de cómo estés construyendo el documento.
    // Si usas docx.SectionProperties(), normalmente se hace así:
    if (typeof sectionProperties.setMargins === 'function') {
        sectionProperties.setMargins(marginsConfig);
    } else {
        // Fallback: asignación directa si la estructura es un objeto plano
        sectionProperties.margins = marginsConfig;
    }

    console.log('[APA Margins]: Márgenes aplicados correctamente (2.54cm en todos los lados).');
    return sectionProperties;
}

/**
 * Función auxiliar para obtener los valores de margen en centímetros (útil para validación).
 * @returns {Object} Valores en cm.
 */
export function getAPAMarginsCM() {
    return {
        top: 2.54,
        right: 2.54,
        bottom: 2.54,
        left: 2.54
    };
}

/**
 * Valida si un objeto de márgenes cumple con APA 7.
 * @param {Object} margins - Objeto con top, right, bottom, left en EMUs.
 * @returns {boolean} True si cumple, False si no.
 */
export function validateAPAMargins(margins) {
    if (!margins) return false;
    
    const tolerance = 1000; // Tolerancia pequeña por errores de redondeo en EMUs
    
    const isCorrect = 
        Math.abs(margins.top - MARGIN_1_INCH_EMU) <= tolerance &&
        Math.abs(margins.right - MARGIN_1_INCH_EMU) <= tolerance &&
        Math.abs(margins.bottom - MARGIN_1_INCH_EMU) <= tolerance &&
        Math.abs(margins.left - MARGIN_1_INCH_EMU) <= tolerance;

    if (!isCorrect) {
        console.warn('[APA Margins]: Los márgenes actuales no cumplen con APA 7.', margins);
    }

    return isCorrect;
}