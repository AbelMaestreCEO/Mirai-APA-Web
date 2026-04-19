/**
 * js/apa/paragraphs.js
 * 
 * Módulo dedicado a la gestión, limpieza y estilización de párrafos.
 * 
 * Funciones principales:
 * - Detectar el tipo de párrafo (cuerpo, cita, título, referencia).
 * - Limpiar estilos heredados no deseados.
 * - Aplicar la combinación correcta de espaciado y tipografía.
 * 
 * Dependencias:
 * - margins.js (para márgenes de sección, si se necesita contexto)
 * - spacing.js (para interlineado y sangrías)
 * - typography.js (para fuentes)
 * - headers.js (para estilos de título)
 */

import { applyStandardParagraphSpacing, applyReferenceParagraphSpacing, applyBlockQuoteIndent } from './spacing.js';
import { applyStandardTypography, applyHeadingTypography } from './typography.js';
import { getHeadingStyle, toTitleCase } from './headers.js';

// =========================================
// TIPOS DE PÁRRAFOS
// =========================================

const PARAGRAPH_TYPES = {
    BODY: 'body',
    HEADING: 'heading',
    BLOCK_QUOTE: 'block_quote',
    REFERENCE: 'reference',
    TITLE_PAGE: 'title_page',
    ABSTRACT: 'abstract',
    FIGURE_CAPTION: 'figure_caption',
    TABLE_CAPTION: 'table_caption',
    UNKNOWN: 'unknown'
};

// =========================================
// LIMPIEZA DE ESTILOS
// =========================================

/**
 * Limpia un objeto de párrafo de estilos heredados que violan APA 7.
 * Elimina colores, subrayados, fondos de celda, alineaciones extrañas, etc.
 * 
 * @param {Object} paragraph - El objeto párrafo a limpiar.
 * @returns {Object} El párrafo limpio.
 */
export function cleanParagraphStyles(paragraph) {
    if (!paragraph) return null;

    // 1. Resetear alineación (APA usa izquierda o centro para títulos)
    // Se restablecerá según el tipo después.
    if (paragraph.alignment) {
        delete paragraph.alignment;
    }

    // 2. Limpiar propiedades de Run (fuente) si existen
    if (paragraph.runs && Array.isArray(paragraph.runs)) {
        paragraph.runs.forEach(run => {
            // Forzar color negro
            if (run.color) delete run.color;
            // Forzar fondo transparente
            if (run.shading) delete run.shading;
            // Quitar subrayado
            if (run.underline) delete run.underline;
            // Quitar tachado
            if (run.strike) delete run.strike;
        });
    }

    // 3. Limpiar espaciado previo si existe
    if (paragraph.spacing) {
        delete paragraph.spacing.before;
        delete paragraph.spacing.after;
        delete paragraph.spacing.line;
    }

    // 4. Limpiar sangría previa
    if (paragraph.indent) {
        delete paragraph.indent.left;
        delete paragraph.indent.right;
        delete paragraph.indent.firstLine;
        delete paragraph.indent.hanging;
    }

    console.log('[APA Paragraphs]: Párrafo limpiado de estilos heredados.');
    return paragraph;
}

// =========================================
// DETECCIÓN DE TIPO DE PÁRRAFOS
// =========================================

/**
 * Intenta detectar el tipo de párrafo basado en su contenido y contexto.
 * Nota: La detección automática es imperfecta. Lo ideal es que el usuario
 * marque los títulos o que el algoritmo use heurísticas simples.
 * 
 * @param {Object} paragraph - El objeto párrafo.
 * @param {string} text - El texto plano del párrafo.
 * @param {number} index - Índice del párrafo en el documento (0 = portada/título).
 * @returns {string} Uno de los PARAGRAPH_TYPES.
 */
