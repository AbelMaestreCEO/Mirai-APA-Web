// js/utils/themeManager.js
export class ThemeManager {
  constructor() {
    this.storageKey = 'mirai-apa-theme';
    this.validThemes = ['blue-light', 'blue-dark', 'sakura-light', 'sakura-dark'];
    this.currentTheme = this.load();
    this.init();
  }

  load() {
    const saved = localStorage.getItem(this.storageKey);
    return this.validThemes.includes(saved) ? saved : 'blue-light';
  }

  init() {
    this.apply(this.currentTheme);
    this.bindButtons();
    this.detectSystemPreference();
  }

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.add('theme-switching');
    setTimeout(() => document.documentElement.classList.remove('theme-switching'), 500);
    this.updateActiveButton(theme);
    this.currentTheme = theme;
    localStorage.setItem(this.storageKey, theme);
  }

  bindButtons() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => this.apply(btn.dataset.theme));
    });
  }

  updateActiveButton(theme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  detectSystemPreference() {
    if (!localStorage.getItem(this.storageKey)) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.apply(prefersDark ? 'blue-dark' : 'blue-light');
    }
  }

  toggleDarkLight() {
    const isDark = this.currentTheme.includes('dark');
    const base = this.currentTheme.includes('sakura') ? 'sakura' : 'blue';
    this.apply(isDark ? `${base}-light` : `${base}-dark`);
  }
}

// Inicializar
export const themeManager = new ThemeManager();