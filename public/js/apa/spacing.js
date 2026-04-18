/**
 * js/apa/spacing.js
 *
 * Módulo dedicado al interlineado, sangrías y espaciado de párrafos según APA 7.
 *
 * Normas APA 7:
 * - Interlineado: Doble (2.0) en todo el documento
 * - Sangría de primera línea: 1.27 cm (0.5 pulgadas)
 * - Sin espaciado adicional entre párrafos (0pt antes y después)
 * - Sangría francesa (hanging indent) en referencias: 1.27 cm
 * - Citas en bloque: sangría 1.27 cm desde el margen izquierdo
 * - Resumen (abstract): sin sangría de primera línea
 *
 * Unidades internas OOXML:
 * - Twips: 1 pulgada = 1440 twips | 1 cm ≈ 567 twips
 * - Interlineado (lineRule AUTO): 240 = simple | 360 = 1.5 | 480 = doble
 */

// =========================================
// CONSTANTES DE CONVERSIÓN
// =========================================

const INCH_TO_TWIPS = 1440;
const CM_TO_TWIPS = 567;

// =========================================
// VALORES APA 7 EN TWIPS
// =========================================

const APA_SPACING = {
    LINE_DOUBLE: 480,           // Interlineado doble (240 * 2)
    LINE_SINGLE: 240,           // Interlineado simple
    PARAGRAPH_BEFORE: 0,        // Sin espacio antes del párrafo
    PARAGRAPH_AFTER: 0,         // Sin espacio después del párrafo
    FIRST_LINE_INDENT: 720,     // Sangría primera línea: 0.5" = 720 twips
    HANGING_INDENT: 720,        // Sangría francesa (referencias): 0.5" = 720 twips
    BLOCK_QUOTE_INDENT: 720,    // Cita en bloque: 0.5" desde margen izquierdo
};

// =========================================
// INTERLINEADO
// =========================================

/**
 * Aplica interlineado doble (2.0) a las propiedades de espaciado de un párrafo.
 *
 * @param {Object} spacingProperties - Objeto de espaciado del párrafo.
 * @returns {Object} Propiedades modificadas con interlineado doble.
 */
export function applyDoubleLineSpacing(spacingProperties) {
    if (!spacingProperties) {
        console.warn('[APA Spacing]: No se proporcionaron propiedades de espaciado.');
        return null;
    }

    if (typeof spacingProperties.setLine === 'function') {
        spacingProperties.setLine(APA_SPACING.LINE_DOUBLE);
    } else {
        spacingProperties.line = APA_SPACING.LINE_DOUBLE;
    }

    // Asegurar que el lineRule sea AUTO (proporcional)
    if (typeof spacingProperties.setLineRule === 'function') {
        spacingProperties.setLineRule('auto');
    } else {
        spacingProperties.lineRule = 'auto';
    }

    return spacingProperties;
}

/**
 * Aplica interlineado simple (1.0) — útil para tablas, pies de figura, etc.
 *
 * @param {Object} spacingProperties - Objeto de espaciado del párrafo.
 * @returns {Object} Propiedades modificadas con interlineado simple.
 */
export function applySingleLineSpacing(spacingProperties) {
    if (!spacingProperties) return null;

    if (typeof spacingProperties.setLine === 'function') {
        spacingProperties.setLine(APA_SPACING.LINE_SINGLE);
    } else {
        spacingProperties.line = APA_SPACING.LINE_SINGLE;
    }

    if (typeof spacingProperties.setLineRule === 'function') {
        spacingProperties.setLineRule('auto');
    } else {
        spacingProperties.lineRule = 'auto';
    }

    return spacingProperties;
}

// =========================================
// ESPACIADO ENTRE PÁRRAFOS
// =========================================

/**
 * Elimina el espaciado adicional entre párrafos según APA 7.
 * APA exige 0pt antes y 0pt después de cada párrafo.
 *
 * @param {Object} spacingProperties - Objeto de espaciado del párrafo.
 * @returns {Object} Propiedades modificadas sin espaciado extra.
 */
