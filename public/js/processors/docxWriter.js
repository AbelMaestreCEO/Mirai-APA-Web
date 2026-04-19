/**
 * js/processors/docxWriter.js
 * 
 * Módulo dedicado a la generación y exportación del nuevo documento .DOCX.
 * 
 * Funcionamiento:
 * 1. Recibe los datos procesados (párrafos con estilos APA, tablas, imágenes).
 * 2. Construye la estructura del documento usando la librería 'docx'.
 * 3. Configura secciones, encabezados (paginación) y márgenes.
 * 4. Genera un Blob descargable.
 * 
 * Dependencias externas:
 * - docx (cargado desde CDN como window.docx)
 * - FileSaver.js (opcional, para facilitar la descarga)
 * 
 * Nota: Este módulo asume que los datos de entrada ya han sido formateado 
 * por los módulos de APA (margins, spacing, typography, etc.).
 */

// =========================================
// VERIFICACIÓN DE DEPENDENCIAS
// =========================================

// Verificar que docx esté disponible (desde CDN o import)
if (typeof docx === 'undefined' && typeof window.docx === 'undefined') {
    console.error('[DocxWriter] docx.js no está cargado. Asegúrate de incluir el CDN.');
}

const docxLib = typeof docx !== 'undefined' ? docx : window.docx;

// =========================================
// IMPORTACIONES DE MÓDULOS APA
// =========================================

import { APA_STANDARDS } from '../utils/constants.js';

// =========================================
// GENERACIÓN DEL DOCUMENTO
// =========================================

/**
 * Genera un nuevo documento DOCX formateado según APA 7.
 * 
 * @param {Object} data - Objeto con { paragraphs, tables, images, metadata }.
 * @param {Object} options - Opciones de configuración (título, autor, etc.).
 * @returns {Promise<Blob>} El blob del archivo generado.
 */
export async function generateDocx(data, options = {}) {
    if (!docxLib) {
        throw new Error('docx.js no está cargado. Por favor recarga la página.');
    }

    const { paragraphs, tables, images, abstract } = data;
    const { title, author, affiliation, course, instructor, date } = options;

    console.log('[DocxWriter]: Iniciando generación del documento...');

    try {
        // 1. Construir la Portada (Title Page)
        const titlePageChildren = buildTitlePageContent(title, author, affiliation, course, instructor, date);

        // 2. Construir el Cuerpo del Documento
        const bodyChildren = [];

        // Añadir Abstract si existe
        if (abstract) {
            bodyChildren.push(...buildAbstractContent(abstract));
        }

        // Añadir Párrafos procesados
        if (paragraphs && Array.isArray(paragraphs)) {
            paragraphs.forEach(p => {
                const docxParagraph = convertToDocxParagraph(p);
                if (docxParagraph) bodyChildren.push(docxParagraph);
            });
        }

        // Añadir Tablas procesadas
        if (tables && Array.isArray(tables)) {
            tables.forEach(t => {
                const docxTable = convertToDocxTable(t);
                if (docxTable) bodyChildren.push(docxTable);
            });
        }

        // Añadir Imágenes procesadas
        if (images && Array.isArray(images)) {
            images.forEach(img => {
                const docxImage = convertToDocxImage(img);
                if (docxImage) bodyChildren.push(docxImage);
            });
        }

        // 3. Configurar Secciones y Encabezados
        const header = new docxLib.Header({
            children: [
                new docxLib.Paragraph({
                    alignment: docxLib.AlignmentType.RIGHT,
                    children: [
                        new docxLib.TextRun({
                            text: "1", // Placeholder, se actualiza automáticamente
                            size: 24
                        })
                    ]
                })
            ]
        });

        const footer = new docxLib.Footer({
            children: [] // Vacío según APA 7
        });

        // 4. Crear la Sección Principal
        const section = new docxLib.Section({
            properties: {
                // Márgenes APA 7 (2.54cm = 914400 EMUs)
                margins: {
                    top: 914400,
                    right: 914400,
                    bottom: 914400,
                    left: 914400
                },
                header: header,
                footer: footer
            },
            children: [
                ...titlePageChildren,
                ...bodyChildren
            ]
        });

        // 5. Crear el Documento
        const doc = new docxLib.Document({
            sections: [section],
            styles: {
                default: {
                    heading1: { run: { size: 24, bold: true } },
                    heading2: { run: { size: 24, bold: true } },
                    heading3: { run: { size: 24, bold: true } },
                }
            }
        });

        // 6. Generar el Blob
        console.log('[DocxWriter]: Serializando documento...');
        const buffer = await docxLib.Packer.toBuffer(doc);
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

        console.log('[DocxWriter]: Documento generado exitosamente.', {
            size: `${(blob.size / 1024).toFixed(2)} KB`
        });

        return blob;

    } catch (error) {
        console.error('[DocxWriter]: Error fatal al generar el documento:', error);
        throw error;
    }
}

