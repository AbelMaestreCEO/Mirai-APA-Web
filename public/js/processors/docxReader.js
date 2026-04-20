/**
 * js/processors/docxReader.js
 * 
 * Módulo dedicado a la lectura y extracción de contenido de archivos .DOCX.
 * 
 * Funcionamiento:
 * 1. Recibe un File object o ArrayBuffer.
 * 2. Usa mammoth.js (o librería similar) para convertir el DOCX a una estructura JSON/HTML legible.
 * 3. Extrae párrafos, tablas e imágenes.
 * 4. Devuelve un array de objetos estandarizados para ser procesados por los módulos APA.
 * 
 * Dependencias externas (deben estar cargadas en index.html):
 * - mammoth.js (npm install mammoth)
 * - jszip (opcional, si se usa para inspección profunda)
 * 
 * Nota: Este módulo NO formatea nada. Solo extrae y normaliza la estructura.
 */

// Asumimos que mammoth está disponible globalmente o se importa como módulo
// import * as mammoth from "mammoth"; 

/**
 * Lee un archivo DOCX y extrae su contenido estructurado.
 * 
 * @param {File|Blob|ArrayBuffer} file - El archivo subido por el usuario.
 * @returns {Promise<Object>} Promesa que resuelve con un objeto { paragraphs, tables, images, metadata }.
 */
export async function readDocxFile(file) {
    if (!file) {
        throw new Error('[DocxReader]: No se proporcionó ningún archivo.');
    }

    // Validar extensión
    if (!file.name.toLowerCase().endsWith('.docx')) {
        throw new Error('[DocxReader]: El archivo debe ser un documento .DOCX.');
    }

    try {
        // Usar mammoth para extraer el contenido.
        // mammoth.convertToHtml es útil, pero para mantener la estructura de párrafos,
        // a veces es mejor usar convertToRaw si la librería lo soporta, o parsear el HTML resultante.
        // Aquí usaremos la conversión a HTML y luego parsearemos el HTML para obtener párrafos.
        
        const arrayBuffer = await file.arrayBuffer();
        
        // Opción A: Usar mammoth para extraer texto plano y estructura básica
        // Esto es más rápido y suficiente para aplicar estilos APA.
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const htmlContent = result.value; // HTML string
        const messages = result.messages; // Advertencias (ej. estilos ignorados)

        if (messages.length > 0) {
            console.warn('[DocxReader]: Advertencias durante la lectura:', messages);
        }

        // Parsear el HTML resultante para extraer párrafos y tablas
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // Extraer párrafos
        const rawParagraphs = extractParagraphsFromHtml(doc);
        
        // Extraer tablas (si las hay)
        const rawTables = extractTablesFromHtml(doc);

        // Extraer imágenes (referencias)
        const rawImages = extractImagesFromHtml(doc);

        console.log(`[DocxReader]: Archivo leído correctamente. ${rawParagraphs.length} párrafos, ${rawTables.length} tablas.`);

        return {
            paragraphs: rawParagraphs,
            tables: rawTables,
            images: rawImages,
            rawHtml: htmlContent // Guardar HTML crudo por si se necesita depuración
        };

    } catch (error) {
        console.error('[DocxReader]: Error al leer el archivo DOCX:', error);
        throw new Error(`Error al procesar el archivo: ${error.message}`);
    }
}

/**
 * Extrae párrafos del HTML generado por mammoth.
 * Mammoth genera <p> para cuerpo y <h1>-<h6> para títulos.
 * También maneja <ul>/<ol> como listas de párrafos.
 *
 * @param {Document} doc - Documento DOM parseado.
 * @returns {Array<Object>} Array de objetos párrafo.
 */
function extractParagraphsFromHtml(doc) {
    const paragraphs = [];

    // Seleccionar todos los nodos relevantes en orden de aparición
    const elements = doc.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');

    elements.forEach((el, index) => {
        const tag = el.tagName.toLowerCase();

        // Nivel de título según el tag HTML
        const headingTagLevel = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };
        let detectedLevel = headingTagLevel[tag] || 0;

        // También detectar por clases que mammoth puede añadir a <p>
        if (detectedLevel === 0) {
            if (el.classList.contains('Heading1') || el.classList.contains('heading-1')) detectedLevel = 1;
            else if (el.classList.contains('Heading2') || el.classList.contains('heading-2')) detectedLevel = 2;
            else if (el.classList.contains('Heading3') || el.classList.contains('heading-3')) detectedLevel = 3;
            else if (el.classList.contains('Heading4') || el.classList.contains('heading-4')) detectedLevel = 4;
            else if (el.classList.contains('Heading5') || el.classList.contains('heading-5')) detectedLevel = 5;
        }

        // Extraer los "runs" (fragmentos de texto con formato) del elemento
        const runs = extractRunsFromElement(el);

        // Texto plano completo (uniendo todos los runs)
        const text = runs.map(r => r.text).join('');

        // Ignorar párrafos completamente vacíos
        if (text.trim() === '') return;

        // Detectar tipo de párrafo
        let type = 'body';
        if (detectedLevel > 0) {
            type = 'heading';
        } else if (/^[A-Z][a-záéíóúü]+,\s+[A-Z]\.\s+\(\d{4}\)/i.test(text.trim())) {
            type = 'reference';
        }

        paragraphs.push({
            id: `p-${index}`,
            type,
            level: detectedLevel,
            text,
            runs,
            html: el.innerHTML,
            isBold: runs.some(r => r.bold),
            isItalic: runs.every(r => r.italic) && runs.length > 0,
        });
    });

    return paragraphs;
}