export function removeParagraphSpacing(spacingProperties) {
    if (!spacingProperties) {
        console.warn('[APA Spacing]: No se proporcionaron propiedades de espaciado.');
        return null;
    }

    // Espacio antes del párrafo (0pt)
    if (typeof spacingProperties.setBefore === 'function') {
        spacingProperties.setBefore(APA_SPACING.PARAGRAPH_BEFORE);
    } else {
        spacingProperties.before = APA_SPACING.PARAGRAPH_BEFORE;
    }

    // Espacio después del párrafo (0pt)
    if (typeof spacingProperties.setAfter === 'function') {
        spacingProperties.setAfter(APA_SPACING.PARAGRAPH_AFTER);
    } else {
        spacingProperties.after = APA_SPACING.PARAGRAPH_AFTER;
    }

    return spacingProperties;
}

// =========================================
// SANGRÍAS
// =========================================

/**
 * Aplica sangría de primera línea (0.5 pulgadas / 1.27 cm) a un párrafo.
 * Esta es la sangría estándar para párrafos del cuerpo del texto.
 *
 * @param {Object} indentProperties - Objeto de sangría del párrafo.
 * @returns {Object} Propiedades modificadas con sangría de primera línea.
 */
export function applyFirstLineIndent(indentProperties) {
    if (!indentProperties) {
        console.warn('[APA Spacing]: No se proporcionaron propiedades de sangría.');
        return null;
    }

    if (typeof indentProperties.setFirstLine === 'function') {
        indentProperties.setFirstLine(APA_SPACING.FIRST_LINE_INDENT);
    } else {
        indentProperties.firstLine = APA_SPACING.FIRST_LINE_INDENT;
    }

    return indentProperties;
}

/**
 * Aplica sangría francesa (hanging indent) para la lista de referencias.
 * La primera línea empieza al margen y las líneas siguientes se sangran 0.5".
 *
 * @param {Object} indentProperties - Objeto de sangría del párrafo.
 * @returns {Object} Propiedades modificadas con sangría francesa.
 */
export function applyHangingIndent(indentProperties) {
    if (!indentProperties) {
        console.warn('[APA Spacing]: No se proporcionaron propiedades de sangría.');
        return null;
    }

    // Sangría francesa: hanging = valor positivo en twips
    if (typeof indentProperties.setHanging === 'function') {
        indentProperties.setHanging(APA_SPACING.HANGING_INDENT);
    } else {
        indentProperties.hanging = APA_SPACING.HANGING_INDENT;
    }

    // Asegurar que no haya firstLine cuando hay hanging
    if (typeof indentProperties.setFirstLine === 'function') {
        indentProperties.setFirstLine(0);
    } else {
        indentProperties.firstLine = 0;
    }

    return indentProperties;
}

/**
 * Aplica sangría de cita en bloque (0.5" desde el margen izquierdo).
 * Las citas en bloque no llevan sangría de primera línea.
 *
 * @param {Object} indentProperties - Objeto de sangría del párrafo.
 * @returns {Object} Propiedades modificadas con sangría izquierda.
 */
export function applyBlockQuoteIndent(indentProperties) {
    if (!indentProperties) {
        console.warn('[APA Spacing]: No se proporcionaron propiedades de sangría.');
        return null;
    }

    // Sangría desde el margen izquierdo
    if (typeof indentProperties.setLeft === 'function') {
        indentProperties.setLeft(APA_SPACING.BLOCK_QUOTE_INDENT);
    } else {
        indentProperties.left = APA_SPACING.BLOCK_QUOTE_INDENT;
    }

    // Sin sangría de primera línea en citas en bloque
    if (typeof indentProperties.setFirstLine === 'function') {
        indentProperties.setFirstLine(0);
    } else {
        indentProperties.firstLine = 0;
    }

    return indentProperties;
}

/**
 * Elimina toda sangría de un párrafo (para títulos, resumen, etc.).
 *
 * @param {Object} indentProperties - Objeto de sangría del párrafo.
 * @returns {Object} Propiedades modificadas sin sangría.
 */
export function removeIndent(indentProperties) {
    if (!indentProperties) return null;

    const zeroFields = ['firstLine', 'hanging', 'left', 'right', 'start'];

    zeroFields.forEach(field => {
        if (typeof indentProperties[`set${capitalize(field)}`] === 'function') {
            indentProperties[`set${capitalize(field)}`](0);
        } else {
            indentProperties[field] = 0;
        }
    });

    return indentProperties;
}

