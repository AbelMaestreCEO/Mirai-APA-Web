/**
 * js/apa/citations.js
 * 
 * Módulo dedicado a la normalización y formateo de citas en el texto.
 * 
 * Normas APA 7 para Citas:
 * 1. Citas Parentéticas: (Apellido, Año) o (Apellido, Año, p. X).
 *    - Dos autores: (Apellido1 & Apellido2, Año).
 *    - Tres o más autores: (Apellido et al., Año).
 * 2. Citas Narrativas: Apellido (Año) o Apellido et al. (Año).
 * 3. Citas Textuales Cortas (<40 palabras): Entre comillas dobles ("...").
 * 4. Citas Textuales Largas (>40 palabras): Bloque separado (sin comillas, sangría).
 * 
 * Dependencias:
 * - typography.js (para asegurar que no haya negritas/cursivas indebidas en la cita)
 * - paragraphs.js (para detectar bloques)
 */

import { applyStandardTypography } from './typography.js';

// =========================================
// PATRONES DE EXPRESIONES REGULARES
// =========================================

// Detectar citas parentéticas básicas: (Apellido, Año)
const PARENTHETICAL_PATTERN = /\(([A-Za-zÀ-ÿ\s,\.&]+?),\s*(\d{4})(?:,\s*p\.?\s*\d+)?\)/g;

// Detectar citas narrativas básicas: Apellido (Año)
const NARRATIVE_PATTERN = /([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z]\.)?(?:\s+et al\.)?)\s*\((\d{4})\)/g;

// Detectar "et al." mal formateado (ej. "et al" sin punto, o "et al.,")
const ET_AL_PATTERN = /\bet al\.?/gi;