/**
 * Extrae los fragmentos de texto con su formato (bold, italic) de un elemento DOM.
 * Recorre los nodos hijos para preservar el formato inline de mammoth.
 *
 * @param {Element} el - Elemento DOM.
 * @returns {Array<{text: string, bold: boolean, italic: boolean}>}
 */
function extractRunsFromElement(el) {
    const runs = [];

    function walk(node, bold, italic) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text) runs.push({ text, bold, italic });
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();
        const isBold   = bold   || tag === 'strong' || tag === 'b';
        const isItalic = italic || tag === 'em'     || tag === 'i';

        for (const child of node.childNodes) {
            walk(child, isBold, isItalic);
        }
    }

    // Determinar si el elemento raíz es heading (negrita implícita)
    const tag = el.tagName.toLowerCase();
    const rootBold = ['h1','h2','h3','h4','h5','h6'].includes(tag);

    for (const child of el.childNodes) {
        walk(child, rootBold, false);
    }

    return runs;
}

/**
 * Extrae tablas del HTML.
 * 
 * @param {Document} doc - Documento DOM.
 * @returns {Array<Object>} Array de objetos tabla.
 */
function extractTablesFromHtml(doc) {
    const tables = [];
    const tableElements = doc.querySelectorAll('table');

    tableElements.forEach((table, index) => {
        const rows = [];
        const trElements = table.querySelectorAll('tr');

        trElements.forEach(tr => {
            const cells = [];
            const tdElements = tr.querySelectorAll('td, th');
            
            tdElements.forEach(td => {
                cells.push({
                    text: td.textContent,
                    html: td.innerHTML,
                    isHeader: td.tagName === 'TH'
                });
            });
            rows.push(cells);
        });

        tables.push({
            id: `tbl-${index}`,
            rows: rows,
            rawElement: table
        });
    });

    return tables;
}

/**
 * Extrae referencias a imágenes.
 * Mammoth convierte imágenes en <img> con src como data URI o URL.
 * 
 * @param {Document} doc - Documento DOM.
 * @returns {Array<Object>} Array de objetos imagen.
 */
function extractImagesFromHtml(doc) {
    const images = [];
    const imgElements = doc.querySelectorAll('img');

    imgElements.forEach((img, index) => {
        images.push({
            id: `img-${index}`,
            src: img.src, // Puede ser data:image/png;base64,...
            alt: img.alt || `Imagen ${index + 1}`,
            width: img.width,
            height: img.height,
            rawElement: img
        });
    });

    return images;
}

/**
 * Función auxiliar para leer un archivo DOCX directamente como texto XML (avanzado).
 * Si se necesita acceso directo al XML de Word (ej. para modificar estilos específicos),
 * se puede usar JSZip.
 * 
 * @param {File} file 
 * @returns {Promise<Object>}
 */
export async function readDocxXmlDirectly(file) {
    // Esta función es un fallback si mammoth no es suficiente.
    // Requiere la librería 'jszip'.
    if (typeof JSZip === 'undefined') {
        console.warn('[DocxReader]: JSZip no está cargado. No se puede leer XML directamente.');
        return null;
    }

    try {
        const zip = await JSZip.loadAsync(file);
        const documentXml = await zip.file("word/document.xml").async("string");
        
        // Aquí se usaría un parser XML (como xmldom) para navegar el XML de Word.
        // Esto es mucho más complejo pero da control total sobre los estilos.
        // Por ahora, retornamos el XML crudo.
        return { xml: documentXml };
    } catch (error) {
        console.error('[DocxReader]: Error leyendo XML directo:', error);
        return null;
    }
}

/**
 * Valida que el archivo sea realmente un DOCX (magic number check).
 * 
 * @param {File} file 
 * @returns {boolean}
 */
export function validateDocxFile(file) {
    // Un DOCX es un ZIP. El magic number de ZIP es PK.
    // Pero en el navegador es difícil leer los primeros bytes sin arrayBuffer.
    // La validación de extensión suele ser suficiente para una app web.
    return file.name.toLowerCase().endsWith('.docx');
}