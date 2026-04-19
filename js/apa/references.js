/**
 * js/apa/references.js
 * 
 * Módulo dedicado al formateo y organización de la Lista de Referencias.
 * 
 * Normas APA 7 para Referencias:
 * 1. Orden: Alfabético por apellido del primer autor.
 * 2. Sangría: Francesa (Hanging Indent) de 1.27 cm (0.5 pulgadas).
 * 3. Interlineado: Doble en todo el documento (incluido entre referencias).
 * 4. Títulos de obras:
 *    - Libros, Informes, Películas: Título en cursiva (Italic).
 *    - Artículos de revista: Título de la revista en cursiva, volumen en cursiva.
 *    - Artículos web: Título en normal (sin cursiva), URL al final.
 * 5. Autores: "&" antes del último autor (en inglés) o "y" (en español).
 * 
 * Nota: Este módulo asume que el texto ya está escrito y se centra en el formato visual.
 *       La extracción semántica (quién es autor, quién es título) es un problema de NLP.
 *       Aquí aplicamos heurísticas para detectar patrones comunes.
 * 
 * Dependencias:
 * - spacing.js (para sangría francesa e interlineado)
 * - typography.js (para fuentes y cursivas)
 * - paragraphs.js (para limpieza básica)
 */

import { applyHangingIndent, applyDoubleLineSpacing, removeParagraphSpacing } from './spacing.js';
import { applyStandardTypography } from './typography.js';
import { cleanParagraphStyles } from './paragraphs.js';

// =========================================
// PATRONES DE DETECCIÓN (Heurísticas)
// =========================================

// Patrones comunes para identificar partes de una referencia
const REF_PATTERNS = {
    // Autor: Apellido, Iniciales. (Año).
    AUTHOR_YEAR: /^([A-Z][a-z]+,?\s+[A-Z]\.)\s+\((\d{4})\)/i,
    // Título de libro/revista (suele ir después del año y punto)
    TITLE_START: /\)\s+(.+?)(?:\.|\(|$)/,
    // Volumen (número) en cursiva: Vol. 12(3)
    VOLUME: /Vol\.?\s+(\d+)/i,
    // DOI o URL
    DOI_URL: /(https?:\/\/|doi\.org\/)[^\s]+/i
};

/**
 * Analiza un texto de referencia para identificar sus componentes.
 * Retorna un objeto con las partes detectadas para aplicar estilos específicos.
 * 
 * @param {string} text - El texto completo de la referencia.
 * @returns {Object} Objeto con { author, year, title, source, doiUrl }.
 */
export function parseReferenceStructure(text) {
    const result = {
        author: '',
        year: '',
        title: '',
        source: '',
        doiUrl: '',
        isBook: false,
        isJournal: false
    };

    const matchAuthor = text.match(REF_PATTERNS.AUTHOR_YEAR);
    if (matchAuthor) {
        result.author = matchAuthor[1];
        result.year = matchAuthor[2];
    }

    // Buscar DOI/URL primero (suele estar al final)
    const matchUrl = text.match(REF_PATTERNS.DOI_URL);
    if (matchUrl) {
        result.doiUrl = matchUrl[0];
        // Remover URL del texto para analizar el resto
        text = text.replace(matchUrl[0], '').trim();
    }

    // Detectar si es artículo de revista (tiene "Vol." o "pp.")
    if (/\b(Vol\.|pp\.|Retrieved from)\b/i.test(text)) {
        result.isJournal = true;
    } else {
        // Si no tiene indicadores de revista, asumimos libro/informe
        result.isBook = true;
    }

    // Extraer título (heurística simple: lo que está entre el año y el punto siguiente o la fuente)
    // Esto es difícil de hacer perfecto sin NLP, pero intentamos capturar lo que sigue al año.
    const parts = text.split('. ');
    if (parts.length > 1) {
        // El segundo segmento suele ser el título
        result.title = parts[1] || '';
        // El resto es la fuente
        result.source = parts.slice(2).join('. ').trim();
    }

    return result;
}

// =========================================
// APLICACIÓN DE ESTILOS VISUALES
// =========================================

/**
 * Aplica el formato visual completo a un párrafo que es una referencia.
 * 
 * @param {Object} paragraph - El objeto párrafo.
 * @param {string} text - El texto del párrafo.
 * @returns {Object} Párrafo formateado.
 */
export function formatReferenceParagraph(paragraph, text) {
    if (!paragraph) return null;

    // 1. Limpiar estilos previos
    cleanParagraphStyles(paragraph);

    // 2. Aplicar espaciado base (Doble + Sin espacio entre párrafos)
    if (paragraph.properties && paragraph.properties.spacing) {
        applyDoubleLineSpacing(paragraph.properties.spacing);
        removeParagraphSpacing(paragraph.properties.spacing);
    }

    // 3. Aplicar Sangría Francesa
    if (paragraph.properties && paragraph.properties.indent) {
        applyHangingIndent(paragraph.properties.indent);
    }

    // 4. Aplicar Tipografía Base (Times New Roman 12)
    if (paragraph.runs && Array.isArray(paragraph.runs)) {
        paragraph.runs.forEach(run => {
            applyStandardTypography(run);
        });
    }

    // 5. Aplicar Cursivas específicas (Títulos de libros/revistas)
    // Nota: Esto es una aproximación. Lo ideal es que el usuario sepa dónde va la cursiva.
    // Aquí intentamos detectar si el texto parece un título de libro y aplicar cursiva a la parte central.
    const structure = parseReferenceStructure(text);
    
    if (structure.title && (structure.isBook || structure.isJournal)) {
        // Estrategia: Marcar la parte del título como cursiva.
        // Como no sabemos exactamente dónde termina el título en el string crudo,
        // una estrategia segura es:
        // - Si es libro: Cursiva en todo el título (después del año).
        // - Si es revista: Cursiva en el nombre de la revista y el volumen.
        
        // Implementación simplificada:
        // Si detectamos "Vol.", cursivamos desde ahí hasta el siguiente punto.
        // Si es libro, cursivamos desde el inicio del título hasta el final de la fuente.
        
        // Para una implementación robusta en JS puro sin NLP, 
        // es mejor dejar que el usuario marque las cursivas o usar una regex más agresiva.
        // Aquí aplicaremos una regla general: Cursiva en la parte que parece título.
        
        applyItalicToTitleRuns(paragraph, structure);
    }

    console.log('[APA References]: Referencia formateada (Sangría francesa, doble espacio).');
    return paragraph;
}

