/**
 * js/apa/abstract.js
 * 
 * Módulo dedicado al formateo del Resumen (Abstract) y Palabras Clave.
 * 
 * Normas APA 7 para el Resumen:
 * 1. Título: "Resumen" (o "Abstract") centrado, negrita, sin cursiva.
 * 2. Párrafo: Único, sin sangría de primera línea, interlineado doble, alineación izquierda.
 * 3. Palabras Clave: Debajo del resumen. Etiqueta "Palabras clave:" en cursiva. 
 *    Las palabras en texto normal, separadas por comas. Sin punto final.
 * 
 * Dependencias:
 * - spacing.js (para interlineado y sangría)
 * - typography.js (para fuentes)
 * - headers.js (para el título)
 */

import { applyDoubleLineSpacing, removeParagraphSpacing, removeIndent } from './spacing.js';
import { applyStandardTypography } from './typography.js';
import { toTitleCase } from './headers.js';

// =========================================
// CONFIGURACIÓN DEL TÍTULO "RESUMEN"
// =========================================

/**
 * Crea el párrafo del título "Resumen".
 * 
 * @param {string} language - Idioma del documento ('es' o 'en').
 * @returns {Object} Objeto de párrafo formateado.
 */
export function createAbstractTitle(language = 'es') {
    const titleText = language === 'es' ? 'Resumen' : 'Abstract';

    const paragraph = {
        properties: {
            alignment: 'center',
            spacing: { before: 0, after: 120, line: 240 } // Espacio después para separar del texto
        },
        runs: [{
            text: titleText,
            bold: true,
            italics: false
        }]
    };

    // Aplicar fuente estándar
    if (paragraph.runs.length > 0) {
        applyStandardTypography(paragraph.runs[0]);
        // Asegurar negrita
        if (typeof paragraph.runs[0].setBold === 'function') {
            paragraph.runs[0].setBold(true);
        } else {
            paragraph.runs[0].bold = true;
        }
    }

    console.log('[APA Abstract]: Título "Resumen" creado.');
    return paragraph;
}

// =========================================
// CONFIGURACIÓN DEL CONTENIDO DEL RESUMEN
// =========================================

/**
 * Crea y formatea el párrafo del contenido del resumen.
 * Regla clave: SIN sangría de primera línea.
 * 
 * @param {string} text - El texto del resumen.
 * @returns {Object} Objeto de párrafo formateado.
 */
export function createAbstractBody(text) {
    if (!text) return null;

    const paragraph = {
        properties: {
            alignment: 'left', // APA prefiere izquierda para el resumen
            spacing: {},
            indent: {}
        },
        runs: [{
            text: text,
            bold: false,
            italics: false
        }]
    };

    // Aplicar interlineado doble
    if (paragraph.properties.spacing) {
        applyDoubleLineSpacing(paragraph.properties.spacing);
        removeParagraphSpacing(paragraph.properties.spacing);
    }

    // Aplicar SIN sangría (crítico para el resumen)
    if (paragraph.properties.indent) {
        removeIndent(paragraph.properties.indent);
    } else {
        paragraph.properties.indent = {
            left: 0,
            right: 0,
            firstLine: 0,
            hanging: 0
        };
    }

    // Aplicar tipografía estándar
    if (paragraph.runs.length > 0) {
        applyStandardTypography(paragraph.runs[0]);
    }

    console.log('[APA Abstract]: Cuerpo del resumen formateado (sin sangría, doble espacio).');
    return paragraph;
}

// =========================================
// PALABRAS CLAVE (Keywords)
// =========================================

/**
 * Crea el párrafo de las palabras clave.
 * Formato: "Palabras clave:" (cursiva) + lista de palabras (normal).
 * 
 * @param {Array<string>} keywords - Array de palabras clave.
 * @param {string} language - Idioma ('es' o 'en').
 * @returns {Object} Objeto de párrafo formateado.
 */
export function createKeywordsParagraph(keywords, language = 'es') {
    if (!keywords || keywords.length === 0) return null;

    const label = language === 'es' ? 'Palabras clave:' : 'Keywords:';
    
    // Construir los runs: Etiqueta en cursiva, palabras en normal
    const runs = [];
    
    // Run 1: Etiqueta
    runs.push({
        text: label,
        bold: false,
        italics: true
    });

    // Run 2: Espacio
    runs.push({
        text: " ",
        bold: false,
        italics: false
    });

    // Runs 3+: Palabras separadas por comas
    keywords.forEach((word, index) => {
        // Capitalizar primera letra de cada palabra (opcional, pero común)
        const formattedWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        
        runs.push({
            text: formattedWord,
            bold: false,
            italics: false
        });

        // Añadir coma si no es la última
        if (index < keywords.length - 1) {
            runs.push({
                text: ", ",
                bold: false,
                italics: false
            });
        }
    });

    const paragraph = {
        properties: {
            alignment: 'left',
            spacing: { before: 120, after: 0, line: 240 }, // Espacio antes del resumen
            indent: { left: 0, firstLine: 0 } // Sin sangría
        },
        runs: runs
    };

    // Aplicar fuente a todos los runs
    paragraph.runs.forEach(run => {
        applyStandardTypography(run);
    });

    console.log('[APA Abstract]: Palabras clave creadas.');
    return paragraph;
}

// =========================================
// ESTRUCTURA COMPLETA
// =========================================

/**
 * Construye la estructura completa del resumen para insertar en el documento.
 * Orden: [Título "Resumen"] -> [Cuerpo] -> [Palabras clave].
 * 
 * @param {string} bodyText - Texto del resumen.
 * @param {Array<string>} keywords - Lista de palabras clave.
 * @param {string} language - Idioma.
 * @returns {Array<Object>} Array de párrafos.
 */
export function buildAbstractStructure(bodyText, keywords = [], language = 'es') {
    const elements = [];

    // 1. Título
    elements.push(createAbstractTitle(language));

    // 2. Cuerpo
    if (bodyText) {
        elements.push(createAbstractBody(bodyText));
    }

    // 3. Palabras clave (si existen)
    if (keywords && keywords.length > 0) {
        elements.push(createKeywordsParagraph(keywords, language));
    }

    console.log('[APA Abstract]: Estructura completa del resumen generada.');
    return elements;
}

// =========================================
// UTILIDADES
// =========================================

/**
 * Extrae palabras clave de un texto si el usuario las ha puesto al final.
 * Heurística: Busca la frase "Palabras clave:" y extrae lo que sigue.
 * 
 * @param {string} text - Texto completo.
 * @returns {Array<string>} Array de palabras clave extraídas.
 */
export function extractKeywordsFromText(text) {
    if (!text) return [];

    const patterns = [
        /Palabras clave:\s*(.+)$/i,
        /Keywords:\s*(.+)$/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            // Dividir por comas y limpiar espacios
            return match[1].split(',').map(k => k.trim()).filter(k => k.length > 0);
        }
    }

    return [];
}

/**
 * Valida si un párrafo parece ser un resumen (sin sangría, centrado arriba).
 * @param {Object} paragraph
 * @returns {boolean}
 */
export function isLikelyAbstractParagraph(paragraph) {
    if (!paragraph || !paragraph.runs) return false;
    
    const text = paragraph.runs.map(r => r.text || "").join("").trim();
    return /^(Resumen|Abstract)$/.test(text);
}