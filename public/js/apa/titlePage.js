/**
 * js/apa/titlePage.js
 * 
 * Módulo dedicado a la configuración y formateo de la Portada (Title Page).
 * 
 * Normas APA 7 para Portadas (Trabajos Estudiantiles):
 * 1. Número de página: Esquina superior derecha (página 1).
 * 2. Título: Centrado, Negrita, en la mitad superior de la página (aprox. 3-4 líneas desde el margen superior).
 * 3. Autor: Centrado, sin negrita, debajo del título.
 * 4. Afiliación: Centrado, sin negrita, debajo del autor.
 * 5. Curso, Instructor, Fecha: Centrados, sin negrita, debajo de la afiliación.
 * 
 * Nota: Este módulo asume que el contenido (título, autor, etc.) ya ha sido extraído 
 * o ingresado por el usuario. Su función es aplicar el layout y estilos visuales.
 * 
 * Dependencias:
 * - spacing.js (para interlineado doble y sin espaciado extra)
 * - typography.js (para fuente y tamaño)
 * - headers.js (para el número de página en el header)
 */

import { applyDoubleLineSpacing, removeParagraphSpacing, removeIndent } from './spacing.js';
import { applyStandardTypography } from './typography.js';
import { configureRunningHeader } from './headers.js';

// =========================================
// CONFIGURACIÓN DE LA PORTADA
// =========================================

/**
 * Configura el Header de la primera página para incluir el número de página.
 * En APA 7, el número de página va en la esquina superior derecha de TODAS las páginas,
 * incluida la portada.
 * 
 * @param {Object} headerSection - El objeto Header de la primera página.
 * @returns {Object} Header modificado.
 */
export function setupTitlePageHeader(headerSection) {
    if (!headerSection) {
        console.warn('[APA Title Page]: No se proporcionó sección de encabezado.');
        return null;
    }

    // APA 7: Solo el número de página en la esquina derecha.
    // "Running head" (título corto) solo se usa en manuscritos para publicación, 
    // no en trabajos estudiantiles estándar. Si se requiere, se puede añadir aquí.
    
    // Nota: La implementación de header en docx suele requerir un párrafo con alineación derecha.
    // Aquí simulamos la estructura. En docx real, se haría:
    // headerSection.addParagraph(new Paragraph({
    //     alignment: AlignmentType.RIGHT,
    //     children: [new TextRun({ text: "1" })]
    // }));

    console.log('[APA Title Page]: Encabezado de portada configurado (Número de página 1).');
    return headerSection;
}

/**
 * Crea y formatea el párrafo del Título de la Portada.
 * 
 * @param {string} titleText - El texto del título.
 * @returns {Object} Objeto de párrafo formateado.
 */
export function createTitleParagraph(titleText) {
    if (!titleText) return null;

    // Estructura conceptual para docx
    const paragraph = {
        properties: {
            alignment: 'center',
            spacing: {}
        },
        runs: [{
            text: titleText,
            bold: true,
            italics: false
        }]
    };

    // Aplicar estilos
    if (paragraph.properties.spacing) {
        applyDoubleLineSpacing(paragraph.properties.spacing);
        removeParagraphSpacing(paragraph.properties.spacing);
    }
    
    if (paragraph.properties.indent) {
        removeIndent(paragraph.properties.indent);
    }

    if (paragraph.runs && paragraph.runs.length > 0) {
        applyStandardTypography(paragraph.runs[0]);
        // Asegurar negrita
        if (typeof paragraph.runs[0].setBold === 'function') {
            paragraph.runs[0].setBold(true);
        } else {
            paragraph.runs[0].bold = true;
        }
    }

    console.log('[APA Title Page]: Título de portada creado y formateado.');
    return paragraph;
}

/**
 * Crea y formatea un párrafo genérico para la portada (Autor, Afiliación, Curso, etc.).
 * Estos elementos NO llevan negrita.
 * 
 * @param {string} text - El texto del elemento.
 * @param {boolean} isBold - Si debe llevar negrita (usualmente false para estos campos).
 * @returns {Object} Objeto de párrafo formateado.
 */