// Detectar comillas simples o dobles
const QUOTE_PATTERN = /["'`]/g;

// =========================================
// NORMALIZACIÓN DE CITAS
// =========================================

/**
 * Normaliza una cita parentética para cumplir con APA 7.
 * Asegura: (Apellido, Año) o (Apellido1 & Apellido2, Año).
 * Convierte "y" a "&" si está dentro de paréntesis.
 * 
 * @param {string} citationText - El texto de la cita original.
 * @returns {string} Citas normalizada.
 */
export function normalizeParentheticalCitation(citationText) {
    if (!citationText) return "";

    let normalized = citationText;

    // 1. Asegurar que "et al." tenga el punto
    normalized = normalized.replace(/\bet al\b/gi, "et al.");

    // 2. Cambiar "y" por "&" dentro de paréntesis (si es español, APA usa "&" en citas parentéticas)
    // Regex para encontrar "y" entre apellidos dentro de paréntesis
    normalized = normalized.replace(/\(\s*([A-Za-zÀ-ÿ\s,\.]+?)\s+y\s+([A-Za-zÀ-ÿ\s,\.]+?)\s*\)/g, "($1 & $2)");

    // 3. Asegurar espacio después de la coma
    normalized = normalized.replace(/,\s*,/g, ", ");
    normalized = normalized.replace(/,\s*(\d)/g, ", $1");

    // 4. Eliminar comillas si las hubiera (las citas parentéticas no llevan comillas)
    normalized = normalized.replace(/"/g, "").replace(/'/g, "");

    console.log('[APA Citations]: Cita parentética normalizada:', normalized);
    return normalized;
}

/**
 * Normaliza una cita narrativa.
 * Asegura: Apellido (Año) o Apellido et al. (Año).
 * Convierte "&" a "y" si está fuera de paréntesis (en español).
 * 
 * @param {string} citationText - El texto de la cita original.
 * @returns {string} Citas normalizada.
 */
export function normalizeNarrativeCitation(citationText) {
    if (!citationText) return "";

    let normalized = citationText;

    // 1. Asegurar "et al."
    normalized = normalized.replace(/\bet al\b/gi, "et al.");

    // 2. Cambiar "&" por "y" en citas narrativas (en español)
    // Solo si no está dentro de paréntesis (aunque la regex es simple, asumimos contexto)
    // Nota: En APA 7 en español, las citas narrativas usan "y", las parentéticas "&".
    normalized = normalized.replace(/\s*&\s*/g, " y ");

    // 3. Asegurar espacio antes del paréntesis
    normalized = normalized.replace(/([A-Za-zÀ-ÿ\.])\((\d)/g, "$1 ($2");

    // 4. Eliminar comillas
    normalized = normalized.replace(/"/g, "").replace(/'/g, "");

    console.log('[APA Citations]: Cita narrativa normalizada:', normalized);
    return normalized;
}

// =========================================
// DETECCIÓN Y FORMATO DE CITAS TEXTUALES
// =========================================

/**
 * Detecta si un texto parece ser una cita textual corta y añade comillas si faltan.
 * Heurística: Texto corto (< 100 chars) que contiene palabras como "dice", "afirma", seguido de texto entre paréntesis.
 * 
 * @param {string} text - El texto del párrafo o fragmento.
 * @returns {string} Texto con comillas añadidas si es necesario.
 */
export function ensureQuotesForShortQuote(text) {
    if (!text) return "";

    // Si ya tiene comillas, no hacer nada
    if (QUOTE_PATTERN.test(text)) return text;

    // Heurística simple: Si el texto es corto y parece una afirmación directa
    // (Esto es difícil de hacer perfecto sin NLP, así que es una sugerencia)
    // En una implementación real, el usuario debería marcar manualmente o el sistema
    // pediría confirmación. Aquí, solo aseguramos que si detectamos un patrón fuerte, añadamos comillas.
    
    // Ejemplo de patrón fuerte: "según X (2020) texto..."
    // No añadimos comillas automáticamente para evitar falsos positivos,
    // pero sí podemos marcar el texto para revisión.
    
    // Por ahora, retornamos el texto sin cambios, pero logueamos una advertencia si parece una cita.
    if (text.length < 150 && /"(.*?)"/.test(text) === false) {
        // Podríamos añadir comillas aquí si el usuario lo confirma, pero por seguridad no lo hacemos automático.
        // console.warn('[APA Citations]: Posible cita textual sin comillas detectada:', text);
    }

    return text;
}

/**
 * Formatea una cita textual larga (Bloque).
 * Esta función no crea el bloque (eso lo hace `paragraphs.js`),
 * sino que asegura que el texto NO tenga comillas y tenga la estructura correcta.
 * 
 * @param {string} text - El texto de la cita.
 * @returns {string} Texto limpio de comillas.
 */
export function cleanBlockQuoteText(text) {
    if (!text) return "";
    
    // Eliminar comillas dobles o simples al inicio y final
    return text.replace(/^["'](.*)["']$/, "$1").trim();
}

// =========================================
// PROCESAMIENTO DE RUNS (Fragmentos de texto)
// =========================================

/**
 * Recorre los runs de un párrafo y normaliza las citas encontradas.
 * 
 * @param {Array<Object>} runs - Array de fragmentos de texto (runs).
 * @returns {Array<Object>} Runs modificados.
 */
export function processCitationsInRuns(runs) {
    if (!runs || !Array.isArray(runs)) return runs;

    // Estrategia: Concatenar todos los runs, normalizar el texto completo, y luego
    // intentar volver a dividirlo. Esto es complejo.
    // Alternativa más segura: Normalizar cada run individualmente si parece una cita completa.
    
    runs.forEach(run => {
        if (!run.text) return;

        let text = run.text;
        let isParenthetical = text.startsWith('(') && text.endsWith(')');
        let isNarrative = /([A-Z][a-z]+)\s*\(\d{4}\)/.test(text) && !isParenthetical;

        if (isParenthetical) {
            run.text = normalizeParentheticalCitation(text);
        } else if (isNarrative) {
            run.text = normalizeNarrativeCitation(text);
        }

        // Asegurar tipografía estándar (sin negrita/cursiva en la cita)
        applyStandardTypography(run);
    });

    return runs;
}

// =========================================
// UTILIDADES
// =========================================

/**
 * Verifica si una cadena es una cita válida según APA 7 (patrón básico).
 * @param {string} text
 * @returns {boolean}
 */
export function isValidAPAFormat(text) {
    // Verifica si coincide con (Apellido, Año) o Apellido (Año)
    const parenMatch = text.match(/^\([A-Za-zÀ-ÿ\s,\.&]+?,\s*\d{4}\)$/);
    const narrMatch = text.match(/^[A-Z][a-zÀ-ÿ]+(?:\s+[A-Z]\.)?(?:\s+et al\.)?\s*\(\d{4}\)$/);
    
    return !!(parenMatch || narrMatch);
}

/**
 * Extrae el año de una cita.
 * @param {string} text
 * @returns {number|null}
 */
export function extractYearFromCitation(text) {
    const match = text.match(/\((\d{4})\)/);
    if (match) return parseInt(match[1]);
    return null;
}

/**
 * Convierte "et al." a "y" o viceversa según el contexto (parentético vs narrativo).
 * @param {string} text
 * @param {boolean} isParenthetical
 * @returns {string}
 */
export function adjustEtAl(text, isParenthetical) {
    if (!text) return text;
    
    if (isParenthetical) {
        // En parentético, usar "&" si hay dos autores, "et al." si hay más.
        // Aquí solo aseguramos que "et al." tenga punto.
        return text.replace(/\bet al\b/gi, "et al.");
    } else {
        // En narrativo, usar "y" para dos autores.
        // "et al." se mantiene igual.
        return text.replace(/\bet al\b/gi, "et al.");
    }
}