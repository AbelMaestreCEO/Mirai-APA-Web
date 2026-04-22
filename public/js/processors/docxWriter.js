/**
 * js/processors/docxWriter.js
 * 
 * Generación y exportación del documento .DOCX formateado a APA 7.
 * Compatible con docx v8+ (UMD build).
 */

/**
 * Genera un nuevo documento DOCX formateado según APA 7.
 * 
 * @param {Object} data - { paragraphs, tables, images, metadata }
 * @param {Object} options - { title, author, affiliation, course, instructor, date }
 * @returns {Promise<Blob>} Blob del archivo generado.
 */
export async function generateDocx(data, options = {}) {
    const { paragraphs = [], tables = [], images = [] } = data;
    const { title, author, affiliation, course, instructor, date } = options;

    console.log('[DocxWriter]: Iniciando generación del documento...');

    try {
        // 1. Construir la Portada
        const titlePageChildren = buildTitlePageContent(title, author, affiliation, course, instructor, date);

        // 2. Construir el Cuerpo del Documento
        const bodyChildren = [];

        // Abstract si existe
        if (data.abstract) {
            bodyChildren.push(...buildAbstractContent(data.abstract));
        }

        // Párrafos procesados
        paragraphs.forEach(p => {
            const docxParagraph = convertToDocxParagraph(p);
            if (docxParagraph) bodyChildren.push(docxParagraph);
        });

        // Tablas procesadas
        tables.forEach(t => {
            const docxTable = convertToDocxTable(t);
            if (docxTable) bodyChildren.push(docxTable);
        });

        // Imágenes procesadas
        images.forEach(img => {
            const docxImage = convertToDocxImage(img);
            if (docxImage) bodyChildren.push(docxImage);
        });

        // 3. Crear el Documento (API v8+)
        const doc = new docx.Document({
            sections: [{
                properties: {
                    // Márgenes APA 7: 2.54 cm = 1440 twips por pulgada
                    page: {
                        margin: {
                            top: 1440,    // 1 inch = 1440 twips
                            right: 1440,
                            bottom: 1440,
                            left: 1440
                        }
                    }
                },
                headers: {
                    default: new docx.Header({
                        children: [
                            new docx.Paragraph({
                                alignment: docx.AlignmentType.RIGHT,
                                children: [
                                    new docx.TextRun({
                                        children: [docx.PageNumber.CURRENT],
                                        font: "Times New Roman",
                                        size: 24
                                    })
                                ]
                            })
                        ]
                    })
                },
                footers: {
                    default: new docx.Footer({
                        children: []
                    })
                },
                children: [
                    ...titlePageChildren,
                    ...bodyChildren
                ]
            }],
            styles: {
                default: {
                    document: {
                        run: {
                            font: "Times New Roman",
                            size: 24
                        }
                    }
                }
            }
        });

        // 4. Generar el Blob (API de navegador, NO toBuffer)
        const blob = await docx.Packer.toBlob(doc);

        console.log('[DocxWriter]: Documento generado exitosamente.');
        return blob;

    } catch (error) {
        console.error('[DocxWriter]: Error fatal al generar el documento:', error);
        throw error;
    }
}

// =========================================
// PORTADA
// =========================================

function buildTitlePageContent(title, author, affiliation, course, instructor, date) {
    const children = [];

    // Espaciadores para centrar verticalmente (~4-5 líneas)
    for (let i = 0; i < 5; i++) {
        children.push(new docx.Paragraph({
            spacing: { before: 0, after: 0, line: 480 },
            children: []
        }));
    }

    // Título (Negrita, Centrado)
    if (title) {
        children.push(new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            spacing: { before: 0, after: 200, line: 480 },
            children: [
                new docx.TextRun({
                    text: title,
                    bold: true,
                    font: "Times New Roman",
                    size: 24
                })
            ]
        }));
    }

    // Autor
    if (author) {
        children.push(createCenteredRun(author, false));
    }

    // Afiliación
    if (affiliation) {
        children.push(createCenteredRun(affiliation, false));
    }

    // Curso, Instructor, Fecha
    if (course) children.push(createCenteredRun(course, false));
    if (instructor) children.push(createCenteredRun(instructor, false));
    if (date) children.push(createCenteredRun(date, false));

    // Espaciador final
    for (let i = 0; i < 2; i++) {
        children.push(new docx.Paragraph({
            spacing: { before: 0, after: 0, line: 480 },
            children: []
        }));
    }

    return children;
}

