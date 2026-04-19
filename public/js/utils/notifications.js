// js/utils/notifications.js
/**
 * Sistema de notificaciones Toast para Mirai APA
 * 
 * Características:
 * - Soporte para múltiples notificaciones simultáneas
 * - Colas de prioridad
 * - Accesibilidad (ARIA labels)
 * - Callbacks para acciones
 * - Integración con tema Liquid Glass
 * - Gestión automática de memoria
 */

// =========================================
// CONFIGURACIÓN
// =========================================

const NOTIFICATION_CONFIG = {
    DEFAULT_DURATION: 5000,
    MAX_TOASTS: 5,
    ANIMATION_DURATION: 300,
    STACK_GAP: 12,
    TYPES: ['success', 'error', 'warning', 'info']
};

// Mapeo de tipos a iconos SVG
const TYPE_ICONS = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>`
};

// Estado interno
let activeToasts = new Map();
let toastCounter = 0;

// =========================================
// FUNCIONES PRINCIPALES
// =========================================

/**
 * Muestra una notificación toast
 * 
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación (success, error, warning, info)
 * @param {Object} options - Opciones adicionales
 * @returns {string} ID único del toast
 */
export function showNotification(message, type = 'info', options = {}) {
    const container = getOrCreateContainer();
    if (!container) return null;

    // Validar tipo
    if (!NOTIFICATION_CONFIG.TYPES.includes(type)) {
        type = 'info';
    }

    // Generar ID único
    const toastId = `toast-${++toastCounter}-${Date.now()}`;
    
    // Configurar opciones
    const config = {
        duration: options.duration ?? NOTIFICATION_CONFIG.DEFAULT_DURATION,
        closable: options.closable !== false,
        priority: options.priority ?? 0,
        action: options.action ?? null,
        actionLabel: options.actionLabel ?? null,
        ...options
    };

    // Crear elemento toast
    const toast = createToastElement(toastId, message, type, config);
    
    // Insertar en contenedor (con orden por prioridad)
    insertToastByPriority(container, toast, config.priority);
    
    // Guardar referencia
    activeToasts.set(toastId, { element: toast, timer: null });

    // Configurar auto-cierre
    if (config.duration > 0) {
        const timer = setTimeout(() => {
            dismissNotification(toastId);
        }, config.duration);
        
        // Pausar timer al hacer hover
        toast.addEventListener('mouseenter', () => clearTimeout(timer));
        toast.addEventListener('mouseleave', () => {
            const newTimer = setTimeout(() => dismissNotification(toastId), config.duration);
            activeToasts.get(toastId).timer = newTimer;
        });
    }

    // Limitar número máximo de toasts
    enforceToastLimit(container);

    return toastId;
}

/**
 * Cierra una notificación específica
 * 
 * @param {string} toastId - ID del toast a cerrar
 */
export function dismissNotification(toastId) {
    const toastData = activeToasts.get(toastId);
    if (!toastData) return;

    const { element, timer } = toastData;
    
    // Limpiar timer
    if (timer) clearTimeout(timer);

    // Animación de salida
    element.classList.add('exit');
    
    // Esperar animación y remover
    setTimeout(() => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        activeToasts.delete(toastId);
    }, NOTIFICATION_CONFIG.ANIMATION_DURATION);
}

/**
 * Cierra todas las notificaciones activas
 */
export function dismissAllNotifications() {
    const ids = Array.from(activeToasts.keys());
    ids.forEach(id => dismissNotification(id));
}

/**
 * Actualiza el mensaje de una notificación existente
 * 
 * @param {string} toastId - ID del toast
 * @param {string} newMessage - Nuevo mensaje
 */
export function updateNotification(toastId, newMessage) {
    const toastData = activeToasts.get(toastId);
    if (!toastData) return;

    const messageEl = toastData.element.querySelector('.toast-message');
    if (messageEl) {
        messageEl.textContent = newMessage;
    }
}

// =========================================
// FUNCIONES AUXILIARES
// =========================================

/**
 * Obtiene o crea el contenedor de toasts
 * @returns {HTMLElement|null}
 */
function getOrCreateContainer() {
    let container = document.getElementById('toastContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    return container;
}

/**
 * Crea el elemento DOM del toast
 * @param {string} id - ID único
 * @param {string} message - Mensaje
 * @param {string} type - Tipo
 * @param {Object} config - Configuración
 * @returns {HTMLElement}
 */
function createToastElement(id, message, type, config) {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.dataset.toastId = id;

    // Construir contenido
    let html = `
        <div class="toast-icon" aria-hidden="true">${TYPE_ICONS[type]}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;

    // Botón de acción opcional
    if (config.action && config.actionLabel) {
        html += `
            <button class="toast-action" data-action="custom">
                ${escapeHtml(config.actionLabel)}
            </button>
        `;
    }

    // Botón de cierre
    if (config.closable) {
        html += `
            <button class="toast-close" aria-label="Cerrar notificación">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
    }

    toast.innerHTML = html;

    // Event listeners
    if (config.closable) {
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            dismissNotification(id);
        });
    }

    if (config.action) {
        const actionBtn = toast.querySelector('.toast-action');
        actionBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            config.action(id);
            if (!config.sticky) {
                dismissNotification(id);
            }
        });
    }

    // Click en el toast también cierra (si es closable)
    if (config.closable) {
        toast.addEventListener('click', () => dismissNotification(id));
    }

    return toast;
}

/**
 * Inserta toast según prioridad (mayor prioridad primero)
 * @param {HTMLElement} container
 * @param {HTMLElement} toast
 * @param {number} priority
 */
function insertToastByPriority(container, toast, priority) {
    const existingToasts = Array.from(container.querySelectorAll('.toast:not(.exit)'));
    const insertBefore = existingToasts.find(t => {
        const tPriority = parseInt(t.dataset.priority || '0');
        return tPriority < priority;
    });

    if (insertBefore) {
        container.insertBefore(toast, insertBefore);
    } else {
        container.appendChild(toast);
    }

    // Guardar prioridad en dataset
    toast.dataset.priority = priority;
}

/**
 * Limita el número máximo de toasts visibles
 * @param {HTMLElement} container
 */
function enforceToastLimit(container) {
    const toasts = container.querySelectorAll('.toast:not(.exit)');
    
    if (toasts.length > NOTIFICATION_CONFIG.MAX_TOASTS) {
        // Remover los más antiguos (primeros en el DOM)
        const toRemove = toasts[0];
        const toastId = toRemove.dataset.toastId;
        dismissNotification(toastId);
    }
}

/**
 * Escapa HTML para prevenir XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =========================================
// MÉTODOS CONVENIENCIA
// =========================================

/**
 * Notificación de éxito
 */
export function showSuccess(message, options = {}) {
    return showNotification(message, 'success', options);
}

/**
 * Notificación de error
 */
export function showError(message, options = {}) {
    return showNotification(message, 'error', options);
}

/**
 * Notificación de advertencia
 */
export function showWarning(message, options = {}) {
    return showNotification(message, 'warning', options);
}

/**
 * Notificación informativa
 */
export function showInfo(message, options = {}) {
    return showNotification(message, 'info', options);
}

// =========================================
// INTEGRACIÓN CON CONSTANTS.JS
// =========================================

/**
 * Muestra notificación basada en mensajes definidos en constants.js
 * 
 * @param {string} messageType - Clave en MESSAGES (ej: 'SUCCESS.FILE_UPLOADED')
 * @param {Object} options - Opciones adicionales
 */
export function showNotificationFromConstants(messageType, options = {}) {
    // Importar constantes si están disponibles
    if (typeof APP_CONFIG !== 'undefined' && typeof MESSAGES !== 'undefined') {
        const parts = messageType.split('.');
        let messageObj = MESSAGES;
        
        for (const part of parts) {
            messageObj = messageObj[part];
            if (!messageObj) break;
        }

        if (typeof messageObj === 'string') {
            const type = messageType.split('.')[0].toLowerCase();
            return showNotification(messageObj, type, options);
        }
    }

    // Fallback
    return showNotification(messageType, 'info', options);
}

// =========================================
// UTILIDADES DE DEBUG
// =========================================

/**
 * Devuelve estadísticas de toasts activos (para debug)
 */
export function getNotificationStats() {
    return {
        activeCount: activeToasts.size,
        maxAllowed: NOTIFICATION_CONFIG.MAX_TOASTS,
        types: Array.from(activeToasts.values()).reduce((acc, { element }) => {
            const type = element.classList.contains('toast-success') ? 'success' :
                        element.classList.contains('toast-error') ? 'error' :
                        element.classList.contains('toast-warning') ? 'warning' : 'info';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {})
    };
}

/**
 * Limpia completamente el sistema (útil para tests)
 */
export function clearAllNotifications() {
    activeToasts.forEach((_, id) => dismissNotification(id));
    activeToasts.clear();
}

// =========================================
// EVENTOS GLOBALES (Opcional)
// =========================================

// Escuchar eventos personalizados para notificaciones automáticas
if (typeof window !== 'undefined') {
    window.addEventListener('mirai:notification', (event) => {
        if (event.detail) {
            showNotification(
                event.detail.message,
                event.detail.type || 'info',
                event.detail.options || {}
            );
        }
    });
}

// Al final de js/utils/notifications.js, antes de las exports finales

/**
 * Alias para compatibilidad con código existente
 * Cierra todas las notificaciones (equivalente a dismissAllNotifications)
 */
export function hideNotification() {
    dismissAllNotifications();
}

// También agregar showNotification como alias para showInfo
export function showNotification(message, type = 'info', options = {}) {
    return showInfo(message, options);
}

// Exportar configuración para acceso externo
export { NOTIFICATION_CONFIG };