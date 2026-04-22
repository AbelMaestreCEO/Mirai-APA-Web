/**
 * js/app.js
 * 
 * Módulo principal de la aplicación Mirai APA.
 * 
 * Funciones principales:
 * - init: Inicializa todos los módulos y listeners.
 * - processDocument: Orquesta el flujo completo (Lectura -> Formateo -> Escritura).
 * - handleDownload: Gestiona la descarga del archivo generado.
 * - handleReset: Reinicia la aplicación.
 * 
 * Flujo de datos:
 * 1. fileHandler (Input) -> 2. docxReader (Parse) -> 3. APA Modules (Format) -> 4. docxWriter (Generate) -> 5. UI (Output)
 */

// Importación de módulos
import { init as initFileHandler, reset as resetFileHandler } from './fileHandler.js';
import { init as initUI, setProcessingState, setFileName, updateProgress, resetUI } from './uiHandler.js';
import { showNotification } from './utils/notifications.js';
import { MESSAGES, APP_CONFIG } from './utils/constants.js';
import { themeManager } from './js/utils/themeManager.js';

// Importación de módulos de procesamiento
import { readDocxFile } from './processors/docxReader.js';
import { generateDocx, downloadBlob } from './processors/docxWriter.js';

// Importación de módulos de reglas APA (para referencia y futura extensión)
// Estos se usan internamente en docxReader/Writer, pero los importamos aquí para asegurar carga
import './apa/margins.js';
import './apa/typography.js';
import './apa/spacing.js';
import './apa/headers.js';
import './apa/paragraphs.js';
import './apa/references.js';
import './apa/titlePage.js';
import './apa/pageNumbers.js';
import './apa/tables.js';
import './apa/figures.js';
import './apa/citations.js';
import './apa/abstract.js';

// Estado interno de la aplicación
let currentProcessedBlob = null;
let isProcessing = false;

/**
 * Inicializa la aplicación cuando el DOM esté listo.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log(`🚀 ${APP_CONFIG.NAME} v${APP_CONFIG.VERSION} iniciando...`);

    // 1. Inicializar módulos
    initFileHandler();
    initUI();

    // 2. Escuchar eventos personalizados
    setupEventListeners();

    // 3. Mensaje de bienvenida en consola
    console.log(`✨ ${APP_CONFIG.DESCRIPTION}`);
    console.log(`👨‍💻 Desarrollado por ${APP_CONFIG.AUTHOR} para ${APP_CONFIG.DOMAIN}`);

    // Opcional: Agregar atajo de teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 't' && e.ctrlKey) {
      e.preventDefault();
      themeManager.toggleDarkLight();
    }
  });
});

/**
 * Configura los listeners para los eventos personalizados disparados por otros módulos.
 */
function setupEventListeners() {
    // Evento: Archivo listo para procesar (disparado por fileHandler)
    document.addEventListener('fileReady', async (event) => {
        if (isProcessing) return;
        const { data, originalName } = event.detail;
        await processDocument(data, originalName);
    });

    // Evento: Descargar archivo (disparado por uiHandler)
    document.addEventListener('downloadRequested', () => {
        if (currentProcessedBlob) {
            downloadBlob(currentProcessedBlob, 'documento_formateado_APA7.docx');
            showNotification('¡Descarga iniciada!', 'success');
        } else {
            showNotification('No hay ningún documento listo para descargar.', 'error');
        }
    });

    // Evento: Reiniciar aplicación (disparado por uiHandler)
    document.addEventListener('resetRequested', () => {
        resetApplication();
    });
}

/**
 * Orquesta el proceso completo de formateo.
 * 
 * @param {Object} data - Datos extraídos del DOCX original.
 * @param {string} originalName - Nombre del archivo original.
 */
async function processDocument(data, originalName) {
    if (isProcessing) return;
    isProcessing = true;

    try {
        // Paso 1: Preparar UI
        setProcessingState('processing');
        updateProgress(50);
        showNotification(MESSAGES.INFO.PROCESSING, 'info');

        // Paso 2: Simular tiempo de procesamiento (opcional, para UX)
        // En una app real, esto ocurre mientras docxWriter construye el documento.
        await new Promise(resolve => setTimeout(resolve, 500));

        // Paso 3: Generar el nuevo documento
        // Aquí pasamos los datos crudos y las opciones de metadatos (si los hubiera)
        // Nota: En esta versión simple, asumimos que los metadatos se extraen o usan por defecto.
        // Si quisieras pedir título/autor al usuario, lo harías aquí antes de llamar a generateDocx.
        
        const options = {
            title: "Título del Documento", // Podrías extraer esto de data.metadata si exists
            author: "Autor",
            affiliation: "Afiliación",
            course: "",
            instructor: "",
            date: new Date().toLocaleDateString('es-ES')
        };

        console.log('📝 Generando documento con estilos APA 7...');
        const blob = await generateDocx(data, options);

        // Paso 4: Guardar el blob en memoria
        currentProcessedBlob = blob;

        // Paso 5: Actualizar UI a estado completado
        updateProgress(100);
        setFileName(originalName);
        setProcessingState('completed');
        showNotification(MESSAGES.SUCCESS.PROCESSING_COMPLETE, 'success');

        console.log('✅ Documento generado exitosamente.');

    } catch (error) {
        console.error('❌ Error fatal en processDocument:', error);
        handleProcessingError(error);
    } finally {
        isProcessing = false;
    }
}

/**
 * Maneja errores durante el procesamiento.
 * 
 * @param {Error} error 
 */
function handleProcessingError(error) {
    setProcessingState('error');
    
    let message = MESSAGES.ERROR.PROCESSING_FAILED;
    if (error.message.includes('Memory') || error.message.includes('Size')) {
        message = 'El documento es demasiado grande o complejo para procesar en el navegador.';
    } else if (error.message.includes('Invalid') || error.message.includes('Corrupt')) {
        message = 'El archivo original está corrupto o no es un DOCX válido.';
    }

    showNotification(message, 'error');
    
    // Resetear después de unos segundos
    setTimeout(() => {
        resetApplication();
    }, 3600000); // 1 hora, para dar tiempo al usuario a leer el mensaje
}

/**
 * Reinicia la aplicación al estado inicial.
 */
function resetApplication() {
    currentProcessedBlob = null;
    resetUI();
    resetFileHandler();
    console.log('🔄 Aplicación reiniciada.');
}

/**
 * Función de utilidad para depuración (puede ser llamada desde la consola).
 */
window.MiraiAPA = {
    getStatus: () => ({ isProcessing, currentBlob: !!currentProcessedBlob }),
    reset: resetApplication
};