/**
 * Intenta aplicar cursiva a los fragmentos de texto que parecen ser títulos.
 * 
 * @param {Object} paragraph - El párrafo.
 * @param {Object} structure - Estructura parseada.
 */
function applyItalicToTitleRuns(paragraph, structure) {
    if (!paragraph.runs || !structure.title) return;

    // Estrategia: Buscar el texto del título en los runs y aplicar cursiva.
    // Esto es complejo porque el texto puede estar dividido en varios runs.
    // Simplificación: Si el run contiene palabras clave de título, aplicar cursiva.
    
    // Una mejor aproximación para "formato automático" sin NLP:
    // Asumir que el usuario escribió la referencia correctamente y solo necesitamos
    // asegurar que el párrafo tenga la sangría y el espaciado correctos.
    // La cursiva manual es difícil de inferir automáticamente sin errores.
    
    // Sin embargo, si el usuario quiere que el script lo haga:
    // Buscamos el patrón de título en el texto completo y marcamos los runs correspondientes.
    
    // Ejemplo simple: Si el título empieza después del año "(2023). ", marcamos desde ahí.
    const startIndex = text.indexOf(structure.title);
    if (startIndex === -1) return;

    let currentPos = 0;
    paragraph.runs.forEach(run => {
        const runText = run.text || '';
        const runEnd = currentPos + runText.length;
        
        // Si este run intersecta con el rango del título
        if (runEnd > startIndex && currentPos < startIndex + structure.title.length) {
            if (typeof run.setItalic === 'function') {
                run.setItalic(true);
            } else {
                run.italic = true;
            }
        }
        
        currentPos = runEnd;
    });
}

// =========================================
// ORDENAMIENTO ALFABÉTICO
// =========================================

/**
 * Ordena un array de párrafos (referencias) alfabéticamente por el apellido del primer autor.
 * 
 * @param {Array<Object>} references - Array de objetos párrafo.
 * @returns {Array<Object>} Array ordenado.
 */
export function sortReferencesAlphabetically(references) {
    if (!Array.isArray(references)) return [];

    return references.sort((a, b) => {
        const textA = extractFirstAuthorSurname(a);
        const textB = extractFirstAuthorSurname(b);
        
        return textA.localeCompare(textB, 'es', { sensitivity: 'accent' });
    });
}

/**
 * Extrae el apellido del primer autor de un párrafo de referencia.
 * Heurística: Toma la primera palabra antes de la primera coma.
 * 
 * @param {Object} paragraph - El párrafo.
 * @returns {string} Apellido del autor.
 */
function extractFirstAuthorSurname(paragraph) {
    if (!paragraph.runs || paragraph.runs.length === 0) return "";
    
    // Concatenar todos los runs para obtener el texto completo
    const fullText = paragraph.runs.map(r => r.text || "").join("");
    
    // Buscar el patrón "Apellido, ..."
    const match = fullText.match(/^([A-Z][a-z]+)/);
    if (match) {
        return match[1].toLowerCase();
    }
    
    return fullText.substring(0, 10).toLowerCase(); // Fallback
}

// =========================================
// UTILIDADES DE TEXTO
// =========================================

/**
 * Conecta autores múltiples con "&" o "y" según el idioma.
 * APA 7 en español usa "y", en inglés "&".
 * 
 * @param {string} authorsString - Cadena de autores (ej: "García, A., López, B., Pérez, C.").
 * @param {string} lang - Idioma ('es' o 'en').
 * @returns {string} Cadena formateada.
 */
export function formatAuthorsList(authorsString, lang = 'es') {
    if (!authorsString) return "";

    const separator = lang === 'es' ? ' y ' : ' & ';
    
    // Dividir por comas que no estén dentro de iniciales (ej: "A. B.")
    // Regex compleja para manejar iniciales: dividir por ", " pero no si sigue una mayúscula y punto
    // Simplificación: dividir por ", " y luego reconstruir.
    const parts = authorsString.split(', ');
    
    if (parts.length <= 1) return authorsString;

    const lastPart = parts.pop();
    return parts.join(', ') + separator + lastPart;
}

/**
 * Añade el DOI o URL al final de la referencia si no existe.
 * 
 * @param {string} referenceText - Texto de la referencia.
 * @param {string} doiOrUrl - El DOI o URL.
 * @returns {string} Texto actualizado.
 */
export function appendDOI(referenceText, doiOrUrl) {
    if (!doiOrUrl) return referenceText;
    
    // Verificar si ya tiene DOI/URL
    if (/(doi\.org|https?:\/\/)/i.test(referenceText)) {
        return referenceText;
    }

    // APA 7: DOI como URL (https://doi.org/...)
    let formattedLink = doiOrUrl;
    if (!formattedLink.startsWith('http')) {
        formattedLink = `https://doi.org/${doiOrUrl}`;
    }

    return `${referenceText} ${formattedLink}`;
}