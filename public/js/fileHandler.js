/**
 * js/fileHandler.js
 * 
 * Módulo dedicado a la gestión de la interacción de archivos (Drag & Drop, Selección).
 * 
 * Funciones principales:
 * - init: Inicializa los event listeners en el DOM.
 * - handleDragEnter/Over/Leave/Drop: Gestiona la experiencia visual del Drag & Drop.
 * - handleFileSelect: Procesa la selección de archivo via click.
 * - validateAndRead: Valida el archivo y lo lee para su procesamiento.
 * 
 * Dependencias:
 * - validators.js (para validar el archivo)
 * - constants.js (para límites y mensajes)
 * - uiHandler.js (para mostrar estados de carga/error)
 */

import { validateFile, validateDocxMagicNumber } from './utils/validators.js';
import { FILE_LIMITS, MESSAGES, CSS_CLASSES } from './utils/constants.js';
import { showNotification, hideNotification } from './utils/notifications.js';
import { updateProgress, setProcessingState } from './uiHandler.js';

// Referencias a elementos del DOM
let dropZone = null;
let fileInput = null;
let selectFileBtn = null;

/**
 * Inicializa el manejador de archivos.
 * Debe llamarse una vez que el DOM esté cargado.
 */
export function init() {
    dropZone = document.getElementById('dropZone');
    fileInput = document.getElementById('fileInput');
    selectFileBtn = document.getElementById('selectFileBtn');

    if (!dropZone || !fileInput) {
        console.error('[FileHandler]: Elementos del DOM no encontrados (dropZone o fileInput).');
        return;
    }

    // Event Listeners para Drag & Drop
    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // Event Listener para click en el input (oculto)
    dropZone.addEventListener('click', () => fileInput.click());
    
    // Event Listener para cambio en el input
    fileInput.addEventListener('change', handleFileSelect);

    // Event Listener para el botón explícito
    if (selectFileBtn) {
        selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el click se propague al dropZone
            fileInput.click();
        });
    }

    console.log('[FileHandler]: Inicializado correctamente.');
}

/**
 * Maneja el evento dragenter.
 */
function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add(CSS_CLASSES.DROPZONE_DRAG_OVER);
}

/**
 * Maneja el evento dragover.
 * Necesario para permitir el drop.
 */
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    // Actualizar efecto visual si es necesario
    dropZone.classList.add(CSS_CLASSES.DROPZONE_DRAG_OVER);
}

/**
 * Maneja el evento dragleave.
 */
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Solo quitar la clase si el elemento que sale es el dropZone mismo
    // (para evitar que se quite al entrar a un hijo)
    if (e.target === dropZone || e.relatedTarget === null) {
        dropZone.classList.remove(CSS_CLASSES.DROPZONE_DRAG_OVER);
    }
}

/**
 * Maneja el evento drop.
 */
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove(CSS_CLASSES.DROPZONE_DRAG_OVER);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        processFile(files[0]);
    } else {
        showNotification('No se detectó ningún archivo.', 'warning');
    }
}

/**
 * Maneja la selección de archivo via input change.
 */
function handleFileSelect(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
        processFile(files[0]);
    }
    // Resetear el input para permitir seleccionar el mismo archivo de nuevo si se cancela
    e.target.value = '';
}

/**
 * Procesa un archivo individual: valida, lee y pasa al siguiente paso.
 * 
 * @param {File} file - El archivo seleccionado.
 */
async function processFile(file) {
    // 1. Mostrar estado de carga
    setProcessingState('uploading');
    updateProgress(10);

    // 2. Validación superficial
    const validation = validateFile(file);
    if (!validation.valid) {
        handleValidationError(validation.errors);
        setProcessingState('idle');
        return;
    }

    // 3. Validación profunda (Magic Number) - Opcional pero recomendado
    try {
        const magicCheck = await validateDocxMagicNumber(file);
        if (!magicCheck.valid) {
            handleValidationError(magicCheck.errors);
            setProcessingState('idle');
            return;
        }
    } catch (err) {
        console.warn('[FileHandler]: No se pudo verificar el magic number, continuando...', err);
    }

    // 4. Leer el archivo
    try {
        updateProgress(30);
        const arrayBuffer = await readFileAsArrayBuffer(file);
        
        // 5. Pasar a docxReader
        // Importamos dinámicamente para evitar circular dependencies si las hubiera
        const { readDocxFile } = await import('./processors/docxReader.js');
        
        updateProgress(50);
        const data = await readDocxFile({ name: file.name, arrayBuffer: () => Promise.resolve(arrayBuffer) });
        
        // 6. Éxito: Pasar a app.js para formateo
        updateProgress(80);
        onFileProcessedSuccess(data, file.name);

    } catch (error) {
        console.error('[FileHandler]: Error al leer o procesar el archivo:', error);
        handleProcessingError(error);
    }
}

/**
 * Lee un archivo como ArrayBuffer.
 * 
 * @param {File} file 
 * @returns {Promise<ArrayBuffer>}
 */
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error al leer el archivo.'));
        
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Maneja errores de validación.
 * 
 * @param {Array<string>} errors 
 */
function handleValidationError(errors) {
    const errorMsg = errors.join(' ');
    showNotification(errorMsg, 'error');
    console.error('[FileHandler]: Error de validación:', errors);
}

/**
 * Maneja errores de procesamiento.
 * 
 * @param {Error} error 
 */
function handleProcessingError(error) {
    let msg = MESSAGES.ERROR.PROCESSING_FAILED;
    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        msg = MESSAGES.ERROR.NETWORK_ERROR;
    } else if (error.message.includes('corrupt') || error.message.includes('invalid')) {
        msg = MESSAGES.ERROR.INVALID_FILE;
    }
    
    showNotification(msg, 'error');
    console.error('[FileHandler]: Error de procesamiento:', error);
}

/**
 * Callback cuando el archivo ha sido leído y extraído correctamente.
 * Delega la responsabilidad de formatear a app.js.
 * 
 * @param {Object} data - Datos extraídos por docxReader.
 * @param {string} originalName - Nombre original del archivo.
 */
function onFileProcessedSuccess(data, originalName) {
    console.log('[FileHandler]: Archivo procesado con éxito. Enviando a formateo...');
    
    // Emitir un evento personalizado para que app.js escuche
    const event = new CustomEvent('fileReady', {
        detail: {
            data: data,
            originalName: originalName
        }
    });
    document.dispatchEvent(event);
    
    updateProgress(100);
    setTimeout(() => {
        setProcessingState('completed');
    }, 500);
}

/**
 * Reinicia el estado del manejador de archivos.
 * Útil después de una descarga o error.
 */
export function reset() {
    if (fileInput) fileInput.value = '';
    setProcessingState('idle');
    updateProgress(0);
    hideNotification();
}