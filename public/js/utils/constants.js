/**
 * js/utils/constants.js
 * 
 * Módulo dedicado a la definición de constantes globales y configuración.
 * 
 * Propósito:
 * - Centralizar valores mágicos (números, strings) para fácil modificación.
 * - Definir comportamientos por defecto de la aplicación.
 * - Configurar límites de recursos y opciones de UI.
 * 
 * Nota: Estos valores pueden ser sobrescritos dinámicamente si se desea,
 * pero por defecto se cargan aquí al iniciar la app.
 */

// =========================================
// CONFIGURACIÓN DE LA APLICACIÓN
// =========================================

export const APP_CONFIG = {
    NAME: 'Mirai APA',
    VERSION: '1.0.0',
    DESCRIPTION: 'Formateador automático de documentos a estilo APA 7',
    AUTHOR: 'Abel Maestre',
    DOMAIN: 'aberumirai.com',
    SUPPORT_URL: 'https://proton.me/support/lumo', // O tu URL de soporte
    GITHUB_REPO: 'https://github.com/AbelMaestreCEO/mirai-apa'
};

// =========================================
// LÍMITES DE ARCHIVOS
// =========================================

export const FILE_LIMITS = {
    MAX_SIZE_MB: 25,
    MAX_SIZE_BYTES: 25 * 1024 * 1024,
    MIN_SIZE_BYTES: 1024,
    ALLOWED_EXTENSIONS: ['.docx'],
    MIME_TYPES: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    MAX_FILENAME_LENGTH: 200,
    CHUNK_SIZE_BYTES: 1024 * 1024 // 1MB para procesamiento por chunks si fuera necesario
};

// =========================================
// CONFIGURACIÓN APA 7 (Valores por defecto)
// =========================================

export const APA_STANDARDS = {
    MARGINS: {
        TOP: 2.54,    // cm
        RIGHT: 2.54,  // cm
        BOTTOM: 2.54, // cm
        LEFT: 2.54    // cm
    },
    FONT: {
        DEFAULT_FAMILY: 'Times New Roman',
        DEFAULT_SIZE_PT: 12,
        DEFAULT_SIZE_DOCX_UNITS: 24, // 12 * 2
        ALLOWED_FAMILIES: [
            'Times New Roman',
            'Arial',
            'Calibri',
            'Georgia',
            'Lucida Sans Unicode'
        ]
    },
    SPACING: {
        LINE_DOUBLE: 480,      // Twips (2.0)
        LINE_SINGLE: 240,      // Twips (1.0)
        LINE_1_5: 360,         // Twips (1.5)
        BEFORE_PARAGRAPH: 0,   // pt
        AFTER_PARAGRAPH: 0,    // pt
        FIRST_LINE_INDENT_CM: 1.27, // 0.5 pulgadas
        HANGING_INDENT_CM: 1.27     // 0.5 pulgadas
    },
    HEADINGS: {
        LEVEL_1: { alignment: 'center', bold: true, italic: false, case: 'title' },
        LEVEL_2: { alignment: 'left', bold: true, italic: false, case: 'title' },
        LEVEL_3: { alignment: 'left', bold: true, italic: true, case: 'title' },
        LEVEL_4: { alignment: 'left', bold: true, italic: false, case: 'title', indent: 1.27, dot: true },
        LEVEL_5: { alignment: 'left', bold: true, italic: true, case: 'title', indent: 1.27, dot: true }
    },
    QUOTE_THRESHOLD_WORDS: 40 // Límite para considerar cita en bloque
};

// =========================================
// CONFIGURACIÓN DE UI / UX
// =========================================

export const UI_CONFIG = {
    ANIMATION_DURATION_FAST: 150,   // ms
    ANIMATION_DURATION_NORMAL: 250, // ms
    ANIMATION_DURATION_SLOW: 350,   // ms
    TOAST_DURATION: 5000,           // ms (duración de notificaciones)
    PROGRESS_INTERVAL: 100,         // ms (actualización de barra de progreso)
    MAX_RETRIES: 3,                 // Reintentos en caso de error de red
    ENABLE_DARK_MODE: true,         // Soporte para modo oscuro automático
    REDUCED_MOTION: window.matchMedia('(prefers-reduced-motion: reduce)').matches
};

