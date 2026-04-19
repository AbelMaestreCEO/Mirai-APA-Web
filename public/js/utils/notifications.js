// js/utils/notifications.js
export function showNotification(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

export function hideNotification() {
    const container = document.getElementById('toastContainer');
    if (container) container.innerHTML = '';
}