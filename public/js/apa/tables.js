/**
 * js/apa/tables.js
 * 
 * Módulo dedicado al formateo de Tablas según APA 7.
 * 
 * Normas APA 7 para Tablas:
 * 1. Encabezado: "Tabla X. Título" (Negrita, Alineado izquierda, sin cursiva).
 * 2. Líneas: Solo horizontales. Sin líneas verticales. Sin líneas horizontales dentro del cuerpo (salvo excepciones).
 * 3. Fuente: 10pt o 11pt (puede diferir del cuerpo), preferiblemente legible.
 * 4. Alineación: Números alineados a la derecha, texto a la izquierda.
 * 5. Nota: Debajo de la tabla, en cursiva, comenzando con "Nota.".
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

const TABLE_FONT_SIZE = 20; // 10pt en unidades docx (10 * 2)
const TABLE_FONT_FAMILY = "Arial"; // APA permite sans-serif en tablas para legibilidad
const HEADER_BOLD = true;
const NOTE_ITALIC = true;

// =========================================
// CREACIÓN DE TÍTULO DE TABLA
// =========================================

/**
 * Crea el párrafo del título de la tabla ("Tabla X. Título").
 * 
 * @param {number} tableNumber - Número de la tabla (ej. 1, 2, 3).
 * @param {string} titleText - El título descriptivo de la tabla.
 * @returns {Object} Objeto de párrafo formateado.
 */
export function createTableTitle(tableNumber, titleText) {
    if (!titleText) return null;

    const fullTitle = `Tabla ${tableNumber}. ${titleText}`;

    const paragraph = {
        properties: {
            alignment: 'left',
            spacing: { before: 0, after: 120, line: 240 } // Espacio pequeño después
        },
        runs: [{
            text: fullTitle,
            bold: true,
            italics: false
        }]
    };

    // Aplicar fuente estándar (o la específica de tabla si se prefiere)
    if (paragraph.runs.length > 0) {
        applyStandardTypography(paragraph.runs[0], TABLE_FONT_FAMILY, TABLE_FONT_SIZE);
        if (typeof paragraph.runs[0].setBold === 'function') {
            paragraph.runs[0].setBold(HEADER_BOLD);
        } else {
            paragraph.runs[0].bold = HEADER_BOLD;
        }
    }

    console.log(`[APA Tables]: Título de tabla creado: "Tabla ${tableNumber}..."`);
    return paragraph;
}

// =========================================
// CONFIGURACIÓN DE LA TABLA (ESTRUCTURA)
// =========================================

/**
 * Configura una tabla para cumplir con las reglas de líneas de APA 7.
 * En la librería 'docx', esto se hace definiendo el estilo de las celdas y bordes.
 * 
 * @param {Object} table - El objeto Tabla de docx.
 * @returns {Object} Tabla configurada.
 */
export function configureTableBorders(table) {
    if (!table) {
        console.warn('[APA Tables]: No se proporcionó objeto de tabla.');
        return null;
    }

    // APA 7: 
    // - Línea superior gruesa (o normal)
    // - Línea debajo del encabezado
    // - Línea inferior
    // - NO líneas verticales
    // - NO líneas horizontales internas en el cuerpo (salvo para agrupar)

    // Nota: La implementación exacta depende de la API de 'docx'.
    // Generalmente se define un 'TableStyle' o se itera sobre filas/celdas.
    
    // Estrategia: Aplicar un estilo predeterminado que elimine bordes verticales
    // y solo mantenga horizontales en posiciones clave.
    
    // Ejemplo conceptual de configuración de bordes en docx:
    // table.border = {
    //     top: { size: 1, color: "auto", space: 0, style: "single" },
    //     bottom: { size: 1, color: "auto", space: 0, style: "single" },
    //     left: { size: 0 }, // Sin borde
    //     right: { size: 0 }, // Sin borde
    //     insideHorizontal: { size: 1, ... }, // Línea debajo del encabezado
    //     insideVertical: { size: 0 } // Sin líneas verticales
    // };

    // Si la tabla ya tiene celdas, iteramos para limpiar bordes verticales
    if (table.rows) {
        table.rows.forEach((row, rowIndex) => {
            row.cells.forEach(cell => {
                if (cell.border) {
                    // Eliminar bordes verticales
                    cell.border.left = { size: 0 };
                    cell.border.right = { size: 0 };
                    
                    // Asegurar bordes horizontales solo donde se necesita
                    // (Esto suele manejarse a nivel de fila o estilo global)
                }
            });
        });
    }

    console.log('[APA Tables]: Bordes de tabla configurados (sin verticales, horizontales selectivos).');
    return table;
}