// =========================================
// CONTENIDO DE PORTADA
// =========================================

/**
 * Construye el contenido de la portada.
 * @returns {Array} Array de elementos docx.
 */
function buildTitlePageContent(title, author, affiliation, course, instructor, date) {
    const children = [];
    
    // Usar valores por defecto si no se proporcionan
    const titleText = title || 'Título del Documento';
    const authorText = author || 'Nombre del Autor';
    const affiliationText = affiliation || 'Afiliación Institucional';
    const dateText = date || new Date().toLocaleDateString('es-ES');

    // Espaciadores para centrar verticalmente (aprox 4-5 líneas)
    for(let i=0; i<5; i++) {
        children.push(new docxLib.Paragraph({ children: [] }));
    }

    // Título (Negrita, centrado)
    children.push(new docxLib.Paragraph({
        alignment: docxLib.AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [
            new docxLib.TextRun({
                text: titleText,
                bold: true,
                size: 24, // 12pt
                font: APA_STANDARDS.FONT.DEFAULT_FAMILY
            })
        ]
    }));

    // Autor (Normal, centrado)
    children.push(new docxLib.Paragraph({
        alignment: docxLib.AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        children: [
            new docxLib.TextRun({
                text: authorText,
                size: 24,
                font: APA_STANDARDS.FONT.DEFAULT_FAMILY
            })
        ]
    }));

    // Afiliación (Normal, centrado)
    children.push(new docxLib.Paragraph({
        alignment: docxLib.AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        children: [
            new docxLib.TextRun({
                text: affiliationText,
                size: 24,
                font: APA_STANDARDS.FONT.DEFAULT_FAMILY
            })
        ]
    }));

    // Curso, Instructor, Fecha (si existen)
    if (course) children.push(createCenteredParagraph(course));
    if (instructor) children.push(createCenteredParagraph(instructor));
    children.push(createCenteredParagraph(dateText));

    // Espaciador final
    for(let i=0; i<2; i++) {
        children.push(new docxLib.Paragraph({ children: [] }));
    }

    console.log('[DocxWriter]: Portada generada.');
    return children;
}

function createCenteredParagraph(text) {
    return new docxLib.Paragraph({
        alignment: docxLib.AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        children: [
            new docxLib.TextRun({
                text: text,
                size: 24,
                font: APA_STANDARDS.FONT.DEFAULT_FAMILY
            })
        ]
    });
}

// =========================================
// CONTENIDO DE ABSTRACT
// =========================================

/**
 * Construye el contenido del Abstract.
 * @returns {Array} Array de elementos docx.
 */
