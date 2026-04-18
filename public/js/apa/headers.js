/**
 * js/apa/headers.js
 * 
 * Módulo dedicado a la gestión de Encabezados de Página y Estilos de Título (Headings).
 * 
 * Normas APA 7:
 * 1. Encabezado de página (Running Head):
 *    - Solo en la portada para tesis/trabajos profesionales (opcional en algunos contextos, 
 *      pero obligatorio en manuscritos para publicación).
 *    - Formato: "TÍTULO CORTO" alineado a la izquierda + Número de página a la derecha.
 *    - En la portada: "Running head: TÍTULO CORTO" (solo en versiones antiguas, APA 7 simplifica).
 *    - En páginas subsiguientes: "TÍTULO CORTO" + número.
 * 
 * 2. Niveles de Títulos (Heading Levels):
 *    - Nivel 1: Centrado, Negrita, Mayúsculas y Minúsculas (Title Case).
 *    - Nivel 2: Alineado a la izquierda, Negrita, Title Case.
 *    - Nivel 3: Alineado a la izquierda, Negrita, Cursiva, Title Case.
 *    - Nivel 4: Sangrado, Negrita, Title Case, termina con punto.
 *    - Nivel 5: Sangrado, Negrita, Cursiva, Title Case, termina con punto.
 * 
 * Dependencias: Ninguna externa.
 */

// =========================================
// CONFIGURACIÓN DE ENCABEZADO DE PÁGINA
// =========================================

/**
 * Configura el contenido del encabezado de página (Running Head).
 * En APA 7, el "Running Head" (texto en mayúsculas) se usa en todas las páginas 
 * si se requiere para publicación, o solo en la portada si es un trabajo estudiantil.
 * 
 * @param {Object} headerSection - El objeto Header/Footer de la librería docx.
 * @param {string} shortTitle - El título corto del documento (máx 50 caracteres).
 * @param {number} pageNumber - El número de página actual.
 * @returns {Object} El objeto header modificado.
 */
export function configureRunningHeader(headerSection, shortTitle, pageNumber) {
    if (!headerSection) {
        console.warn('[APA Headers]: No se proporcionó sección de encabezado.');
        return null;
    }

    // Normalizar el título corto: MAYÚSCULAS, sin más de 50 chars
    const cleanTitle = shortTitle.toUpperCase().substring(0, 50).trim();
    
    // Construir el contenido del encabezado
    // Estructura: [Texto Título] [Espaciador flexible] [Número de página]
    // Nota: La implementación exacta depende de cómo uses docx (ej. Table para alineación o Flex)
    
    // Ejemplo de estructura conceptual para docx:
    // headerSection.addParagraph(new Paragraph({
    //     children: [
    //         new TextRun({ text: cleanTitle, bold: true }),
    //         new TextRun({ text: " ", space: "auto" }), // Espaciador
    //         new TextRun({ text: String(pageNumber) })
    //     ],
    //     alignment: AlignmentType.RIGHT // O LEFT dependiendo de la versión exacta de APA requerida
    // }));

    // Nota: En la práctica, para alinear el título a la izquierda y el número a la derecha
    // en docx, a menudo se usa una tabla invisible de 2 columnas o un container con alignment.
    
    console.log(`[APA Headers]: Encabezado configurado: "${cleanTitle}" - Pág ${pageNumber}`);
    return headerSection;
}

/**
 * Configura el pie de página (generalmente solo lleva el número de página en APA 7).
 * 
 * @param {Object} footerSection - El objeto Footer de la librería docx.
 * @param {number} pageNumber - El número de página.
 * @returns {Object} El objeto footer modificado.
 */
export function configureFooter(footerSection, pageNumber) {
    if (!footerSection) {
        console.warn('[APA Headers]: No se proporcionó sección de pie de página.');
        return null;
    }

    // APA 7: El número de página va en la esquina superior derecha del encabezado.
    // El pie de página suele estar vacío o usarse para notas al pie específicas.
    // Si se requiere número en el pie (no estándar APA 7 para manuscritos, pero común en tesis):
    // footerSection.addParagraph(...);

    console.log('[APA Headers]: Pie de página configurado.');
    return footerSection;
}

// =========================================
// ESTILOS DE TÍTULOS (HEADING LEVELS)
// =========================================

/**
 * Obtiene la configuración de estilo para un nivel de título específico.
 * 
 * @param {number} level - Nivel del título (1 a 5).
 * @returns {Object} Configuración de estilo (alineación, negrita, cursiva, caso).
 */