/**
 * Aplica estilos de fuente y alineación a las celdas de una tabla.
 * 
 * @param {Object} table - El objeto Tabla.
 * @param {boolean} isHeaderRow - Si la primera fila es encabezado.
 * @returns {Object} Tabla con estilos aplicados.
 */
export function applyTableCellStyles(table, isHeaderRow = true) {
    if (!table || !table.rows) return null;

    table.rows.forEach((row, rowIndex) => {
        const isHeader = isHeaderRow && rowIndex === 0;

        row.cells.forEach(cell => {
            // 1. Fuente y tamaño
            if (cell.content && cell.content.children) {
                cell.content.children.forEach(child => {
                    if (child.type === 'paragraph' && child.runs) {
                        child.runs.forEach(run => {
                            applyStandardTypography(run, TABLE_FONT_FAMILY, TABLE_FONT_SIZE);
                            
                            // Encabezado en negrita
                            if (isHeader) {
                                if (typeof run.setBold === 'function') run.setBold(true);
                                else run.bold = true;
                            }
                        });
                    }
                });
            }

            // 2. Alineación de celda
            // Números a la derecha, texto a la izquierda
            // (Esto requiere análisis del contenido, aquí aplicamos izquierda por defecto)
            if (cell.alignment) {
                cell.alignment = 'left'; 
            } else {
                // Si usamos una estructura de celda simple
                cell._alignment = 'left';
            }
            
            // 3. Espaciado interno de celda (padding)
            // APA sugiere espacio suficiente para legibilidad
            if (cell.padding) {
                cell.padding.top = 5; // 5 puntos
                cell.padding.bottom = 5;
                cell.padding.left = 5;
                cell.padding.right = 5;
            }
        });
    });

    console.log('[APA Tables]: Estilos de celda aplicados (fuente 10pt, negrita en encabezado).');
    return table;
}

// =========================================
// NOTA DE TABLA
// =========================================

/**
 * Crea el párrafo de la nota debajo de la tabla.
 * Formato: "Nota." en cursiva, seguido del texto normal.
 * 
 * @param {string} noteText - El texto de la nota.
 * @returns {Object} Objeto de párrafo formateado.
 */
export function createTableNote(noteText) {
    if (!noteText) return null;

    // Separar "Nota." del resto del texto si el usuario lo incluyó junto
    let prefix = "Nota.";
    let body = noteText;
    
    if (noteText.toLowerCase().startsWith("nota.")) {
        body = noteText.substring(5).trim();
    }

    const paragraph = {
        properties: {
            alignment: 'left',
            spacing: { before: 120, after: 0, line: 240 }, // Espacio antes
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
        applyStandardTypography(run, TABLE_FONT_FAMILY, TABLE_FONT_SIZE);
    });

    console.log('[APA Tables]: Nota de tabla creada.');
    return paragraph;
}

// =========================================
// UTILIDADES
// =========================================

/**
 * Determina si una celda contiene números para alinearlos a la derecha.
 * (Heurística simple).
 * 
 * @param {string} text - Texto de la celda.
 * @returns {boolean}
 */
export function isNumericCell(text) {
    if (!text) return false;
    // Coincide con números, decimales, porcentajes, signos de moneda
    return /^[+-]?[\d.,\s%$€£¥]+$/.test(text.trim());
}

/**
 * Alinea celdas numéricas a la derecha y las de texto a la izquierda.
 * 
 * @param {Object} table - La tabla.
 * @returns {Object} Tabla modificada.
 */
export function alignNumericCells(table) {
    if (!table || !table.rows) return null;

    table.rows.forEach(row => {
        row.cells.forEach(cell => {
            if (cell.content && cell.content.children) {
                const text = cell.content.children
                    .filter(c => c.type === 'paragraph')
                    .map(p => p.runs ? p.runs.map(r => r.text || "").join("") : "")
                    .join(" ");
                
                if (isNumericCell(text)) {
                    if (cell.alignment) {
                        cell.alignment = 'right';
                    } else {
                        cell._alignment = 'right';
                    }
                }
            }
        });
    });

    return table;
}