function createCenteredRun(text, bold = false) {
    return new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        spacing: { before: 200, after: 200, line: 480 },
        children: [
            new docx.TextRun({
                text: text,
                bold: bold,
                font: "Times New Roman",
                size: 24
            })
        ]
    });
}

// =========================================
// ABSTRACT
// =========================================

function buildAbstractContent(abstractData) {
    const children = [];

    // Título "Resumen"
    children.push(new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        spacing: { before: 0, after: 200, line: 480 },
        children: [
            new docx.TextRun({
                text: "Resumen",
                bold: true,
                font: "Times New Roman",
                size: 24
            })
        ]
    }));

    // Cuerpo (sin sangría)
    if (abstractData.body) {
        children.push(new docx.Paragraph({
            alignment: docx.AlignmentType.LEFT,
            spacing: { before: 0, after: 0, line: 480 },
            indent: { firstLine: 0 },
            children: [
                new docx.TextRun({
                    text: abstractData.body,
                    font: "Times New Roman",
                    size: 24
                })
            ]
        }));
    }

    // Palabras clave
    if (abstractData.keywords && abstractData.keywords.length > 0) {
        children.push(new docx.Paragraph({
            alignment: docx.AlignmentType.LEFT,
            spacing: { before: 200, after: 0, line: 480 },
            indent: { firstLine: 0 },
            children: [
                new docx.TextRun({
                    text: "Palabras clave: ",
                    italics: true,
                    font: "Times New Roman",
                    size: 24
                }),
                new docx.TextRun({
                    text: abstractData.keywords.join(", "),
                    font: "Times New Roman",
                    size: 24
                })
            ]
        }));
    }

    return children;
}

// =========================================
// CONVERSIÓN DE PÁRRAFOS
// =========================================

function convertToDocxParagraph(p) {
    if (!p || !p.text) return null;

    // Espaciado y sangría según tipo
    let spacing = { before: 0, after: 0, line: 480 };
    let indent = {};

    if (p.type === 'body') {
        indent.firstLine = 720; // 0.5" = 720 twips
    } else if (p.type === 'reference') {
        indent.hanging = 720;   // Sangría francesa
    } else if (p.type === 'heading') {
        spacing.before = 240;
        spacing.after = 120;
    }

    // Alineación
    let alignment = docx.AlignmentType.LEFT;
    if (p.type === 'heading' && p.level === 1) {
        alignment = docx.AlignmentType.CENTER;
    }

    return new docx.Paragraph({
        alignment,
        spacing,
        indent: Object.keys(indent).length > 0 ? indent : undefined,
        children: [
            new docx.TextRun({
                text: p.text,
                bold: p.isBold || false,
                italics: p.isItalic || false,
                font: "Times New Roman",
                size: 24
            })
        ]
    });
}

// =========================================
// CONVERSIÓN DE TABLAS
// =========================================

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
                                    text: cell.text || "",
                                    size: 20, // 10pt para tablas
                                    bold: cell.isHeader || false,
                                    font: "Times New Roman"
                                })
                            ],
                            alignment: cell.isNumeric
                                ? docx.AlignmentType.RIGHT
                                : docx.AlignmentType.LEFT
                        })
                    ],
                    borders: {
                        top: { style: cell.isHeader ? docx.BorderStyle.SINGLE : docx.BorderStyle.NONE, size: 1 },
                        bottom: { style: docx.BorderStyle.SINGLE, size: 1 },
                        left: { style: docx.BorderStyle.NONE, size: 0 },
                        right: { style: docx.BorderStyle.NONE, size: 0 }
                    }
                });
            })
        });
    });

    return new docx.Table({
        rows,
        width: { size: 100, type: docx.WidthType.PERCENTAGE }
    });
}

// =========================================
// CONVERSIÓN DE IMÁGENES
// =========================================

function convertToDocxImage(img) {
    if (!img || !img.src) return null;

    let imageData = img.src;
    if (img.src.startsWith('data:')) {
        // Extraer base64 y convertir a Uint8Array para el navegador
        const base64Data = img.src.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        imageData = bytes;
    }

    return new docx.Paragraph({
        alignment: docx.AlignmentType.CENTER,
        children: [
            new docx.ImageRun({
                data: imageData,
                transformation: {
                    width: img.width || 400,
                    height: img.height || 300
                },
                type: img.type || docx.ImageType.PNG
            })
        ]
    });
}

// =========================================
// DESCARGA
// =========================================

export function downloadBlob(blob, filename = "documento_apa.docx") {
    if (typeof saveAs !== 'undefined') {
        saveAs(blob, filename);
    } else {
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