export function getHeadingStyle(level) {
    const styles = {
        1: {
            alignment: 'center',
            bold: true,
            italic: false,
            case: 'title', // Title Case (Mayúsculas y Minúsculas)
            indent: 0
        },
        2: {
            alignment: 'left',
            bold: true,
            italic: false,
            case: 'title',
            indent: 0
        },
        3: {
            alignment: 'left',
            bold: true,
            italic: true,
            case: 'title',
            indent: 0
        },
        4: {
            alignment: 'left',
            bold: true,
            italic: false,
            case: 'title',
            indent: 1.27, // 0.5 pulgadas en cm
            trailingDot: true // Termina con punto
        },
        5: {
            alignment: 'left',
            bold: true,
            italic: true,
            case: 'title',
            indent: 1.27,
            trailingDot: true
        }
    };

    return styles[level] || styles[1];
}

/**
 * Aplica el estilo de un título a un objeto de párrafo.
 * 
 * @param {Object} paragraphProperties - Propiedades del párrafo.
 * @param {number} level - Nivel del título (1-5).
 * @param {Object} runProperties - Propiedades de la fuente (opcional, hereda del documento).
 * @returns {Object} Propiedades del párrafo modificadas.
 */
export function applyHeadingStyle(paragraphProperties, level, runProperties = null) {
    if (!paragraphProperties) {
        console.warn('[APA Headers]: No se proporcionaron propiedades de párrafo.');
        return null;
    }

    const styleConfig = getHeadingStyle(level);

    // 1. Alineación
    if (typeof paragraphProperties.setAlignment === 'function') {
        paragraphProperties.setAlignment(styleConfig.alignment);
    } else {
        paragraphProperties.alignment = styleConfig.alignment;
    }

    // 2. Negrita y Cursiva (en el Run)
    if (runProperties) {
        if (typeof runProperties.setBold === 'function') {
            runProperties.setBold(styleConfig.bold);
        } else {
            runProperties.bold = styleConfig.bold;
        }

        if (typeof runProperties.setItalic === 'function') {
            runProperties.setItalic(styleConfig.italic);
        } else {
            runProperties.italic = styleConfig.italic;
        }
    }

    // 3. Sangría (para niveles 4 y 5)
    if (styleConfig.indent > 0) {
        if (paragraphProperties.indent) {
            if (typeof paragraphProperties.indent.setLeft === 'function') {
                // Convertir cm a twips (1.27 cm * 567 ≈ 720 twips)
                paragraphProperties.indent.setLeft(Math.round(styleConfig.indent * 567));
            } else {
                paragraphProperties.indent.left = Math.round(styleConfig.indent * 567);
            }
        } else {
            paragraphProperties.indent = {
                left: Math.round(styleConfig.indent * 567)
            };
        }
    }

    // 4. Punto final (para niveles 4 y 5)
    // Esto se maneja usualmente al agregar el texto, no en las propiedades del párrafo.
    // Pero podemos devolver una flag para que el llamador añada el punto.
    if (styleConfig.trailingDot) {
        paragraphProperties._needsTrailingDot = true;
    }

    console.log(`[APA Headers]: Estilo Nivel ${level} aplicado.`);
    return paragraphProperties;
}

/**
 * Convierte un texto a Title Case (Mayúsculas y Minúsculas) según APA.
 * APA 7 usa "Title Case" para todos los niveles de títulos.
 * 
 * @param {string} text - Texto original.
 * @returns {string} Texto convertido a Title Case.
 */
export function toTitleCase(text) {
    if (!text) return "";

    const minorWords = [
        "a", "an", "and", "as", "at", "but", "by", "for", "if", "in", "into", 
        "is", "it", "like", "nor", "of", "on", "or", "per", "so", "than", "the", 
        "to", "up", "via", "yet"
    ];

    return text.toLowerCase().split(" ").map((word, index) => {
        // Primera palabra siempre mayúscula
        if (index === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }
        
        // Palabras finales siempre mayúsculas
        const lastWord = index === text.split(" ").length - 1;
        if (lastWord) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }

        // Palabras menores en minúscula (excepto si son la primera o última)
        if (minorWords.includes(word)) {
            return word;
        }

        // Resto en Title Case
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(" ");
}

/**
 * Helper para determinar si un párrafo parece un título basado en su longitud y formato.
 * (Opcional: útil si se quiere detectar títulos automáticamente en un documento importado).
 * 
 * @param {string} text - Texto del párrafo.
 * @param {number} length - Longitud del párrafo.
 * @returns {boolean}
 */
export function isLikelyHeading(text, length) {
    // Heurística simple: párrafos cortos (< 100 chars) y sin punto final suelen ser títulos
    if (length > 100) return false;
    if (text.trim().endsWith(".")) return false;
    if (text.trim().endsWith(":")) return true; // A veces títulos terminan en dos puntos
    
    return true;
}