export function detectParagraphType(paragraph, text, index = 0) {
    const trimmedText = text.trim();
    const length = trimmedText.length;

    // 1. Título de la portada (primer párrafo, largo, sin punto)
    if (index === 0 && length > 20 && !trimmedText.endsWith('.')) {
        return PARAGRAPH_TYPES.TITLE_PAGE;
    }

    // 2. Abstract (Resumen) - suele tener la palabra "Abstract" o "Resumen"
    if (/^(abstract|resumen|summary)/i.test(trimmedText)) {
        return PARAGRAPH_TYPES.ABSTRACT;
    }

    // 3. Cita en bloque (longitud > 40 palabras aprox)
    // Heurística: más de 60 caracteres y sin punto final inmediato (a veces)
    if (length > 400) { // Aproximadamente 40 palabras en inglés/español
        return PARAGRAPH_TYPES.BLOCK_QUOTE;
    }

    // 4. Referencia (suele empezar con autor, año, título en cursiva)
    // Patrón simple: "Apellido, A. (Año)."
    if (/^[A-Z][a-z]+,?\s+[A-Z]\.\s+\(\d{4}\)/i.test(trimmedText)) {
        return PARAGRAPH_TYPES.REFERENCE;
    }

    // 5. Títulos (cortos, sin punto final, a veces en mayúsculas)
    if (length < 100 && !trimmedText.endsWith('.') && !trimmedText.includes(',')) {
        // Podríamos verificar si ya tiene negrita en el original
        if (paragraph.runs && paragraph.runs.some(r => r.bold)) {
            return PARAGRAPH_TYPES.HEADING;
        }
    }

    // 6. Leyendas de figuras/tablas (suelen empezar con "Figura" o "Tabla")
    if (/^(figura|tabla|figure|table)\s+\d+/i.test(trimmedText)) {
        return /^figura/i.test(trimmedText) ? PARAGRAPH_TYPES.FIGURE_CAPTION : PARAGRAPH_TYPES.TABLE_CAPTION;
    }

    // Default: Cuerpo del texto
    return PARAGRAPH_TYPES.BODY;
}

// =========================================
// APLICACIÓN DE ESTILOS SEGÚN TIPO
// =========================================

/**
 * Aplica el estilo completo de APA 7 a un párrafo según su tipo detectado.
 * 
 * @param {Object} paragraph - El objeto párrafo (limpio).
 * @param {string} type - El tipo de párrafo detectado.
 * @param {number} headingLevel - Nivel de título (si aplica, 1-5).
 * @returns {Object} El párrafo estilizado.
 */
