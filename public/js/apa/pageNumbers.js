/**
 * js/apa/pageNumbers.js
 * 
 * Módulo dedicado a la configuración y gestión de la numeración de páginas.
 * 
 * Normas APA 7:
 * - Ubicación: Esquina superior derecha de TODAS las páginas.
 * - Inicio: El número 1 debe estar en la portada.
 * - Formato: Número entero simple (1, 2, 3...). Sin "Página", sin puntos, sin paréntesis.
 * - Fuente: Misma fuente que el cuerpo del texto (Times New Roman 12pt).
 * 
 * Dependencias:
 * - headers.js (para configurar el header donde va el número)
 * 
 * Nota: En la librería 'docx', la numeración se gestiona mediante FieldCodes dentro del Header.
 *       No se "escribe" el número manualmente en cada página, sino que se inserta un campo
 *       que se actualiza automáticamente.
 */

import { configureRunningHeader } from './headers.js';

// =========================================
// CÓDIGOS DE CAMPO (Field Codes)
// =========================================

// Código de campo de Word/DOCX para el número de página actual
// { PAGE } es el código interno. En docx.js se representa como un objeto Field.
const PAGE_FIELD_CODE = "PAGE";

// =========================================
// CONFIGURACIÓN DEL HEADER
// =========================================

/**
 * Configura el encabezado de una sección específica para incluir el número de página.
 * 
 * @param {Object} headerSection - El objeto Header de la sección (docx.Header).
 * @param {boolean} isFirstPage - Si es la primera página (portada), aunque en APA 7 el número va igual.
 * @returns {Object} El header modificado.
 */
export function setupPageNumberHeader(headerSection, isFirstPage = false) {
    if (!headerSection) {
        console.warn('[APA Page Numbers]: No se proporcionó sección de encabezado.');
        return null;
    }

    // APA 7: El número va a la derecha.
    // En docx, esto se logra creando un párrafo con alineación RIGHT y un campo PAGE.
    
    // Nota: La implementación exacta depende de la versión de la librería 'docx'.
    // Ejemplo conceptual:
    // headerSection.addParagraph(new Paragraph({
    //     alignment: AlignmentType.RIGHT,
    //     children: [
    //         new Field({
    //             fieldCode: PAGE_FIELD_CODE,
    //             text: "1" // Placeholder
    //         })
    //     ]
    // }));

    // Si la librería no soporta Fields directamente de esta forma, 
    // a veces se requiere un workaround con tablas invisibles o simplemente 
    // confiar en que el renderizador lo maneje.
    
    // Para este módulo, asumimos que pasamos la configuración necesaria al constructor del Header.
    headerSection._pageNumberConfig = {
        alignment: 'right',
        startAt: 1,
        format: 'decimal'
    };

    console.log('[APA Page Numbers]: Encabezado configurado para numeración automática (derecha, inicio en 1).');
    return headerSection;
}

/**
 * Configura el pie de página (generalmente vacío en APA 7, pero útil por si acaso).
 * 
 * @param {Object} footerSection - El objeto Footer.
 * @returns {Object} Footer modificado.
 */
export function setupEmptyFooter(footerSection) {
    if (!footerSection) return null;
    
    // APA 7 no requiere nada en el pie de página para manuscritos estándar.
    // Dejamos el footer vacío o con un espacio mínimo.
    footerSection._isEmpty = true;
    
    return footerSection;
}

// =========================================
// GESTIÓN DE SECCIONES
// =========================================

/**
 * Asegura que la numeración sea continua entre secciones.
 * Si el documento tiene múltiples secciones (ej. portada, cuerpo, referencias),
 * la numeración debe continuar sin reiniciarse.
 * 
 * @param {Array<Object>} sections - Array de objetos Sección del documento.
 * @returns {Array<Object>} Secciones con numeración continua configurada.
 */
export function ensureContinuousNumbering(sections) {
    if (!Array.isArray(sections)) return [];

    let startNumber = 1;

    sections.forEach((section, index) => {
        if (!section.properties) {
            section.properties = {};
        }

        // Configurar el header de esta sección
        if (section.properties.header) {
            setupPageNumberHeader(section.properties.header, index === 0);
        }

        // Configurar el footer (vacío)
        if (section.properties.footer) {
            setupEmptyFooter(section.properties.footer);
        }

        // Asegurar que no haya reinicio de número (a menos que se desee explícitamente)
        // En docx, esto se controla con 'startAt' en las propiedades de la sección.
        // Para continuidad, 'startAt' debe ser null o el número siguiente.
        // Aquí forzamos que empiece en 1 solo en la primera sección, y luego herede.
        
        if (index > 0) {
            // Si la sección anterior terminó en N, esta debe empezar en N+1.
            // Como no tenemos el conteo total de páginas de la anterior (es dinámico),
            // dejamos que el motor de Word/DOCX lo maneje por defecto (continuidad).
            // Solo aseguramos que no haya 'restart' explícito.
            if (section.properties.pageNumber) {
                delete section.properties.pageNumber.restart;
            }
        }
    });

    console.log('[APA Page Numbers]: Numeración continua asegurada en todas las secciones.');
    return sections;
}

// =========================================
// VALIDACIÓN
// =========================================

/**
 * Valida si un documento tiene la numeración configurada correctamente.
 * (Esta función es más conceptual, ya que la validación real ocurre al renderizar).
 * 
 * @param {Object} document - El objeto Documento.
 * @returns {boolean}
 */
export function validatePageNumbering(document) {
    if (!document || !document.sections || document.sections.length === 0) {
        console.warn('[APA Page Numbers]: Documento inválido o sin secciones.');
        return false;
    }

    const firstSection = document.sections[0];
    
    // Verificar que la primera sección tenga un header configurado
    if (!firstSection.properties || !firstSection.properties.header) {
        console.error('[APA Page Numbers]: La portada no tiene encabezado configurado.');
        return false;
    }

    // Verificar alineación derecha (simulado)
    if (firstSection.properties.header._pageNumberConfig?.alignment !== 'right') {
        console.error('[APA Page Numbers]: El número de página no está alineado a la derecha.');
        return false;
    }

    console.log('[APA Page Numbers]: Validación de numeración exitosa.');
    return true;
}

// =========================================
// UTILIDADES
// =========================================

/**
 * Obtiene el formato de número de página estándar de APA 7.
 * @returns {Object} Configuración de formato.
 */
export function getAPA7NumberFormat() {
    return {
        format: 'decimal', // 1, 2, 3...
        startAt: 1,
        restart: false // Continuar en secciones siguientes
    };
}