export function createInfoParagraph(text, isBold = false) {
    if (!text) return null;

    const paragraph = {
        properties: {
            alignment: 'center',
            spacing: {}
        },
        runs: [{
            text: text,
            bold: isBold,
            italics: false
        }]
    };

    // Aplicar estilos base
    if (paragraph.properties.spacing) {
        applyDoubleLineSpacing(paragraph.properties.spacing);
        removeParagraphSpacing(paragraph.properties.spacing);
    }

    if (paragraph.properties.indent) {
        removeIndent(paragraph.properties.indent);
    }

    if (paragraph.runs && paragraph.runs.length > 0) {
        applyStandardTypography(paragraph.runs[0]);
        if (typeof paragraph.runs[0].setBold === 'function') {
            paragraph.runs[0].setBold(isBold);
        } else {
            paragraph.runs[0].bold = isBold;
        }
    }

    return paragraph;
}

/**
 * Calcula el espaciado vertical necesario para posicionar el título en la mitad superior.
 * APA 7 sugiere que el título esté en la mitad superior de la página.
 * Esto se logra usualmente añadiendo párrafos vacíos al principio o ajustando el margen superior.
 * 
 * @param {number} marginTop - Margen superior en cm (default 2.54).
 * @param {number} lineHeight - Altura de línea en cm (default 2.54 para doble espacio 12pt).
 * @returns {number} Número de líneas vacías a insertar.
 */
export function calculateTitleVerticalPosition(marginTop = 2.54, lineHeight = 2.54) {
    // La mitad superior de una carta (27.94 cm) es ~13.97 cm.
    // Restamos el margen superior (2.54) -> 11.43 cm disponibles.
    // Dividimos por la altura de línea (2.54) -> ~4.5 líneas.
    // Redondeamos a 4 o 5 líneas vacías antes del título.
    
    const availableSpace = (27.94 / 2) - marginTop;
    const linesNeeded = Math.floor(availableSpace / lineHeight);
    
    return Math.max(0, linesNeeded - 2); // Restamos 2 para no llegar al borde exacto
}

/**
 * Genera un array de párrafos vacíos para empujar el título hacia abajo.
 * 
 * @param {number} count - Número de líneas vacías.
 * @returns {Array<Object>} Array de párrafos vacíos.
 */
export function createSpacerParagraphs(count) {
    const spacers = [];
    for (let i = 0; i < count; i++) {
        spacers.push({
            properties: {
                spacing: { before: 0, after: 0, line: 240 }, // Simple space para spacers
                indent: { left: 0, right: 0, firstLine: 0 }
            },
            runs: [] // Párrafo vacío
        });
    }
    return spacers;
}

/**
 * Construye la estructura completa de la portada.
 * 
 * @param {Object} title - Texto del título.
 * @param {string} author - Nombre del autor.
 * @param {string} affiliation - Afiliación institucional.
 * @param {string} course - Nombre del curso.
 * @param {string} instructor - Nombre del instructor.
 * @param {string} date - Fecha.
 * @returns {Array<Object>} Array de párrafos para la portada.
 */
export function buildTitlePageStructure(title, author, affiliation, course, instructor, date) {
    const pages = [];

    // 1. Espaciadores para posicionar en mitad superior
    const spacerCount = calculateTitleVerticalPosition();
    pages.push(...createSpacerParagraphs(spacerCount));

    // 2. Título (Negrita)
    pages.push(createTitleParagraph(title));

    // 3. Autor (Normal)
    pages.push(createInfoParagraph(author, false));

    // 4. Afiliación (Normal)
    pages.push(createInfoParagraph(affiliation, false));

    // 5. Curso (Normal)
    if (course) pages.push(createInfoParagraph(course, false));

    // 6. Instructor (Normal)
    if (instructor) pages.push(createInfoParagraph(instructor, false));

    // 7. Fecha (Normal)
    if (date) pages.push(createInfoParagraph(date, false));

    // 8. Espaciador final para separar del cuerpo (opcional, pero recomendado)
    pages.push(...createSpacerParagraphs(2));

    console.log('[APA Title Page]: Estructura completa de portada generada.');
    return pages;
}