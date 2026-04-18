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
 * - docx (npm install docx) - Debe estar cargada globalmente o importada.
 * - FileSaver.js (opcional, para facilitar la descarga)
 * 
 * Nota: Este módulo asume que los datos de entrada ya han sido formateados 
 * por los módulos de APA (margins, spacing, typography, etc.).
 */

// Importamos la librería docx (asumiendo que está disponible globalmente como 'docx' o se importa)
// import * as docx from "docx"; 

/**
 * Genera un nuevo documento DOCX formateado según APA 7.
 * 
 * @param {Object} data - Objeto con { paragraphs, tables, images, metadata }.
 * @param {Object} options - Opciones de configuración (título, autor, etc.).
 * @returns {Promise<Blob>} El blob del archivo generado.
 */
export async function generateDocx(data, options = {}) {
    const { paragraphs, tables, images } = data;
    const { title, author, affiliation, course, instructor, date } = options;

    console.log('[DocxWriter]: Iniciando generación del documento...');

    try {
        // 1. Construir la Portada (Title Page)
        const titlePageChildren = buildTitlePageContent(title, author, affiliation, course, instructor, date);

        // 2. Construir el Cuerpo del Documento
        const bodyChildren = [];

        // Añadir Abstract si existe
        if (data.abstract) {
            bodyChildren.push(...buildAbstractContent(data.abstract));
        }

        // Añadir Párrafos procesados
        paragraphs.forEach(p => {
            // Convertir nuestro objeto interno a un objeto docx.Paragraph
            const docxParagraph = convertToDocxParagraph(p);
            if (docxParagraph) bodyChildren.push(docxParagraph);
        });

        // Añadir Tablas procesadas
        tables.forEach(t => {
            const docxTable = convertToDocxTable(t);
            if (docxTable) bodyChildren.push(docxTable);
        });

        // Añadir Imágenes procesadas
        images.forEach(img => {
            const docxImage = convertToDocxImage(img);
            if (docxImage) bodyChildren.push(docxImage);
        });

        // 3. Configurar Secciones y Encabezados
        // En docx, podemos tener múltiples secciones. Aquí usaremos una sola sección 
        // con un header que contenga la numeración de página.
        
        const header = new docx.Header({
            children: [
                new docx.Paragraph({
                    alignment: docx.AlignmentType.RIGHT,
                    children: [
                        new docx.Field({
                            fieldCode: "PAGE",
                            text: "1"
                        })
                    ]
                })
            ]
        });

        const footer = new docx.Footer({
            children: [] // Vacío según APA 7
        });

        // 4. Crear la Sección Principal
        const section = new docx.Section({
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
        const doc = new docx.Document({
            sections: [section],
            styles: {
                // Definir estilos base si es necesario, aunque los aplicamos inline
                default: {
                    heading1: { run: { size: 24, bold: true } },
                    heading2: { run: { size: 24, bold: true } },
                    // ... otros estilos
                }
            }
        });

        // 6. Generar el Blob
        const buffer = await docx.Packer.toBuffer(doc);
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

        console.log('[DocxWriter]: Documento generado exitosamente.');
        return blob;

    } catch (error) {
        console.error('[DocxWriter]: Error fatal al generar el documento:', error);
        throw error;
    }
}

/**
 * Construye el contenido de la portada.
 * @returns {Array} Array de elementos docx.
 */
function buildTitlePageContent(title, author, affiliation, course, instructor, date) {
    const children = [];
    
    // Espaciadores para centrar verticalmente (aprox 4-5 líneas)
    for(let i=0; i<5; i++) {
        children.push(new docx.Paragraph({ children: [] }));
    }

    // Título
    if (title) {
        children.push(new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [
                new docx.TextRun({
                    text: title,
                    bold: true,
                    size: 24 // 12pt
                })
            ]
        }));
    }

    // Autor
    if (author) {
        children.push(new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
                new docx.TextRun({
                    text: author,
                    size: 24
                })
            ]
        }));
    }

    // Afiliación
    if (affiliation) {
        children.push(new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
                new docx.TextRun({
                    text: affiliation,
                    size: 24
                })
            ]
        }));
    }

    // Curso, Instructor, Fecha
    if (course) children.push(createCenteredParagraph(course));
    if (instructor) children.push(createCenteredParagraph(instructor));
    if (date) children.push(createCenteredParagraph(date));

    // Espaciador final
    for(let i=0; i<2; i++) {
        children.push(new docx.Paragraph({ children: [] }));
    }

    return children;
}

function createCenteredParagraph(text) {
    return new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
        children: [
            new docx.TextRun({
                text: text,
                size: 24
            })
        ]
    });
}

/**
 * Construye el contenido del Abstract.
 * @returns {Array} Array de elementos docx.
 */