function buildAbstractContent(abstractData) {
    const children = [];

    // Título "Resumen"
    children.push(new docxLib.Paragraph({
        alignment: docxLib.AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [
            new docxLib.TextRun({
                text: "Resumen",
                bold: true,
                size: 24,
                font: APA_STANDARDS.FONT.DEFAULT_FAMILY
            })
        ]
    }));

    // Cuerpo (sin sangría, doble espacio)
    if (abstractData.body) {
        children.push(new docxLib.Paragraph({
            alignment: docxLib.AlignmentType.LEFT,
            spacing: { 
                line: APA_STANDARDS.SPACING.LINE_DOUBLE, 
                lineRule: docxLib.LineRuleType.AUTO, 
                before: 0, 
                after: 0 
            },
            indent: { firstLine: 0 },
            children: [
                new docxLib.TextRun({
                    text: abstractData.body,
                    size: 24,
                    font: APA_STANDARDS.FONT.DEFAULT_FAMILY
                })
            ]
        }));
    }

    // Palabras clave
    if (abstractData.keywords && abstractData.keywords.length > 0) {
        const kwText = "Palabras clave: " + abstractData.keywords.join(", ");
        children.push(new docxLib.Paragraph({
            alignment: docxLib.AlignmentType.LEFT,
            spacing: { 
                before: 200, 
                after: 0, 
                line: APA_STANDARDS.SPACING.LINE_DOUBLE, 
                lineRule: docxLib.LineRuleType.AUTO 
            },
            indent: { firstLine: 0 },
            children: [
                new docxLib.TextRun({
                    text: "Palabras clave:",
                    italics: true,
                    size: 24,
                    font: APA_STANDARDS.FONT.DEFAULT_FAMILY
                }),
                new docxLib.TextRun({
                    text: " " + abstractData.keywords.join(", "),
                    size: 24,
                    font: APA_STANDARDS.FONT.DEFAULT_FAMILY
                })
            ]
        }));
    }

    console.log('[DocxWriter]: Abstract generado.');
    return children;
}

// =========================================
// CONVERSIÓN DE PÁRRAFOS
// =========================================

/**
 * Convierte nuestro objeto interno de párrafo a docx.Paragraph.
 * @param {Object} p - Párrafo procesado.
 * @returns {docx.Paragraph}
 */
function convertToDocxParagraph(p) {
    if (!p || !p.text) return null;

    // Configurar espaciado y sangría según el tipo
    let spacing = { 
        line: APA_STANDARDS.SPACING.LINE_DOUBLE, 
        lineRule: docxLib.LineRuleType.AUTO, 
        before: 0, 
        after: 0 
    };
    let indent = { firstLine: 0 };

    if (p.type === 'body') {
        indent.firstLine = 720; // 0.5" en twips
    } else if (p.type === 'reference') {
        indent.hanging = 720;
        indent.firstLine = 0;
    } else if (p.type === 'heading') {
        spacing = { 
            before: 240, 
            after: 120, 
            line: APA_STANDARDS.SPACING.LINE_DOUBLE, 
            lineRule: docxLib.LineRuleType.AUTO 
        };
        indent = { firstLine: 0 };
    }

    // Configurar alineación
    let alignment = docxLib.AlignmentType.LEFT;
    if (p.type === 'heading' && p.level === 1) alignment = docxLib.AlignmentType.CENTER;

    // Crear el TextRun
    const run = new docxLib.TextRun({
        text: p.text,
        size: 24, // 12pt
        bold: p.isBold || false,
        italics: p.isItalic || false,
        font: APA_STANDARDS.FONT.DEFAULT_FAMILY
    });

    return new docxLib.Paragraph({
        alignment: alignment,
        spacing: spacing,
        indent: indent,
        children: [run]
    });
}

// =========================================
// CONVERSIÓN DE TABLAS
// =========================================

/**
 * Convierte una tabla interna a docx.Table.
 * @param {Object} t - Tabla procesada.
 * @returns {docx.Table}
 */
