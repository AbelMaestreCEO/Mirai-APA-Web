/**
 * js/apa/figures.js
 * 
 * Módulo dedicado al formateo de Figuras (Imágenes, Gráficos) según APA 7.
 * 
 * Normas APA 7 para Figuras:
 * 1. Ubicación: La figura debe estar lo más cerca posible de su mención en el texto.
 * 2. Título: "Figura X. Título descriptivo" (Itálico, centrado, situado DEBAJO de la imagen).
 * 3. Nota: Debajo del título (si aplica), comenzando con "Nota." en cursiva.
 * 4. Imagen: Sin bordes decorativos, alta resolución, centrada.
 * 
 * Dependencias:
 * - typography.js (para fuentes)
 * - spacing.js (para espaciado)
 */

import { applyStandardTypography } from './typography.js';
import { applySingleLineSpacing, removeParagraphSpacing } from './spacing.js';

// =========================================
// CONSTANTES DE ESTILO
// =========================================

const FIGURE_FONT_SIZE = 20; // 10pt en unidades docx
const FIGURE_FONT_FAMILY = "Arial"; // Sans-serif para títulos de figuras es común
const TITLE_ITALIC = true;

// =========================================
// CREACIÓN DE TÍTULO DE FIGURA
// =========================================

/**
 * Crea el párrafo del título de la figura ("Figura X. Título").
 * A diferencia de las tablas, el título va DEBAJO y en cursiva.
 * 
 * @param {number} figureNumber - Número de la figura.
 * @param {string} titleText - El texto del título.
 * @returns {Object} Objeto de párrafo formateado.
 */
export function createFigureTitle(figureNumber, titleText) {
    if (!titleText) return null;

    const fullTitle = `Figura ${figureNumber}. ${titleText}`;

    const paragraph = {
        properties: {
            alignment: 'center',
            spacing: { before: 120, after: 120, line: 240 } // Espacio arriba y abajo
        },
        runs: [{
            text: fullTitle,
            bold: false,
            italics: true // APA 7: Título de figura en cursiva
        }]
    };

    // Aplicar fuente
    if (paragraph.runs.length > 0) {
        applyStandardTypography(paragraph.runs[0], FIGURE_FONT_FAMILY, FIGURE_FONT_SIZE);
        if (typeof paragraph.runs[0].setItalic === 'function') {
            paragraph.runs[0].setItalic(TITLE_ITALIC);
        } else {
            paragraph.runs[0].italics = TITLE_ITALIC;
        }
    }

    console.log(`[APA Figures]: Título de figura creado: "Figura ${figureNumber}..."`);
    return paragraph;
}

// =========================================
// CONFIGURACIÓN DE LA IMAGEN
// =========================================

/**
 * Configura una imagen para cumplir con APA 7.
 * - Sin bordes.
 * - Alineación centrada.
 * - Ancho máximo (opcional, para evitar que se salga de los márgenes).
 * 
 * @param {Object} imageRun - El objeto que contiene la imagen en docx.
 * @param {number} maxWidthPt - Ancho máximo en puntos (opcional, ej. 400pt).
 * @returns {Object} Imagen configurada.
 */
export function configureFigureImage(imageRun, maxWidthPt = null) {
    if (!imageRun) {
        console.warn('[APA Figures]: No se proporcionó objeto de imagen.');
        return null;
    }

    // 1. Alineación: La imagen debe estar centrada en el párrafo.
    // En docx, esto suele ser una propiedad del párrafo que contiene la imagen,
    // o una propiedad de la imagen misma si la librería lo soporta.
    if (imageRun.alignment) {
        imageRun.alignment = 'center';
    } else {
        imageRun._alignment = 'center';
    }

    // 2. Sin bordes: Asegurar que no haya marco alrededor.
    if (imageRun.border) {
        imageRun.border = {
            top: { size: 0 },
            bottom: { size: 0 },
            left: { size: 0 },
            right: { size: 0 }
        };
    }

    // 3. Dimensiones: Si se proporciona un ancho máximo, ajustar proporcionalmente.
    if (maxWidthPt && imageRun.width) {
        // Lógica simplificada: si el ancho original es mayor, escalar.
        // Nota: La implementación exacta de escalado depende de la API de 'docx'.
        // Aquí solo marcamos la intención.
        if (imageRun.width > maxWidthPt) {
            const ratio = maxWidthPt / imageRun.width;
            imageRun.width = maxWidthPt;
            imageRun.height = imageRun.height * ratio; // Mantener proporción
        }
    }

    console.log('[APA Figures]: Imagen configurada (centrada, sin bordes).');
    return imageRun;
}

