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
 * Mammoth convierte cada <p> de Word en un <p> en HTML.
 * 
 * @param {Document} doc - Documento DOM parseado.
 * @returns {Array<Object>} Array de objetos párrafo.
 */
function extractParagraphsFromHtml(doc) {
    const paragraphs = [];
    const pElements = doc.querySelectorAll('p');

    pElements.forEach((p, index) => {
        const text = p.textContent || "";
        const innerHTML = p.innerHTML;
        
        // Detectar si es un título basado en clases de mammoth (ej. "style-code-heading-1")
        // Mammoth asigna clases como "style-code-heading-1" si el estilo original era Heading 1.
        let detectedLevel = 0;
        if (p.classList.contains('style-code-heading-1')) detectedLevel = 1;
        else if (p.classList.contains('style-code-heading-2')) detectedLevel = 2;
        else if (p.classList.contains('style-code-heading-3')) detectedLevel = 3;
        else if (p.classList.contains('style-code-heading-4')) detectedLevel = 4;
        else if (p.classList.contains('style-code-heading-5')) detectedLevel = 5;

        // Detectar si es una lista (mammoth a veces pone listas en <ul>/<li>, pero a veces en <p>)
        // Aquí asumimos que si está en <p>, es un párrafo normal o título.

        paragraphs.push({
            id: `p-${index}`,
            type: detectedLevel > 0 ? 'heading' : 'body', // Se refinara en paragraphs.js
            level: detectedLevel,
            text: text,
            html: innerHTML,
            rawElement: p // Referencia al nodo DOM si se necesita inspección profunda
        });
    });

    return paragraphs;
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