// =========================================
// CONFIGURACIÓN DE API / BACKEND
// =========================================

export const API_CONFIG = {
    BASE_URL: 'https://api.aberumirai.com', // Ajusta a tu dominio de Worker
    ENDPOINTS: {
        UPLOAD: '/api/upload',
        DOWNLOAD: '/api/download',
        HISTORY: '/api/history',
        DELETE: '/api/delete',
        HEALTH: '/api/health'
    },
    TIMEOUT_MS: 30000, // 30 segundos timeout
    RETRY_DELAY_MS: 1000
};

// =========================================
// MENSAJES DE ERROR Y ÉXITO
// =========================================

export const MESSAGES = {
    SUCCESS: {
        FILE_UPLOADED: 'Archivo cargado correctamente.',
        PROCESSING_COMPLETE: 'Documento formateado exitosamente.',
        DOWNLOAD_READY: 'Tu documento está listo para descargar.',
        FILE_DELETED: 'Archivo eliminado correctamente.'
    },
    ERROR: {
        INVALID_FILE: 'El archivo seleccionado no es válido.',
        FILE_TOO_LARGE: 'El archivo excede el tamaño máximo permitido.',
        PROCESSING_FAILED: 'Hubo un error al procesar el documento.',
        NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
        SERVER_ERROR: 'El servidor encontró un problema. Inténtalo de nuevo.',
        UNSUPPORTED_FORMAT: 'Formato no soportado. Solo se aceptan .DOCX.'
    },
    WARNING: {
        LARGE_FILE: 'El archivo es muy grande. El procesamiento podría tardar.',
        MISSING_METADATA: 'Faltan datos para la portada. Se usarán valores por defecto.',
        OLD_BROWSER: 'Tu navegador podría no soportar todas las funciones.'
    },
    INFO: {
        PROCESSING: 'Procesando documento...',
        PREPARING_DOWNLOAD: 'Preparando descarga...',
        SAVING_TO_CLOUD: 'Guardando en la nube...'
    }
};

// =========================================
// CLASES CSS (Referencias rápidas)
// =========================================

export const CSS_CLASSES = {
    DROPZONE: 'dropzone',
    DROPZONE_DRAG_OVER: 'drag-over',
    BUTTON_PRIMARY: 'btn-primary',
    BUTTON_SECONDARY: 'btn-secondary',
    BUTTON_GHOST: 'btn-ghost',
    CARD: 'card',
    SECTION: 'section',
    LOADING: 'loading',
    ERROR: 'error',
    SUCCESS: 'success',
    TOAST: 'toast',
    TOAST_SUCCESS: 'toast-success',
    TOAST_ERROR: 'toast-error',
    TOAST_WARNING: 'toast-warning',
    TOAST_INFO: 'toast-info'
};

// =========================================
// ESTADO DE LA APLICACIÓN (Default State)
// =========================================

export const DEFAULT_STATE = {
    isProcessing: false,
    progress: 0,
    currentStep: 'idle', // idle, uploading, processing, downloading, completed, error
    file: null,
    processedFile: null,
    history: [],
    settings: {
        language: 'es', // 'es' o 'en'
        autoSave: true,
        darkMode: false
    }
};

// =========================================
// UTILIDADES DE CONVERSIÓN
// =========================================

export const CONVERSION_FACTORS = {
    CM_TO_TWIPS: 567,
    INCH_TO_TWIPS: 1440,
    PT_TO_DOCX_UNITS: 2,
    DOCX_UNITS_TO_PT: 0.5,
    PIXELS_TO_CM: 0.0352778 // Aproximado para 96 DPI
};

// =========================================
// INICIALIZACIÓN (Opcional)
// =========================================

/**
 * Inicializa cualquier configuración dinámica si es necesario.
 * Por ejemplo, detectar el idioma del navegador.
 */
export function initializeConstants() {
    // Detectar idioma del navegador
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('en')) {
        APA_STANDARDS.FONT.DEFAULT_FAMILY = 'Times New Roman'; // O Arial si prefieres
        // Podrías cambiar otros defaults aquí
    }
    
    console.log(`[Mirai APA] v${APP_CONFIG.VERSION} inicializado. Idioma: ${browserLang}`);
}

// Ejecutar inicialización si se desea
// initializeConstants();