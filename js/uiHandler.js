/**
 * js/uiHandler.js
 * 
 * Módulo dedicado a la gestión de la Interfaz de Usuario (UI).
 * 
 * Funciones principales:
 * - updateProgress: Actualiza la barra de progreso y el porcentaje.
 * - setProcessingState: Cambia entre estados (idle, uploading, processing, completed, error).
 * - showSection / hideSection: Controla la visibilidad de las secciones (Hero, Dropzone, Progress, Result).
 * - enable/disableButtons: Gestiona el estado de los botones durante el proceso.
 * - resetUI: Restaura la interfaz al estado inicial.
 * 
 * Dependencias:
 * - constants.js (para IDs de elementos y clases CSS)
 */

import { CSS_CLASSES, UI_CONFIG, MESSAGES } from './utils/constants.js';

// Referencias a elementos del DOM
let progressBar = null;
let progressBadge = null;
let progressSection = null;
let dropZoneSection = null;
let resultSection = null;
let fileNameDisplay = null;
let downloadBtn = null;
let newFileBtn = null;
let selectFileBtn = null;

/**
 * Inicializa las referencias del DOM.
 * Debe llamarse una vez que el DOM esté cargado.
 */
export function init() {
    progressBar = document.getElementById('progressBar');
    progressBadge = document.getElementById('progressBadge');
    progressSection = document.getElementById('progressSection');
    dropZoneSection = document.querySelector('.section:nth-of-type(2)'); // La sección de dropzone
    resultSection = document.getElementById('resultSection');
    fileNameDisplay = document.getElementById('fileNameDisplay');
    downloadBtn = document.getElementById('downloadBtn');
    newFileBtn = document.getElementById('newFileBtn');
    selectFileBtn = document.getElementById('selectFileBtn');

    // Event Listeners para botones de resultado
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownloadClick);
    }
    if (newFileBtn) {
        newFileBtn.addEventListener('click', handleNewFileClick);
    }

    console.log('[UI Handler]: Inicializado correctamente.');
}

/**
 * Actualiza la barra de progreso y el texto de porcentaje.
 * 
 * @param {number} percent - Porcentaje de avance (0-100).
 */
export function updateProgress(percent) {
    if (!progressBar || !progressBadge) return;

    // Clamp entre 0 y 100
    const safePercent = Math.min(100, Math.max(0, percent));
    
    progressBar.style.width = `${safePercent}%`;
    progressBadge.textContent = `${Math.round(safePercent)}%`;

    // Animación suave (CSS transition ya está definida en components.css)
}

/**
 * Cambia el estado visual de la aplicación.
 * Controla qué secciones se muestran y cuáles se ocultan.
 * 
 * Estados: 'idle', 'uploading', 'processing', 'completed', 'error'
 * 
 * @param {string} state - El nuevo estado.
 */
export function setProcessingState(state) {
    // Ocultar todo primero
    if (dropZoneSection) dropZoneSection.style.display = 'none';
    if (progressSection) progressSection.style.display = 'none';
    if (resultSection) resultSection.style.display = 'none';

    // Habilitar/Deshabilitar botones
    const isBusy = ['uploading', 'processing'].includes(state);
    toggleButtons(!isBusy);

    switch (state) {
        case 'idle':
            if (dropZoneSection) dropZoneSection.style.display = 'block';
            updateProgress(0);
            break;

        case 'uploading':
        case 'processing':
            if (progressSection) progressSection.style.display = 'block';
            // Actualizar texto de estado si se desea (opcional)
            break;

        case 'completed':
            if (resultSection) resultSection.style.display = 'block';
            updateProgress(100);
            break;

        case 'error':
            if (dropZoneSection) dropZoneSection.style.display = 'block';
            // El error se maneja con una notificación toast
            break;
    }
}

/**
 * Establece el nombre del archivo en la sección de resultados.
 * 
 * @param {string} fileName - Nombre del archivo original.
 */
export function setFileName(fileName) {
    if (fileNameDisplay) {
        fileNameDisplay.textContent = fileName;
    }
}

/**
 * Habilita o deshabilita los botones interactivos.
 * 
 * @param {boolean} enabled - Si los botones deben estar habilitados.
 */
function toggleButtons(enabled) {
    if (selectFileBtn) selectFileBtn.disabled = !enabled;
    // El dropzone se maneja con pointer-events en CSS si es necesario, 
    // pero deshabilitar el botón explícito es suficiente.
}

/**
 * Maneja el clic en el botón de descarga.
 * Ejecuta la descarga del blob generado.
 */
function handleDownloadClick() {
    // Este evento será escuchado por app.js que tiene la referencia al blob
    const event = new CustomEvent('downloadRequested');
    document.dispatchEvent(event);
}

/**
 * Maneja el clic en el botón "Nueva conversión".
 * Reinicia el flujo.
 */
function handleNewFileClick() {
    const event = new CustomEvent('resetRequested');
    document.dispatchEvent(event);
}

/**
 * Muestra una notificación Toast.
 * Delega a notifications.js, pero aquí podemos añadir lógica específica de UI.
 * 
 * @param {string} message - Mensaje a mostrar.
 * @param {string} type - Tipo de notificación ('success', 'error', 'warning', 'info').
 */
export function showToast(message, type = 'info') {
    // Importamos dinámicamente para evitar dependencias circulares
    import('./utils/notifications.js').then(module => {
        module.showNotification(message, type);
    });
}

/**
 * Oculta la notificación actual.
 */
export function hideToast() {
    import('./utils/notifications.js').then(module => {
        module.hideNotification();
    });
}

/**
 * Restaura la interfaz al estado inicial (como al cargar la página).
 */
export function resetUI() {
    setProcessingState('idle');
    setFileName('');
    updateProgress(0);
    hideToast();
    
    // Limpiar cualquier clase de error residual
    if (dropZoneSection) {
        dropZoneSection.classList.remove(CSS_CLASSES.ERROR);
        dropZoneSection.classList.remove(CSS_CLASSES.SUCCESS);
    }
}

/**
 * Agrega un efecto de "shake" a la dropzone en caso de error de validación.
 */
export function shakeDropZone() {
    if (!dropZoneSection) return;
    
    dropZoneSection.style.animation = 'shake 0.5s';
    setTimeout(() => {
        dropZoneSection.style.animation = '';
    }, 500);
}

// Añadir la animación de shake dinámicamente si no existe en CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);