export function applyAPAStyleToParagraph(paragraph, type, headingLevel = 1) {
    if (!paragraph) return null;

    // Asegurar que tenemos objetos de propiedades
    if (!paragraph.properties) {
        paragraph.properties = {};
    }
    
    const props = paragraph.properties;
    const runs = paragraph.runs || [];

    // Limpiar primero
    cleanParagraphStyles(paragraph);

    switch (type) {
        case PARAGRAPH_TYPES.TITLE_PAGE:
            // Portada: Centrado, Negrita (opcional), Tamaño 12, Sin sangría
            if (props.alignment) props.alignment = 'center';
            if (runs.length > 0) {
                applyStandardTypography(runs[0], 'Times New Roman', 24); // 12pt
                if (typeof runs[0].setBold === 'function') runs[0].setBold(true);
                else runs[0].bold = true;
            }
            // Sin sangría, interlineado doble (aunque en portada a veces es simple, APA dice doble)
            if (props.spacing) {
                applyDoubleLineSpacing(props.spacing);
                removeParagraphSpacing(props.spacing);
            }
            if (props.indent) removeIndent(props.indent);
            break;

        case PARAGRAPH_TYPES.ABSTRACT:
            // Abstract: Sin sangría primera línea, Título "Abstract" en negrita centrado
            // El contenido del abstract va justificado o izquierda, sin sangría primera línea.
            if (props.alignment) props.alignment = 'justify'; // O 'left' según preferencia
            if (props.indent) removeIndent(props.indent);
            if (props.spacing) {
                applyDoubleLineSpacing(props.spacing);
                removeParagraphSpacing(props.spacing);
            }
            // Aplicar fuente estándar
            runs.forEach(run => applyStandardTypography(run));
            break;

        case PARAGRAPH_TYPES.HEADING:
            // Títulos: Depende del nivel
            const style = getHeadingStyle(headingLevel);
            if (props.alignment) props.alignment = style.alignment;
            if (props.indent && style.indent > 0) {
                props.indent.left = Math.round(style.indent * 567);
            }
            runs.forEach(run => applyHeadingTypography(run, style.bold));
            if (props.spacing) {
                applyDoubleLineSpacing(props.spacing);
                removeParagraphSpacing(props.spacing);
            }
            // Si es nivel 4 o 5, añadir punto al final del texto (lógica externa)
            break;

        case PARAGRAPH_TYPES.BLOCK_QUOTE:
            // Cita en bloque: Sangría izquierda 0.5", doble espacio, sin comillas
            if (props.alignment) props.alignment = 'left';
            if (props.indent) {
                applyBlockQuoteIndent(props.indent);
            }
            if (props.spacing) {
                applyDoubleLineSpacing(props.spacing);
                removeParagraphSpacing(props.spacing);
            }
            runs.forEach(run => applyStandardTypography(run));
            break;

        case PARAGRAPH_TYPES.REFERENCE:
            // Referencias: Sangría francesa, doble espacio
            if (props.alignment) props.alignment = 'left';
            if (props.indent) {
                applyHangingIndent(props.indent);
            }
            if (props.spacing) {
                applyReferenceParagraphSpacing(props.spacing);
            }
            runs.forEach(run => applyStandardTypography(run));
            break;

        case PARAGRAPH_TYPES.FIGURE_CAPTION:
        case PARAGRAPH_TYPES.TABLE_CAPTION:
            // Leyendas: Itálico, centrado o izquierda, interlineado simple o doble (APA varía)
            // APA 7: Figuras: "Figura X. Título" (Negrita, Itálico para "Figura X", Título en Itálico)
            // Tablas: "Tabla X. Título" (Negrita arriba, sin itálico)
            // Simplificación: Itálico y centrado para figuras, Negrita y arriba para tablas.
            if (type === PARAGRAPH_TYPES.FIGURE_CAPTION) {
                if (props.alignment) props.alignment = 'center';
                runs.forEach(run => {
                    applyStandardTypography(run);
                    if (typeof run.setItalic === 'function') run.setItalic(true);
                    else run.italic = true;
                });
            } else {
                if (props.alignment) props.alignment = 'left'; // Tablas van arriba a la izquierda
                runs.forEach(run => {
                    applyStandardTypography(run);
                    if (typeof run.setBold === 'function') run.setBold(true);
                    else run.bold = true;
                });
            }
            if (props.spacing) {
                applySingleLineSpacing(props.spacing); // Leyendas suelen ser simples
                removeParagraphSpacing(props.spacing);
            }
            break;

        case PARAGRAPH_TYPES.BODY:
        default:
            // Cuerpo estándar: Sangría primera línea, doble espacio, justificado o izquierda
            if (props.alignment) props.alignment = 'left'; // APA prefiere izquierda (no justificado)
            if (props.indent) {
                applyFirstLineIndent(props.indent);
            }
            if (props.spacing) {
                applyStandardParagraphSpacing(props.spacing);
            }
            runs.forEach(run => applyStandardTypography(run));
            break;
    }

    return paragraph;
}

// =========================================
// UTILIDADES AUXILIARES (Reutilizando de spacing/typography)
// =========================================

// Importamos las funciones necesarias para que este archivo sea autocontenido en lógica
// (En un entorno real, estas importaciones ya están arriba)
import { applyDoubleLineSpacing, removeParagraphSpacing, removeIndent, applyFirstLineIndent, applyHangingIndent, applySingleLineSpacing } from './spacing.js';


/**
 * Helper para remover espaciado entre párrafos
 */
function removeParagraphSpacing(spacing) {
    if (!spacing) return;
    if (typeof spacing.setBefore === 'function') spacing.setBefore(0);
    else spacing.before = 0;
    if (typeof spacing.setAfter === 'function') spacing.setAfter(0);
    else spacing.after = 0;
}

/**
 * Helper para remover sangría
 */
function removeIndent(indent) {
    if (!indent) return;
    if (typeof indent.setFirstLine === 'function') indent.setFirstLine(0);
    else indent.firstLine = 0;
    if (typeof indent.setHanging === 'function') indent.setHanging(0);
    else indent.hanging = 0;
    if (typeof indent.setLeft === 'function') indent.setLeft(0);
    else indent.left = 0;
}