// =========================================
// NOTA DE FIGURA
// =========================================

/**
 * Crea el párrafo de la nota debajo del título de la figura.
 * Formato: "Nota." en cursiva, seguido del texto normal.
 * 
 * @param {string} noteText - El texto de la nota.
 * @returns {Object} Objeto de párrafo formateado.
 */
export function createFigureNote(noteText) {
    if (!noteText) return null;

    let prefix = "Nota.";
    let body = noteText;
    
    if (noteText.toLowerCase().startsWith("nota.")) {
        body = noteText.substring(5).trim();
    }

    const paragraph = {
        properties: {
            alignment: 'left', // Las notas van alineadas a la izquierda
            spacing: { before: 120, after: 0, line: 240 },
            indent: { left: 0, firstLine: 0 } // Sin sangría
        },
        runs: [
            {
                text: prefix,
                italics: true,
                bold: false
            },
            {
                text: " " + body,
                italics: false,
                bold: false
            }
        ]
    };

    // Aplicar fuente
    paragraph.runs.forEach(run => {
        applyStandardTypography(run, FIGURE_FONT_FAMILY, FIGURE_FONT_SIZE);
    });

    console.log('[APA Figures]: Nota de figura creada.');
    return paragraph;
}

// =========================================
// ESTRUCTURA COMPLETA DE FIGURA
// =========================================

/**
 * Construye la estructura completa de una figura para insertarla en el documento.
 * Orden: [Imagen] -> [Título] -> [Nota (opcional)].
 * 
 * @param {Object} imageElement - El elemento de imagen.
 * @param {number} figureNumber - Número de la figura.
 * @param {string} titleText - Título de la figura.
 * @param {string} [noteText] - Nota opcional.
 * @returns {Array<Object>} Array de elementos (imagen, título, nota) listos para insertar.
 */
export function buildFigureStructure(imageElement, figureNumber, titleText, noteText = null) {
    const elements = [];

    // 1. Imagen (con configuración)
    const configuredImage = configureFigureImage(imageElement);
    // Nota: En docx, la imagen suele ir dentro de un párrafo.
    // Aquí asumimos que imageElement es el párrafo o el run con la imagen.
    // Si es un run, lo envolvemos en un párrafo centrado.
    if (configuredImage) {
        const imageParagraph = {
            type: 'paragraph',
            properties: { alignment: 'center' },
            children: [configuredImage] // O children: [new ImageRun(...)]
        };
        elements.push(imageParagraph);
    }

    // 2. Título
    const titleParagraph = createFigureTitle(figureNumber, titleText);
    if (titleParagraph) {
        elements.push(titleParagraph);
    }

    // 3. Nota (si existe)
    if (noteText) {
        const noteParagraph = createFigureNote(noteText);
        if (noteParagraph) {
            elements.push(noteParagraph);
        }
    }

    console.log(`[APA Figures]: Estructura completa de Figura ${figureNumber} generada.`);
    return elements;
}

// =========================================
// UTILIDADES
// =========================================

/**
 * Valida si una imagen tiene las dimensiones adecuadas para impresión.
 * (Mínimo 300 DPI es ideal, pero aquí verificamos tamaño relativo).
 * 
 * @param {number} widthPx - Ancho en píxeles.
 * @param {number} heightPx - Alto en píxeles.
 * @returns {boolean}
 */
export function isImageResolutionAdequate(widthPx, heightPx) {
    // Heurística simple: al menos 600px de ancho para calidad decente en pantalla/papel
    return widthPx >= 600 && heightPx >= 400;
}

/**
 * Genera un número de figura secuencial basado en un array de figuras existentes.
 * 
 * @param {Array} existingFigures - Array de objetos figura.
 * @returns {number} Siguiente número.
 */
export function getNextFigureNumber(existingFigures) {
    if (!existingFigures || existingFigures.length === 0) return 1;
    
    // Buscar el número más alto
    const maxNum = existingFigures.reduce((max, fig) => {
        const num = parseInt(fig.number) || 0;
        return num > max ? num : max;
    }, 0);
    
    return maxNum + 1;
}