// =========================================
// FUNCIÓN COMBINADA (PÁRRAFO ESTÁNDAR APA)
// =========================================

/**
 * Aplica todas las reglas de espaciado APA 7 a un párrafo estándar del cuerpo:
 * - Interlineado doble
 * - Sin espaciado entre párrafos
 * - Sangría de primera línea (0.5")
 *
 * @param {Object} paragraphProperties - Objeto de propiedades del párrafo.
 * @returns {Object} Propiedades modificadas con espaciado APA completo.
 */
export function applyStandardParagraphSpacing(paragraphProperties) {
    if (!paragraphProperties) {
        console.warn('[APA Spacing]: No se proporcionaron propiedades de párrafo.');
        return null;
    }

    // Aplicar interlineado y espaciado
    if (paragraphProperties.spacing) {
        applyDoubleLineSpacing(paragraphProperties.spacing);
        removeParagraphSpacing(paragraphProperties.spacing);
    } else {
        paragraphProperties.spacing = {
            line: APA_SPACING.LINE_DOUBLE,
            lineRule: 'auto',
            before: APA_SPACING.PARAGRAPH_BEFORE,
            after: APA_SPACING.PARAGRAPH_AFTER
        };
    }

    // Aplicar sangría de primera línea
    if (paragraphProperties.indent) {
        applyFirstLineIndent(paragraphProperties.indent);
    } else {
        paragraphProperties.indent = {
            firstLine: APA_SPACING.FIRST_LINE_INDENT
        };
    }

    console.log('[APA Spacing]: Espaciado estándar de párrafo aplicado (doble, 0pt, sangría 0.5").');
    return paragraphProperties;
}

/**
 * Aplica espaciado para párrafos de referencia bibliográfica:
 * - Interlineado doble
 * - Sin espaciado entre párrafos
 * - Sangría francesa (hanging indent 0.5")
 *
 * @param {Object} paragraphProperties - Objeto de propiedades del párrafo.
 * @returns {Object} Propiedades modificadas para referencia.
 */
export function applyReferenceParagraphSpacing(paragraphProperties) {
    if (!paragraphProperties) {
        console.warn('[APA Spacing]: No se proporcionaron propiedades de párrafo.');
        return null;
    }

    // Interlineado y espaciado
    if (paragraphProperties.spacing) {
        applyDoubleLineSpacing(paragraphProperties.spacing);
        removeParagraphSpacing(paragraphProperties.spacing);
    } else {
        paragraphProperties.spacing = {
            line: APA_SPACING.LINE_DOUBLE,
            lineRule: 'auto',
            before: APA_SPACING.PARAGRAPH_BEFORE,
            after: APA_SPACING.PARAGRAPH_AFTER
        };
    }

    // Sangría francesa
    if (paragraphProperties.indent) {
        applyHangingIndent(paragraphProperties.indent);
    } else {
        paragraphProperties.indent = {
            hanging: APA_SPACING.HANGING_INDENT,
            firstLine: 0
        };
    }

    console.log('[APA Spacing]: Espaciado de referencia aplicado (doble, sangría francesa 0.5").');
    return paragraphProperties;
}

// =========================================
// UTILIDADES
// =========================================

/**
 * Capitaliza la primera letra de un string (helper interno).
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convierte centímetros a twips.
 * @param {number} cm
 * @returns {number}
 */
export function cmToTwips(cm) {
    return Math.round(cm * CM_TO_TWIPS);
}

/**
 * Convierte pulgadas a twips.
 * @param {number} inches
 * @returns {number}
 */
export function inchesToTwips(inches) {
    return Math.round(inches * INCH_TO_TWIPS);
}

/**
 * Convierte puntos (pt) a twips (1pt = 20 twips).
 * Útil para espaciado before/after si se necesita en puntos.
 * @param {number} points
 * @returns {number}
 */
export function pointsToTwips(points) {
    return points * 20;
}

/**
 * Valida si un objeto de espaciado cumple con el interlineado doble APA.
 * @param {Object} spacing - Objeto de espaciado con propiedad `line`.
 * @returns {boolean}
 */
export function isDoubleSpaced(spacing) {
    if (!spacing) return false;
    const tolerance = 10;
    return Math.abs((spacing.line || 0) - APA_SPACING.LINE_DOUBLE) <= tolerance;
}