function buildAbstractContent(abstractData) {
    const children = [];

    // Título "Resumen"
    children.push(new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [
            new docx.TextRun({
                text: "Resumen",
                bold: true,
                size: 24
            })
        ]
    }));

    // Cuerpo (sin sangría)
    if (abstractData.body) {
        children.push(new docx.Paragraph({
            alignment: docx.AlignmentType.LEFT,
            spacing: { line: 480, lineRule: docx.LineRuleType.AUTO, before: 0, after: 0 }, // Doble espacio
            indent: { firstLine: 0 }, // Sin sangría
            children: [
                new docx.TextRun({
                    text: abstractData.body,
                    size: 24
                })
            ]
        }));
    }

    // Palabras clave
    if (abstractData.keywords && abstractData.keywords.length > 0) {
        const kwText = "Palabras clave: " + abstractData.keywords.join(", ");
        children.push(new docx.Paragraph({
            alignment: docx.AlignmentType.LEFT,
            spacing: { before: 200, after: 0, line: 480, lineRule: docx.LineRuleType.AUTO },
            indent: { firstLine: 0 },
            children: [
                new docx.TextRun({
                    text: "Palabras clave:",
                    italics: true,
                    size: 24
                }),
                new docx.TextRun({
                    text: " " + abstractData.keywords.join(", "),
                    size: 24
                })
            ]
        }));
    }

    return children;
}

/**
 * Convierte nuestro objeto interno de párrafo a docx.Paragraph.
 * @param {Object} p - Párrafo procesado.
 * @returns {docx.Paragraph}
 */
function convertToDocxParagraph(p) {
    if (!p || !p.text) return null;

    // Configurar espaciado y sangría según el tipo
    let spacing = { line: 480, lineRule: docx.LineRuleType.AUTO, before: 0, after: 0 };
    let indent = { firstLine: 0 };

    if (p.type === 'body') {
        indent.firstLine = 720; // 0.5"
    } else if (p.type === 'reference') {
        indent.hanging = 720;
        indent.firstLine = 0;
    } else if (p.type === 'heading') {
        spacing = { before: 240, after: 120, line: 480, lineRule: docx.LineRuleType.AUTO };
        indent = { firstLine: 0 };
    }

    // Configurar alineación
    let alignment = docx.AlignmentType.LEFT;
    if (p.type === 'heading' && p.level === 1) alignment = docx.AlignmentType.CENTER;

    // Crear el TextRun
    const run = new docx.TextRun({
        text: p.text,
        size: 24, // 12pt
        bold: p.isBold || false,
        italics: p.isItalic || false,
        font: "Times New Roman"
    });

    return new docx.Paragraph({
        alignment: alignment,
        spacing: spacing,
        indent: indent,
        children: [run]
    });
}

/**
 * Convierte una tabla interna a docx.Table.
 * @param {Object} t - Tabla procesada.
 * @returns {docx.Table}
 */
function convertToDocxTable(t) {
    if (!t || !t.rows) return null;

    const rows = t.rows.map(row => {
        return new docx.TableRow({
            children: row.cells.map(cell => {
                return new docx.TableCell({
                    children: [
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text: cell.text,
                                    size: 20, // 10pt para tablas
                                    bold: cell.isHeader
                                })
                            ],
                            alignment: cell.isNumeric ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT
                        })
                    ],
                    // Bordes: Solo horizontales en encabezado
                    borders: {
                        top: { style: docx.BorderStyle.NONE, size: 0 },
                        bottom: cell.isHeader ? { style: docx.BorderStyle.SINGLE, size: 2, color: "auto" } : { style: docx.BorderStyle.NONE, size: 0 },
                        left: { style: docx.BorderStyle.NONE, size: 0 },
                        right: { style: docx.BorderStyle.NONE, size: 0 }
                    }
                });
            })
        });
    });

    return new docx.Table({
        rows: rows,
        width: { size: 100, type: docx.WidthType.PERCENTAGE }
    });
}

/**
 * Convierte una imagen interna a docx.ImageRun.
 * @param {Object} img - Imagen procesada.
 * @returns {docx.ImageRun}
 */
function convertToDocxImage(img) {
    if (!img || !img.src) return null;

    // Convertir base64 a buffer si es necesario
    let imageData = img.src;
    if (img.src.startsWith('data:')) {
        // Extraer base64
        const base64Data = img.src.split(',')[1];
        imageData = Buffer.from(base64Data, 'base64');
    }

    return new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        children: [
            new docx.ImageRun({
                data: imageData,
                transformation: {
                    width: img.width || 400,
                    height: img.height || 300
                }
            })
        ]
    });
}

/**
 * Descarga el blob generado.
 * @param {Blob} blob 
 * @param {string} filename 
 */
export function downloadBlob(blob, filename = "documento_apa.docx") {
    if (typeof saveAs !== 'undefined') {
        saveAs(blob, filename);
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
    }
}