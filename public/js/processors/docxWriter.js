/**
 * js/processors/docxWriter.js
 * 
 * Módulo dedicado a la generación y exportación del nuevo documento .DOCX.
 * 
 * Dependencias:
 * - docx (cargado desde CDN como window.docx)
 * - FileSaver.js (opcional, para facilitar la descarga)
 */

// =========================================
// VERIFICACIÓN DE DEPENDENCIAS
// =========================================

// El bundle UMD puede exponer las clases de diferentes formas
const docxGlobal = typeof docx !== 'undefined' ? docx : (typeof window !== 'undefined' ? window.docx : undefined);

// Intentar acceder a las clases (algunas versiones las ponen bajo docx.docx)
const docxLib = docxGlobal?.docx || docxGlobal;

if (!docxLib) {
    console.error('[DocxWriter] CRÍTICO: docx.js no está cargado correctamente.');
    throw new Error('docx.js no está cargado. Por favor recarga la página.');
}

console.log('[DocxWriter] docx.js cargado correctamente');

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
 * @param {Object} data - Objeto con { paragraphs, tables, images, abstract }.
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
            const imagePromises = images.map(async (img) => {
                return await convertToDocxImage(img);
            });
            
            const resolvedImages = await Promise.all(imagePromises);
            resolvedImages.forEach(docxImage => {
                if (docxImage) bodyChildren.push(docxImage);
            });
        }

        // 3. Configurar Secciones y Encabezados
        const header = new docxLib.Header({
            children: [
                new docxLib.Paragraph({
                    alignment: docxLib.AlignmentType.RIGHT,
                    children: [new docxLib.TextRun({ text: "1", size: 24 })]
                })
            ]
        });

        const footer = new docxLib.Footer({ children: [] });

        // 4. Crear la Sección Principal
        const section = new docxLib.Section({
            properties: {
                margins: { top: 914400, right: 914400, bottom: 914400, left: 914400 },
                header: header,
                footer: footer
            },
            children: [...titlePageChildren, ...bodyChildren]
        });

        // 5. Crear el Documento
        const doc = new docxLib.Document({
            sections: [section],
            styles: {
                default: {
                    heading1: { run: { size: 24, bold: true } },
                    heading2: { run: { size: 24, bold: true } }
                }
            }
        });

        // 6. Generar el Blob
        console.log('[DocxWriter]: Serializando documento...');
        const buffer = await docxLib.Packer.toBuffer(doc);
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

        console.log('[DocxWriter]: Documento generado exitosamente.', { size: `${(blob.size / 1024).toFixed(2)} KB` });
        return blob;

    } catch (error) {
        console.error('[DocxWriter]: Error fatal al generar el documento:', error);
        throw error;
    }
}

// =========================================
// CONTENIDO DE PORTADA
// =========================================

function buildTitlePageContent(title, author, affiliation, course, instructor, date) {
    const children = [];
    
    const titleText = title || 'Título del Documento';
    const authorText = author || 'Nombre del Autor';
    const affiliationText = affiliation || 'Afiliación Institucional';
    const dateText = date || new Date().toLocaleDateString('es-ES');

    // Espaciadores
    for(let i=0; i<5; i++) {
        children.push(new docxLib.Paragraph({ children: [] }));
    }

    // Título
    children.push(new docxLib.Paragraph({
        alignment: docxLib.AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [
            new docxLib.TextRun({
                text: titleText,
                bold: true,
                size: 24,
                font: APA_STANDARDS.FONT.DEFAULT_FAMILY
            })
        ]
    }));

    // Autor
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

    // Afiliación
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

    // Curso, Instructor, Fecha
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

    // Cuerpo
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

function convertToDocxParagraph(p) {
    if (!p || !p.text) return null;

    let spacing = { 
        line: APA_STANDARDS.SPACING.LINE_DOUBLE, 
        lineRule: docxLib.LineRuleType.AUTO, 
        before: 0, 
        after: 0 
    };
    let indent = { firstLine: 0 };

    if (p.type === 'body') {
        indent.firstLine = 720;
    } else if (p.type === 'reference') {
        indent.hanging = 720;
        indent.firstLine = 0;
    } else if (p.type === 'heading') {
        spacing = { before: 240, after: 120, line: APA_STANDARDS.SPACING.LINE_DOUBLE, lineRule: docxLib.LineRuleType.AUTO };
        indent = { firstLine: 0 };
    }

    let alignment = docxLib.AlignmentType.LEFT;
    if (p.type === 'heading' && p.level === 1) alignment = docxLib.AlignmentType.CENTER;

    const run = new docxLib.TextRun({
        text: p.text,
        size: 24,
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
                                    size: 20,
                                    bold: cell.isHeader || false,
                                    font: APA_STANDARDS.FONT.DEFAULT_FAMILY
                                })
                            ],
                            alignment: cell.isNumeric ? docxLib.AlignmentType.RIGHT : docxLib.AlignmentType.LEFT
                        })
                    ],
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

async function convertToDocxImage(img) {
    if (!img || !img.src) return null;

    let imageData;
    
    if (img.src.startsWith('data:')) {
        const base64Data = img.src.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        imageData = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            imageData[i] = binaryString.charCodeAt(i);
        }
    } else if (img.src.startsWith('http')) {
        try {
            const response = await fetch(img.src);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            imageData = new Uint8Array(arrayBuffer);
        } catch (e) {
            console.warn('[DocxWriter]: No se pudo cargar imagen desde URL:', img.src, e);
            return null;
        }
    } else {
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

export function downloadBlob(blob, filename = "documento_apa.docx") {
    if (!blob) {
        console.error('[DocxWriter]: No se puede descargar, blob vacío.');
        return;
    }

    if (typeof saveAs !== 'undefined') {
        saveAs(blob, filename);
        console.log('[DocxWriter]: Documento descargado:', filename);
    } else {
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
// UTILIDADES
// =========================================

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

export function checkDependencies() {
    const hasDocx = typeof docxLib !== 'undefined';
    const hasFileSaver = typeof saveAs !== 'undefined';
    
    console.log('[DocxWriter] Verificación de dependencias:', {
        docx: hasDocx ? '✓' : '✗',
        fileSaver: hasFileSaver ? '✓' : '✗'
    });
    
    return hasDocx;
}