function convertToDocxTable(t) {
    if (!t || !t.rows) return null;

    const rows = t.rows.map(row => {
        return new docxLib.TableRow({
            children: row.cells.map(cell => {
                return new docxLib.TableCell({
                    children: [
                        new docxLib.Paragraph({
                            children: [
                                new docxLib.TextRun({
                                    text: cell.text || '',
                                    size: 20, // 10pt para tablas
                                    bold: cell.isHeader || false,
                                    font: APA_STANDARDS.FONT.DEFAULT_FAMILY
                                })
                            ],
                            alignment: cell.isNumeric ? docxLib.AlignmentType.RIGHT : docxLib.AlignmentType.LEFT
                        })
                    ],
                    // Bordes: Solo horizontales en encabezado (APA 7)
                    borders: {
                        top: { style: docxLib.BorderStyle.NONE, size: 0 },
                        bottom: cell.isHeader ? { style: docxLib.BorderStyle.SINGLE, size: 2, color: "auto" } : { style: docxLib.BorderStyle.NONE, size: 0 },
                        left: { style: docxLib.BorderStyle.NONE, size: 0 },
                        right: { style: docxLib.BorderStyle.NONE, size: 0 }
                    }
                });
            })
        });
    });

    return new docxLib.Table({
        rows: rows,
        width: { size: 100, type: docxLib.WidthType.PERCENTAGE }
    });
}

// =========================================
// CONVERSIÓN DE IMÁGENES
// =========================================

/**
 * Convierte una imagen interna a docx.ImageRun.
 * @param {Object} img - Imagen procesada.
 * @returns {docx.ImageRun}
 */
function convertToDocxImage(img) {
    if (!img || !img.src) return null;

    // Convertir base64 a Uint8Array (el navegador no tiene Buffer)
    let imageData;
    if (img.src.startsWith('data:')) {
        // Extraer base64
        const base64Data = img.src.split(',')[1];
        // Convertir base64 a Uint8Array
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        imageData = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            imageData[i] = binaryString.charCodeAt(i);
        }
    } else if (img.src.startsWith('http')) {
        // Si es URL externa, intentar fetch
        try {
            const response = await fetch(img.src);
            const arrayBuffer = await response.arrayBuffer();
            imageData = new Uint8Array(arrayBuffer);
        } catch (e) {
            console.warn('[DocxWriter]: No se pudo cargar imagen desde URL:', img.src);
            return null;
        }
    } else {
        // Asumir que ya es Uint8Array o Buffer
        imageData = img.src;
    }

    return new docxLib.Paragraph({
        alignment: docxLib.AlignmentType.CENTER,
        children: [
            new docxLib.ImageRun({
                data: imageData,
                transformation: {
                    width: img.width || 400,
                    height: img.height || 300
                }
            })
        ]
    });
}

// =========================================
// DESCARGA DEL DOCUMENTO
// =========================================

/**
 * Descarga el blob generado.
 * @param {Blob} blob 
 * @param {string} filename 
 */
export function downloadBlob(blob, filename = "documento_apa.docx") {
    if (!blob) {
        console.error('[DocxWriter]: No se puede descargar, blob vacío.');
        return;
    }

    if (typeof saveAs !== 'undefined') {
        saveAs(blob, filename);
        console.log('[DocxWriter]: Documento descargado:', filename);
    } else {
        // Fallback simple
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('[DocxWriter]: Documento descargado (fallback).');
    }
}

// =========================================
// UTILIDADES ADICIONALES
// =========================================

/**
 * Genera documento y lo descarga automáticamente.
 * @param {Object} data 
 * @param {Object} options 
 * @param {string} filename 
 */
export async function generateAndDownload(data, options = {}, filename = "documento_apa.docx") {
    try {
        const blob = await generateDocx(data, options);
        downloadBlob(blob, filename);
        return blob;
    } catch (error) {
        console.error('[DocxWriter]: Error al generar y descargar:', error);
        throw error;
    }
}

/**
 * Verifica que todas las dependencias estén cargadas.
 * @returns {boolean}
 */
export function checkDependencies() {
    const hasDocx = typeof docxLib !== 'undefined';
    const hasFileSaver = typeof saveAs !== 'undefined';
    
    console.log('[DocxWriter] Verificación de dependencias:', {
        docx: hasDocx ? '✓' : '✗',
        fileSaver: hasFileSaver ? '✓' : '✗'
    });
    
    return hasDocx;
}